//! Kết nối tới Photoshop đang chạy qua Windows COM automation và gọi doJavaScript().
//!
//! GHI CHÚ QUAN TRỌNG (đọc trước khi build):
//! - Toàn bộ file này chỉ compile trên Windows (`#[cfg(windows)]`). Trên Linux/Mac
//!   sẽ dùng bản stub bên dưới để code vẫn cargo-check được, nhưng KHÔNG chạy được thật.
//! - Về CLSID: tài liệu bàn giao giả định Photoshop có 1 CLSID gốc cố định giống nhau
//!   mọi phiên bản. Em tra lại thì KHÔNG đúng — CLSID được gán theo từng bản cài, khác
//!   nhau giữa CS6/CC/CC2024... Vì vậy bản dưới đây tra theo ProgID (chuỗi tên, ổn định
//!   hơn) thay vì hardcode CLSID: thử "Photoshop.Application.13" (ProgID riêng của CS6)
//!   trước, rồi mới tới "Photoshop.Application" (bản mặc định/đang active trên máy).

#[cfg(windows)]
mod imp {
    use windows::core::{Interface, Result, BSTR, GUID, IUnknown, PCWSTR, VARIANT};
    use windows::Win32::System::Com::{
        CLSIDFromProgID, CoCreateInstance, CoInitializeEx, IDispatch, CLSCTX_LOCAL_SERVER,
        COINIT_APARTMENTTHREADED, DISPATCH_METHOD, DISPPARAMS, EXCEPINFO,
    };
    use windows::Win32::System::Ole::GetActiveObject;

    // Thử ProgID riêng của CS6 trước (ổn định nhất nếu máy có cài CS6),
    // rồi mới fallback sang ProgID chung (trỏ tới bản Photoshop đang "active" trên máy).
    const PROG_IDS: [&str; 2] = ["Photoshop.Application.13", "Photoshop.Application"];

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn resolve_clsid() -> Result<GUID> {
        let mut last_err = None;
        for progid in PROG_IDS {
            let wide = to_wide(progid);
            unsafe {
                match CLSIDFromProgID(PCWSTR(wide.as_ptr())) {
                    Ok(clsid) => return Ok(clsid),
                    Err(e) => last_err = Some(e),
                }
            }
        }
        Err(last_err.unwrap())
    }

    /// Kết nối vào Photoshop: ưu tiên bám vào phiên bản ĐANG CHẠY (qua Running Object
    /// Table), chỉ CoCreateInstance (tự mở mới) nếu chưa có phiên nào chạy.
    pub fn connect() -> Result<IDispatch> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        }

        let clsid = resolve_clsid()?;

        unsafe {
            let mut running: Option<IUnknown> = None;
            if GetActiveObject(&clsid, None, &mut running).is_ok() {
                if let Some(unk) = running {
                    if let Ok(disp) = unk.cast::<IDispatch>() {
                        return Ok(disp);
                    }
                }
            }

            // Không có bản nào đang chạy trong ROT -> mở/kết nối local server mới.
            CoCreateInstance(&clsid, None, CLSCTX_LOCAL_SERVER)
        }
    }

    /// Gọi Photoshop.Application.doJavaScript(script) — dùng để test kết nối
    /// (VD script = "alert('OK')") hoặc chạy logic ExtendScript đã port từ host.jsx.
    ///
    /// Trả lỗi dạng String (không phải windows::core::Error) vì khi script bị lỗi bên
    /// trong Photoshop (VD ReferenceError, SyntaxError...), COM chỉ trả về mã lỗi chung
    /// "Exception occurred (0x80020009)" — muốn biết lỗi thật (dòng nào, vì sao) phải tự
    /// đọc thêm EXCEPINFO.bstrDescription, nên gộp thành 1 chuỗi dễ đọc luôn ở đây.
    pub fn do_java_script(disp: &IDispatch, script: &str) -> std::result::Result<String, String> {
        unsafe {
            let name_wide = to_wide("DoJavaScript");
            let mut dispid = 0i32;
            disp.GetIDsOfNames(
                &GUID::zeroed(),
                &PCWSTR(name_wide.as_ptr()),
                1,
                0,
                &mut dispid,
            )
            .map_err(|e| format!("Không tìm thấy DoJavaScript: {e}"))?;

            let mut args: [VARIANT; 1] = [VARIANT::from(BSTR::from(script))];
            let params = DISPPARAMS {
                rgvarg: args.as_mut_ptr(),
                rgdispidNamedArgs: std::ptr::null_mut(),
                cArgs: 1,
                cNamedArgs: 0,
            };

            let mut result = VARIANT::default();
            let mut excep = EXCEPINFO::default();

            let invoke_res = disp.Invoke(
                dispid,
                &GUID::zeroed(),
                0,
                DISPATCH_METHOD,
                &params,
                Some(&mut result as *mut _),
                Some(&mut excep as *mut _),
                None,
            );

            match invoke_res {
                Ok(()) => {
                    // Lấy đúng nội dung chuỗi từ VARIANT — không dùng {:?} (debug) vì nó in kèm
                    // cả mô tả kiểu dữ liệu COM (VD "Type 8" = mã kỹ thuật của BSTR/chuỗi) lẫn
                    // vào trước nội dung thật, gây lẫn linh tinh vào kết quả hiển thị cho Anh.
                    let text = BSTR::try_from(&result).map(|b| b.to_string()).unwrap_or_default();
                    Ok(text)
                }
                Err(e) => {
                    // Lỗi ExtendScript thật (nếu có) nằm ở đây — đây mới là thông tin
                    // hữu ích để sửa script, mã lỗi COM (0x80020009...) chỉ là vỏ ngoài.
                    let desc = excep.bstrDescription.to_string();
                    let src = excep.bstrSource.to_string();
                    if !desc.trim().is_empty() {
                        Err(format!(
                            "Lỗi ExtendScript: {desc}{}",
                            if !src.trim().is_empty() {
                                format!(" (nguồn: {src})")
                            } else {
                                String::new()
                            }
                        ))
                    } else {
                        Err(format!("{e}"))
                    }
                }
            }
        }
    }
}

#[cfg(not(windows))]
mod imp {
    // Stub để code cargo-check được trên máy không phải Windows (VD môi trường soạn code).
    // KHÔNG dùng để chạy thật — COM chỉ tồn tại trên Windows.
    pub struct FakeDispatch;

    pub fn connect() -> Result<FakeDispatch, String> {
        Err("COM automation chỉ chạy trên Windows.".into())
    }

    pub fn do_java_script(_disp: &FakeDispatch, _script: &str) -> Result<String, String> {
        Err("COM automation chỉ chạy trên Windows.".into())
    }
}

pub use imp::*;
