// (Tauri port) Ẩn cửa sổ cmd đen bật kèm khi mở app — mặc định Rust build ra app kiểu
// "console" trên Windows, luôn kèm theo 1 cửa sổ terminal dù không dùng tới. Đổi sang
// "windows" (app GUI thuần) thì không còn cửa sổ đó nữa. Chỉ áp dụng cho bản release —
// giữ lại cửa sổ debug ở bản --debug để lỡ có gì in ra vẫn xem được lúc cần sửa lỗi.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// TypoCore CS6 — cầu nối giữa giao diện HTML/CSS/JS cũ (port từ CEP) và
// Photoshop CS6 đang chạy, qua Windows COM automation.

mod photoshop;
mod worker;

use serde::Serialize;

#[derive(Serialize)]
struct ConnectResult {
    ok: bool,
    message: String,
}

/// Đảm bảo có kết nối tới Photoshop VÀ host.jsx đã nạp — worker.rs tự lo việc ghép
/// host.jsx vào script khi cần, ở đây chỉ cần gửi 1 script "rỗng" để kích hoạt.
#[tauri::command]
fn connect_photoshop() -> ConnectResult {
    match worker::run_script("\"READY\";".to_string()) {
        Ok(_) => ConnectResult {
            ok: true,
            message: "Đã kết nối Photoshop và nạp xong host.jsx.".into(),
        },
        Err(e) => ConnectResult {
            ok: false,
            message: format!("Lỗi kết nối/nạp host.jsx: {e}"),
        },
    }
}

/// Chạy 1 đoạn ExtendScript ngắn — hàm mà cep-polyfill.js gọi thay cho
/// cs.evalScript() của CEP trước đây. Luôn đi qua thread COM nền (worker.rs)
/// để dùng lại kết nối sống, không mở/đóng COM mới mỗi lần gọi.
#[tauri::command]
fn run_script(script: String) -> ConnectResult {
    match worker::run_script(script) {
        Ok(res) => ConnectResult { ok: true, message: res },
        Err(e) => ConnectResult {
            ok: false,
            message: format!("Lỗi chạy script: {e}"),
        },
    }
}

#[tauri::command]
fn test_alert() -> ConnectResult {
    match worker::run_script("alert('TypoCore CS6 – ket noi OK!');".to_string()) {
        Ok(res) => ConnectResult {
            ok: true,
            message: format!("doJavaScript() chạy xong. Kết quả thô: {}", res),
        },
        Err(e) => ConnectResult {
            ok: false,
            message: format!("Lỗi: {e}"),
        },
    }
}

/// Dò tổ hợp phím tắt (Win+Shift+E/D/B, Win+Ctrl, Win+Alt) đọc THẲNG từ Windows —
/// không đi qua Photoshop/COM. Trước đây scripts.js gọi getHotkeyCombo() bên
/// host.jsx (qua ScriptUI.environment.keyboardState) 20 lần/giây — với CEP thì rẻ
/// (cùng tiến trình), nhưng với COM out-of-process thì cực nặng, gây giật/đơ máy.
/// Việc dò phím vốn không cần Photoshop biết gì cả nên chuyển hẳn về phía Rust.
#[cfg(windows)]
#[tauri::command]
fn get_hotkey_combo() -> String {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
    };

    fn is_down(vk: u16) -> bool {
        unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 }
    }

    let win = is_down(VK_LWIN.0) || is_down(VK_RWIN.0);
    let shift = is_down(VK_SHIFT.0);
    let ctrl = is_down(VK_CONTROL.0);
    let alt = is_down(VK_MENU.0);

    if win && shift {
        if is_down(0x45) {
            return "winShiftE".into(); // phím E
        }
        if is_down(0x44) {
            return "winShiftD".into(); // phím D
        }
        if is_down(0x42) {
            return "winShiftB".into(); // phím B
        }
    }
    if win && ctrl {
        return "metaCtrl".into();
    }
    if win && alt {
        return "metaAlt".into();
    }
    String::new()
}

#[cfg(not(windows))]
#[tauri::command]
fn get_hotkey_combo() -> String {
    String::new()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            connect_photoshop,
            run_script,
            test_alert,
            get_hotkey_combo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
