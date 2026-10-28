//! Giữ 1 kết nối COM sống dùng lại nhiều lần, thay vì mở/đóng liên tục mỗi lệnh.
//!
//! Lý do cần file này: COM (đặc biệt kiểu Apartment-Threaded mình đang dùng) gắn chặt
//! vào 1 thread cụ thể — không thể "cache" con trỏ IDispatch rồi dùng tùy ý từ nhiều
//! thread khác nhau (Tauri chạy mỗi lệnh trên thread có thể khác nhau). Nên giải pháp
//! đúng là: mở 1 thread nền DUY NHẤT, chuyên xử lý mọi lệnh COM tuần tự qua hàng đợi,
//! và giữ kết nối Photoshop sống xuyên suốt trong thread đó.
//!
//! QUAN TRỌNG — bài học từ lỗi "getText is not a function", rồi tối ưu lại:
//! Hàm khai báo kiểu `function getText(){}` (không gắn vào $.global) KHÔNG tự nhớ được
//! giữa các lần gọi doJavaScript() riêng biệt qua COM. Ban đầu em vá bằng cách gửi lại
//! NGUYÊN host.jsx (450KB) trong MỌI lệnh — đúng nhưng chậm, gây trễ/giật khi dùng nhiều.
//! Giờ sửa đúng gốc: host.jsx (bản trong dự án này) đã được thêm đoạn xuất TẤT CẢ hàm
//! top-level ra `$.global` (cơ chế DUY NHẤT thực sự "nhớ" được giữa các lần gọi COM —
//! xem cuối file host.jsx). Nhờ vậy: lần đầu vẫn gửi nguyên host.jsx (chậm, nhưng chỉ 1
//! lần), các lần sau chỉ cần gửi 1 đoạn "hồi phục" rất nhỏ (REHYDRATE, ~2KB) kéo hàm từ
//! $.global về lại biến cục bộ — nhanh hơn nhiều so với gửi lại cả 450KB mỗi lần.
//!
//! QUAN TRỌNG #2 — Photoshop treo (hay gặp với bản không đăng ký COM đầy đủ, VD portable):
//! Không có cách nào an toàn để "hủy giữa chừng" 1 lệnh COM đang bị treo — nên nếu 1 lệnh
//! không trả lời trong TIMEOUT giây, mình không cố cứu thread đó nữa mà coi nó đã chết,
//! âm thầm tạo thread COM mới cho các lệnh tiếp theo. Người dùng không cần khởi động lại
//! app sau mỗi lần treo — chỉ cần thử lại thao tác.
//!
//! QUAN TRỌNG #3 — không bao giờ dùng `throw` để "báo hiệu" bất cứ điều gì cho Rust biết:
//! Photoshop tự bật popup lỗi NATIVE ngay khi có exception không được JS bắt lại, bất kể
//! phía Rust có xử lý êm thấm phía sau hay không — Anh vẫn thấy popup khó chịu. Nên MỌI
//! script gửi đi đều được bọc try/catch NGAY TRONG ExtendScript (xem wrap()), lỗi thật thì
//! trả về dưới dạng CHUỖI có tiền tố nhận diện, không bao giờ để "throw" lọt ra ngoài.

#[cfg(windows)]
mod imp {
    use crate::photoshop;
    use std::sync::mpsc::{channel, sync_channel, Sender, SyncSender};
    use std::sync::{Mutex, OnceLock};
    use windows::Win32::System::Com::IDispatch;

    const HOST_JSX: &str = include_str!("../host.jsx");

    // Đoạn "hồi phục nhanh": kéo các hàm đã xuất ra $.global (xem cuối host.jsx) về lại
    // biến cục bộ, thay cho việc phải gửi lại nguyên host.jsx.
    const REHYDRATE: &str = include_str!("../rehydrate.js");

    // Giá trị đặc biệt (không phải exception!) mà script trả về khi $.global chưa sẵn
    // sàng — worker tự nhận biết để gửi lại bản đầy đủ NGAY trong CÙNG request, Anh
    // không thấy lỗi, không cần bấm lại.
    const RELOAD_SIGNAL: &str = "TC_NEEDS_FULL_RELOAD";
    // Tiền tố đánh dấu 1 lỗi ExtendScript THẬT (do chính script gây ra, VD sai kiểu layer)
    // — script tự bắt lỗi bằng try/catch của CHÍNH NÓ rồi trả về chuỗi có tiền tố này,
    // KHÔNG dùng throw để báo hiệu bất cứ điều gì nữa (xem lý do ở bọc script bên dưới).
    const ERR_PREFIX: &str = "TC_JS_ERR::";

    /// Bọc MỌI script gửi cho Photoshop trong try/catch NGAY TRONG ExtendScript, rồi trả
    /// lỗi ra dưới dạng CHUỖI bình thường (có tiền tố ERR_PREFIX) thay vì để nó "throw" ra
    /// ngoài. Lý do bắt buộc phải làm vậy: Photoshop tự bật 1 popup lỗi NATIVE ngay khi có
    /// exception nào đó KHÔNG được code JS bắt lại — dù phía Rust của mình có xử lý ổn thoả
    /// phía sau, Anh vẫn thấy popup khó chịu đó hiện lên. Bọc try/catch ở đây thì Photoshop
    /// không bao giờ thấy "uncaught exception" nữa, popup không còn cơ hội bật lên.
    fn wrap(inner: &str) -> String {
        format!(
            "try {{\n{inner}\n}} catch (__tcErr) {{ \"{ERR_PREFIX}\" + String(__tcErr) + \" @line \" + (__tcErr.line || \"?\"); }}"
        )
    }

    /// Diễn giải chuỗi kết quả THÔ (đã qua wrap() ở trên) thành đúng ý nghĩa thật của nó:
    /// lỗi script thật, tín hiệu "cần nạp lại", hay kết quả bình thường.
    enum Outcome {
        Ok(String),
        NeedsReload,
        ScriptError(String),
    }
    fn interpret(raw: String) -> Outcome {
        if raw == RELOAD_SIGNAL {
            Outcome::NeedsReload
        } else if let Some(msg) = raw.strip_prefix(ERR_PREFIX) {
            Outcome::ScriptError(format!("Lỗi ExtendScript: {msg}"))
        } else {
            Outcome::Ok(raw)
        }
    }

    struct Request {
        script: String,
        reply: Sender<Result<String, String>>,
    }

    // Bọc trong Mutex vì có lúc mình cần THAY hẳn cả kênh gửi lệnh (khi thread COM cũ bị
    // coi là "chết/treo vĩnh viễn" — xem run_script bên dưới) — không chỉ dùng 1 lần cố định.
    static WORKER: OnceLock<Mutex<SyncSender<Request>>> = OnceLock::new();

    // Lỗi kiểu này nghĩa là kết nối/COM vẫn ổn, chỉ là bản thân đoạn script có vấn đề
    // (VD gọi hàm với layer sai loại, tham số thiếu...) — không cần/không nên reconnect.
    fn is_benign_script_error(e: &str) -> bool {
        e.starts_with("Lỗi ExtendScript:")
    }

    /// Chạy 1 lệnh với kết nối đã có — thử đường "hồi phục nhanh" trước, tự động gửi lại
    /// bản đầy đủ NGAY nếu $.global chưa sẵn sàng (không bắt Anh phải bấm lại lần 2).
    fn run_on(disp: &IDispatch, script: &str, host_loaded: &mut bool) -> Result<String, String> {
        if *host_loaded {
            let quick_check = format!(
                "if (typeof $.global.__tc_ready === \"undefined\") {{ \"{RELOAD_SIGNAL}\"; }} else {{\n{REHYDRATE}\n{script};\n}}"
            );
            match photoshop::do_java_script(disp, &wrap(&quick_check)) {
                Ok(raw) => match interpret(raw) {
                    Outcome::Ok(r) => return Ok(r),
                    Outcome::ScriptError(e) => return Err(e),
                    Outcome::NeedsReload => *host_loaded = false, // rơi xuống nhánh đầy đủ bên dưới
                },
                Err(e) => return Err(e), // lỗi ở tầng COM thật sự (không phải script) -> trả nguyên
            }
        }

        let full = wrap(&format!("{HOST_JSX}\n{script}"));
        let outcome = photoshop::do_java_script(disp, &full).map(interpret);
        let r = match outcome {
            Ok(Outcome::Ok(r)) => Ok(r),
            Ok(Outcome::ScriptError(e)) => Err(e),
            Ok(Outcome::NeedsReload) => Err("Không thể nạp host.jsx (lỗi không rõ nguyên nhân).".into()),
            Err(e) => Err(e),
        };
        *host_loaded = r.is_ok();
        r
    }

    fn worker_loop(rx: std::sync::mpsc::Receiver<Request>) {
        let mut cached: Option<IDispatch> = None;
        let mut host_loaded = false;

        for req in rx {
            let mut outcome: Option<Result<String, String>> = None;

            if let Some(disp) = &cached {
                match run_on(disp, &req.script, &mut host_loaded) {
                    Ok(r) => outcome = Some(Ok(r)),
                    Err(e) => {
                        if is_benign_script_error(&e) {
                            // Kết nối vẫn tốt, chỉ là lỗi logic trong chính script.
                            outcome = Some(Err(e));
                        } else {
                            // Nghi ngờ kết nối/COM có vấn đề thật -> bỏ cache, thử kết nối lại.
                            cached = None;
                            host_loaded = false;
                        }
                    }
                }
            }

            if outcome.is_none() {
                outcome = Some(match photoshop::connect() {
                    Ok(disp) => {
                        let r = run_on(&disp, &req.script, &mut host_loaded);
                        cached = Some(disp);
                        r
                    }
                    Err(e) => Err(format!("Không kết nối được: {e}")),
                });
            }

            // Nếu người gọi đã bỏ cuộc chờ (timeout ở run_script) thì reply có thể không còn
            // ai nhận nữa — .send() lỗi là bình thường, bỏ qua, không phải bug.
            let _ = req.reply.send(outcome.unwrap());
        }
    }

    fn spawn_worker() -> SyncSender<Request> {
        let (tx, rx) = sync_channel::<Request>(256);
        std::thread::Builder::new()
            .name("typocore-com-worker".into())
            .spawn(move || worker_loop(rx))
            .expect("không tạo được thread COM nền");
        tx
    }

    fn worker_mutex() -> &'static Mutex<SyncSender<Request>> {
        WORKER.get_or_init(|| Mutex::new(spawn_worker()))
    }

    /// Gửi 1 đoạn script cho thread COM nền chạy, chờ kết quả trả về. host.jsx được tự
    /// động đảm bảo có sẵn trước khi script chạy — người gọi không cần lo việc này.
    /// An toàn gọi từ bất kỳ thread nào (Tauri command chạy trên thread nào cũng được).
    ///
    /// TỰ PHỤC HỒI khi Photoshop treo: nếu không có phản hồi trong TIMEOUT giây (hay gặp
    /// với 1 số bản Photoshop đăng ký COM không đầy đủ, VD bản portable), coi thread COM
    /// hiện tại là đã "chết" (không cố chờ/giải cứu nó nữa — về mặt kỹ thuật không thể an
    /// toàn "hủy giữa chừng" 1 lệnh COM đang chờ), ÂM THẦM tạo 1 thread COM MỚI cho các
    /// lệnh SAU — Anh không cần khởi động lại app, chỉ cần thử lại thao tác vừa lỗi.
    const TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

    pub fn run_script(script: String) -> Result<String, String> {
        let (reply_tx, reply_rx) = channel();
        {
            let sender = worker_mutex().lock().unwrap();
            sender
                .send(Request { script, reply: reply_tx })
                .map_err(|_| "Thread COM nền đã dừng bất ngờ. Hãy khởi động lại app.".to_string())?;
        }
        match reply_rx.recv_timeout(TIMEOUT) {
            Ok(result) => result,
            Err(_) => {
                // Thread cũ coi như bỏ luôn (không join/chờ nó nữa) — thay bằng thread mới
                // để các lệnh tiếp theo của Anh không bị kẹt theo.
                let mut sender = worker_mutex().lock().unwrap();
                *sender = spawn_worker();
                Err(format!(
                    "Photoshop không phản hồi sau {} giây — coi như bị treo (hay gặp ở Photoshop đăng ký COM không đầy đủ, VD bản portable). Đã tự làm mới kết nối nền, Anh thử lại thao tác vừa rồi nhé — không cần khởi động lại app.",
                    TIMEOUT.as_secs()
                ))
            }
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn run_script(_script: String) -> Result<String, String> {
        Err("COM automation chỉ chạy trên Windows.".into())
    }
}

pub use imp::*;
