// cep-polyfill.js
// -----------------------------------------------------------------------
// TypoCore CS6 (bản Tauri) — giả lập lại đúng "hình dạng" API của CSInterface
// (thư viện CEP thật của Adobe) để scripts.js CŨ chạy được gần như nguyên vẹn,
// KHÔNG cần sửa hàng ngàn dòng scripts.js.
//
// Nguyên lý: mọi lệnh cs.evalScript(jsxCode, callback) trong scripts.js đều
// chuyển thành lời gọi Tauri invoke('run_script', { script: jsxCode }), rồi
// Rust gửi jsxCode đó qua COM cho Photoshop chạy thật (thay cho evalScript
// nội bộ của CEP trước đây).
//
// Việc nạp toàn bộ host.jsx vào ExtendScript engine (trước đây làm qua
// $.evalFile trong scripts.js dòng ~93) giờ làm bên phía Rust, tự động mỗi
// lần bấm "Kết nối Photoshop" — nên hàm applyPattern(), getText()... trong
// host.jsx đã có sẵn trong engine trước khi Anh bấm bất kỳ nút chức năng nào.
// -----------------------------------------------------------------------

(function () {
  function getInvoke() {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      console.error("[TypoCore] window.__TAURI__ chưa sẵn sàng — kiểm tra withGlobalTauri trong tauri.conf.json.");
      return null;
    }
    return window.__TAURI__.core.invoke;
  }

  // SystemPath không còn ý nghĩa thật (không còn khái niệm "thư mục extension"
  // của CEP nữa) — giữ lại chỉ để các đoạn code cũ tham chiếu SystemPath.EXTENSION
  // không bị crash vì undefined.
  window.SystemPath = { EXTENSION: "EXTENSION" };

  function CSInterface() {}

  CSInterface.prototype.evalScript = function (script, callback) {
    var invoke = getInvoke();
    if (!invoke) {
      if (callback) callback("EvalScript Error: Tauri chưa sẵn sàng.");
      return;
    }
    invoke("run_script", { script: script })
      .then(function (res) {
        if (callback) callback(res.ok ? res.message : "EvalScript Error: " + res.message);
      })
      .catch(function (err) {
        if (callback) callback("EvalScript Error: " + (err && err.message ? err.message : err));
      });
  };

  // Không còn dùng thật (host.jsx được nạp tự động phía Rust), trả về chuỗi
  // rỗng để các đoạn code cũ ghép path không bị lỗi kiểu dữ liệu.
  CSInterface.prototype.getSystemPath = function () {
    return "";
  };

  // Panel Tauri là cửa sổ rời có thể tự tay kéo giãn (không dock như CEP), nên
  // KHÔNG tự resize theo nội dung mỗi khi ẩn/hiện tính năng nữa — Anh muốn kích
  // cỡ cố định, chỉ đổi khi chính tay Anh kéo cửa sổ. Giữ hàm rỗng (no-op) thay vì
  // xoá hẳn để các chỗ gọi cs.resizeContent(...) trong scripts.js không bị lỗi.
  CSInterface.prototype.resizeContent = function () {};

  // Đọc phím tắt thẳng từ Windows (không qua Photoshop/COM) — dùng cho pollHotkeys()
  // chạy 20 lần/giây, tránh làm nghẽn hàng đợi COM như hồi còn gọi qua host.jsx.
  CSInterface.prototype.getHotkeyComboNative = function (callback) {
    var invoke = getInvoke();
    if (!invoke) {
      if (callback) callback("");
      return;
    }
    invoke("get_hotkey_combo")
      .then(function (combo) {
        if (callback) callback(combo || "");
      })
      .catch(function () {
        if (callback) callback("");
      });
  };

  // ---------------------------------------------------------------------
  // Thay window.alert() bằng thông báo tự vẽ trong app — alert() gốc của trình
  // duyệt là hộp thoại HỆ ĐIỀU HÀNH, không co giãn theo chiều ngang cửa sổ Tauri,
  // bị tràn/to quá khổ khi Anh thu hẹp app. Không cần sửa từng chỗ gọi alert()
  // trong scripts.js (27 chỗ) — chặn ngay ở đây, toàn bộ tự động dùng bản mới.
  // ---------------------------------------------------------------------
  function ensureToastContainer() {
    var el = document.getElementById("__tcToastContainer");
    if (el) return el;
    el = document.createElement("div");
    el.id = "__tcToastContainer";
    el.style.cssText = [
      "position:fixed", "top:8px", "left:8px", "right:8px", "z-index:99999",
      "display:flex", "flex-direction:column", "gap:6px", "pointer-events:none",
    ].join(";");
    document.body.appendChild(el);
    return el;
  }

  window.alert = function (message) {
    try {
      var container = ensureToastContainer();
      var box = document.createElement("div");
      box.textContent = String(message);
      box.style.cssText = [
        "background:#2a2a33", "color:#eee", "border:1px solid #4a4a58",
        "border-radius:8px", "padding:10px 12px", "font-size:12px",
        "line-height:1.4", "box-shadow:0 4px 14px rgba(0,0,0,.4)",
        "white-space:pre-wrap", "word-break:break-word",
        "pointer-events:auto", "cursor:pointer", "max-width:100%",
        "box-sizing:border-box",
      ].join(";");
      var dismiss = function () {
        box.style.transition = "opacity .15s";
        box.style.opacity = "0";
        setTimeout(function () { box.remove(); }, 150);
      };
      box.addEventListener("click", dismiss);
      container.appendChild(box);
      setTimeout(dismiss, 4500);
    } catch (e) {
      // Nếu vì lý do gì đó lỗi, không để mất thông báo hoàn toàn.
      console.error("[TypoCore] alert() thay thế lỗi:", e, message);
    }
  };

  window.CSInterface = CSInterface;

  // ---------------------------------------------------------------------
  // Tự nạp host.jsx vào ExtendScript engine ngay khi panel mở lên — thay thế
  // cho IIFE $.evalFile() ở đầu scripts.js (đoạn đó giờ chạy vô hại nhưng vô
  // tác dụng vì getSystemPath() không còn trỏ tới file thật nữa). Việc nạp
  // thật sự nằm ở lệnh Rust connect_photoshop(), include_str! sẵn host.jsx.
  // ---------------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", function () {
    var invoke = getInvoke();
    if (!invoke) return;
    invoke("connect_photoshop")
      .then(function (res) {
        console.log("[TypoCore] connect_photoshop:", res.message);
        if (!res.ok) {
          console.error("[TypoCore] Chưa kết nối được Photoshop lúc mở panel — mở Photoshop lên rồi khởi động lại app.");
        }
      })
      .catch(function (err) {
        console.error("[TypoCore] connect_photoshop lỗi:", err);
      });
  });

  // ---------------------------------------------------------------------
  // Pin Always On Top — tính năng riêng của bản Tauri (không có trong CEP gốc),
  // vì panel giờ là cửa sổ rời, dễ bị Photoshop che mất khi làm việc.
  // Checkbox nằm trong Advanced Setting (xem index.html, id="toggle_alwaysOnTop").
  // ---------------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", function () {
    var cb = document.getElementById("toggle_alwaysOnTop");
    if (!cb) return;

    function applyAlwaysOnTop(pinned) {
      var tauriWindow = window.__TAURI__ && window.__TAURI__.window;
      if (!tauriWindow) return;
      var win = tauriWindow.getCurrentWindow();
      // (Tauri port) setAlwaysOnTop(true) đôi khi "không ăn" ngay lần đầu (quirk của
      // Windows khi gọi SetWindowPos lúc cửa sổ chưa hoàn toàn sẵn sàng) — y hệt việc
      // Anh phải tắt/bật lại thủ công mới ăn. Giờ tự làm luôn: tắt trước (đảm bảo về
      // trạng thái sạch) rồi mới bật lại, thay vì gọi thẳng true 1 lần.
      win.setAlwaysOnTop(false)
        .catch(function () {})
        .then(function () {
          if (!pinned) return;
          return win.setAlwaysOnTop(true);
        })
        .catch(function (e) {
          console.error("[TypoCore] Không đặt được Always On Top:", e);
        });
    }

    var saved = localStorage.getItem("typoCorePinAlwaysOnTop") === "1";
    cb.checked = saved;
    applyAlwaysOnTop(saved);

    cb.addEventListener("click", function (e) {
      e.stopPropagation(); // tránh làm đóng popup Setting đang mở
      var pinned = cb.checked;
      localStorage.setItem("typoCorePinAlwaysOnTop", pinned ? "1" : "0");
      applyAlwaysOnTop(pinned);
    });
  });
})();
