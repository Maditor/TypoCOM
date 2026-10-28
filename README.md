# TypoCOM

TypoCOM là bản chuyển thể của TypoCore sang Tauri, dùng Windows COM automation để giao
tiếp với Photoshop — giải pháp cho các bản Photoshop cũ (CS6) không hỗ trợ CEP. Giao diện
gốc được giữ gần như nguyên vẹn; toàn bộ logic ExtendScript (căn giữa, dán chữ hàng loạt,
FX Studio...) hoạt động qua kết nối COM thay vì evalScript. `cep-polyfill.js` giả lập
CSInterface, chuyển các lệnh `cs.evalScript()` thành gọi COM thật qua Rust.

## Cài (1 lần)
- Rust: https://rustup.rs
- Tauri CLI: `cargo install tauri-cli --version "^2"`
- Visual Studio Build Tools — tick "Desktop development with C++"

## Build
```
cargo tauri build --debug   # lần đầu, log lỗi rõ hơn
cargo tauri build           # bản release
```
File `.exe` (portable) nằm ở `src-tauri\target\{debug,release}\typocom.exe`.

## Dùng cơ bản
1. Mở Photoshop (bản cài đặt chính thức) lên trước, mở sẵn 1 document.
2. Chạy `typocom.exe` — app tự kết nối, không cần bấm gì thêm.
3. Chọn 1 layer chữ trong Photoshop, dùng các nút trong Typer Box / Quick Layout / FX
   Studio như bản TypoCore gốc.
4. Bấm icon bánh răng (Settings) để vào Panel Setup (kéo-thả sắp xếp lại nút), chọn Logo,
   Import/Export style...
5. Muốn cửa sổ luôn nổi trên cùng khi làm việc với Photoshop: Settings > Advanced Setting >
   Pin Always On Top.

### Phím tắt
- `Win + Ctrl` — Dán (Typer Box / Multiple Bubble, tuỳ cái nào đang bật)
- `Win + Alt` — Center
- `Win + Shift + E` / `Win + Shift + D` — Chuyển dòng trước / dòng sau trong Typer Box
- `Win + Shift + B` — Bật/tắt Multiple Bubble

⚠️ **Bộ phím tắt Win+Shift+E/D/B hiện chưa thật sự ổn định** — đang bị trùng với phím tắt
gốc của Photoshop (`Shift+E` = Eraser, `Shift+B` = Brush), nên đôi lúc bấm tổ hợp trên vẫn
làm đổi tool bên Photoshop ngoài ý muốn. Nếu gặp, tắt các phím tắt này ở Typer Box Setting
và dùng nút bấm trực tiếp trên giao diện thay thế.

## Giới hạn
- Chỉ hỗ trợ Photoshop **cài đặt chính thức**. Bản portable có kết nối được nhưng không
  ổn định (app tự phục hồi sau ~10s treo, không cần khởi động lại).
- Mở nhiều bản Photoshop cùng lúc → app luôn nhắm vào bản cài chính thức, không báo lỗi.
