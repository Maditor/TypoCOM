var cs = new CSInterface();

function on(id, event, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

var _busy = false;
var _originalPasteDisabled = true;
var _queue = [];
var MAX_QUEUE = 1;
var _currentExpr = '';
var previewInterval = null;
var syncedTextColor = null;
var autoFxInterval = null;
var lastAutoFxText = null;
var basicColors = [
    "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF", "#880000", "#AA0000",
    "#CC0000", "#EE0000", "#FF3333", "#FF6666", "#FF9999", "#FFCCCC", "#880044", "#AA0055",
    "#CC0066", "#EE0077", "#FF3388", "#FF66AA", "#FF99CC", "#FFCCEE", "#440088", "#6600AA",
    "#8800CC", "#AA00EE", "#BB33FF", "#CC66FF", "#DD99FF", "#EEAAFF", "#004488", "#0066AA",
    "#0088CC", "#00AAEE", "#33BBFF", "#66CCFF", "#99DDFF", "#CCEEFF", "#008800", "#00AA00",
    "#00CC00", "#00EE00", "#33FF33", "#66FF66", "#99FF99", "#CCFFCC", "#888800", "#AAAA00",
    "#CCCC00", "#EEEE00", "#FFFF33", "#FFFF66", "#FFFF99", "#FFFFCC", "#884400", "#AA6600",
    "#CC8800", "#EEAA00", "#FFBB33", "#FFCC66", "#FFDD99", "#FFEECC", "#888888", "#AAAAAA"
];
var cachedPopupWidth = 0;
var cachedPopupHeight = 0;
var globalColorPickerListenerAdded = false;
var _patternData = {
    1:{4:[2,2],6:[2,2,2],7:[2,3,2],8:[2,4,2],10:[2,3,3,2],11:[2,3,3,3],13:[2,4,4,3],14:[3,4,4,3],15:[4,4,4,3],17:[2,4,5,4,2],20:[3,5,5,4,3],24:[3,4,5,5,4,3],30:[4,5,7,6,5,3],18:[2,4,6,4,2], 19:[2,4,7,4,2], 21:[2,5,7,5,2], 22:[2,5,8,5,2], 23:[2,5,9,5,2], 25:[2,6,9,6,2], 26:[2,6,10,6,2], 27:[2,7,9,7,2], 28:[2,7,10,7,2], 29:[2,8,9,8,2], 31:[2,4,6,7,6,4,2], 32:[2,4,6,8,6,4,2], 33:[2,4,7,7,7,4,2], 34:[2,4,7,8,7,4,2], 35:[2,4,7,9,7,4,2], 36:[2,4,8,8,8,4,2], 37:[2,4,8,9,8,4,2], 38:[2,4,8,10,8,4,2], 39:[2,5,8,9,8,5,2], 40:[2,5,8,10,8,5,2]},
    2:{4:[2,2],6:[3,3],7:[4,3],8:[2,3,3],10:[3,4,3],11:[4,4,3],13:[3,6,4],14:[2,4,4,3],15:[5,6,5],17:[3,5,6,3],20:[4,5,6,5],24:[4,6,6,5,3],30:[4,7,8,7,4],18:[3,4,4,4,3], 19:[3,4,5,4,3], 21:[3,5,5,5,3], 22:[3,5,6,5,3], 23:[3,6,5,6,3], 25:[3,6,7,6,3], 26:[3,6,8,6,3], 27:[3,7,7,7,3], 28:[3,7,8,7,3], 29:[3,7,9,7,3], 31:[4,7,9,7,4], 32:[4,7,10,7,4], 33:[4,8,9,8,4], 34:[4,8,10,8,4], 35:[3,5,6,7,6,5,3], 36:[3,5,6,8,6,5,3], 37:[3,5,7,7,7,5,3], 38:[3,5,7,8,7,5,3], 39:[3,5,8,8,8,5,3], 40:[3,5,8,9,8,5,3]},
    3:{4:[1,2,1],6:[1,2,3],7:[1,2,3,1],8:[1,2,3,2],10:[1,2,4,3],11:[1,2,3,3,2],13:[2,4,4,3],14:[2,5,4,3],15:[2,4,5,4],17:[2,4,5,4,2],18:[2,4,5,5,2],19:[2,4,5,5,2],20:[2,4,6,4,4],21:[2,4,6,5,4],23:[2,4,6,5,4,2],24:[2,4,6,5,4,3],25:[3,6,8,6,4],27:[2,4,6,6,5,4],29:[4,7,8,6,4],30:[2,5,7,6,6,4],31:[2,4,6,6,5,4,4],33:[3,6,8,6,6,5],22:[2,4,5,5,4,2], 26:[2,4,7,7,4,2], 28:[2,4,7,9,4,2], 32:[2,4,6,8,6,4,2], 34:[2,4,7,8,7,4,2], 35:[2,4,7,9,7,4,2], 36:[2,4,8,8,8,4,2], 37:[2,4,8,9,8,4,2], 38:[2,4,8,10,8,4,2], 39:[2,5,8,9,8,5,2], 40:[2,5,8,10,8,5,2]},
    4:{4:[2,2],6:[2,4],7:[2,2,3],8:[2,3,3],9:[2,3,3,1],10:[2,4,4],11:[2,4,3,2],13:[3,6,4],14:[3,7,4],15:[2,5,6,2],18:[3,5,6,4],17:[2,5,6,4],20:[3,7,6,4],21:[3,6,7,5],23:[3,6,7,5,2],24:[3,7,6,5,3],25:[2,4,6,6,4,3],27:[3,6,8,6,4],29:[3,5,7,5,5,4],30:[3,7,7,7,6],31:[3,7,8,7,6],33:[4,8,8,7,7],19:[3,4,5,4,3], 22:[3,5,6,5,3], 26:[3,6,8,6,3], 28:[3,7,8,7,3], 32:[3,5,8,8,5,3], 34:[3,5,9,9,5,3], 35:[3,5,9,10,5,3], 36:[3,6,9,9,6,3], 37:[3,6,10,9,6,3], 38:[3,6,10,10,6,3], 39:[3,7,9,10,7,3], 40:[3,7,10,10,7,3]},
    5:{4:[1,2,1],6:[3,2,1],7:[1,2,2,2],8:[2,3,2,1],10:[1,4,3,2],11:[2,3,4,2],13:[3,4,4,2],14:[3,4,4,2,1],15:[2,3,4,4,2],17:[3,4,4,4,2],20:[3,5,5,5,2],24:[3,4,5,5,5,2],30:[4,5,6,6,6,3],18:[2,3,4,4,3,2], 19:[2,3,4,5,3,2], 21:[2,3,5,6,3,2], 22:[2,3,5,7,3,2], 23:[2,3,6,7,3,2], 25:[2,4,6,7,4,2], 26:[2,4,6,8,4,2], 27:[2,4,7,8,4,2], 28:[2,4,7,9,4,2], 29:[2,4,8,9,4,2], 31:[2,4,6,7,6,4,2], 32:[2,4,6,8,6,4,2], 33:[2,4,7,7,7,4,2], 34:[2,4,7,8,7,4,2], 35:[2,4,7,9,7,4,2], 36:[2,4,8,8,8,4,2], 37:[2,4,8,9,8,4,2], 38:[2,4,8,10,8,4,2], 39:[2,5,8,9,8,5,2], 40:[2,5,8,10,8,5,2]},
    6:{4:[2,2],6:[4,2],7:[2,2,2,1],8:[3,3,2],10:[4,4,2],11:[1,4,4,2],13:[4,6,3],14:[5,6,3],15:[5,6,4],17:[4,6,4,3],20:[5,6,6,3],24:[6,7,7,4],26:[5,5,8,5,3],30:[6,7,7,7,3],18:[2,3,4,4,3,2], 19:[2,3,4,5,3,2], 21:[2,3,5,6,3,2], 22:[2,3,5,7,3,2], 23:[2,3,6,7,3,2], 25:[2,4,6,7,4,2], 27:[2,4,7,8,4,2], 28:[2,4,7,9,4,2], 29:[2,4,8,9,4,2], 31:[2,5,5,7,5,5,2], 32:[2,5,5,8,5,5,2], 33:[2,5,6,7,6,5,2], 34:[2,5,6,8,6,5,2], 35:[2,5,7,7,7,5,2], 36:[2,5,7,8,7,5,2], 37:[2,5,7,9,7,5,2], 38:[2,5,8,8,8,5,2], 39:[2,5,8,9,8,5,2], 40:[2,5,8,10,8,5,2]},
    7:{4:[2,2],6:[2,2,2],7:[3,4],8:[2,4,2],10:[2,3,3,2],11:[2,3,3,3],12:[2,4,3,3],13:[3,3,4,3],14:[2,4,5,3],15:[2,5,4,4],16:[2,3,4,4,3],17:[2,4,5,4,2],18:[3,4,4,4,3],20:[2,5,5,5,3],23:[3,4,6,4,4,2],24:[2,3,5,6,5,3],26:[3,4,4,5,5,3,2],30:[2,6,7,6,6,3],19:[2,3,4,4,3,3], 21:[2,3,4,5,4,3], 22:[2,3,5,5,4,3], 25:[2,4,5,6,5,3], 27:[2,4,6,6,5,4], 28:[2,4,6,7,5,4], 29:[2,4,7,7,5,4], 31:[2,4,6,7,6,4,2], 32:[2,4,6,8,6,4,2], 33:[2,4,7,7,7,4,2], 34:[2,4,7,8,7,4,2], 35:[2,4,7,9,7,4,2], 36:[2,4,8,8,8,4,2], 37:[2,4,8,9,8,4,2], 38:[2,4,8,10,8,4,2], 39:[2,5,8,9,8,5,2], 40:[2,5,8,10,8,5,2]},
    8:{4:[2,2],6:[3,2,2],7:[3,3,1],8:[3,3,2],10:[3,3,2,2],11:[3,5,3],12:[2,4,4,2],13:[3,5,3,2],14:[3,5,4,2],15:[3,5,5,2],17:[3,3,5,4,2],20:[3,5,6,4,2],21:[3,5,5,5,3],24:[3,5,6,5,3,2],26:[3,5,5,6,4,3],30:[3,6,8,7,4,2],18:[3,4,4,4,3], 19:[3,4,5,4,3], 22:[3,5,6,5,3], 23:[3,5,7,5,3], 25:[3,6,7,6,3], 27:[3,7,7,7,3], 28:[3,7,8,7,3], 29:[3,7,9,7,3], 31:[3,5,7,8,5,3], 32:[3,5,8,8,5,3], 33:[3,5,8,9,5,3], 34:[3,6,8,8,6,3], 35:[3,6,8,9,6,3], 36:[3,6,9,9,6,3], 37:[3,6,9,10,6,3], 38:[3,7,9,9,7,3], 39:[3,7,10,9,7,3], 40:[3,7,10,10,7,3]},
    9:{4:[2,2],5:[2,2,1],6:[2,3,1],7:[3,4],8:[3,2,3],10:[4,3,3],11:[4,3,4],13:[4,4,3,2],14:[4,4,3,3],15:[3,4,5,3],17:[4,5,4,4],19:[3,4,5,4,3],20:[4,5,5,4,2],24:[4,5,6,5,4],30:[4,5,6,6,6,4],18:[2,3,4,4,3,2], 21:[2,3,5,6,3,2], 22:[2,3,5,7,3,2], 23:[2,3,6,7,3,2], 25:[2,4,6,7,4,2], 26:[2,4,6,8,4,2], 27:[2,4,7,8,4,2], 28:[2,4,7,9,4,2], 29:[2,4,8,9,4,2], 31:[2,4,6,7,6,4,2], 32:[2,4,6,8,6,4,2], 33:[2,4,7,7,7,4,2], 34:[2,4,7,8,7,4,2], 35:[2,4,7,9,7,4,2], 36:[2,4,8,8,8,4,2], 37:[2,4,8,9,8,4,2], 38:[2,4,8,10,8,4,2], 39:[2,5,8,9,8,5,2], 40:[2,5,8,10,8,5,2]}
};

function getCasePreview(text, n) {
    var words = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
    var total = words.length;
    var map = _patternData[n];
    if (!map) return text;
    var closestKey = null, minDiff = 9999;
    for (var k in map) {
        var diff = Math.abs(total - parseInt(k));
        if (diff < minDiff) { minDiff = diff; closestKey = k; }
    }
    var pattern = map[closestKey].slice();
    var sum = pattern.reduce(function(a,b){return a+b;},0);
    if (total > sum) {
        var extra = total - sum;
        var len = pattern.length;
        if (len % 2 == 1) pattern[Math.floor(len/2)] += extra;
        else {
            var m1 = Math.floor(len/2)-1, m2 = Math.floor(len/2);
            pattern[m1] += Math.floor(extra/2);
            pattern[m2] += extra - Math.floor(extra/2);
        }
    }
    var lines = [], idx = 0;
    for (var i = 0; i < pattern.length; i++) {
        var lineWords = [];
        for (var j = 0; j < pattern[i]; j++) if (words[idx]) lineWords.push(words[idx++]);
        lines.push(lineWords.join(" "));
    }
    return lines.join("\n");
}
// Danh sách các kiểu cách dòng (đã lọc trùng) cho 1 đoạn text — dùng chung cho lưới Quick Layout
// VÀ cho phím tắt Win+Ctrl khi bật "Link Quick Layout to Typer Box" (luôn lấy items[0] = kiểu ĐẦU TIÊN).
function buildCasePreviewItems(text) {
    var caseNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var seen = {};
    var items = [];
    for (var n = 0; n < caseNumbers.length; n++) {
        var caseNum = caseNumbers[n];
        var formatted = getCasePreview(text, caseNum);
        if (seen[formatted]) continue;
        seen[formatted] = true;
        items.push({ case: caseNum, text: formatted });
    }
    return items;
}

// (Tauri port) Bỏ hẳn khối $.evalFile bootstrap kiểu CEP cũ ở đây — không cần nữa vì
// host.jsx giờ tự nạp qua connect_photoshop()/worker.rs (xem cep-polyfill.js), gọi kiểu
// cũ chỉ tạo ra lỗi "File or folder does not exist" vô ích mỗi lần mở app.

function _isNoQueueTask(expr) { return expr.startsWith('applyCase') || expr.startsWith('splitEven'); }

function _executeNow(expr, btn, onDone) {
    if (_busy) return;
    _busy = true;
    _currentExpr = expr;
    if (btn) btn.blur();
    cs.evalScript(expr, function(result) {
        _busy = false;
        _currentExpr = '';
        if (btn) btn.blur();
        if (onDone) onDone(result);
        _processQueue();
    });
}
function _processQueue() {
    if (_busy || _queue.length === 0) return;
    var task = _queue.shift();
    _executeNow(task.expr, task.btn, task.onDone);
}
function _exec(expr, btn, onDone) {
    if (!_busy) { _executeNow(expr, btn, onDone); return; }
    if (_isNoQueueTask(expr) || _queue.length >= MAX_QUEUE || _currentExpr === expr) return;
    _queue.push({ expr: expr, btn: btn, onDone: onDone });
}
function runBtn(expr, el) {
    _exec(expr, el, function(res) {
        flash(el, res);
        if (isBadResult(res)) {
            alert(expr + " failed: " + res);
        }
    });
}
// (Tauri port) Logo path không còn nhờ Photoshop tự nhớ nữa — đọc từ localStorage
// (đã lưu sẵn lúc "Choose Logo") rồi gửi kèm thẳng vào lệnh mỗi lần dùng.
function runPlaceLogo(el) {
    var path = localStorage.getItem("typoCoreLogoPath") || "";
    if (!path) { alert("Chưa chọn logo — vào Settings > Choose Logo trước."); return; }
    runBtn('placeLogo(' + JSON.stringify(path) + ')', el);
}

var BAD = { "ERROR":1, "NO_LAYER":1, "NO_FX":1, "NO_PATH":1, "NO_FILE":1, "NO_DOC":1, "NO_TEXT":1, "NO_OTHER_DOC":1, "NO_STYLE":1 };
function isBadResult(result) {
    if (!result) return true;
    var s = String(result);
    if (s.indexOf("OK") === 0) return false;
    if (s.includes("ERROR") || s.indexOf("ERR:") === 0) return true;
    for (var key in BAD) { if (s.indexOf(key) === 0) return true; }
    return false;
}
function flash(btn, result) {
    if (!btn) return;
    var bad = isBadResult(result);
    btn.classList.remove("flash-ok", "flash-err");
    btn.classList.add(bad ? "flash-err" : "flash-ok");
    setTimeout(function() { btn.classList.remove("flash-ok", "flash-err"); }, 500);
}

var _copiedFXData = null; // JSON (string) của FX vừa Copy — giữ ngay trên app, ổn định hơn nhờ Photoshop nhớ giúp.
function doCopyFX() {
    var btn = document.getElementById("btnCopyFX");
    _exec('copyFX()', btn, function(res) {
        // copyFX() giờ trả thẳng JSON (bắt đầu bằng "{") khi thành công, hoặc NO_DOC/ERROR khi lỗi.
        var ok = (res + "").indexOf("{") === 0;
        flash(btn, ok ? "OK" : res);
        if (ok) {
            _copiedFXData = res;
            var pasteBtn = document.getElementById("btnPasteFX");
            if (pasteBtn) {
                pasteBtn.disabled = false;
                _originalPasteDisabled = false;
            }
        } else {
            alert("Copy FX failed: " + res);
        }
    });
}
function doPasteFX() {
    var btn = document.getElementById("btnPasteFX");
    if (!_copiedFXData) { alert("Chưa Copy FX nào cả — bấm Copy trước."); return; }
    _exec('pasteFX(' + JSON.stringify(_copiedFXData) + ')', btn, function(res) {
        flash(btn, res);
        if (res === "OK") { var vis = loadVis(); if (!vis.multiplePaste) btn.disabled = true; }
        else { alert("Paste FX failed: " + res); }
    });
}

// ========== DÁN CHỮ (TyperTools bridge) — theo cấu trúc thật của TyperTool ==========
var TEXT_PRESETS_KEY = "typoCoreTextPresets";
var _pasteLines = [];      // [{rawIndex, rawText, text, ignore}]
var _pasteLineIdx = -1;    // rawIndex của dòng hiện tại

function loadTextPresets() {
    try {
        var raw = localStorage.getItem(TEXT_PRESETS_KEY);
        if (raw) {
            var data = JSON.parse(raw);
            if (!data.folders) data.folders = {}; // tương thích dữ liệu cũ chưa có folder
            // Tương thích dữ liệu cũ chưa có sortIndex (kéo-thả đổi thứ tự) — gán theo đúng thứ tự
            // key hiện tại (insertion order) để không bị xáo trộn khi lần đầu mở lại sau cập nhật.
            var needMigrate = false;
            var ids = Object.keys(data.presets);
            for (var i = 0; i < ids.length; i++) {
                if (typeof data.presets[ids[i]].sortIndex !== "number") { needMigrate = true; break; }
            }
            if (needMigrate) {
                ids.forEach(function(id, i) { data.presets[id].sortIndex = i; });
                saveTextPresets(data);
            }
            return data;
        }
    } catch (e) {}
    return { presets: {}, folders: {}, defaultId: null };
}
function saveTextPresets(data) {
    try { localStorage.setItem(TEXT_PRESETS_KEY, JSON.stringify(data)); } catch (e) {}
}
function getCurrentPreset() {
    var data = loadTextPresets();
    if (data.defaultId && data.presets[data.defaultId]) return data.presets[data.defaultId];
    var ids = Object.keys(data.presets);
    return ids.length ? data.presets[ids[0]] : null;
}
function getPresetBaseSize(preset) {
    try { return preset.style.textProps.layerText.textStyleRange[0].textStyle.size; } catch (e) { return null; }
}
function getPresetColorCss(preset) {
    try {
        var c = preset.style.textProps.layerText.textStyleRange[0].textStyle.color;
        if (c && "red" in c) return "rgb(" + Math.round(c.red) + "," + Math.round(c.green) + "," + Math.round(c.blue) + ")";
    } catch (e) {}
    return "#888";
}
// Giữ tên hàm để các chỗ gọi (doPasteToSelection, pasteSpecificLineToLayer, applyStyleToActiveLayer)
// không phải sửa — nay chỉ trả về đúng style gốc của preset, không còn % scale.
function scaledStyle(preset) {
    return preset ? preset.style : null;
}

// ---------- Danh sách Style, nhóm theo Folder (giống Unsorted/My Project của TyperTool) ----------
var UNSORTED_KEY = "__unsorted__"; // folder ảo chứa style chưa gán folder nào
function renderStyleList() {
    var container = document.getElementById("stylesFoldersContainer");
    if (!container) return;
    var scrollBox = document.getElementById("texterScroll");
    var savedScroll = scrollBox ? scrollBox.scrollTop : 0;
    var data = loadTextPresets();
    container.innerHTML = "";

    var groups = {}; // folderKey -> [presetId,...]
    groups[UNSORTED_KEY] = [];
    Object.keys(data.folders).forEach(function(fid) { groups[fid] = []; });
    Object.keys(data.presets).forEach(function(id) {
        var fid = data.presets[id].folder;
        if (fid && groups[fid]) groups[fid].push(id);
        else groups[UNSORTED_KEY].push(id);
    });
    Object.keys(groups).forEach(function(fid) {
        groups[fid].sort(function(a, b) {
            return (data.presets[a].sortIndex || 0) - (data.presets[b].sortIndex || 0);
        });
    });

    if (!Object.keys(data.presets).length) {
        var empty = document.createElement("div");
        empty.className = "tt-style-empty";
        empty.textContent = "No styles yet — select a text layer and click \"+ Add style\"";
        container.appendChild(empty);
        updateCurrentMeta();
        if (scrollBox) scrollBox.scrollTop = savedScroll;
        return;
    }

    // Unsorted trước, rồi tới các folder thật theo thứ tự đã tạo
    renderFolderBlock(container, UNSORTED_KEY, "Unsorted", groups[UNSORTED_KEY], data, false);
    Object.keys(data.folders).forEach(function(fid) {
        renderFolderBlock(container, fid, data.folders[fid].name, groups[fid], data, true);
    });
    updateCurrentMeta();
    if (scrollBox) scrollBox.scrollTop = savedScroll;
}
function renderFolderBlock(container, folderKey, folderName, presetIds, data, isRealFolder) {
    if (isRealFolder === false && !presetIds.length) return; // ẩn "Unsorted" khi rỗng cho gọn
    var item = document.createElement("div");
    item.className = "tt-folder-item";

    var header = document.createElement("div");
    header.className = "tt-folder-header";

    var marker = document.createElement("span");
    marker.className = "tt-folder-marker";
    marker.textContent = "▾";

    var title = document.createElement("span");
    title.className = "tt-folder-title";
    title.textContent = folderName + " (" + presetIds.length + ")";

    header.appendChild(marker);
    header.appendChild(title);

    if (isRealFolder) {
        var actions = document.createElement("span");
        actions.className = "tt-folder-actions";
        var renameBtn = document.createElement("button");
        renameBtn.textContent = "✎";
        renameBtn.title = "Rename folder";
        renameBtn.addEventListener("click", function(e) { e.stopPropagation(); renameFolder(folderKey); });
        var delBtn = document.createElement("button");
        delBtn.textContent = "×";
        delBtn.title = "Delete folder (styles move to Unsorted)";
        delBtn.addEventListener("click", function(e) { e.stopPropagation(); deleteFolder(folderKey); });
        actions.appendChild(renameBtn);
        actions.appendChild(delBtn);
        header.appendChild(actions);
    } else if (presetIds.length) {
        // Unsorted là folder ảo, không xóa/đổi tên được — chỉ có nút xóa nhanh toàn bộ style trong đó
        var uActions = document.createElement("span");
        uActions.className = "tt-folder-actions";
        var clearBtn = document.createElement("button");
        clearBtn.textContent = "×";
        clearBtn.title = "Delete all Unsorted styles";
        clearBtn.addEventListener("click", function(e) { e.stopPropagation(); clearUnsortedStyles(); });
        uActions.appendChild(clearBtn);
        header.appendChild(uActions);
    }
    header.addEventListener("click", function() { item.classList.toggle("collapsed"); });

    var list = document.createElement("div");
    list.className = "tt-styles-list";
    presetIds.forEach(function(id) { list.appendChild(buildStyleItemEl(id, data)); });
    if (!presetIds.length) {
        var emptyMsg = document.createElement("div");
        emptyMsg.className = "tt-style-empty";
        emptyMsg.textContent = "(empty)";
        list.appendChild(emptyMsg);
    }
    // Kéo-thả đổi thứ tự style trong CÙNG 1 folder (giống TypeR) — dùng chung thư viện Sortable.js
    // đã có sẵn cho "Panel Setup". Kéo xong lưu lại sortIndex mới theo đúng thứ tự DOM hiện tại.
    if (presetIds.length > 1 && typeof Sortable !== "undefined") {
        new Sortable(list, {
            animation: 150,
            forceFallback: true, // WebView2 (Tauri) không được đáng tin cậy với HTML5 Drag&Drop gốc -> giả lập bằng chuột
            handle: ".tt-style-name",
            onEnd: function() {
                var d2 = loadTextPresets();
                var rows = list.querySelectorAll(".tt-style-item");
                for (var i = 0; i < rows.length; i++) {
                    var pid = rows[i].getAttribute("data-preset-id");
                    if (d2.presets[pid]) d2.presets[pid].sortIndex = i;
                }
                saveTextPresets(d2);
            }
        });
    }

    item.appendChild(header);
    item.appendChild(list);
    container.appendChild(item);
}
// TyperTool KHÔNG set qua element.style.fontFamily (JS property) — nó nhét font-family vào
// một <span> con bằng chuỗi HTML (dangerouslySetInnerHTML). Cách JS property đôi khi bị trình
// duyệt âm thầm từ chối với vài tên font đặc biệt (dấu ngoặc, số ở đầu...), còn set qua chuỗi
// HTML attribute thì luôn ăn. Làm y hệt cách đó.
function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fontFamilyAttrSafe(fontName) {
    // an toàn cho style='font-family: "X"'
    return String(fontName).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}
function setTextWithFontFamily(el, text, fontName) {
    if (fontName) {
        el.innerHTML = "<span style='font-family: \"" + fontFamilyAttrSafe(fontName) + "\"'>" + escapeHtml(text) + "</span>";
    } else {
        el.textContent = text;
    }
}
function buildStyleItemEl(id, data) {
    var p = data.presets[id];
    var row = document.createElement("div");
    row.className = "tt-style-item" + (data.defaultId === id ? " m-current" : "");
    row.setAttribute("data-preset-id", id);

    var dot = document.createElement("span");
    dot.className = "tt-style-dot";
    dot.style.background = getPresetColorCss(p);

    var name = document.createElement("span");
    name.className = "tt-style-name";
    setTextWithFontFamily(name, p.name, p.previewFont);
    if (p.previewFont) {
        name.title = "Preview font: " + p.previewFont;
    } else {
        name.title = "No preview font yet — open ✎ Edit and Save to generate one.";
    }

    var actions = document.createElement("span");
    actions.className = "tt-style-actions";
    var editBtn = document.createElement("button");
    editBtn.textContent = "✎";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", function(e) { e.stopPropagation(); editStylePreset(id); });
    var applyBtn = document.createElement("button");
    applyBtn.textContent = "←";
    applyBtn.title = "Apply to selected layer";
    applyBtn.addEventListener("click", function(e) { e.stopPropagation(); applyStyleToActiveLayer(id, applyBtn); });
    actions.appendChild(editBtn);
    actions.appendChild(applyBtn);

    row.appendChild(dot);
    row.appendChild(name);
    row.appendChild(actions);
    row.addEventListener("click", function() { selectStylePreset(id); });
    return row;
}
function selectStylePreset(id) {
    var data = loadTextPresets();
    if (!data.presets[id]) return;
    data.defaultId = id;
    saveTextPresets(data);
    renderStyleList();
    // Đổi style hiện hành -> nếu đang Link Quick Layout to Typer Box và popup đang mở, ép render lại
    // preview ngay để lấy đúng font mới (chữ không đổi nên updatePreviewIfNeeded thường sẽ bỏ qua).
    if (isLinkQLTexter() && typeof window.forceRefreshPreview === "function") {
        var overlay = document.getElementById("previewOverlay");
        if (overlay && overlay.style.display === "block") window.forceRefreshPreview();
    }
}
function editStylePreset(id) {
    openStyleEditor(id);
}
function deleteStylePreset(id) {
    if (!confirm("Delete this style?")) return;
    var data = loadTextPresets();
    delete data.presets[id];
    if (data.defaultId === id) {
        var rest = Object.keys(data.presets);
        data.defaultId = rest.length ? rest[0] : null;
    }
    saveTextPresets(data);
    renderStyleList();
}
function doSaveTextPreset() {
    openStyleEditor(null);
}

// ---------- Folder ----------
function doAddFolder() {
    var name = prompt("New folder name:");
    if (!name || !name.trim()) return;
    var data = loadTextPresets();
    var fid = "f" + Date.now();
    data.folders[fid] = { name: name.trim() };
    saveTextPresets(data);
    renderStyleList();
    renderFolderOptionsInEditor(); // nếu panel edit đang mở, cập nhật luôn dropdown
}
function renameFolder(fid) {
    var data = loadTextPresets();
    if (!data.folders[fid]) return;
    var name = prompt("Folder name:", data.folders[fid].name);
    if (!name || !name.trim()) return;
    data.folders[fid].name = name.trim();
    saveTextPresets(data);
    renderStyleList();
}
function deleteFolder(fid) {
    var data = loadTextPresets();
    if (!data.folders[fid]) return;
    if (!confirm('Delete folder "' + data.folders[fid].name + '"? Its styles will move to Unsorted.')) return;
    delete data.folders[fid];
    Object.keys(data.presets).forEach(function(id) {
        if (data.presets[id].folder === fid) delete data.presets[id].folder;
    });
    saveTextPresets(data);
    renderStyleList();
}
function clearUnsortedStyles() {
    var data = loadTextPresets();
    var unsortedIds = Object.keys(data.presets).filter(function(id) { return !data.presets[id].folder; });
    if (!unsortedIds.length) return;
    if (!confirm("Delete all " + unsortedIds.length + " Unsorted style(s)? This cannot be undone.")) return;
    unsortedIds.forEach(function(id) { delete data.presets[id]; });
    if (data.defaultId && !data.presets[data.defaultId]) {
        var rest = Object.keys(data.presets);
        data.defaultId = rest.length ? rest[0] : null;
    }
    saveTextPresets(data);
    renderStyleList();
}

// ========== IMPORT / EXPORT (định dạng file export của TyperTool) ==========
// Định dạng gốc: {ignoreLinePrefixes, defaultStyleId, folders:[{name,id}], styles:[{name,folder,textProps,id,...}]}
// Giờ đã đọc/ghi được folder thật (không còn ghép tên "Folder: Style" như bản trước).
// Các field style-level khác của TyperTool (stroke, prefixes, prefixColor) CHƯA được hỗ trợ, sẽ bị bỏ qua khi import.
function handleImportStylesFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var raw;
        try { raw = JSON.parse(e.target.result); } catch (err) { alert("File is not valid JSON."); return; }
        if (!raw || !Array.isArray(raw.styles)) { alert("File is not a valid TyperTool export."); return; }

        var data = loadTextPresets();
        var hasExisting = Object.keys(data.presets).length > 0 || Object.keys(data.folders).length > 0;
        if (hasExisting) {
            showImportChoiceDialog(function(deleteExisting) {
                proceedImport(raw, deleteExisting ? { presets: {}, folders: {}, defaultId: null } : data);
            });
        } else {
            proceedImport(raw, data);
        }
    };
    reader.readAsText(file);
}
function proceedImport(raw, data) {
    // Map folder id trong file -> folder id thật trong TypoCore.
    // Nếu đã có sẵn 1 folder cùng TÊN thì dùng lại (tránh tạo trùng khi import nhiều lần).
    var folderIdMap = {};
    (raw.folders || []).forEach(function(f, idx) {
        var existingId = Object.keys(data.folders).find(function(fid) { return data.folders[fid].name === f.name; });
        if (existingId) {
            folderIdMap[f.id] = existingId;
        } else {
            var newFid = "f" + Date.now() + "_" + idx;
            data.folders[newFid] = { name: f.name };
            folderIdMap[f.id] = newFid;
        }
    });

    var importedCount = 0;
    var idMap = {}; // id style cũ trong file -> id mới trong TypoCore
    raw.styles.forEach(function(s) {
        if (!s || !s.textProps) return;
        var newId = "p" + Date.now() + "_" + importedCount;
        var preset = { name: s.name || "Untitled", style: { textProps: s.textProps } };
        if (s.folder && folderIdMap[s.folder]) preset.folder = folderIdMap[s.folder];
        if (s.stroke) preset.stroke = s.stroke; // giữ lại stroke thật từ file import (nếu có)
        // Suy ra previewFont y hệt lúc lưu tay ở Edit Style, để style import cũng hiện đúng font.
        try {
            var ts = s.textProps.layerText.textStyleRange[0].textStyle;
            var derived = deriveDisplayFontName(ts.fontName || ts.fontPostScriptName);
            if (derived) preset.previewFont = derived;
        } catch (e) {}
        data.presets[newId] = preset;
        if (s.id) idMap[s.id] = newId;
        importedCount++;
    });
    if (!importedCount) { alert("No styles found in the file to import."); return; }

    // Nếu chưa có style mặc định nào sẵn -> lấy defaultStyleId từ file làm mặc định
    if (!data.defaultId && raw.defaultStyleId && idMap[raw.defaultStyleId]) {
        data.defaultId = idMap[raw.defaultStyleId];
    }
    saveTextPresets(data);

    // ignoreLinePrefixes (VD: "##") — dòng bắt đầu bằng các prefix này sẽ bị bỏ qua khi tách dòng
    if (Array.isArray(raw.ignoreLinePrefixes) && raw.ignoreLinePrefixes.length) {
        try { localStorage.setItem("typoCoreIgnoreLinePrefixes", JSON.stringify(raw.ignoreLinePrefixes)); } catch (err) {}
    }

    renderStyleList();
    refreshPasteLines(); // áp lại ignoreLinePrefixes mới (nếu có) cho nội dung đang gõ
    alert("Imported " + importedCount + " style" + (importedCount > 1 ? "s" : "") + ".");
}
// Hộp thoại tùy chỉnh 2 nút rõ nghĩa (Delete / Keep) thay cho confirm() OK/Cancel dễ nhầm
function showImportChoiceDialog(callback) {
    var overlay = document.getElementById("importChoiceOverlay");
    if (!overlay) { callback(false); return; } // fallback an toàn nếu thiếu markup: mặc định Keep
    overlay.style.display = "flex";
    var deleteBtn = document.getElementById("btnImportChoiceDelete");
    var keepBtn = document.getElementById("btnImportChoiceKeep");
    function cleanup() {
        overlay.style.display = "none";
        deleteBtn.removeEventListener("click", onDelete);
        keepBtn.removeEventListener("click", onKeep);
    }
    function onDelete() { cleanup(); callback(true); }
    function onKeep() { cleanup(); callback(false); }
    deleteBtn.addEventListener("click", onDelete);
    keepBtn.addEventListener("click", onKeep);
}
function doExportStyles() {
    var data = loadTextPresets();
    var presetIds = Object.keys(data.presets);
    if (!presetIds.length) { alert("No styles to export yet."); return; }
    var folders = Object.keys(data.folders).map(function(fid) {
        return { name: data.folders[fid].name, id: fid, chosen: false, selected: false };
    });
    var styles = presetIds.map(function(id) {
        var p = data.presets[id];
        return {
            name: p.name,
            folder: p.folder || undefined,
            textProps: p.style.textProps,
            // Các field dưới đây TypoCore không có khái niệm tương ứng, nhưng TyperTool THẬT
            // luôn ghi ra đủ các field này cho mỗi style — thiếu là file export không đọc lại
            // được trong TyperTool (code của nó không phòng trường hợp field bị undefined).
            // Điền giá trị mặc định/vô hại (tắt/rỗng) để giữ đúng hình dạng dữ liệu gốc.
            prefixes: [],
            prefixColor: "#FFFFFF",
            stroke: p.stroke || { enabled: false, size: 0, opacity: 100, position: "outer", color: { r: 255, g: 255, b: 255 } },
            id: id,
            edited: Date.now(),
            chosen: false,
            selected: false
        };
    });
    var out = {
        ignoreLinePrefixes: getIgnoreLinePrefixes(),
        defaultStyleId: data.defaultId || undefined,
        folders: folders,
        styles: styles,
        version: "1.4.9", // khớp version thật của TyperTool để tránh bị từ chối/parse sai khi import lại
        exported: new Date().toISOString()
    };
    var jsonText = JSON.stringify(out, null, 2);
    _exec('saveTextFile(' + JSON.stringify(jsonText) + ', ' + JSON.stringify("export-typocore.json") + ')', null, function(res) {
        if (res === "CANCELLED") return; // người dùng tự bấm Cancel trên hộp thoại, không phải lỗi
        if (res === "OK") { alert("Export saved successfully."); return; }
        alert("Export failed: " + res);
    });
}

// ========== STYLE EDIT PANEL (Font / Size / Leading / Color / Alignment) ==========
// Bám theo form "Edit Style" thật của TyperTool. Vì dựng 1 textProps hợp lệ từ đầu
// (textShape, textStyleRange, paragraphStyleRange...) rất dễ sai định dạng descriptor
// của Photoshop, nên mọi style BẮT BUỘC phải xuất phát từ 1 style "lấy từ layer đang chọn"
// (TT_getActiveStyle) — sau đó các field Font/Size/Leading/Color/Alignment chỉ GHI ĐÈ
// lên đúng những field đó trong style đã capture, phần còn lại (leading, kerning...) giữ nguyên.
var _editingStyleId = null;   // null = đang tạo style mới
var _editingBaseStyle = null; // style JSON đã capture (hoặc đang sửa)
var _editingAlign = "left";
var _editingToggles = { bold: false, italic: false, underline: false, strikethrough: false, fontCaps: "normal", hyphenate: false, hangingRoman: false, baseline: "normal" };
var _editingStroke = { enabled: false, size: 0, opacity: 100, position: "outer", color: { r: 255, g: 255, b: 255 } };
var _editingFolder = null;    // id folder đang chọn cho style này (null = Unsorted)
var _userFontsCache = null;

// Style mặc định để "New Style" cũng hiện đủ toàn bộ option ngay, không bắt buộc phải bấm
// "Copy layer style" trước mới chỉnh được (giống hành vi thật của TypeR).
function getDefaultBaseStyle() {
    return {
        textProps: {
            layerText: {
                textGridding: "none",
                orientation: "horizontal",
                antiAlias: "antiAliasSmooth",
                textStyleRange: [{ from: 0, to: 100, textStyle: {
                    fontPostScriptName: "Tahoma", fontName: "Tahoma", fontStyleName: "Regular",
                    size: 14, horizontalScale: 100, verticalScale: 100, autoLeading: true,
                    tracking: 0, baselineShift: 0, autoKern: "metricsKern", fontCaps: "normal",
                    baseline: "normal", underline: "underlineOff", strikethrough: "strikethroughOff",
                    syntheticBold: false, syntheticItalic: false,
                    color: { red: 255, green: 255, blue: 255 }
                }}],
                paragraphStyleRange: [{ from: 0, to: 100, paragraphStyle: { alignment: "left", autoLeadingPercentage: 1.2, hyphenate: false, hangingRoman: false } }]
            },
            typeUnit: "pt"
        }
    };
}
function openStyleEditor(id) {
    _editingStyleId = id;
    _editingBaseStyle = null;
    _editingAlign = "left";
    _editingToggles = { bold: false, italic: false, underline: false, strikethrough: false, fontCaps: "normal", hyphenate: false, hangingRoman: false, baseline: "normal" };
    _editingStroke = { enabled: false, size: 0, opacity: 100, position: "outer", color: { r: 255, g: 255, b: 255 } };
    var data = loadTextPresets();
    var existing = id ? data.presets[id] : null;
    _editingFolder = existing ? (existing.folder || null) : null;
    if (existing && existing.stroke) _editingStroke = JSON.parse(JSON.stringify(existing.stroke));

    document.getElementById("styleEditTitle").textContent = existing ? "Edit Style" : "New Style";
    document.getElementById("styleEditName").value = existing ? existing.name : "";
    document.getElementById("btnStyleEditDelete").style.display = existing ? "block" : "none";
    renderFolderOptionsInEditor();

    _editingBaseStyle = existing ? JSON.parse(JSON.stringify(existing.style)) : getDefaultBaseStyle();
    populateStyleEditFields(); // luôn hiện đủ option ngay — "Copy layer style" chỉ là điền nhanh, không bắt buộc
    loadUserFontsIfNeeded();
    document.getElementById("styleEditOverlay").style.display = "flex";
}
// Đổ danh sách folder vào dropdown chọn folder trong panel edit, chọn đúng folder đang gán cho style
function renderFolderOptionsInEditor() {
    var sel = document.getElementById("styleEditFolder");
    if (!sel) return;
    var data = loadTextPresets();
    sel.innerHTML = "";
    var noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "(No folder)";
    sel.appendChild(noneOpt);
    Object.keys(data.folders).forEach(function(fid) {
        var opt = document.createElement("option");
        opt.value = fid;
        opt.textContent = data.folders[fid].name;
        sel.appendChild(opt);
    });
    sel.value = _editingFolder || "";
}
// Từ tên font Photoshop hiển thị (VD "MTO Augie Regular") suy ra tên dùng để PREVIEW bằng CSS
// (VD "MTO Augie") — chỉ bỏ đúng đuôi "Regular"/"Normal" thừa ở cuối, còn lại giữ nguyên y hệt
// (VD "000 AnimeAce3 [TeddyBear]" không có đuôi này thì không đổi gì cả).
function deriveDisplayFontName(rawName) {
    if (!rawName) return null;
    var suffixWords = ["Regular", "Normal"];
    for (var i = 0; i < suffixWords.length; i++) {
        var re = new RegExp("[\\s\\-]" + suffixWords[i] + "$", "i");
        if (re.test(rawName)) return rawName.replace(re, "").trim();
    }
    return rawName;
}
function closeStyleEditor() {
    document.getElementById("styleEditOverlay").style.display = "none";
}
function loadUserFontsIfNeeded() {
    var sel = document.getElementById("styleEditFont");
    if (_userFontsCache) { fillFontSelect(sel); return; }
    cs.evalScript('TT_getUserFonts()', function(res) {
        try {
            var data = JSON.parse(res);
            _userFontsCache = (data && data.fonts) ? data.fonts : [];
        } catch (e) { _userFontsCache = []; }
        fillFontSelect(sel);
    });
}
// Dùng chung được ở bất kỳ đâu cần liệt kê font thật (không gắn riêng với Style Edit như
// fillFontSelect() bên dưới) — Quick Layout Font List tái dùng lại đúng cache _userFontsCache này,
// không gọi lại TT_getUserFonts() thêm lần nào, tránh trùng lặp/xung đột dữ liệu.
// Mỗi slot lưu {postScriptName, previewName} — postScriptName để chọn đúng option trong dropdown,
// previewName (tên hiển thị, qua deriveDisplayFontName giống hệt Style Edit) để áp vào CSS
// font-family cho preview, vì postScriptName không phải lúc nào cũng trùng tên CSS nhận diện được.
function fontSlotPostScriptName(entry) {
    if (!entry) return "";
    return (typeof entry === "object") ? (entry.postScriptName || "") : entry;
}
function fontSlotPreviewName(entry) {
    if (!entry) return "";
    return (typeof entry === "object") ? (entry.previewName || entry.postScriptName || "") : entry;
}
function ensureUserFontsLoaded(callback) {
    if (_userFontsCache) { callback(); return; }
    cs.evalScript('TT_getUserFonts()', function(res) {
        try {
            var data = JSON.parse(res);
            _userFontsCache = (data && data.fonts) ? data.fonts : [];
        } catch (e) { _userFontsCache = []; }
        callback();
    });
}
function fillFontSelectGeneric(sel, currentValue) {
    if (!sel) return;
    sel.innerHTML = "";
    var blankOpt = document.createElement("option");
    blankOpt.value = "";
    blankOpt.textContent = "(choose font)";
    sel.appendChild(blankOpt);
    (_userFontsCache || []).forEach(function(f) {
        var opt = document.createElement("option");
        opt.value = f.postScriptName || f.name;
        opt.textContent = f.name;
        sel.appendChild(opt);
    });
    sel.value = currentValue || "";
}
function fillFontSelect(sel) {
    if (!sel || sel.dataset.filled === "1") { restoreFontSelectValue(); return; }
    sel.innerHTML = "";
    (_userFontsCache || []).forEach(function(f) {
        var opt = document.createElement("option");
        opt.value = f.postScriptName || f.name;
        opt.textContent = f.name;
        sel.appendChild(opt);
    });
    sel.dataset.filled = "1";
    restoreFontSelectValue();
}
function restoreFontSelectValue() {
    if (!_editingBaseStyle) return;
    try {
        var ts = _editingBaseStyle.textProps.layerText.textStyleRange[0].textStyle;
        var sel = document.getElementById("styleEditFont");
        var want = ts.fontPostScriptName || ts.fontName;
        if (want) sel.value = want;
    } catch (e) {}
}
function populateStyleEditFields() {
    try {
        var ts = _editingBaseStyle.textProps.layerText.textStyleRange[0].textStyle;
        document.getElementById("styleEditSize").value = ts.size !== undefined ? Math.round(ts.size * 100) / 100 : "";
        // Leading rỗng = auto (Photoshop tự tính ~120% size). Có số = leading cố định (pt), tắt auto.
        document.getElementById("styleEditLeading").value = (!ts.autoLeading && ts.leading) ? ts.leading : "";
        var c = ts.color;
        document.getElementById("styleEditColor").value = c ? rgbToHex(c.red, c.green, c.blue) : "#ffffff";
        restoreFontSelectValue();
        _editingToggles = {
            bold: !!ts.syntheticBold,
            italic: !!ts.syntheticItalic,
            underline: !!(ts.underline && ts.underline !== "underlineOff"),
            strikethrough: !!(ts.strikethrough && ts.strikethrough !== "strikethroughOff"),
            fontCaps: ts.fontCaps || "normal",
            baseline: ts.baseline || "normal",
            hyphenate: false, hangingRoman: false // đọc riêng từ paragraphStyle ngay dưới
        };
        document.getElementById("styleEditTracking").value = ts.tracking || 0;
        document.getElementById("styleEditBaseline").value = ts.baselineShift || 0;
        document.getElementById("styleEditHScale").value = ts.horizontalScale !== undefined ? Math.round(ts.horizontalScale) : 100;
        document.getElementById("styleEditVScale").value = ts.verticalScale !== undefined ? Math.round(ts.verticalScale) : 100;
        document.getElementById("styleEditKerning").value = ts.autoKern || "metricsKern";
    } catch (e) {}
    try {
        document.getElementById("styleEditAntiAlias").value = _editingBaseStyle.textProps.layerText.antiAlias || "antiAliasSmooth";
    } catch (e) {}
    setToggleButtonsUI();
    populateStrokeFieldsUI();
    var autoPct = 120;
    try {
        var pAuto = _editingBaseStyle.textProps.layerText.paragraphStyleRange[0].paragraphStyle.autoLeadingPercentage;
        if (pAuto) autoPct = Math.round(pAuto * 100);
    } catch (e) {}
    document.getElementById("styleEditAutoLeadingPct").value = autoPct;
    updateAutoLeadingRowVisibility();
    try {
        var ps = _editingBaseStyle.textProps.layerText.paragraphStyleRange[0].paragraphStyle;
        _editingAlign = ps.alignment || "left";
        _editingToggles.hyphenate = !!ps.hyphenate;
        _editingToggles.hangingRoman = !!ps.hangingRoman;
    } catch (e) { _editingAlign = "left"; }
    setAlignButtonsUI(_editingAlign);
    document.getElementById("styleEditFields").style.display = "block";
}
// Đồng bộ giao diện 6 nút toggle (Bold/Italic/Underline/Strike/AllCaps/SmallCaps) theo _editingToggles
function setToggleButtonsUI() {
    var map = {
        styleToggleBold: _editingToggles.bold,
        styleToggleItalic: _editingToggles.italic,
        styleToggleUnderline: _editingToggles.underline,
        styleToggleStrike: _editingToggles.strikethrough,
        styleToggleAllCaps: _editingToggles.fontCaps === "allCaps",
        styleToggleSmallCaps: _editingToggles.fontCaps === "smallCaps",
        styleToggleSuper: _editingToggles.baseline === "superScript",
        styleToggleSub: _editingToggles.baseline === "subScript"
    };
    Object.keys(map).forEach(function(id) {
        var btn = document.getElementById(id);
        if (btn) btn.classList.toggle("m-active", !!map[id]);
    });
}
function populateStrokeFieldsUI() {
    document.getElementById("styleEditStrokeEnabled").checked = !!_editingStroke.enabled;
    document.getElementById("styleEditStrokeSize").value = _editingStroke.size;
    // Opacity/Position không còn cho chỉnh trên UI nữa -> cố định 100% / outer
    _editingStroke.opacity = 100;
    _editingStroke.position = "outer";
    var col = _editingStroke.color || { r: 255, g: 255, b: 255 };
    document.getElementById("styleEditStrokeColor").value = rgbToHex(col.r, col.g, col.b);
}
// Chỉ hiện ô "Auto leading %" khi Leading đang để trống (đang ở chế độ auto) — giống TyperTool
function updateAutoLeadingRowVisibility() {
    var leadingVal = document.getElementById("styleEditLeading").value;
    var row = document.getElementById("styleEditAutoLeadingRow");
    if (row) row.style.display = leadingVal ? "none" : "flex";
}
function setAlignButtonsUI(align) {
    ["Left", "Center", "Right"].forEach(function(a) {
        var btn = document.getElementById("styleEditAlign" + a);
        if (btn) btn.classList.toggle("active", a.toLowerCase() === align);
    });
    var hyBtn = document.getElementById("styleToggleHyphenate");
    if (hyBtn) hyBtn.classList.toggle("active", !!_editingToggles.hyphenate);
    var hrBtn = document.getElementById("styleToggleHangingRoman");
    if (hrBtn) hrBtn.classList.toggle("active", !!_editingToggles.hangingRoman);
}
function doStyleEditCopyFromLayer() {
    var btn = document.getElementById("btnStyleEditCopyFromLayer");
    cs.evalScript('TT_getActiveStyle()', function(res) {
        if (!res) { alert("Could not read style — select a text layer in Photoshop and try again."); return; }
        try { _editingBaseStyle = JSON.parse(res); } catch (e) { alert("Invalid style data returned."); return; }
        populateStyleEditFields();
    });
}
function rgbToHex(r, g, b) {
    function h(n) { n = Math.max(0, Math.min(255, Math.round(n || 0))); var s = n.toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h(r) + h(g) + h(b);
}
function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    if (!m) return { red: 255, green: 255, blue: 255 };
    return { red: parseInt(m[1], 16), green: parseInt(m[2], 16), blue: parseInt(m[3], 16) };
}
// Stroke dùng field {r,g,b} (khác {red,green,blue} của màu chữ) — theo đúng format gốc của TypeR
function hexToRgb2(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    if (!m) return { r: 255, g: 255, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
// Ghi các field đang chỉnh vào bản style đã capture (chỉ ghi đè field liên quan, giữ nguyên phần khác)
function applyStyleEditFieldsToBase() {
    if (!_editingBaseStyle) return;
    var leadingStr = document.getElementById("styleEditLeading").value;
    var leadingVal = parseFloat(leadingStr);
    var hasLeading = leadingStr !== "" && !isNaN(leadingVal) && leadingVal > 0;
    var autoPctVal = parseFloat(document.getElementById("styleEditAutoLeadingPct").value);
    try {
        var ranges = _editingBaseStyle.textProps.layerText.textStyleRange;
        var fontSel = document.getElementById("styleEditFont");
        var sizeVal = parseFloat(document.getElementById("styleEditSize").value);
        var colorVal = hexToRgb(document.getElementById("styleEditColor").value);
        var fontOpt = fontSel && fontSel.selectedOptions && fontSel.selectedOptions[0];
        for (var i = 0; i < ranges.length; i++) {
            var ts = ranges[i].textStyle;
            if (!ts) continue;
            if (!isNaN(sizeVal) && sizeVal > 0) ts.size = sizeVal;
            if (hasLeading) {
                ts.autoLeading = false;
                ts.leading = leadingVal;
            } else {
                ts.autoLeading = true;
                delete ts.leading;
            }
            ts.color = colorVal;
            if (fontOpt) {
                ts.fontPostScriptName = fontOpt.value;
                ts.fontName = fontOpt.textContent;
            }
            ts.syntheticBold = !!_editingToggles.bold;
            ts.syntheticItalic = !!_editingToggles.italic;
            ts.underline = _editingToggles.underline ? "underlineOnLeftInVertical" : "underlineOff";
            ts.strikethrough = _editingToggles.strikethrough ? "xHeightStrikethroughOn" : "strikethroughOff";
            ts.fontCaps = _editingToggles.fontCaps || "normal";
            ts.baseline = _editingToggles.baseline || "normal";
            var trackingVal = parseFloat(document.getElementById("styleEditTracking").value);
            ts.tracking = isNaN(trackingVal) ? 0 : trackingVal;
            var baselineVal = parseFloat(document.getElementById("styleEditBaseline").value);
            ts.baselineShift = isNaN(baselineVal) ? 0 : baselineVal;
            var hScaleVal = parseFloat(document.getElementById("styleEditHScale").value);
            ts.horizontalScale = (!isNaN(hScaleVal) && hScaleVal > 0) ? hScaleVal : 100;
            var vScaleVal = parseFloat(document.getElementById("styleEditVScale").value);
            ts.verticalScale = (!isNaN(vScaleVal) && vScaleVal > 0) ? vScaleVal : 100;
            ts.autoKern = document.getElementById("styleEditKerning").value || "metricsKern";
        }
    } catch (e) {}
    try {
        _editingBaseStyle.textProps.layerText.antiAlias = document.getElementById("styleEditAntiAlias").value || "antiAliasSmooth";
    } catch (e) {}
    try {
        var pranges = _editingBaseStyle.textProps.layerText.paragraphStyleRange;
        for (var j = 0; j < pranges.length; j++) {
            if (!pranges[j].paragraphStyle) continue;
            pranges[j].paragraphStyle.alignment = _editingAlign;
            pranges[j].paragraphStyle.hyphenate = !!_editingToggles.hyphenate;
            pranges[j].paragraphStyle.hangingRoman = !!_editingToggles.hangingRoman;
            // Auto leading % chỉ có ý nghĩa khi đang auto (không nhập Leading cố định)
            if (!hasLeading && !isNaN(autoPctVal) && autoPctVal > 0) {
                pranges[j].paragraphStyle.autoLeadingPercentage = autoPctVal / 100;
            }
        }
    } catch (e) {}
}
function doStyleEditSave() {
    var name = document.getElementById("styleEditName").value.trim();
    if (!name) { alert("Enter a name for the style."); return; }
    if (!_editingBaseStyle) { alert("No style data yet — click \"Copy style from active layer\" first."); return; }
    applyStyleEditFieldsToBase();
    var data = loadTextPresets();
    var id = _editingStyleId || ("p" + Date.now());
    var preset = { name: name, style: _editingBaseStyle, stroke: _editingStroke };
    if (data.presets[id] && typeof data.presets[id].sortIndex === "number") {
        preset.sortIndex = data.presets[id].sortIndex; // đang sửa style cũ -> giữ nguyên vị trí
    } else {
        var maxIdx = -1;
        Object.keys(data.presets).forEach(function(pid) {
            var si = data.presets[pid].sortIndex || 0;
            if (si > maxIdx) maxIdx = si;
        });
        preset.sortIndex = maxIdx + 1; // style mới -> xếp cuối danh sách
    }
    if (_editingFolder) preset.folder = _editingFolder;
    // Tự suy ra tên font để PREVIEW từ đúng font đang chọn trong dropdown Font (đã copy từ layer
    // hoặc người dùng đổi tay), áp cùng cách xử lý đuôi "Regular" như Quick Layout đang làm.
    var fontSel = document.getElementById("styleEditFont");
    var fontOpt = fontSel && fontSel.selectedOptions && fontSel.selectedOptions[0];
    if (fontOpt) {
        var derived = deriveDisplayFontName(fontOpt.textContent);
        if (derived) preset.previewFont = derived;
    }
    data.presets[id] = preset;
    data.defaultId = id; // style vừa lưu -> chọn làm current luôn
    saveTextPresets(data);
    closeStyleEditor();
    renderStyleList();
    // Vừa sửa/lưu style hiện hành -> nếu đang Link Quick Layout to Typer Box và popup đang mở, ép
    // render lại preview ngay để lấy đúng font mới (chữ không đổi nên updatePreviewIfNeeded thường
    // sẽ bỏ qua).
    if (isLinkQLTexter() && typeof window.forceRefreshPreview === "function") {
        var overlay = document.getElementById("previewOverlay");
        if (overlay && overlay.style.display === "block") window.forceRefreshPreview();
    }
}
on("styleEditFolder", "change", function(e) { _editingFolder = e.target.value || null; });
on("btnStyleEditCopyFromLayer", "click", doStyleEditCopyFromLayer);
on("styleEditLeading", "input", updateAutoLeadingRowVisibility);
on("btnStyleEditSave", "click", doStyleEditSave);
on("btnStyleEditDelete", "click", function() {
    if (!_editingStyleId) return;
    var id = _editingStyleId;
    deleteStylePreset(id); // hàm này đã có confirm() riêng
    // Nếu người dùng bấm OK ở confirm thì preset đã bị xoá khỏi storage -> đóng panel
    var data = loadTextPresets();
    if (!data.presets[id]) closeStyleEditor();
});
on("btnStyleEditClose", "click", closeStyleEditor);
on("styleEditAlignLeft", "click", function() { _editingAlign = "left"; setAlignButtonsUI(_editingAlign); });
on("styleEditAlignCenter", "click", function() { _editingAlign = "center"; setAlignButtonsUI(_editingAlign); });
on("styleEditAlignRight", "click", function() { _editingAlign = "right"; setAlignButtonsUI(_editingAlign); });
on("styleToggleBold", "click", function() { _editingToggles.bold = !_editingToggles.bold; setToggleButtonsUI(); });
on("styleToggleItalic", "click", function() { _editingToggles.italic = !_editingToggles.italic; setToggleButtonsUI(); });
on("styleToggleUnderline", "click", function() { _editingToggles.underline = !_editingToggles.underline; setToggleButtonsUI(); });
on("styleToggleStrike", "click", function() { _editingToggles.strikethrough = !_editingToggles.strikethrough; setToggleButtonsUI(); });
on("styleToggleAllCaps", "click", function() { _editingToggles.fontCaps = (_editingToggles.fontCaps === "allCaps") ? "normal" : "allCaps"; setToggleButtonsUI(); });
on("styleToggleSmallCaps", "click", function() { _editingToggles.fontCaps = (_editingToggles.fontCaps === "smallCaps") ? "normal" : "smallCaps"; setToggleButtonsUI(); });
on("styleToggleSuper", "click", function() { _editingToggles.baseline = (_editingToggles.baseline === "superScript") ? "normal" : "superScript"; setToggleButtonsUI(); });
on("styleToggleSub", "click", function() { _editingToggles.baseline = (_editingToggles.baseline === "subScript") ? "normal" : "subScript"; setToggleButtonsUI(); });
on("styleToggleHyphenate", "click", function() { _editingToggles.hyphenate = !_editingToggles.hyphenate; setAlignButtonsUI(_editingAlign); });
on("styleToggleHangingRoman", "click", function() { _editingToggles.hangingRoman = !_editingToggles.hangingRoman; setAlignButtonsUI(_editingAlign); });
on("styleEditStrokeEnabled", "change", function(e) { _editingStroke.enabled = e.target.checked; });
on("styleEditStrokeSize", "input", function(e) { _editingStroke.size = parseFloat(e.target.value) || 0; });
on("styleEditStrokeColor", "input", function(e) { _editingStroke.color = hexToRgb2(e.target.value); });

// ---------- Tách dòng & duyệt dòng (live, không cần bấm nút tách) ----------
function getIgnoreLinePrefixes() {
    try {
        var raw = localStorage.getItem("typoCoreIgnoreLinePrefixes");
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}
function splitPasteLines(raw) {
    var rawLines = raw.split(/\r\n|\r|\n/);
    var ignorePrefixes = getIgnoreLinePrefixes();
    return rawLines.map(function(line, idx) {
        var trimmed = line.replace(/\s+/g, " ").trim();
        var hasIgnorePrefix = ignorePrefixes.some(function(p) { return p && line.indexOf(p) === 0; });
        return { rawIndex: idx, rawText: line, text: trimmed, ignore: !trimmed || hasIgnorePrefix };
    });
}
function visiblePasteLines() {
    return _pasteLines.filter(function(l) { return !l.ignore; });
}
function currentLineText() {
    if (_pasteLineIdx < 0) return null;
    for (var i = 0; i < _pasteLines.length; i++) {
        if (_pasteLines[i].rawIndex === _pasteLineIdx) return _pasteLines[i].text;
    }
    return null;
}
// TyperTool (bản gốc) không tra cứu gì thêm — nó dùng thẳng fontName làm font-family CSS
// (xem hàm H() trong index.js gốc: fontFamily = e.fontName). Làm y hệt cho đúng, bỏ phần
// tra ngược qua app.fonts đã thêm nhầm trước đó.
function getPresetFontFamily(preset) {
    try {
        var ts = preset.style.textProps.layerText.textStyleRange[0].textStyle;
        var candidates = [];
        function add(n) { if (n && candidates.indexOf(n) === -1) candidates.push(n); }
        // Ưu tiên cao nhất: tra ngược qua danh sách font thật của máy (app.fonts, khớp theo
        // postScriptName) — đây là nguồn ĐÁNG TIN nhất vì lấy trực tiếp từ hệ thống, không
        // phải tên nội bộ Photoshop lưu trong style (có thể không khớp CSS font-family).
        if (_userFontsCache && ts.fontPostScriptName) {
            for (var i = 0; i < _userFontsCache.length; i++) {
                if (_userFontsCache[i].postScriptName === ts.fontPostScriptName) {
                    add(_userFontsCache[i].family);
                    add(_userFontsCache[i].name);
                    break;
                }
            }
        }
        // Rồi mới tới tên GỐC Photoshop lưu, giữ nguyên y hệt.
        add(ts.fontName);
        add(ts.fontPostScriptName);
        // Dự phòng cuối: nếu tên có đuôi style thừa kiểu "MTO Augie Regular" thì thử bỏ đuôi.
        var suffixWords = ["Regular", "Normal"];
        [ts.fontName, ts.fontPostScriptName].forEach(function(n) {
            if (!n) return;
            suffixWords.forEach(function(w) {
                var re = new RegExp("[\\s\\-]" + w + "$", "i");
                if (re.test(n)) add(n.replace(re, "").trim());
            });
        });
        return candidates.length ? candidates : null;
    } catch (e) { return null; }
}
function fontFamilyCss(candidates) {
    if (!candidates || !candidates.length) return "";
    return candidates.map(function(n) { return '"' + n + '"'; }).join(", ") + ", inherit";
}
function updateCurrentMeta() {
    var numEl = document.getElementById("pasteCurrentLineNum");
    var styleEl = document.getElementById("pasteCurrentStyleName");
    var dotEl = document.getElementById("pasteCurrentColorDot");
    var sizeEl = document.getElementById("pasteTextPresetSize");
    var curEl = document.getElementById("pasteLineCurrent");
    if (!numEl) return;
    var preset = getCurrentPreset();
    var visible = visiblePasteLines();
    var pos = -1;
    for (var i = 0; i < visible.length; i++) if (visible[i].rawIndex === _pasteLineIdx) { pos = i; break; }
    numEl.textContent = "line: " + (pos >= 0 ? (pos + 1) : 0) + "/" + visible.length;
    if (styleEl) styleEl.textContent = preset ? preset.name : "--";
    if (dotEl) dotEl.style.background = preset ? getPresetColorCss(preset) : "#888";
    if (sizeEl) {
        var size = preset ? getPresetBaseSize(preset) : null;
        sizeEl.textContent = (size !== null && size !== undefined) ? Math.round(size) : "--";
    }
    if (curEl) {
        setTextWithFontFamily(curEl, currentLineText() || "", preset ? preset.previewFont : null);
    }
}
function measureLineHeightPx(text) {
    var m = document.getElementById("pasteTextMeasure");
    if (!m) return 18;
    m.textContent = (text && text.length) ? text : " ";
    var h = m.scrollHeight || 18;
    return Math.max(18, h);
}
// Tự cuộn khung dán (.tt-text-block) sao cho dòng đang chọn (m-current) nằm GIỮA khung nhìn thấy,
// dựa theo chiều cao thật từng dòng đã tính trong renderLineList (row.style.height).
function scrollToCurrentLine() {
    var container = document.getElementById("pasteLineList");
    var scrollBox = document.getElementById("pasteTextBlock");
    if (!container || !scrollBox) return;
    var rows = container.children;
    var offset = 0, targetRow = null, targetHeight = 0;
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].classList.contains("m-current")) {
            targetRow = rows[i];
            targetHeight = rows[i].offsetHeight;
            break;
        }
        offset += rows[i].offsetHeight;
    }
    if (!targetRow) return;
    var target = offset + targetHeight / 2 - scrollBox.clientHeight / 2;
    var maxScroll = Math.max(0, scrollBox.scrollHeight - scrollBox.clientHeight);
    if (target < 0) target = 0;
    if (target > maxScroll) target = maxScroll;
    scrollBox.scrollTop = target;
}
function renderLineList() {
    var container = document.getElementById("pasteLineList");
    var input = document.getElementById("pasteTextInput");
    var scrollBox = document.getElementById("pasteTextBlock");
    var savedScroll = scrollBox ? scrollBox.scrollTop : 0;
    if (!container) return;
    container.innerHTML = "";
    var totalHeight = 0;
    var dispIdx = 0; // đếm số dòng hiển thị, CHỈ tăng khi dòng có ký tự — dòng trống bị bỏ qua, không đếm
    _pasteLines.forEach(function(line) {
        var h = measureLineHeightPx(line.rawText);
        totalHeight += h;

        var row = document.createElement("div");
        row.className = "tt-text-line-row" + (line.rawIndex === _pasteLineIdx ? " m-current" : "");
        row.style.height = h + "px";

        var num = document.createElement("span");
        num.className = "tt-text-line-num";
        if (!line.ignore) {
            dispIdx++;
            num.textContent = dispIdx;
            num.title = "Select this line";
            num.addEventListener("click", function(e) {
                e.stopPropagation();
                _pasteLineIdx = line.rawIndex; // chỉ đổi dòng đang chọn, KHÔNG đưa con trỏ vào ô soạn thảo
                renderLinePreview();
            });
            row.addEventListener("mouseenter", function() { row.classList.add("m-hover"); });
            row.addEventListener("mouseleave", function() { row.classList.remove("m-hover"); });
        }
        row.appendChild(num);

        var fill = document.createElement("span");
        fill.className = "tt-text-line-fill";
        row.appendChild(fill);

        if (!line.ignore) {
            var pasteBtn = document.createElement("button");
            pasteBtn.className = "tt-text-line-insert";
            pasteBtn.textContent = "⏎";
            pasteBtn.title = "Paste this line's text into selected layer (keeps that layer's existing font/style)";
            pasteBtn.addEventListener("click", function(e) { e.stopPropagation(); pasteSpecificLineToLayer(line.rawIndex); });
            row.appendChild(pasteBtn);
        }
        container.appendChild(row);
    });
    // Textarea không còn co theo "rows" (vì 1 dòng logic có thể chiếm nhiều dòng hiển thị
    // khi bị wrap theo khung) — set chiều cao thật bằng px cho khớp lớp nền bên dưới.
    if (input) input.style.height = Math.max(scrollBox ? scrollBox.clientHeight : 36, totalHeight) + "px";
    if (scrollBox) scrollBox.scrollTop = savedScroll;
}
function renderLinePreview() {
    updateCurrentMeta();
    renderLineList();
    scrollToCurrentLine(); // tự cuộn khung dán để dòng đang chọn nằm giữa, tiện theo dõi
    savePasteTextState(); // lưu cache mỗi khi text hoặc dòng đang chọn thay đổi
    // Nếu đang Link Quick Layout to Typer Box và popup Quick Layout đang mở -> cập nhật preview ngay
    if (isLinkQLTexter() && typeof window.updatePreviewIfNeeded === "function") {
        var overlay = document.getElementById("previewOverlay");
        if (overlay && overlay.style.display === "block") window.updatePreviewIfNeeded();
    }
}
// ---------- Lưu/khôi phục nội dung ô dán + dòng đang làm dở (localStorage) ----------
function savePasteTextState() {
    var input = document.getElementById("pasteTextInput");
    try {
        localStorage.setItem("typoCorePasteText", input ? input.value : "");
        localStorage.setItem("typoCorePasteLineIdx", String(_pasteLineIdx));
    } catch (e) {}
}
function restorePasteTextState() {
    var input = document.getElementById("pasteTextInput");
    if (!input) { renderLinePreview(); return; }
    var savedText = "";
    try { savedText = localStorage.getItem("typoCorePasteText") || ""; } catch (e) {}
    if (!savedText) { renderLinePreview(); return; }
    input.value = savedText;
    _pasteLines = splitPasteLines(savedText);
    var visible = visiblePasteLines();
    var savedIdx = NaN;
    try { savedIdx = parseInt(localStorage.getItem("typoCorePasteLineIdx"), 10); } catch (e) {}
    var stillValid = visible.some(function(l) { return l.rawIndex === savedIdx; });
    _pasteLineIdx = stillValid ? savedIdx : (visible.length ? visible[0].rawIndex : -1);
    renderLinePreview();
}
// Đọc vị trí con trỏ trong ô -> xác định đang ở dòng nào (khi người dùng tự bấm/gõ trong ô)
function syncLineFromCaret() {
    var input = document.getElementById("pasteTextInput");
    if (!input) return;
    var pos = input.selectionStart;
    var before = input.value.slice(0, pos);
    var lineIdx = before.split("\n").length - 1;
    var line = _pasteLines[lineIdx];
    // Bỏ qua nếu con trỏ đang đứng ở dòng trống — dòng trống không có trong danh sách
    // "line 1..N" nên không thể chọn làm dòng hiện tại (tránh bug hiện "line: 0/N").
    if (line && !line.ignore && lineIdx !== _pasteLineIdx) {
        _pasteLineIdx = line.rawIndex;
        renderLinePreview(); // dùng chung 1 chỗ cập nhật -> tự kèm luôn refresh Quick Layout nếu đang Link
    }
}
function moveLine(dir) {
    var visible = visiblePasteLines();
    if (!visible.length) return;
    var curPos = -1;
    for (var i = 0; i < visible.length; i++) if (visible[i].rawIndex === _pasteLineIdx) { curPos = i; break; }
    var newPos = curPos + dir;
    if (newPos < 0 || newPos >= visible.length) return;
    _pasteLineIdx = visible[newPos].rawIndex;
    renderLinePreview(); // chỉ đổi dòng đang chọn, KHÔNG đưa con trỏ vào ô soạn thảo (tránh gõ nhầm)
}
function refreshPasteLines() {
    var input = document.getElementById("pasteTextInput");
    var raw = input ? input.value : "";
    var oldIdx = _pasteLineIdx;
    _pasteLines = raw ? splitPasteLines(raw) : [];
    var visible = visiblePasteLines();
    if (!visible.some(function(l) { return l.rawIndex === oldIdx; })) {
        _pasteLineIdx = visible.length ? visible[0].rawIndex : -1;
    }
    renderLinePreview();
}
function doPasteToSelection() {
    var btn = document.getElementById("btnPasteToSelection");
    var text = currentLineText();
    if (!text) { alert("No line to paste — type or paste your translation first."); return; }
    var preset = getCurrentPreset();
    if (!preset) { alert("No style yet. Select a text layer, then click \"+ Add style\"."); return; }
    var payload = { text: text, style: scaledStyle(preset), stroke: preset.stroke };
    _exec('TT_pasteToSelection(' + JSON.stringify(payload) + ')', btn, function(res) {
        flash(btn, res);
        if (res === "OK") moveLine(1); // jump to next line to keep pasting
    });
}

// ========== LINK QUICK LAYOUT TO TEXTER ==========
// Khi bật: Quick Layout đọc text từ dòng hiện tại của Typer Box (thay vì layer đang chọn trong PTS),
// và bấm chọn 1 kiểu cách dòng trong Quick Layout sẽ DÁN chữ đã cách dòng đó ra Selection (dùng style
// hiện hành của Texter) thay vì áp trực tiếp lên layer đang chọn như bình thường.
// Auto Shape / Auto Fit (Typer Box Setting) — nối vào nút Center (alignCenter): bật lên thì sau khi
// canh giữa bóng thoại sẽ tự chia lại dòng và/hoặc dò cỡ chữ vừa khít, tắt thì Center chạy như cũ.
var AUTO_SHAPE_KEY = "typoCoreAutoShape";
var AUTO_FIT_KEY = "typoCoreAutoFit";
function isAutoShapeEnabled() { return localStorage.getItem(AUTO_SHAPE_KEY) === "1"; }
function setAutoShapeEnabled(v) { try { localStorage.setItem(AUTO_SHAPE_KEY, v ? "1" : "0"); } catch (e) {} }
function isAutoFitEnabled() { return localStorage.getItem(AUTO_FIT_KEY) === "1"; }
function setAutoFitEnabled(v) { try { localStorage.setItem(AUTO_FIT_KEY, v ? "1" : "0"); } catch (e) {} }
var AUTO_FIT_PADDING_KEY = "typoCoreAutoFitPadding";
function getAutoFitPadding() {
    var v = parseFloat(localStorage.getItem(AUTO_FIT_PADDING_KEY));
    return isNaN(v) ? 10 : v; // 10 = mặc định gốc của TypeR
}
function setAutoFitPadding(v) { try { localStorage.setItem(AUTO_FIT_PADDING_KEY, String(v)); } catch (e) {} }
function buildAlignCenterCall() {
    return "alignCenter(" + (isAutoShapeEnabled() ? "true" : "false") + "," + (isAutoFitEnabled() ? "true" : "false") + "," + getAutoFitPadding() + ")";
}
// Center thành công nhưng riêng Auto Shape/Auto Fit bị lỗi -> vẫn hiện rõ lý do ra alert, không
// để im lặng như "chạy xong không làm gì cả" (rất khó đoán nguyên nhân nếu không thấy lỗi thật).
function runAlignCenter(btn) {
    _exec(buildAlignCenterCall(), btn, function(res) {
        flash(btn, res);
        if (res && res.indexOf("AUTOFIT_ERROR:") === 0) {
            alert("Center OK, but Auto Shape/Auto Fit failed:\n" + res.slice("AUTOFIT_ERROR:".length));
        }
    });
}
var LINK_QL_TEXTER_KEY = "typoCoreLinkQuickLayoutTexter";
function isLinkQLTexter() { return localStorage.getItem(LINK_QL_TEXTER_KEY) === "1"; }
function setLinkQLTexter(v) { try { localStorage.setItem(LINK_QL_TEXTER_KEY, v ? "1" : "0"); } catch (e) {} updateQLLoadOrNavUI(); }
// Khi Link Quick Layout to Typer Box đang bật, nút "Load" không còn tác dụng (nguồn text luôn lấy
// trực tiếp từ dòng hiện tại của Typer Box, tự cập nhật rồi) -> ẩn Load, hiện 2 nút đổi dòng ▲▼
// ngay đúng chỗ đó thay vào, tận dụng chỗ trống thay vì thêm hẳn 1 hàng mới.
function updateQLLoadOrNavUI() {
    var linked = isLinkQLTexter();
    var btnLoad = document.getElementById("btnPreviewLoad");
    var navGroup = document.getElementById("btnQLLineNavGroup");
    if (btnLoad) btnLoad.style.display = linked ? "none" : "";
    if (navGroup) navGroup.style.display = linked ? "flex" : "none";
}
// Multiple Bubble đôi khi lệch vị trí khi các bóng thoại cách xa nhau trên ảnh dài (chưa rõ nguyên
// nhân gốc, có thể do máy/thao tác riêng) — để optional, bật lên khi thấy lệch thì thử lại.
// Khi bật: sau khi Multiple Bubble dán THÀNH CÔNG nhiều chỗ, tự tắt MB luôn (phải bật lại tay mới
// tiếp tục) — tránh lỡ tay chọn thêm vùng ngoài ý muốn sau khi đã dán xong 1 mẻ.
var SNAP_MB_KEY = "typoCoreSnapMultiBubble";
function isSnapMultiBubble() { return localStorage.getItem(SNAP_MB_KEY) === "1"; }
function setSnapMultiBubble(v) { try { localStorage.setItem(SNAP_MB_KEY, v ? "1" : "0"); } catch (e) {} }
function pasteFormattedTextToSelectionViaTexter(text) {
    if (!text) return;
    var preset = getCurrentPreset();
    if (!preset) { alert("No style yet in Typer Box. Select a text layer, then click \"+ Add style\"."); return; }
    var payload = { text: text, style: scaledStyle(preset), stroke: preset.stroke };
    _exec('TT_pasteToSelection(' + JSON.stringify(payload) + ')', null, function(res) {
        if (res === "OK") {
            moveLine(1); // giữ cùng hành vi tự nhảy dòng như nút Paste chính
            var vis = loadVis();
            if (!vis.manualResizeBox) _exec('resizeBox()');
            return;
        }
        if (res === "ERR:noSelection") {
            // Không có Selection nào -> thay vì báo lỗi, dán luôn text + style hiện tại vào
            // layer text đang được chọn trong Photoshop (giống Paste to Layer thường).
            _exec('TT_pasteToLayer(' + JSON.stringify(payload) + ')', null, function(res2) {
                if (res2 === "OK") {
                    moveLine(1);
                    var vis2 = loadVis();
                    if (!vis2.manualResizeBox) _exec('resizeBox()');
                }
            });
        }
    });
}
// Dùng cho phím tắt Win+Ctrl khi đang Link: lấy kiểu cách dòng ĐẦU TIÊN đang hiện trong Quick Layout
// (áp dụng lên đúng dòng hiện tại của Texter) rồi dán ra Selection.
function pasteFirstQuickLayoutCase() {
    var text = currentLineText();
    if (!text) { alert("No line to paste — type or paste your translation first."); return; }
    var items = buildCasePreviewItems(text);
    var formatted = items.length ? items[0].text : text;
    pasteFormattedTextToSelectionViaTexter(formatted);
}

function pasteSpecificLineToLayer(rawIndex) {
    _pasteLineIdx = rawIndex;
    renderLinePreview();
    var text = currentLineText();
    if (!text) return;
    var row = document.querySelectorAll(".tt-text-line-row")[rawIndex] || null;
    var btn = row ? row.querySelector(".tt-text-line-insert") : null;
    // Chỉ đổi CHỮ, giữ nguyên font/style hiện có của layer đang chọn (style: null -> host.jsx tự
    // lấy lại đúng textStyleRange/paragraphStyleRange từ chính layer đó, không ghi đè gì cả).
    var payload = { text: text, style: null };
    _exec('TT_pasteToLayer(' + JSON.stringify(payload) + ')', btn, function(res) {
        flash(btn, res);
    });
}
// Áp style (font/size/tracking/color/align) lên layer đang chọn, GIỮ NGUYÊN text hiện có của layer đó
function applyStyleToActiveLayer(id, btn) {
    var data = loadTextPresets();
    var preset = data.presets[id];
    if (!preset) return;
    var payload = { text: null, style: scaledStyle(preset), stroke: preset.stroke };
    _exec('TT_pasteToLayer(' + JSON.stringify(payload) + ')', btn, function(res) {
        flash(btn, res);
    });
}
on("pasteTextInput", "input", refreshPasteLines);
on("pasteTextInput", "click", syncLineFromCaret);
on("pasteTextInput", "keyup", syncLineFromCaret);
// Hover đúng dòng nền phía dưới khi rê chuột qua phần chữ trong ô soạn thảo (chỉ để dễ nhìn,
// không đổi dòng đang chọn — phải bấm số thứ tự hoặc click vào chữ mới đổi/soạn thảo).
on("pasteTextInput", "mousemove", function(e) {
    var container = document.getElementById("pasteLineList");
    if (!container) return;
    var y = e.offsetY;
    var acc = 0;
    var rows = container.children;
    for (var i = 0; i < rows.length; i++) {
        var h = rows[i].offsetHeight;
        var isHover = (y >= acc && y < acc + h);
        rows[i].classList.toggle("m-hover", isHover);
        acc += h;
    }
});
on("pasteTextInput", "mouseleave", function() {
    var container = document.getElementById("pasteLineList");
    if (!container) return;
    Array.prototype.forEach.call(container.children, function(r) { r.classList.remove("m-hover"); });
});
// Sau khi dán (Ctrl+V), trình duyệt tự đặt con trỏ ở CUỐI đoạn vừa dán. Nếu để vậy, "keyup" chạy
// ngay sau đó (lúc thả phím Ctrl/V) sẽ đọc nhầm vị trí cuối này và ghi đè mất dòng đầu tiên vừa chọn
// đúng ở bước "input". Nên chủ động đưa con trỏ về đầu văn bản ngay sau khi dán xong.
on("pasteTextInput", "paste", function() {
    // "paste" bắn ra TRƯỚC khi nội dung dán được chèn vào, nên đọc value ngay lúc này
    // để biết ô đang trống hay đã có sẵn dữ liệu.
    var inputNow = document.getElementById("pasteTextInput");
    var wasEmpty = !inputNow || !inputNow.value.trim();
    if (!wasEmpty) return; // đã có sẵn nội dung -> dán thêm vào giữa/cuối, không can thiệp vị trí gì cả
    setTimeout(function() {
        var input = document.getElementById("pasteTextInput");
        if (input) input.setSelectionRange(0, 0);
        refreshPasteLines(); // ô đang trống -> dán vào là coi như bắt đầu mới, đưa về dòng 1
    }, 0);
});
on("btnLinePrev", "click", function() { moveLine(-1); });
on("btnLineNext", "click", function() { moveLine(1); });
on("btnSaveTextPreset", "click", doSaveTextPreset);
on("btnAddFolder", "click", doAddFolder);
on("importStylesFile", "change", function(e) { handleImportStylesFile(e.target.files[0]); e.target.value = ""; });
on("btnAlignSimple", "click", function() {
    runAlignCenter(this);
});
on("btnMultipleBubble", "click", toggleMultipleBubble);
on("btnToggleAutoShape", "click", function() {
    setAutoShapeEnabled(!isAutoShapeEnabled());
    updateAutoShapeFitDots();
    updateLinkQLLockState(); // Auto Shape bật thì khoá Link Q.Layout (xung đột cách dòng)
});
on("btnToggleAutoFit", "click", function() {
    setAutoFitEnabled(!isAutoFitEnabled());
    updateAutoShapeFitDots();
});
function updateAutoShapeFitDots() {
    var shapeDot = document.getElementById("autoShapeDot");
    var fitDot = document.getElementById("autoFitDot");
    if (shapeDot) shapeDot.classList.toggle("mb-active", isAutoShapeEnabled());
    if (fitDot) fitDot.classList.toggle("mb-active", isAutoFitEnabled());
}
updateAutoShapeFitDots(); // đồng bộ trạng thái chấm ngay lúc panel mở (theo setting đã lưu)
on("btnMBPause", "click", toggleMBPause);
on("btnMBClear", "click", clearMBSelections);
on("btnOpenTexter", "click", function() {
    var el = document.getElementById("texterOverlay");
    if (!el) return;
    var isOpen = el.style.display === "block";
    el.style.display = isOpen ? "none" : "block";
    localStorage.setItem("typoCoreTexterState", isOpen ? "closed" : "open");
});
(function() {
    if (localStorage.getItem("typoCoreTexterState") === "open") {
        var el = document.getElementById("texterOverlay");
        if (el) el.style.display = "block";
    }
})();
renderStyleList();
restorePasteTextState();
// Thu nhỏ/phóng to panel làm thay đổi độ rộng khung -> chữ wrap lại khác -> tính lại layout
(function() {
    var block = document.querySelector(".tt-text-block");
    if (!block || typeof ResizeObserver === "undefined") return;
    var ro = new ResizeObserver(function() { renderLineList(); });
    ro.observe(block);
})();
var STORAGE_KEY = "typoCoreToolVisibility";
var TOOL_DEFS = {
    quickLayout: { sectionId: "section-preview", isSection: true },
    fxManager:   { sectionId: "section-fx",      isSection: true },
    texterStudio: { sectionId: "section-texter", isSection: true },
    layoutCases: { sectionId: "section-layout", isSection: true },
    splitEven:   { sectionId: "section-split",   isSection: true },
    actionsSection: { sectionId: "section-actions", isSection: true },
    center:      { dataTool: "center",    isSection: false },
    groupText:   { dataTool: "groupText", isSection: false },
    copyFX:      { dataTool: "copyFX",    isSection: false },
    pasteFX:     { dataTool: "pasteFX",   isSection: false },
    selectForm:  { dataTool: "selectForm", isSection: false },
    logo:        { dataTool: "logo",       isSection: false },
    manualLoadText: { dataTool: "nonexistent2", isSection: false },
    multiplePaste: { dataTool: "nonexistent", isSection: false },
    manualResizeBox: { dataTool: "nonexistent3", isSection: false },
    autoFX: { dataTool: "nonexistent4", isSection: false },
};

function loadVis() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            var data = JSON.parse(raw);
            if (typeof data.multiplePaste === "undefined") data.multiplePaste = false;
            if (typeof data.manualResizeBox === "undefined") data.manualResizeBox = false;
            if (typeof data.autoFX === "undefined") data.autoFX = false;
            return data;
        }
    } catch(e) {}
    var vis = {};
    for (var k in TOOL_DEFS) vis[k] = true;
    vis.multiplePaste = false;
    vis.manualResizeBox = false;
    vis.autoFX = false;
    return vis;
}
function saveVis(vis) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vis)); } catch(e) {} }
function applyVis(vis) {
    for (var key in TOOL_DEFS) {
        var def = TOOL_DEFS[key];
        var show = vis[key] !== false;
        var actionsSection = document.getElementById("section-actions");
        if (actionsSection) {
            var isActionsVisible = window.getComputedStyle(actionsSection).display !== "none";
            if (!isActionsVisible) document.body.classList.add("actions-hidden");
            else document.body.classList.remove("actions-hidden");
        }
        if (def.isSection) {
            var el = document.getElementById(def.sectionId);
            if (el) el.style.display = show ? "" : "none";
        } else {
            var btn = document.querySelector('[data-tool="' + def.dataTool + '"]');
            if (btn) btn.style.display = show ? "" : "none";
        }
    }
var rows = document.querySelectorAll('.action-row');
for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var btns = row.querySelectorAll('[data-tool]');
    var hasVisible = false;
    for (var j = 0; j < btns.length; j++) {
        if (btns[j].style.display !== 'none') {
            hasVisible = true;
            break;
        }
    }
    row.style.display = hasVisible ? '' : 'none';
}
    requestAnimationFrame(function() { cs.resizeContent(document.body.scrollWidth, document.body.scrollHeight); });
    updateCheckboxes(vis);
}
function updateCheckboxes(vis) {
    for (var key in TOOL_DEFS) {
        var cb = document.getElementById("toggle_" + key);
        if (cb) cb.checked = vis[key] !== false;
    }
}

// ===================== FX STUDIO – ẨN/HIỆN TỪNG CHỨC NĂNG =====================
// Khi 1 chức năng bị ẩn: không hiển thị trong FX Studio, và KHÔNG sync/apply chức năng đó.
var FX_STUDIO_KEY = "typoCoreFxFeatureVisibility";
var FX_FEATURE_DEFAULTS = { gradientFill: true, frameFX: true, outerGlow: true, dropShadow: false, textColor: true };

function loadFxFeatureVis() {
    try {
        var raw = localStorage.getItem(FX_STUDIO_KEY);
        if (raw) {
            var data = JSON.parse(raw);
            for (var k in FX_FEATURE_DEFAULTS) {
                if (typeof data[k] === "undefined") data[k] = FX_FEATURE_DEFAULTS[k];
            }
            return data;
        }
    } catch(e) {}
    var vis = {};
    for (var k in FX_FEATURE_DEFAULTS) vis[k] = FX_FEATURE_DEFAULTS[k];
    return vis;
}
function saveFxFeatureVis(vis) { try { localStorage.setItem(FX_STUDIO_KEY, JSON.stringify(vis)); } catch(e) {} }

// Dùng để guard sync/apply: nếu chức năng đang bị ẩn thì bỏ qua, không đồng bộ/áp dụng
function isFxFeatureVisible(key) { return loadFxFeatureVis()[key] !== false; }

function applyFxFeatureVis(vis) {
    for (var key in FX_FEATURE_DEFAULTS) {
        var show = vis[key] !== false;
        var enableCb = document.querySelector('.fx-enable[data-fx="' + key + '"]');
        var section = enableCb ? enableCb.closest(".fx-section") : null;
        if (section) section.style.display = show ? "" : "none";
        var cb = document.getElementById("toggle_fx_" + key);
        if (cb) cb.checked = show;
    }
    requestAnimationFrame(function() { cs.resizeContent(document.body.scrollWidth, document.body.scrollHeight); });
}

var LAYOUT_KEY = "typoCoreLayout";
var _editMode = false;
var sortableSections = null;
var sortableButtons = [];

function toggleEditMode() {
    var settingPopup = document.getElementById("settingPopup");
    if (settingPopup) settingPopup.classList.remove("show");
    
    _editMode = !_editMode;
    document.body.classList.toggle("edit-mode", _editMode);
    var editModeBtns = document.getElementById("editModeButtons");
    if (editModeBtns) editModeBtns.style.display = _editMode ? "flex" : "none";
    
    var pasteBtn = document.getElementById("btnPasteFX");
    
    if (_editMode) {
        if (pasteBtn) {
            _originalPasteDisabled = pasteBtn.disabled;
            pasteBtn.disabled = false;
        }
        if (!sortableSections) {
            sortableSections = new Sortable(document.querySelector('.panel'), { animation: 150, forceFallback: true, handle: '.section', draggable: '.section', disabled: false, onEnd: saveLayout });
        } else { sortableSections.enable(); }
        initButtonSortable();
        enableAllButtonSortable(true);
    } else {
        if (sortableSections) { sortableSections.destroy(); sortableSections = null; }
        sortableButtons.forEach(function(s) { if (s) s.destroy(); });
        sortableButtons = [];
        cleanEmptyActionRows();
        saveLayout();
        if (pasteBtn) pasteBtn.disabled = _originalPasteDisabled;
    }
}
function initSortableForAllRows() {
    var rows = document.querySelectorAll('.action-row');
    sortableButtons.forEach(function(s) { if(s) s.destroy(); });
    sortableButtons = [];
    
    rows.forEach(function(row) {
        if (row.style.display === 'none') return;
        
        var sort = new Sortable(row, {
            group: { name: 'actions-group', pull: true, put: ['actions-group'] },
            animation: 200,
            forceFallback: true,
            draggable: '[data-tool]',
            onEnd: function() {
                saveLayout();
            }
        });
        sortableButtons.push(sort);
    });
}
function cleanEmptyActionRows() {
    var actionGrid = document.querySelector('.action-grid');
    if (!actionGrid) return;
    var rows = actionGrid.querySelectorAll('.action-row');
    var hasRowWithButtons = false;
    
    rows.forEach(function(row) {
        var btns = row.querySelectorAll('[data-tool]');
        if (btns.length === 0) {
            row.remove();
        } else {
            hasRowWithButtons = true;
        }
    });
    
    if (!hasRowWithButtons) {
        var defaultRow = document.createElement('div');
        defaultRow.className = 'action-row';
        
        var groupBtn = document.createElement('button');
        groupBtn.setAttribute('data-tool', 'groupText');
        groupBtn.textContent = 'Group';
        groupBtn.onclick = function() { runBtn('groupTextLayers()', this); };
        defaultRow.appendChild(groupBtn);
        
        var centerBtn = document.createElement('button');
        centerBtn.setAttribute('data-tool', 'center');
        centerBtn.textContent = 'Center';
        centerBtn.onclick = function() { runBtn('alignCenterSimple()', this); };
        defaultRow.appendChild(centerBtn);
        
        actionGrid.appendChild(defaultRow);
    }
    
    if (_editMode) initSortableForAllRows();
}
function initButtonSortable() { initSortableForAllRows(); }
function addNewRow() {
    var actionGrid = document.querySelector('.action-grid');
    if (!actionGrid) return;
    
    var newRow = document.createElement('div');
    newRow.className = 'action-row';
    newRow.style.display = 'flex';
    actionGrid.appendChild(newRow);
    
    var sort = new Sortable(newRow, {
        group: { name: 'actions-group', pull: true, put: ['actions-group'] },
        animation: 200,
        forceFallback: true,
        draggable: '[data-tool]',
        onEnd: function() {
            saveLayout();
        }
    });
    sortableButtons.push(sort);
    saveLayout();
}
function enableAllButtonSortable(enable) { sortableButtons.forEach(function(sort) { if (enable) sort.enable(); else sort.disable(); }); }
function saveLayout() {
    var sections = [];
    var sectionElements = document.querySelectorAll('.panel > .section');
    for (var i = 0; i < sectionElements.length; i++) { var sec = sectionElements[i]; var id = sec.getAttribute('data-drag-id') || sec.id; sections.push(id); }
    var actionButtons = [];
    var rows = document.querySelectorAll('.action-row');
    for (var r = 0; r < rows.length; r++) {
        var tools = [];
        var btns = rows[r].querySelectorAll('[data-tool]');
        for (var b = 0; b < btns.length; b++) tools.push(btns[b].getAttribute('data-tool'));
        if (tools.length) actionButtons.push(tools);
    }
    var layout = { sections: sections, actionButtons: actionButtons };
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch(e) {}
}
function restoreLayout() {
    try {
        var raw = localStorage.getItem(LAYOUT_KEY);
        var panel = document.querySelector('.panel');
        if (raw) {
            var layout = JSON.parse(raw);
            if (layout.sections) {
                for (var i = 0; i < layout.sections.length; i++) {
                    var id = layout.sections[i];
                    var sec = document.querySelector('[data-drag-id="' + id + '"]') || document.getElementById(id);
                    if (sec) panel.appendChild(sec);
                }
                var footer = document.querySelector('.panel-footer');
                if (footer) panel.appendChild(footer);
            }
        }
        var actionGrid = document.querySelector('.action-grid');
        var existingButtons = document.querySelectorAll('[data-tool]');
        var btnMap = {};
        existingButtons.forEach(function(btn) { var tool = btn.getAttribute('data-tool'); btnMap[tool] = btn; btn.style.display = ''; });
        actionGrid.innerHTML = '';
        var rowsToCreate = [];
        if (raw && layout.actionButtons && layout.actionButtons.length) rowsToCreate = layout.actionButtons;
        else rowsToCreate = [['groupText', 'center'], ['copyFX', 'pasteFX'], ['selectForm', 'logo']];
        rowsToCreate.forEach(function(tools) {
            var row = document.createElement('div'); row.className = 'action-row';
            tools.forEach(function(tool) { var btn = btnMap[tool]; if (btn) row.appendChild(btn); });
            if (row.children.length > 0) actionGrid.appendChild(row);
        });
        var vis = loadVis();
        applyVis(vis);
        cleanEmptyActionRows();
        if (_editMode) { initButtonSortable(); enableAllButtonSortable(true); }
    } catch(e) { console.log(e); }
}
function resetLayout() {
    localStorage.removeItem(LAYOUT_KEY);
    var panel = document.querySelector('.panel');
    var order = ['section-fx', 'section-preview', 'section-split', 'section-actions'];
    order.forEach(function(id) { var sec = document.getElementById(id); if (sec) panel.appendChild(sec); });
    var footer = document.querySelector('.panel-footer'); if (footer) panel.appendChild(footer);
    document.getElementById('section-layout').style.display = 'none';
    var vis = loadVis();
    for (var k in TOOL_DEFS) vis[k] = (k === 'layoutCases' || k === 'manualLoadText' || k === 'manualResizeBox') ? false : true;
    saveVis(vis); applyVis(vis);
    var actionGrid = document.querySelector('.action-grid');
    var allBtns = document.querySelectorAll('[data-tool]');
    var btnMap = {};
    allBtns.forEach(function(btn) { btnMap[btn.getAttribute('data-tool')] = btn; btn.style.display = ''; });
    actionGrid.innerHTML = '';
    var defaultRows = [['groupText', 'center'], ['copyFX', 'pasteFX'], ['selectForm', 'logo']];
    defaultRows.forEach(function(tools) {
        var row = document.createElement('div'); row.className = 'action-row';
        tools.forEach(function(tool) { if (btnMap[tool]) row.appendChild(btnMap[tool]); });
        actionGrid.appendChild(row);
    });
    if (_editMode) { initButtonSortable(); enableAllButtonSortable(true); }
    flash(document.getElementById("settingBtn"), "OK");
}
function createDefaultActionRows() {
    var actionGrid = document.querySelector('.action-grid'); actionGrid.innerHTML = '';
    var defaultRows = [['groupText', 'center'], ['copyFX', 'pasteFX'], ['selectForm', 'logo']];
    defaultRows.forEach(function(tools) {
        var row = document.createElement('div'); row.className = 'action-row';
        tools.forEach(function(tool) { var btn = document.querySelector('[data-tool="' + tool + '"]'); if (btn) row.appendChild(btn); });
        actionGrid.appendChild(row);
    });
}
function saveAndExitEditMode() { if (!_editMode) return; toggleEditMode(); }

function setupSettingPopup() {
    var btn = document.getElementById("settingBtn");
    var popup = document.getElementById("settingPopup");
    var layoutManagerSub = document.getElementById("layoutManagerSub");
    var layoutManagerArrow = document.getElementById("layoutManagerArrow");
    var toolManagerSub = document.getElementById("toolManagerSub");
    var toolManagerArrow = document.getElementById("toolManagerArrow");
    var advancedSettingSub = document.getElementById("advancedSettingSub");
    var advancedSettingArrow = document.getElementById("advancedSettingArrow");
    var textSettingSub = document.getElementById("textSettingSub");
    var textSettingArrow = document.getElementById("textSettingArrow");
function closeSettingPopup() {
    popup.classList.remove("show");
    if (layoutManagerSub) layoutManagerSub.style.display = "none";
    if (layoutManagerArrow) layoutManagerArrow.textContent = "▼";
    if (toolManagerSub) toolManagerSub.style.display = "none";
    if (toolManagerArrow) toolManagerArrow.textContent = "▼";
    if (advancedSettingSub) advancedSettingSub.style.display = "none";
    if (advancedSettingArrow) advancedSettingArrow.textContent = "▼";
    if (textSettingSub) textSettingSub.style.display = "none";
    if (textSettingArrow) textSettingArrow.textContent = "▼";
    var actionsSub = document.getElementById("actionsSub");
    var actionsArrow = document.getElementById("actionsSubArrow");
    if (actionsSub) actionsSub.style.display = "none";
    if (actionsArrow) actionsArrow.textContent = "▼";
    var fxManagerSub = document.getElementById("fxManagerSub");
    var fxManagerSubArrow = document.getElementById("fxManagerSubArrow");
    if (fxManagerSub) fxManagerSub.style.display = "none";
    if (fxManagerSubArrow) fxManagerSubArrow.textContent = "▼";
}
    function openSettingPopup() {
        if (layoutManagerSub) layoutManagerSub.style.display = "none";
        if (layoutManagerArrow) layoutManagerArrow.textContent = "▼";
        if (toolManagerSub) toolManagerSub.style.display = "none";
        if (toolManagerArrow) toolManagerArrow.textContent = "▼";
        if (advancedSettingSub) advancedSettingSub.style.display = "none";
        if (advancedSettingArrow) advancedSettingArrow.textContent = "▼";
        if (textSettingSub) textSettingSub.style.display = "none";
        if (textSettingArrow) textSettingArrow.textContent = "▼";
        var fxManagerSub = document.getElementById("fxManagerSub");
        var fxManagerSubArrow = document.getElementById("fxManagerSubArrow");
        if (fxManagerSub) fxManagerSub.style.display = "none";
        if (fxManagerSubArrow) fxManagerSubArrow.textContent = "▼";
        popup.classList.add("show");
    }
    if (btn) {
        btn.addEventListener("click", function(e) { e.stopPropagation(); if (popup.classList.contains("show")) closeSettingPopup(); else openSettingPopup(); });
    }
    document.addEventListener("click", function(e) { if (!popup.contains(e.target) && e.target !== btn) closeSettingPopup(); });
    popup.querySelectorAll("[data-action]").forEach(function(item) {
        item.addEventListener("click", function(e) {
            var action = this.getAttribute("data-action");
            if (action === "chooseLogo") {
                cs.evalScript('pickLogoPath()', function(result) {
                    if (!result || result === "CANCELLED") return;
                    if (result.indexOf("ERROR") !== -1) return;
                    localStorage.setItem("typoCoreLogoPath", result);
                    var btnLogo = document.getElementById("btnLogo");
                    if (btnLogo) { btnLogo.title = result; btnLogo.classList.add("flash-ok"); setTimeout(function() { btnLogo.classList.remove("flash-ok"); }, 800); }
                });
            } else if (action === "toggleEditMode") { toggleEditMode(); closeSettingPopup(); return; }
            else if (action === "resetLayout") { resetLayout(); }
            else if (action === "importStylesMain") { document.getElementById("importStylesFile").click(); }
            else if (action === "exportStylesMain") { doExportStyles(); }
            closeSettingPopup();
        });
    });
    popup.querySelectorAll("input[type='checkbox']").forEach(function(cb) {
        cb.addEventListener("click", function(e) {
            e.stopPropagation();
            if (this.id.indexOf("toggle_fx_") === 0) {
                var fxKey = this.id.replace("toggle_fx_", "");
                if (FX_FEATURE_DEFAULTS.hasOwnProperty(fxKey)) {
                    var fxVis = loadFxFeatureVis();
                    fxVis[fxKey] = this.checked;
                    saveFxFeatureVis(fxVis);
                    applyFxFeatureVis(fxVis);
                }
                return;
            }
            var key = this.id.replace("toggle_", "");
            if (TOOL_DEFS.hasOwnProperty(key)) {
                var vis = loadVis(); vis[key] = this.checked; saveVis(vis); applyVis(vis);
                if (key === "manualLoadText") {
                    var overlay = document.getElementById("previewOverlay");
                    if (overlay && overlay.style.display === "block") {
                        if (vis.manualLoadText) { if (previewInterval) { clearInterval(previewInterval); previewInterval = null; } }
                        else { if (!previewInterval) previewInterval = setInterval(window.updatePreviewIfNeeded, 2200); }
                    }
                } else if (key === "autoFX") {
                    if (vis.autoFX) startAutoFx(); else stopAutoFx();
                } else if (key === "texterStudio") {
                    applyTexterStudioLockState(vis.texterStudio !== false);
                }
            }
        });
    });
    var layoutToggle = document.getElementById("layoutManagerToggle");
    if (layoutToggle) {
        layoutToggle.addEventListener("click", function(e) { e.stopPropagation(); if (layoutManagerSub.style.display === "none") { layoutManagerSub.style.display = "block"; layoutManagerArrow.textContent = "▲"; } else { layoutManagerSub.style.display = "none"; layoutManagerArrow.textContent = "▼"; } });
    }
    var toolToggle = document.getElementById("toolManagerToggle");
    if (toolToggle) {
        toolToggle.addEventListener("click", function(e) { e.stopPropagation(); if (toolManagerSub.style.display === "none") { toolManagerSub.style.display = "block"; toolManagerArrow.textContent = "▲"; } else { toolManagerSub.style.display = "none"; toolManagerArrow.textContent = "▼"; } });
    }
    var advancedSettingToggle = document.getElementById("advancedSettingToggle");
    if (advancedSettingToggle) {
        advancedSettingToggle.addEventListener("click", function(e) { e.stopPropagation(); if (advancedSettingSub.style.display === "none") { advancedSettingSub.style.display = "block"; advancedSettingArrow.textContent = "▲"; } else { advancedSettingSub.style.display = "none"; advancedSettingArrow.textContent = "▼"; } });
    }
    var textSettingToggle = document.getElementById("textSettingToggle");
    if (textSettingToggle) {
        textSettingToggle.addEventListener("click", function(e) { e.stopPropagation(); if (textSettingSub.style.display === "none") { textSettingSub.style.display = "block"; textSettingArrow.textContent = "▲"; } else { textSettingSub.style.display = "none"; textSettingArrow.textContent = "▼"; } });
    }

    var actionsArrow = document.getElementById("actionsSubArrow");
    if (actionsArrow) {
        actionsArrow.addEventListener("click", function(e) {
            e.stopPropagation();
            var sub = document.getElementById("actionsSub");
            if (sub.style.display === "none" || sub.style.display === "") {
                sub.style.display = "block";
                this.textContent = "▲";
            } else {
                sub.style.display = "none";
                this.textContent = "▼";
            }
        });
    }
    var fxManagerSubArrow = document.getElementById("fxManagerSubArrow");
    if (fxManagerSubArrow) {
        fxManagerSubArrow.addEventListener("click", function(e) {
            e.stopPropagation();
            var sub = document.getElementById("fxManagerSub");
            if (sub.style.display === "none" || sub.style.display === "") {
                sub.style.display = "block";
                this.textContent = "▲";
            } else {
                sub.style.display = "none";
                this.textContent = "▼";
            }
        });
    }
    updateCheckboxes(loadVis());
    updateLinkQLLockState(); // đồng bộ trạng thái khoá Link ngay lúc mở Settings (theo Auto Shape đã lưu)
    var cbLinkQL = document.getElementById("toggle_linkQuickLayoutTexter");
    if (cbLinkQL) {
        cbLinkQL.checked = isLinkQLTexter();
        cbLinkQL.addEventListener("click", function(e) {
            e.stopPropagation();
            if (this.disabled) return;
            setLinkQLTexter(this.checked);
        });
    }
    var inputPadding = document.getElementById("inputAutoFitPadding");
    if (inputPadding) {
        inputPadding.value = getAutoFitPadding();
        inputPadding.addEventListener("click", function(e) { e.stopPropagation(); });
        inputPadding.addEventListener("change", function() {
            var v = parseFloat(this.value);
            if (isNaN(v) || v < 0) v = 10;
            setAutoFitPadding(v);
            this.value = v;
        });
    }
    var cbSnapMB = document.getElementById("toggle_snapMultiBubble");
    if (cbSnapMB) {
        cbSnapMB.checked = isSnapMultiBubble();
        cbSnapMB.addEventListener("click", function(e) {
            e.stopPropagation();
            setSnapMultiBubble(this.checked);
        });
    }
}

function setupPreviewPopup() {
    var overlay = document.getElementById("previewOverlay");
    var btnOpen = document.getElementById("btnPreviewLayout");
    var btnLoad = document.getElementById("btnPreviewLoad");
    var btnClose = document.getElementById("btnPreviewClose");
    var btnToggle = document.getElementById("btnPreviewToggle");
    if (btnToggle) btnToggle.textContent = "H";
    var grid = document.getElementById("previewGrid");
    var lastPreviewText = "";
    var isHorizontal = false;
    var customFonts = [];
    var selectedFontIndex = -1;
    var previewSize = 14;
    var maxFonts = 5;
    var btnFont = document.getElementById("btnPreviewFont");
    var btnSizeDown = document.getElementById("btnPreviewSizeDown");
    var btnSizeUp = document.getElementById("btnPreviewSizeUp");
    var sizeDisplay = document.getElementById("previewSizeDisplay");
    var fontPicker = document.getElementById("fontPickerPopup");
    var fontPickerList = document.getElementById("fontPickerList");
    var btnAddFont = document.getElementById("btnAddFont");
    var btnFontClose = document.getElementById("btnFontPickerClose");

    function loadFontsFromStorage() {
        try { var saved = localStorage.getItem("typoCoreQuickFonts"); if (saved) customFonts = JSON.parse(saved); } catch(e) {}
        if (!Array.isArray(customFonts)) customFonts = [];
        if (customFonts.length > maxFonts) customFonts = customFonts.slice(0, maxFonts);
        var idx = localStorage.getItem("typoCoreQuickFontIndex");
        if (idx !== null) selectedFontIndex = parseInt(idx, 10);
        if (selectedFontIndex >= customFonts.length) selectedFontIndex = -1;
        var savedSize = localStorage.getItem("typoCoreQuickFontSize");
        if (savedSize) previewSize = parseInt(savedSize, 10) || 14;
        if (previewSize < 1) previewSize = 1;
        updateSizeUI();
    }
    function saveFontsToStorage() {
        localStorage.setItem("typoCoreQuickFonts", JSON.stringify(customFonts));
        localStorage.setItem("typoCoreQuickFontIndex", selectedFontIndex);
        localStorage.setItem("typoCoreQuickFontSize", previewSize);
    }
    function updateSizeUI() { if (sizeDisplay) sizeDisplay.textContent = previewSize; saveFontsToStorage(); applyFontAndSizeToPreview(); }
    function applyFontAndSizeToPreview() {
        if (!grid) return;
        // Dựng lại toàn bộ preview qua renderPreviews() (dùng kỹ thuật span + fontFamilyAttrSafe an
        // toàn, giống hệt cách preview khi Link với Typer Box) thay vì gán thẳng style.fontFamily —
        // cách cũ không tin cậy với tên font kiểu postScriptName (có ký tự đặc biệt/CEP không nhận).
        // Lấy lại text MỚI thay vì chỉ dựa vào lastPreviewText (có thể đang trống nếu Font List được
        // mở trước khi popup preview kịp render lần đầu).
        getQuickLayoutSourceText(function(text) {
            if (text && text !== "null" && text !== "undefined" && (text + "").indexOf("ERROR") !== 0) {
                lastPreviewText = text;
                renderPreviews(text);
            }
        });
        var items = grid.querySelectorAll(".preview-item");
        items.forEach(function(item) { item.style.fontSize = previewSize + "px"; });
    }
    function renderFontList() {
        if (!fontPickerList) return;
        fontPickerList.innerHTML = "";
        if (customFonts.length === 0) {
            var empty = document.createElement("div");
            empty.style.cssText = "padding:10px;color:#888;";
            empty.textContent = 'No font slots yet. Click "Add slot" below.';
            fontPickerList.appendChild(empty);
        }
        customFonts.forEach(function(f, index) {
            var div = document.createElement("div");
            div.className = "font-item" + (index === selectedFontIndex ? " selected" : "");
            var indexSpan = document.createElement("span"); indexSpan.className = "font-index"; indexSpan.textContent = (index + 1);
            indexSpan.title = "Use this slot for preview";
            indexSpan.addEventListener("click", function(e) { e.stopPropagation(); selectFont(index); });
            div.appendChild(indexSpan);
            // Dropdown chọn đúng font thật (giống Style Edit), thay cho gõ tay tên font trước đây —
            // tái dùng _userFontsCache đã tải sẵn, không cần chính xác tuyệt đối tên font nữa.
            var sel = document.createElement("select");
            sel.className = "font-select";
            fillFontSelectGeneric(sel, fontSlotPostScriptName(customFonts[index]));
            sel.addEventListener("click", function(e) { e.stopPropagation(); });
            sel.addEventListener("change", function(e) {
                e.stopPropagation();
                var opt = sel.selectedOptions && sel.selectedOptions[0];
                var derived = opt ? deriveDisplayFontName(opt.textContent) : "";
                customFonts[index] = { postScriptName: sel.value, previewName: derived };
                selectedFontIndex = index; // chọn font ở slot nào -> tự dùng luôn slot đó để preview
                saveFontsToStorage();
                renderFontList(); // vẽ lại để cập nhật khung "đang chọn" (class .selected) đúng slot
                applyFontAndSizeToPreview();
            });
            div.appendChild(sel);
            var removeSpan = document.createElement("span"); removeSpan.className = "font-remove"; removeSpan.textContent = "✕";
            removeSpan.addEventListener("click", function(e) { e.stopPropagation(); removeFont(index); });
            div.appendChild(removeSpan);
            fontPickerList.appendChild(div);
        });
    }
    function selectFont(index) { selectedFontIndex = index; saveFontsToStorage(); renderFontList(); applyFontAndSizeToPreview(); }
    function removeFont(index) { customFonts.splice(index,1); if(selectedFontIndex === index) selectedFontIndex = -1; else if(selectedFontIndex > index) selectedFontIndex--; saveFontsToStorage(); renderFontList(); applyFontAndSizeToPreview(); }
    function addFont() {
        if (customFonts.length >= maxFonts) { alert("Maximum " + maxFonts + " font slots allowed."); return; }
        customFonts.push(""); // thêm 1 slot trống -> chọn font qua dropdown ngay bên dưới
        saveFontsToStorage(); renderFontList(); selectFont(customFonts.length - 1);
    }
    if (btnFont) btnFont.addEventListener("click", function() {
        ensureUserFontsLoaded(function() {
            renderFontList();
            if (fontPicker) fontPicker.style.display = "flex";
        });
    });
    if (btnFontClose) btnFontClose.addEventListener("click", function() { if (fontPicker) fontPicker.style.display = "none"; });
    if (btnAddFont) btnAddFont.addEventListener("click", addFont);
    if (btnSizeDown) btnSizeDown.addEventListener("click", function() { if (previewSize > 1) previewSize--; updateSizeUI(); });
    if (btnSizeUp) btnSizeUp.addEventListener("click", function() { if (previewSize < 999) previewSize++; updateSizeUI(); });
    loadFontsFromStorage();

    function renderPreviews(text) {
        if (!grid) return;
        if (!text || !text.trim()) {
            if (grid.children.length) grid.innerHTML = "";
            return;
        }
        var items = buildCasePreviewItems(text);
        grid.innerHTML = "";
        // Khi đang Link Quick Layout to Typer Box -> lấy FONT (không lấy size) từ style hiện hành
        // của Typer Box để preview, thay cho font tự chọn riêng của Quick Layout.
        var linkedFont = null;
        if (isLinkQLTexter()) {
            var curPreset = getCurrentPreset();
            if (curPreset && curPreset.previewFont) linkedFont = curPreset.previewFont;
        }
        for (var i = 0; i < items.length; i++) {
            var item = document.createElement("div");
            item.className = "preview-item";
            item.style.fontSize = previewSize + "px";
            var fam = linkedFont || ((selectedFontIndex >= 0 && customFonts[selectedFontIndex]) ? fontSlotPreviewName(customFonts[selectedFontIndex]) : null);
            var innerHtml = escapeHtml(items[i].text).replace(/\n/g, "<br>");
            item.innerHTML = fam ? ("<span style='font-family: \"" + fontFamilyAttrSafe(fam) + "\"'>" + innerHtml + "</span>") : innerHtml;
            item.addEventListener("click", (function(caseNum, formattedText) {
                return function() {
                    if (isLinkQLTexter()) {
                        pasteFormattedTextToSelectionViaTexter(formattedText);
                        return;
                    }
                    // Gộp applyCase() + resizeBox() thành 1 lệnh COM duy nhất thay vì 2 lệnh nối
                    // tiếp — đỡ 1 lượt round-trip COM (vốn chậm hơn CEP cũ), QuickLayout phản hồi
                    // nhanh hơn thấy rõ.
                    var vis0 = loadVis();
                    var combined = vis0.manualResizeBox
                        ? 'applyCase(' + caseNum + ')'
                        : '(function(){var r=applyCase(' + caseNum + ');if(r==="OK")resizeBox();return r;})()';
                    _exec(combined, null, function(res) {});
                };
            })(items[i].case, items[i].text));
            grid.appendChild(item);
        }
    }

    // Nguồn text cho Quick Layout: bình thường đọc từ layer text đang chọn trong Photoshop (getText()).
    // Khi bật "Link Quick Layout to Typer Box" -> đọc từ dòng hiện tại trong Typer Box thay vào đó.
    function getQuickLayoutSourceText(callback) {
        if (isLinkQLTexter()) { callback(currentLineText() || ""); return; }
        cs.evalScript('getText()', callback);
    }
    function updatePreviewIfNeeded() {
        getQuickLayoutSourceText(function(text) {
            if (!text || text === "null" || text === "undefined" || (text + "").indexOf("ERROR") === 0) {
                if (grid) grid.innerHTML = "";
                lastPreviewText = "";
                return;
            }
            if (text === lastPreviewText) return;
            lastPreviewText = text;
            renderPreviews(text);
        });
    }
    window.updatePreviewIfNeeded = updatePreviewIfNeeded;
    // Ép render lại preview bất kể chữ có đổi hay không — dùng khi CHỈ đổi style/font (chữ vẫn y
    // nguyên) mà updatePreviewIfNeeded() bình thường sẽ bỏ qua vì so sánh thấy text giống lần trước.
    function forceRefreshPreview() {
        lastPreviewText = "";
        updatePreviewIfNeeded();
    }
    window.forceRefreshPreview = forceRefreshPreview;

    function loadPreviews() {
        getQuickLayoutSourceText(function(text) {
            if (!text || text === "null" || text === "undefined" || (text + "").indexOf("ERROR") === 0) {
                if (grid) grid.innerHTML = "";
                return;
            }
            if (!text.trim()) { if (grid) grid.innerHTML = ""; return; }
            lastPreviewText = text;
            renderPreviews(text);
        });
    }
    if (btnToggle) btnToggle.addEventListener("click", function() { isHorizontal = !isHorizontal; if (isHorizontal) { if (grid) grid.classList.add("horizontal"); btnToggle.textContent = "V"; } else { if (grid) grid.classList.remove("horizontal"); btnToggle.textContent = "H"; } });
    if (btnOpen) btnOpen.addEventListener("click", function() {
        if (overlay && overlay.style.display === "block") { closePopup(); return; }
        if (overlay) overlay.style.display = "block";
        updateQLLoadOrNavUI();
        loadPreviews();
        if (previewInterval) clearInterval(previewInterval);
        var vis = loadVis();
        if (!vis.manualLoadText) previewInterval = setInterval(updatePreviewIfNeeded, 2200);
    });
    function closePopup() {
        if (overlay) overlay.style.display = "none";
        var popup = document.getElementById('previewPopup');
        if (popup) { var h = popup.offsetHeight; if (h > 0) localStorage.setItem('typoCorePreviewPopupHeight', h); }
        if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }
    }
    if (btnClose) btnClose.addEventListener("click", closePopup);
    if (overlay) overlay.addEventListener("click", function(e) { if (e.target === overlay) closePopup(); });
    if (btnLoad) btnLoad.addEventListener("click", loadPreviews);
    var btnQLPrev = document.getElementById("btnQLLinePrev");
    var btnQLNext = document.getElementById("btnQLLineNext");
    if (btnQLPrev) btnQLPrev.addEventListener("click", function() { moveLine(-1); });
    if (btnQLNext) btnQLNext.addEventListener("click", function() { moveLine(1); });
    var popupEl = document.getElementById('previewPopup');
    var handleEl = document.querySelector('.resize-handle');
    if (popupEl && handleEl) {
        var savedHeight = localStorage.getItem('typoCorePreviewPopupHeight');
        if (savedHeight && !isNaN(savedHeight)) popupEl.style.height = savedHeight + 'px';
        makeResizable(popupEl, handleEl);
    }

    window._prvGetPreviewSize = function() { return previewSize; };
    window._prvSetPreviewSize = function(v) {
        previewSize = Math.max(1, Math.min(999, v));
        updateSizeUI();
        var inp = document.getElementById("prvNumInput");
        if (inp && window._prvToolbarMode === 'A') inp.value = previewSize;
    };
    window._prvOpenFontPicker = function() {
        ensureUserFontsLoaded(function() {
            renderFontList();
            if (fontPicker) fontPicker.style.display = "flex";
        });
    };
    if (btnOpen) btnOpen.click();
}

function makeResizable(popupElement, handleElement) {
    let startY, startHeight;
    handleElement.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startY = e.clientY;
        startHeight = parseInt(document.defaultView.getComputedStyle(popupElement).height, 10);
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });
    function doDrag(e) {
        let newHeight = startHeight + (e.clientY - startY);
        if (newHeight > 150 && newHeight < 1080) {
            popupElement.style.height = newHeight + 'px';
            localStorage.setItem('typoCorePreviewPopupHeight', newHeight);
        }
    }
    function stopDrag() { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); }
}

// ========== FX MANAGER ==========
var fxCollapsedMode = localStorage.getItem("typoCoreFxCollapsed") === "1";
var fxSwatchTarget = null;
var recentColors = [];

var angleCanvas = document.getElementById("gradientAngleCanvas");
var angleDragging = false;
var angleCurrent = 0;

function setAngleFromRadians(rad) {
    var deg = rad * 180 / Math.PI;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    angleCurrent = Math.round(deg);
    document.getElementById("gradientAngleInput").value = angleCurrent;
    drawAngleCircle(angleCurrent);
}

function handleAngleDrag(e) {
    if (!angleDragging) return;
    var rect = angleCanvas.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var rad = Math.atan2(-dy, dx);
    setAngleFromRadians(rad);
}

if (angleCanvas) {
    angleCanvas.width = 20;
    angleCanvas.height = 20;
    angleCanvas.addEventListener("mousedown", function(e) {
        e.preventDefault();
        angleDragging = true;
        handleAngleDrag(e);
        document.addEventListener("mousemove", onAngleMouseMove);
        document.addEventListener("mouseup", onAngleMouseUp);
    });
    function onAngleMouseMove(e) { handleAngleDrag(e); }
    function onAngleMouseUp() {
        angleDragging = false;
        document.removeEventListener("mousemove", onAngleMouseMove);
        document.removeEventListener("mouseup", onAngleMouseUp);
        maybeAutoApply();
    }
}
var angleCtx = angleCanvas ? angleCanvas.getContext("2d") : null;

function drawAngleCircle(degrees) {
    if (!angleCanvas || !angleCtx) return;
    var w = angleCanvas.width, h = angleCanvas.height;
    angleCtx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, radius = 7;
    angleCtx.beginPath();
    angleCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
    angleCtx.strokeStyle = "#aaa"; angleCtx.lineWidth = 1; angleCtx.stroke();
    var rad = degrees * Math.PI / 180;
    var x = cx + radius * Math.cos(rad);
    var y = cy - radius * Math.sin(rad);
    angleCtx.beginPath();
    angleCtx.moveTo(cx, cy); angleCtx.lineTo(x, y);
    angleCtx.strokeStyle = "#aaa"; angleCtx.lineWidth = 1; angleCtx.stroke();
}
drawAngleCircle(0);

on("gradientAngleInput", "input", function(e) {
    var val = parseInt(e.target.value) || 0;
    angleCurrent = val;
    drawAngleCircle(val);
});

function setSwatchColor(el, c) {
    if (!el) return;
    if (c === null || c === undefined) {
        el.style.backgroundColor = "transparent";
        el.style.backgroundImage = "linear-gradient(45deg, #555 25%, transparent 25%, transparent 75%, #555 75%, #555 100%), linear-gradient(45deg, #555 25%, transparent 25%, transparent 75%, #555 75%, #555 100%)";
        el.style.backgroundSize = "10px 10px";
        el.style.backgroundPosition = "0 0, 5px 5px";
        el.removeAttribute("data-color");
        if (el.id === "strokeColor2") updateStrokeFieldsVisibility();
        return;
    }
    el.style.backgroundColor = "rgb(" + c.r + "," + c.g + "," + c.b + ")";
    el.style.backgroundImage = "none";
    el.setAttribute("data-color", JSON.stringify(c));
    if (el.id === "strokeColor2") updateStrokeFieldsVisibility();
}

// ===================== STROKE: ẩn/hiện Position/Type/Angle theo màu ô bên phải =====================
// Ô phải (strokeColor2) rỗng => chế độ mặc định: chỉ hiện Size.
// Ô phải có màu => hiện đầy đủ Position/Type/Angle.
// Chỉ set display của từng hàng con (không đụng tới maxHeight của .fx-section-body),
// nên không ảnh hưởng tới cơ chế Less/More (Less/More vẫn tính scrollHeight bình thường
// dựa trên các hàng đang thực sự hiển thị tại thời điểm đó).
function updateStrokeFieldsVisibility() {
    var c2 = getSwatchColor(document.getElementById("strokeColor2"));
    var full = !!c2;
    var posRow = document.getElementById("strokePositionRow");
    var typeRow = document.getElementById("strokeTypeRow");
    var angleRow = document.getElementById("strokeAngleRow");
    if (posRow) posRow.style.display = full ? "" : "none";
    if (typeRow) typeRow.style.display = full ? "" : "none";
    if (angleRow) angleRow.style.display = full ? "" : "none";
    // Nếu panel đang mở và không ở chế độ Less (đã có maxHeight cụ thể), cập nhật lại
    // chiều cao cho khớp nội dung mới, tránh dư/thiếu khoảng trống.
    if (typeof fxCollapsedMode !== "undefined" && !fxCollapsedMode && posRow) {
        var body = posRow.closest(".fx-section-body");
        if (body && body.style.maxHeight && body.style.maxHeight !== "0px") {
            body.style.maxHeight = body.scrollHeight + "px";
        }
    }
}

function getSwatchColor(el) {
    if (!el) return null;
    var d = el.getAttribute("data-color");
    if (d) {
        try {
            var c = JSON.parse(d);
            console.log("getSwatchColor parsed:", c);
            return c;
        } catch(e) { console.log("getSwatchColor error:", e); }
    }
    return null;
}
function addRecentColor(c) {
    recentColors = recentColors.filter(function(item) { return item.r !== c.r || item.g !== c.g || item.b !== c.b; });
    recentColors.unshift(c);
    if (recentColors.length > 5) recentColors.pop();
    localStorage.setItem("typoCoreRecentColors", JSON.stringify(recentColors));
}

function showColorPicker(targetSwatch, e) {
    fxSwatchTarget = targetSwatch;
    var popup = document.getElementById("colorPickerPopup");
    var fxPopup = document.getElementById("fxPopup");
    if (!popup || !fxPopup) return;
    if (popup.parentNode !== document.body) { document.body.appendChild(popup); }

    var recentDiv = popup.querySelector(".recent-colors");
    if (recentDiv) {
        recentDiv.innerHTML = "";
        recentColors.forEach(function(c) {
            var sw = document.createElement("div"); sw.className = "swatch";
            sw.style.backgroundColor = "rgb(" + c.r + "," + c.g + "," + c.b + ")";
            sw.addEventListener("click", (function(color) { return function() { setSwatchColor(fxSwatchTarget, color); popup.style.display = "none"; addRecentColor(color); maybeAutoApply(); }; })(c));
            recentDiv.appendChild(sw);
        });
    }

    var colorGrid = document.getElementById("colorGrid");
    if (colorGrid) {
        colorGrid.innerHTML = "";
        // Ô None (rỗng) đặt ở đầu lưới, ngay bên trái ô màu đen -> dùng để bỏ chọn màu (cần cho Stroke/Stroke Gradient)
        var noneDiv = document.createElement("div");
        noneDiv.textContent = "✕";
        noneDiv.style.cssText = "width:14px; height:14px; background:#333; color:#fff; display:flex; align-items:center; justify-content:center; font-size:10px; cursor:pointer; border:1px solid #666; border-radius:2px;";
        noneDiv.addEventListener("click", function() {
            setSwatchColor(fxSwatchTarget, null);
            popup.style.display = "none";
            maybeAutoApply();
        });
        colorGrid.appendChild(noneDiv);
        basicColors.forEach(function(hex) {
            var sw = document.createElement("div");
            sw.style.backgroundColor = hex; sw.style.border = "1px solid #666"; sw.style.borderRadius = "2px";
            sw.style.cursor = "pointer"; sw.style.width = "14px"; sw.style.height = "14px";
            sw.addEventListener("click", (function(colorHex) {
                return function() {
                    var r = parseInt(colorHex.slice(1,3),16), g = parseInt(colorHex.slice(3,5),16), b = parseInt(colorHex.slice(5,7),16);
                    setSwatchColor(fxSwatchTarget, {r:r, g:g, b:b});
                    popup.style.display = "none";
                    addRecentColor({r:r, g:g, b:b});
                    maybeAutoApply();
                };
            })(hex));
            colorGrid.appendChild(sw);
        });
    }

    if (cachedPopupWidth === 0 || cachedPopupHeight === 0) {
        popup.style.display = "flex"; popup.style.visibility = "hidden";
        cachedPopupWidth = popup.offsetWidth; cachedPopupHeight = popup.offsetHeight;
        popup.style.display = "none"; popup.style.visibility = "visible";
    }

    var top, left;
    if (e) {
        top = e.clientY + 8;
        left = e.clientX - cachedPopupWidth / 2;
        if (top + cachedPopupHeight > window.innerHeight) top = e.clientY - cachedPopupHeight - 8;
        if (left < 5) left = 5;
        if (left + cachedPopupWidth > window.innerWidth - 5) left = window.innerWidth - cachedPopupWidth - 5;
        popup.style.position = "fixed";
        popup.style.top = top + "px"; popup.style.left = left + "px";
        popup.style.bottom = "auto"; popup.style.right = "auto"; popup.style.transform = "none";
    } else {
        var applyBtn = document.getElementById("btnFxApply");
        if (applyBtn) {
            var rect = applyBtn.getBoundingClientRect();
            top = rect.top - cachedPopupHeight - 5;
            left = rect.left + rect.width / 2 - cachedPopupWidth / 2;
        } else { top = window.innerHeight / 2 - cachedPopupHeight / 2; left = window.innerWidth / 2 - cachedPopupWidth / 2; }
        popup.style.position = "fixed";
        popup.style.top = top + "px"; popup.style.left = left + "px";
        popup.style.bottom = "auto"; popup.style.right = "auto"; popup.style.transform = "none";
    }
    popup.style.display = "flex";

    if (!globalColorPickerListenerAdded) {
        document.addEventListener('click', function(e) {
            var popupEl = document.getElementById("colorPickerPopup");
            if (popupEl && popupEl.style.display === "flex") {
                if (popupEl.contains(e.target) || e.target.closest('.color-swatch') || e.target.closest('.quick-fgbg')) return;
                popupEl.style.display = "none";
            }
        });
        globalColorPickerListenerAdded = true;
    }
}

var swatches = document.querySelectorAll(".color-swatch");
swatches.forEach(function(sw) {
    if (sw.id === "textColorSwatch") return;
    sw.addEventListener("click", function(e) { showColorPicker(sw, e); });
    sw.addEventListener("dblclick", function(e) {
        e.stopPropagation();
        var popup = document.getElementById("colorPickerPopup");
        if (popup) popup.style.display = "none";
        var current = getSwatchColor(sw);
        var jsx = '(function(){var c=new SolidColor();c.rgb.red=' + current.r + ';c.rgb.green=' + current.g + ';c.rgb.blue=' + current.b + ';app.foregroundColor=c;var ok=app.showColorPicker();if(!ok) return "CANCEL";var fg=app.foregroundColor.rgb;return JSON.stringify({r:Math.round(fg.red),g:Math.round(fg.green),b:Math.round(fg.blue)});})()';
        cs.evalScript(jsx, function(result) {
            if (!result || result === "CANCEL" || result === "null" || result === "undefined") return;
            try { var c = JSON.parse(result); setSwatchColor(sw, c); addRecentColor(c); maybeAutoApply(); } catch(e) {}
        });
    });
});

(function() {
    var tcSwatch = document.getElementById("textColorSwatch");
    if (!tcSwatch) return;
    tcSwatch.addEventListener("click", function(e) { showColorPicker(tcSwatch, e); });
    tcSwatch.addEventListener("dblclick", function(e) {
        e.stopPropagation();
        var popup = document.getElementById("colorPickerPopup");
        if (popup) popup.style.display = "none";
        var current = getSwatchColor(tcSwatch);
        var jsx = '(function(){var c=new SolidColor();c.rgb.red=' + current.r + ';c.rgb.green=' + current.g + ';c.rgb.blue=' + current.b + ';app.foregroundColor=c;var ok=app.showColorPicker();if(!ok) return "CANCEL";var fg=app.foregroundColor.rgb;return JSON.stringify({r:Math.round(fg.red),g:Math.round(fg.green),b:Math.round(fg.blue)});})()';
        cs.evalScript(jsx, function(result) {
            if (!result || result === "CANCEL" || result === "null" || result === "undefined") return;
            try { var c = JSON.parse(result); setSwatchColor(tcSwatch, c); addRecentColor(c); maybeAutoApply(); } catch(e) {}
        });
    });
    setSwatchColor(tcSwatch, {r:0, g:0, b:0});
})();

on("btnOpenFX", "click", function() {
    var el = document.getElementById("fxOverlay");
    if (!el) return;
    var isOpen = el.style.display === "flex";
    el.style.display = isOpen ? "none" : "flex";
    localStorage.setItem("typoCoreFxState", isOpen ? "closed" : "open");
    
    // Nếu đang mở và trạng thái Less đã lưu, áp dụng lại
    if (!isOpen) {
        // Khi mở, áp dụng trạng thái Less từ localStorage
        setTimeout(function() {
            var savedCollapsed = localStorage.getItem("typoCoreFxCollapsed") === "1";
            fxCollapsedMode = savedCollapsed;
            var toggleBtn = document.getElementById("btnFxToggleMode");
            if (toggleBtn) toggleBtn.textContent = savedCollapsed ? 'More' : 'Less';
            document.querySelectorAll('.fx-section-body').forEach(function(body) {
                if (savedCollapsed) {
                    body.style.maxHeight = '0';
                    body.style.overflow = 'hidden';
                    body.style.padding = '0';
                    body.style.margin = '0';
                } else {
                    body.style.maxHeight = body.scrollHeight + 'px';
                    body.style.overflow = '';
                    body.style.padding = '';
                    body.style.margin = '';
                }
            });
        }, 50);
    }
});

on("btnFxClose", "click", function() {
    var el = document.getElementById("fxOverlay");
    if (el) {
        el.style.display = "none";
        localStorage.setItem("typoCoreFxState", "closed");
        // Reset tất cả inline style của body để tránh lỗi giao diện lần sau
        document.querySelectorAll('.fx-section-body').forEach(function(body) {
            body.style.maxHeight = '';
            body.style.overflow = '';
            body.style.padding = '';
            body.style.margin = '';
        });
    }
});

on("btnFxToggleMode", "click", function() {
    fxCollapsedMode = !fxCollapsedMode;
    this.textContent = fxCollapsedMode ? 'More' : 'Less';
    localStorage.setItem("typoCoreFxCollapsed", fxCollapsedMode ? "1" : "0");

    document.querySelectorAll('.fx-section-body').forEach(function(body) {
        if (fxCollapsedMode) {
            body.style.maxHeight = '0';
            body.style.overflow = 'hidden';
            body.style.padding = '0';
            body.style.margin = '0';
        } else {
            body.style.maxHeight = body.scrollHeight + 'px';
            setTimeout(function() {
                body.style.overflow = '';
                body.style.padding = '';
                body.style.margin = '';
            }, 200);
        }
    });
});

function getSelectedLayersIDs() {
    var ids = [];
    try {
        var ref = new ActionReference();
        ref.putProperty(stringIDToTypeID("property"), stringIDToTypeID("targetLayersIDs"));
        ref.putEnumerated(stringIDToTypeID("document"), stringIDToTypeID("ordinal"), stringIDToTypeID("targetEnum"));
        var desc = executeActionGet(ref);
        var list = desc.getList(stringIDToTypeID("targetLayersIDs"));
        for (var i = 0; i < list.count; i++) ids.push(list.getReference(i).getIdentifier());
    } catch(e) { ids.push(app.activeDocument.activeLayer.id); }
    return ids;
}

function selectLayerByID(id) {
    var ref = new ActionReference();
    ref.putIdentifier(charIDToTypeID("Lyr "), id);
    var desc = new ActionDescriptor();
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putBoolean(charIDToTypeID("MkVs"), false);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function bindSlider(sliderId, valId) {
    var slider = document.getElementById(sliderId);
    var input = document.getElementById(valId);
    if (!slider || !input) return;
    slider.addEventListener("input", function() { input.value = Math.round(this.value); });
    input.addEventListener("input", function() {
        var v = parseFloat(this.value);
        if (isNaN(v)) v = 0;
        v = Math.min(parseFloat(slider.max), Math.max(parseFloat(slider.min), v));
        slider.value = v; this.value = v;
    });
    input.value = Math.round(slider.value);
}
bindSlider("strokeSize1", "strokeSize1Val");
bindSlider("textColorFill", "textColorFillVal");
bindSlider("shadowOpacity", "shadowOpacityVal");
bindSlider("shadowDistance", "shadowDistanceVal");
bindSlider("shadowSpread", "shadowSpreadVal");
bindSlider("shadowSize", "shadowSizeVal");
bindSlider("glowOpacity", "glowOpacityVal");
bindSlider("glowSize", "glowSizeVal");
bindSlider("glowSpread", "glowSpreadVal");
bindSlider("textColorOpacity", "textColorOpacityVal");

// ===== Stroke Angle =====
var strokeAngleCanvas = document.getElementById("strokeAngleCanvas");
var strokeAngleInput = document.getElementById("strokeAngleInput");
var strokeAngleDragging = false;

function drawStrokeAngleCircle(deg) {
    if (!strokeAngleCanvas) return;
    var ctx = strokeAngleCanvas.getContext("2d");
    var w = strokeAngleCanvas.width, h = strokeAngleCanvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w/2, cy = h/2, r = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1; ctx.stroke();
    var rad = deg * Math.PI / 180;
    var x = cx + r * Math.cos(rad);
    var y = cy - r * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1; ctx.stroke();
}

function handleStrokeAngleDrag(e) {
    if (!strokeAngleDragging) return;
    var rect = strokeAngleCanvas.getBoundingClientRect();
    var cx = rect.left + rect.width/2;
    var cy = rect.top + rect.height/2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var rad = Math.atan2(-dy, dx);
    var deg = rad * 180 / Math.PI;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    var val = Math.round(deg);
    strokeAngleInput.value = val;
    drawStrokeAngleCircle(val);
}

if (strokeAngleCanvas) {
    strokeAngleCanvas.addEventListener("mousedown", function(e) {
        e.preventDefault();
        strokeAngleDragging = true;
        handleStrokeAngleDrag(e);
        document.addEventListener("mousemove", handleStrokeAngleDrag);
        document.addEventListener("mouseup", function() {
            strokeAngleDragging = false;
            document.removeEventListener("mousemove", handleStrokeAngleDrag);
            maybeAutoApply();
        });
    });
}

if (strokeAngleInput) {
    strokeAngleInput.addEventListener("input", function() {
        var deg = parseFloat(this.value) || 0;
        drawStrokeAngleCircle(deg);
    });
    drawStrokeAngleCircle(parseFloat(strokeAngleInput.value) || 0);
}

// SYNC với debounce
var syncTimeout = null;
function performFxSync(opts) {
    opts = opts || {};
    var btn = opts.btn || document.getElementById("btnFxSync");
    var silent = !!opts.silent;
    cs.evalScript("getFXData()", function(json) {
        if (!json || json === "NO_DOC" || json.indexOf("ERROR:") === 0) {
            if (!silent) alert("FX not found: " + (json || "undefined"));
            if (btn && !silent) flash(btn, "NO_FX");
            if (opts.onDone) opts.onDone(false);
            return;
        }
        try {
            var data = JSON.parse(json);
            var fxVis = loadFxFeatureVis();

// Lưu màu chữ (bỏ qua nếu Text Color đang bị ẩn trong FX Studio)
var textColorCheck = document.getElementById("enableTextColor");
var textColorSwatch = document.getElementById("textColorSwatch");
if (fxVis.textColor && data.textColor) {
    syncedTextColor = data.textColor;
    if (textColorCheck) textColorCheck.checked = true;
    if (textColorSwatch) setSwatchColor(textColorSwatch, data.textColor);
    // Opacity (khớp với layer.opacity mà Apply sẽ đọc lại)
    var tcOpacity = (data.textColor.opacity !== undefined && data.textColor.opacity !== null) ? data.textColor.opacity : 100;
    document.getElementById("textColorOpacity").value = tcOpacity;
    document.getElementById("textColorOpacityVal").value = Math.round(tcOpacity);
    // Fill (khớp với layer.fillOpacity mà Apply sẽ đọc lại)
    var tcFill = (data.textColor.fill !== undefined && data.textColor.fill !== null) ? data.textColor.fill : 100;
    document.getElementById("textColorFill").value = tcFill;
    document.getElementById("textColorFillVal").value = Math.round(tcFill);
} else {
    syncedTextColor = null;
    if (textColorCheck) textColorCheck.checked = false;
    if (textColorSwatch) setSwatchColor(textColorSwatch, {r:0, g:0, b:0});
    document.getElementById("textColorOpacity").value = 100;
    document.getElementById("textColorOpacityVal").value = 100;
    document.getElementById("textColorFill").value = 100;
    document.getElementById("textColorFillVal").value = 100;
}
                // Gradient
                var gradCheck = document.querySelector('[data-fx="gradientFill"]');
                if (gradCheck) gradCheck.checked = false;
                document.getElementById("gradientAngleInput").value = 0;
                setSwatchColor(document.getElementById("gradientColor1"), {r:255,g:255,b:255});
                setSwatchColor(document.getElementById("gradientColor2"), {r:255,g:255,b:255});

                // Stroke
                var frameCheck = document.querySelector('[data-fx="frameFX"]');
                if (frameCheck) frameCheck.checked = false;
                document.getElementById("strokeSize1").value = 2;
                document.getElementById("strokeSize1Val").value = 2;
                document.getElementById("strokePosition").value = "outsetFrame";
                document.getElementById("strokeGradientType").value = "linear";
                document.getElementById("strokeAngleInput").value = 0;
                drawStrokeAngleCircle(0);
                setSwatchColor(document.getElementById("strokeColor1"), {r:255,g:255,b:255});
                setSwatchColor(document.getElementById("strokeColor2"), null);

               
                // Bỏ qua sync Gradient nếu đang bị ẩn trong FX Studio
                if (fxVis.gradientFill && data.gradientFill) {
                    if (gradCheck) gradCheck.checked = data.gradientFill.enabled;
                    document.getElementById("gradientAngleInput").value = data.gradientFill.angle || 0;
                    if (data.gradientFill.colors && data.gradientFill.colors.length > 0) {
                        setSwatchColor(document.getElementById("gradientColor1"), data.gradientFill.colors[0]);
                        if (data.gradientFill.colors.length > 1) setSwatchColor(document.getElementById("gradientColor2"), data.gradientFill.colors[1]);
                    }
                    drawAngleCircle(data.gradientFill.angle || 0);
                }

                // Bỏ qua sync Stroke nếu đang bị ẩn trong FX Studio
                if (fxVis.frameFX && data.strokes && data.strokes.length > 0) {
    if (frameCheck) frameCheck.checked = true;
    var s1 = data.strokes[0];
    document.getElementById("strokeSize1").value = s1.size;
    document.getElementById("strokeSize1Val").value = Math.round(s1.size);
    // Xử lý position (style)
    var styleMap = { "outsetFrame": "outsetFrame", "insetFrame": "insetFrame", "centerFrame": "centerFrame" };
    var styleVal = styleMap[s1.style] || "outsetFrame";
    document.getElementById("strokePosition").value = styleVal;


    // Nếu là gradient
    if (s1.paintType === "gradientFill" && s1.gradient) {
        var grad = s1.gradient;
        document.getElementById("strokeGradientType").value = grad.type || "linear";
        document.getElementById("strokeAngleInput").value = grad.angle || 0;
        drawStrokeAngleCircle(grad.angle || 0);
        if (grad.colors && grad.colors.length >= 2) {
            setSwatchColor(document.getElementById("strokeColor1"), grad.colors[0]);
            setSwatchColor(document.getElementById("strokeColor2"), grad.colors[1]);
        } else if (grad.colors && grad.colors.length === 1) {
            setSwatchColor(document.getElementById("strokeColor1"), grad.colors[0]);
            setSwatchColor(document.getElementById("strokeColor2"), null);
        } else {
            setSwatchColor(document.getElementById("strokeColor1"), null);
            setSwatchColor(document.getElementById("strokeColor2"), null);
        }
    } else {
        // solid
        document.getElementById("strokeGradientType").value = "linear";
        document.getElementById("strokeAngleInput").value = 0;
        drawStrokeAngleCircle(0);
        setSwatchColor(document.getElementById("strokeColor1"), s1.color || null);
        setSwatchColor(document.getElementById("strokeColor2"), null);
    }
}

  
                  // ===== DROP SHADOW ===== (bỏ qua nếu đang bị ẩn trong FX Studio)
                var shadowCheck = document.querySelector('[data-fx="dropShadow"]');
                if (fxVis.dropShadow && data.dropShadow) {
                    if (shadowCheck) shadowCheck.checked = data.dropShadow.enabled;
                    document.getElementById("shadowBlendMode").value = data.dropShadow.mode || "normal";
                    document.getElementById("shadowOpacity").value = data.dropShadow.opacity || 100;
                    document.getElementById("shadowOpacityVal").value = Math.round(data.dropShadow.opacity || 100);
                    document.getElementById("shadowAngleInput").value = data.dropShadow.angle || 30;
                    drawShadowAngleCircle(data.dropShadow.angle || 30);
                    var syncedDistance = parseFloat(data.dropShadow.distance);
                    if (isNaN(syncedDistance)) syncedDistance = 0;
                    document.getElementById("shadowDistance").value = syncedDistance;
                    document.getElementById("shadowDistanceVal").value = Math.round(syncedDistance);
                    document.getElementById("shadowSpread").value = data.dropShadow.spread || 20;
                    document.getElementById("shadowSpreadVal").value = Math.round(data.dropShadow.spread || 20);
                    document.getElementById("shadowSize").value = data.dropShadow.size || 100;
                    document.getElementById("shadowSizeVal").value = Math.round(data.dropShadow.size || 100);
                    setSwatchColor(document.getElementById("shadowColor"), data.dropShadow.color || {r:255, g:255, b:255});
                } else {
                    // Reset về mặc định khi layer không có drop shadow
                    if (shadowCheck) shadowCheck.checked = false;
                    document.getElementById("shadowBlendMode").value = "normal";
                    document.getElementById("shadowOpacity").value = 100;
                    document.getElementById("shadowOpacityVal").value = 100;
                    document.getElementById("shadowAngleInput").value = 30;
                    drawShadowAngleCircle(30);
                    document.getElementById("shadowDistance").value = 0;
                    document.getElementById("shadowDistanceVal").value = 0;
                    document.getElementById("shadowSpread").value = 20;
                    document.getElementById("shadowSpreadVal").value = 20;
                    document.getElementById("shadowSize").value = 100;
                    document.getElementById("shadowSizeVal").value = 100;
                    setSwatchColor(document.getElementById("shadowColor"), {r:255, g:255, b:255});
                }

                // ===== OUTER GLOW ===== (bỏ qua nếu đang bị ẩn trong FX Studio)
                var glowCheck = document.querySelector('[data-fx="outerGlow"]');
                if (fxVis.outerGlow && data.outerGlow) {
                    if (glowCheck) glowCheck.checked = data.outerGlow.enabled;
                    document.getElementById("glowOpacity").value = data.outerGlow.opacity || 100;
                    document.getElementById("glowOpacityVal").value = Math.round(data.outerGlow.opacity || 100);
                    document.getElementById("glowSize").value = data.outerGlow.blur || 20;
                    document.getElementById("glowSizeVal").value = Math.round(data.outerGlow.blur || 20);
                    document.getElementById("glowSpread").value = data.outerGlow.chokeMatte || 5;
                    document.getElementById("glowSpreadVal").value = Math.round(data.outerGlow.chokeMatte || 5);
                    setSwatchColor(document.getElementById("glowColor"), data.outerGlow.color || {r:255, g:255, b:255});
                } else {
                    // Reset về mặc định khi layer không có Outer Glow
                    if (glowCheck) glowCheck.checked = false;
                    document.getElementById("glowOpacity").value = 100;
                    document.getElementById("glowOpacityVal").value = 100;
                    document.getElementById("glowSize").value = 20;
                    document.getElementById("glowSizeVal").value = 20;
                    document.getElementById("glowSpread").value = 5;
                    document.getElementById("glowSpreadVal").value = 5;
                    setSwatchColor(document.getElementById("glowColor"), {r:255, g:255, b:255});
                }

                if (btn && !silent) flash(btn, "OK");
                if (opts.onDone) opts.onDone(true);
            } catch(e) {
                if (!silent) alert("JSON parse error: " + e.message);
                if (btn && !silent) flash(btn, "ERROR");
                if (opts.onDone) opts.onDone(false);
            }
        });
}
on("btnFxSync", "click", function() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(function() {
        performFxSync({ btn: document.getElementById("btnFxSync") });
    }, 200);
});

// ===================== AUTO FX (độc lập với Auto Load Text) =====================
// Khi bật: chỉ tự động APPLY thông số đang chỉnh trong FX Studio xuống layer đang chọn
// (qua maybeAutoApply, được gọi mỗi khi người dùng đổi giá trị trong panel).
// KHÔNG còn tự động SYNC (đọc ngược FX từ layer vào panel) khi đổi layer/nội dung chữ,
// để tránh ghi đè thông số người dùng đang chỉnh trong FX Studio.
// Vẫn cập nhật preview QuickLayout khi nội dung chữ thay đổi (không liên quan tới sync FX).
function autoFxPoll() {
    cs.evalScript('getText()', function(text) {
        if (!text || text === "null" || text === "undefined" || text.indexOf("ERROR") === 0) return;
        if (text === lastAutoFxText) return;
        lastAutoFxText = text;
        // Load: cập nhật lưới preview QuickLayout nếu có (không phụ thuộc setting Auto Load Text)
        if (typeof window.updatePreviewIfNeeded === "function") window.updatePreviewIfNeeded();
    });
}
function startAutoFx() {
    if (autoFxInterval) return;
    lastAutoFxText = null; // đảm bảo lần đầu bật sẽ load + sync ngay 1 lần
    autoFxPoll();
    autoFxInterval = setInterval(autoFxPoll, 1500);
}
function stopAutoFx() {
    if (autoFxInterval) { clearInterval(autoFxInterval); autoFxInterval = null; }
}

// Nút Apply (ghi đè) – hỗ trợ multi-layer, luôn hiển thị spinner
function performFxApply(opts) {
    opts = opts || {};
    var btn = opts.btn || document.getElementById("btnFxApply");
    var silent = !!opts.silent;
    var payload = {};
    var fxVis = loadFxFeatureVis();

    var gradCheck = document.querySelector('[data-fx="gradientFill"]');
    if (fxVis.gradientFill && gradCheck && gradCheck.checked) {
        payload.gradientFill = {
            enabled: true,
            angle: parseFloat(document.getElementById("gradientAngleInput").value) || 0,
            type: "linear",
            colors: [getSwatchColor(document.getElementById("gradientColor1")), getSwatchColor(document.getElementById("gradientColor2"))]
        };
    }

       // Stroke
    var strokes = [];
    var frameCheck = document.querySelector('[data-fx="frameFX"]');
    if (fxVis.frameFX && frameCheck && frameCheck.checked) {
        var color1 = getSwatchColor(document.getElementById("strokeColor1"));
        var color2 = getSwatchColor(document.getElementById("strokeColor2"));
        var size = parseFloat(document.getElementById("strokeSize1").value) || 1;
        var position = document.getElementById("strokePosition").value;
        var gradientType = document.getElementById("strokeGradientType").value;
        var angle = parseFloat(document.getElementById("strokeAngleInput").value) || 0;
        
        if (color1 || color2) {
            var stroke = {
                enabled: true,
                size: size,
                style: position // "outsetFrame", "insetFrame", "centerFrame"
            };
            if (color1 && color2) {
                stroke.paintType = "gradientFill";
                stroke.gradient = {
                    type: gradientType,
                    angle: angle,
                    colors: [color1, color2],
                    scale: 100
                };
            } else {
                stroke.paintType = "solidColor";
                stroke.color = color1 || color2;
            }
            strokes.push(stroke);
        }
    }
    if (strokes.length > 0) payload.strokes = strokes;
    
   // Drop Shadow
var shadowCheck = document.querySelector('[data-fx="dropShadow"]');
if (fxVis.dropShadow && shadowCheck && shadowCheck.checked) {
    var blendMode = document.getElementById("shadowBlendMode").value;
    var opacity = parseFloat(document.getElementById("shadowOpacity").value) || 100;
    var angle = parseFloat(document.getElementById("shadowAngleInput").value) || 30;
    var distance = parseFloat(document.getElementById("shadowDistance").value);
    if (isNaN(distance)) distance = 5;
    var spread = parseFloat(document.getElementById("shadowSpread").value) || 0;
    var size = parseFloat(document.getElementById("shadowSize").value) || 5;
    var color = getSwatchColor(document.getElementById("shadowColor"));
    payload.dropShadow = {
        enabled: true,
        mode: blendMode,
        opacity: opacity,
        angle: angle,
        distance: distance,
        spread: spread,
        size: size,
        color: color,
        useGlobalLight: false
    };
}

    // Outer Glow
    var glowCheck = document.querySelector('[data-fx="outerGlow"]');
    if (fxVis.outerGlow && glowCheck && glowCheck.checked) {
        var glowOpacity = parseFloat(document.getElementById("glowOpacity").value) || 100;
        var glowBlur = parseFloat(document.getElementById("glowSize").value) || 20;
        var glowChoke = parseFloat(document.getElementById("glowSpread").value) || 5;
        var glowColorVal = getSwatchColor(document.getElementById("glowColor"));
        payload.outerGlow = {
            enabled: true,
            opacity: glowOpacity,
            blur: glowBlur,
            chokeMatte: glowChoke,
            color: glowColorVal || {r:255, g:255, b:255}
        };
    }

    // Text Color: đọc từ swatch nếu checkbox được bật
    var textColorCheck = document.getElementById("enableTextColor");
    if (fxVis.textColor && textColorCheck && textColorCheck.checked) {
        var tcSwatch = document.getElementById("textColorSwatch");
        var tc = getSwatchColor(tcSwatch);
        var opacity = parseFloat(document.getElementById("textColorOpacity").value) || 100;
        var fill = parseFloat(document.getElementById("textColorFill").value) || 100;
        if (tc) {
            payload.textColor = {
                r: tc.r,
                g: tc.g,
                b: tc.b,
                opacity: opacity,
                fill: fill
            };
        }
    }
    var jsonStr = JSON.stringify(payload);
    var spinner = document.getElementById("fxSpinner");
    
    // Luôn hiển thị spinner khi bắt đầu apply (dù 1 layer hay nhiều layer)
    if (spinner) spinner.style.display = "inline-block";
    
    // Gọi apply lên tất cả layer được chọn
    var expr = 'applyFXToSelectedLayers(' + JSON.stringify(jsonStr) + ')';
    _exec(expr, silent ? null : btn, function(res) {
        if (spinner) spinner.style.display = "none";
        if (res !== "OK" && !silent) alert("Apply failed: " + res);
        if (opts.onDone) opts.onDone(res === "OK");
    });
}
on("btnFxApply", "click", function() {
    performFxApply({ btn: this });
});

// ===================== CLEAR – đưa toàn bộ thông số FX Studio về mặc định =====================
function resetFxStudioToDefaults() {
    // Gradient
    var gradCheck = document.querySelector('[data-fx="gradientFill"]');
    if (gradCheck) gradCheck.checked = false;
    document.getElementById("gradientAngleInput").value = 0;
    setSwatchColor(document.getElementById("gradientColor1"), {r:255, g:255, b:255});
    setSwatchColor(document.getElementById("gradientColor2"), {r:255, g:255, b:255});
    drawAngleCircle(0);

    // Stroke
    var frameCheck = document.querySelector('[data-fx="frameFX"]');
    if (frameCheck) frameCheck.checked = false;
    document.getElementById("strokeSize1").value = 2;
    document.getElementById("strokeSize1Val").value = 2;
    document.getElementById("strokePosition").value = "outsetFrame";
    document.getElementById("strokeGradientType").value = "linear";
    document.getElementById("strokeAngleInput").value = 0;
    drawStrokeAngleCircle(0);
    setSwatchColor(document.getElementById("strokeColor1"), {r:255, g:255, b:255});
    setSwatchColor(document.getElementById("strokeColor2"), null);

    // Drop Shadow
    var shadowCheck = document.querySelector('[data-fx="dropShadow"]');
    if (shadowCheck) shadowCheck.checked = false;
    document.getElementById("shadowBlendMode").value = "normal";
    document.getElementById("shadowOpacity").value = 100;
    document.getElementById("shadowOpacityVal").value = 100;
    document.getElementById("shadowAngleInput").value = 30;
    drawShadowAngleCircle(30);
    document.getElementById("shadowDistance").value = 0;
    document.getElementById("shadowDistanceVal").value = 0;
    document.getElementById("shadowSpread").value = 20;
    document.getElementById("shadowSpreadVal").value = 20;
    document.getElementById("shadowSize").value = 100;
    document.getElementById("shadowSizeVal").value = 100;
    setSwatchColor(document.getElementById("shadowColor"), {r:255, g:255, b:255});

    // Outer Glow
    var glowCheck = document.querySelector('[data-fx="outerGlow"]');
    if (glowCheck) glowCheck.checked = false;
    document.getElementById("glowOpacity").value = 100;
    document.getElementById("glowOpacityVal").value = 100;
    document.getElementById("glowSize").value = 20;
    document.getElementById("glowSizeVal").value = 20;
    document.getElementById("glowSpread").value = 5;
    document.getElementById("glowSpreadVal").value = 5;
    setSwatchColor(document.getElementById("glowColor"), {r:255, g:255, b:255});

    // Text Color
    var textColorCheck = document.getElementById("enableTextColor");
    if (textColorCheck) textColorCheck.checked = false;
    syncedTextColor = null;
    setSwatchColor(document.getElementById("textColorSwatch"), {r:0, g:0, b:0});
    document.getElementById("textColorOpacity").value = 100;
    document.getElementById("textColorOpacityVal").value = 100;
    document.getElementById("textColorFill").value = 100;
    document.getElementById("textColorFillVal").value = 100;
}
on("btnFxClear", "click", function() {
    resetFxStudioToDefaults();
    flash(this, "OK");
});

// ===================== AUTO APPLY (chỉ hoạt động khi Auto FX đang bật) =====================
// Khi thay đổi thông số trong FX Studio (checkbox, select, slider lúc thả chuột, xoay angle lúc thả chuột,
// hoặc chọn màu) -> tự động Apply lại, có debounce để tránh gọi Photoshop liên tục.
var autoApplyTimeout = null;
function maybeAutoApply() {
    if (!loadVis().autoFX) return;
    if (autoApplyTimeout) clearTimeout(autoApplyTimeout);
    autoApplyTimeout = setTimeout(function() {
        performFxApply({ silent: true });
    }, 300);
}
var fxPopupEl = document.getElementById("fxPopup");
if (fxPopupEl) {
    // 'change' bắt được: checkbox toggle, select đổi giá trị, và slider/number input LÚC THẢ CHUỘT (không bắn liên tục lúc kéo)
    fxPopupEl.addEventListener("change", function() { maybeAutoApply(); });
}

// Nút FG và BG trong color picker popup (dùng cho tất cả swatch)
function applyPSColorToSwatch(type) {
    if (!fxSwatchTarget) { 
        alert("Select a color swatch first"); 
        return; 
    }
    var jsx = type === "FG"
        ? '(function(){var c=app.foregroundColor.rgb;return JSON.stringify({r:Math.round(c.red),g:Math.round(c.green),b:Math.round(c.blue)});})()'
        : '(function(){var c=app.backgroundColor.rgb;return JSON.stringify({r:Math.round(c.red),g:Math.round(c.green),b:Math.round(c.blue)});})()'
    cs.evalScript(jsx, function(col) {
        if (!col || col === "null" || col === "undefined") return;
        try {
            var c = JSON.parse(col);
            setSwatchColor(fxSwatchTarget, c);
            var popup = document.getElementById("colorPickerPopup");
            if (popup) popup.style.display = "none";
            addRecentColor(c);
            maybeAutoApply();
        } catch(e) {}
    });
}
var fgBtn = document.querySelector("#colorPickerPopup .fg-color");
if (fgBtn) fgBtn.addEventListener("click", function() { applyPSColorToSwatch("FG"); });
var bgBtn = document.querySelector("#colorPickerPopup .bg-color");
if (bgBtn) bgBtn.addEventListener("click", function() { applyPSColorToSwatch("BG"); });

// Nút FG/BG duy nhất dành riêng cho gradient (lấy FG cho color1, BG cho color2)
var quickFgBg = document.querySelector('.quick-fgbg');
if (quickFgBg) {
    quickFgBg.addEventListener('click', function(e) {
        e.stopPropagation();
        var swatch1 = document.getElementById('gradientColor1');
        var swatch2 = document.getElementById('gradientColor2');
        if (!swatch1 || !swatch2) return;
        cs.evalScript(
            '(function(){var fg=app.foregroundColor.rgb,bg=app.backgroundColor.rgb;return JSON.stringify({fg:{r:Math.round(fg.red),g:Math.round(fg.green),b:Math.round(fg.blue)},bg:{r:Math.round(bg.red),g:Math.round(bg.green),b:Math.round(bg.blue)}});})()',
            function(res) {
                if (!res || res === "null" || res === "undefined") return;
                try {
                    var d = JSON.parse(res);
                    setSwatchColor(swatch1, d.fg);
                    setSwatchColor(swatch2, d.bg);
                    addRecentColor(d.fg);
                    addRecentColor(d.bg);
                } catch(e) {}
            }
        );
        var popup = document.getElementById('colorPickerPopup');
        if (popup) popup.style.display = 'none';
    });
}
drawAngleCircle(0);

// ========== PRV NEW TOOLBAR ==========
window._prvToolbarMode = 'A';
(function initPrvToolbar() {
    var btnLeft   = document.getElementById("btnPrvLeft");
    var btnMinus  = document.getElementById("btnPrvMinus");
    var btnPlus   = document.getElementById("btnPrvPlus");
    var btnSpinUp = document.getElementById("btnPrvSpinUp");
    var btnSpinDn = document.getElementById("btnPrvSpinDn");
    var numInput  = document.getElementById("prvNumInput");
    var btnMode   = document.getElementById("btnPreviewMode");
    var _prvStep  = 3;

    if (!numInput) return;

    function getNum() { return parseInt(numInput.value) || 1; }
    function setNum(v) { numInput.value = Math.max(1, Math.min(999, v)); }

    function switchMode(mode) {
        window._prvToolbarMode = mode;
        localStorage.setItem("typoCorePrvMode", mode);
        if (mode === 'A') {
            if (btnLeft) btnLeft.textContent = 'Font';
            var sz = window._prvGetPreviewSize ? window._prvGetPreviewSize() : 14;
            setNum(sz);
            if (btnSpinUp) btnSpinUp.style.display = 'none';
            if (btnSpinDn) btnSpinDn.style.display = 'none';
        } else {
            if (btnLeft) btnLeft.textContent = 'Center';
            setNum(_prvStep);
            if (btnSpinUp) btnSpinUp.style.display = '';
            if (btnSpinDn) btnSpinDn.style.display = '';
        }
        var sc = document.getElementById("sizeControl");
        if (sc) sc.setAttribute("data-mode", mode === 'A' ? "font" : "center");
    }

    if (btnMode) btnMode.addEventListener("click", function() { switchMode(window._prvToolbarMode === 'A' ? 'B' : 'A'); });
    if (btnLeft) btnLeft.addEventListener("click", function() {
        if (window._prvToolbarMode === 'A') { if (window._prvOpenFontPicker) window._prvOpenFontPicker(); }
        else { runAlignCenter(this); }
    });
    if (btnSpinUp) btnSpinUp.addEventListener("click", function(e) { e.stopPropagation(); var v = getNum() + 1; setNum(v); if (window._prvToolbarMode === 'A') { if (window._prvSetPreviewSize) window._prvSetPreviewSize(v); } else { _prvStep = getNum(); } });
    if (btnSpinDn) btnSpinDn.addEventListener("click", function(e) { e.stopPropagation(); var v = Math.max(1, getNum() - 1); setNum(v); if (window._prvToolbarMode === 'A') { if (window._prvSetPreviewSize) window._prvSetPreviewSize(v); } else { _prvStep = getNum(); } });
    if (numInput) numInput.addEventListener("change", function() {
        var v = Math.max(1, parseInt(this.value) || 1);
        setNum(v);
        if (window._prvToolbarMode === 'A') { if (window._prvSetPreviewSize) window._prvSetPreviewSize(v); }
        else { _prvStep = v; localStorage.setItem("typoCorePrvStep", v); }
    });
    if (btnMinus) btnMinus.addEventListener("click", function() {
        if (window._prvToolbarMode === 'A') {
            var sz = window._prvGetPreviewSize ? window._prvGetPreviewSize() : getNum();
            if (window._prvSetPreviewSize) window._prvSetPreviewSize(sz - 1);
            setNum(window._prvGetPreviewSize ? window._prvGetPreviewSize() : sz - 1);
        } else { _exec('applyNow(' + (-_prvStep) + ',' + (-_prvStep) + ')', this); }
    });
    if (btnPlus) btnPlus.addEventListener("click", function() {
        if (window._prvToolbarMode === 'A') {
            var sz = window._prvGetPreviewSize ? window._prvGetPreviewSize() : getNum();
            if (window._prvSetPreviewSize) window._prvSetPreviewSize(sz + 1);
            setNum(window._prvGetPreviewSize ? window._prvGetPreviewSize() : sz + 1);
        } else { _exec('applyNow(' + _prvStep + ',' + _prvStep + ')', this); }
    });

    var savedPrvMode = localStorage.getItem("typoCorePrvMode") || 'A';
    var savedPrvStep = parseInt(localStorage.getItem("typoCorePrvStep")) || 3;
    _prvStep = savedPrvStep;
    switchMode(savedPrvMode);
})();

// ===== KHỞI ĐỘNG =====
function makeFxResizable() {
    var scrollDiv = document.querySelector('.fx-scroll');
    var handle = document.querySelector('.fx-resize-handle');
    if (!scrollDiv || !handle) return;
    var savedHeight = localStorage.getItem("typoCoreFxScrollHeight");
    if (savedHeight) scrollDiv.style.height = savedHeight + "px";
    var startY, startHeight;
    handle.addEventListener("mousedown", function(e) {
        e.preventDefault();
        startY = e.clientY;
        startHeight = scrollDiv.offsetHeight;
        document.addEventListener("mousemove", doDrag);
        document.addEventListener("mouseup", stopDrag);
    });
    function doDrag(e) {
        var newHeight = startHeight + (e.clientY - startY);
        newHeight = Math.max(110, Math.min(600, newHeight));
        scrollDiv.style.height = newHeight + "px";
        localStorage.setItem("typoCoreFxScrollHeight", newHeight);
    }
    function stopDrag() { document.removeEventListener("mousemove", doDrag); document.removeEventListener("mouseup", stopDrag); }
    var fxOverlay = document.getElementById("fxOverlay");
    if (fxOverlay) {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === "style" && fxOverlay.style.display === "flex") {
                    var saved = localStorage.getItem("typoCoreFxScrollHeight");
                    if (saved) scrollDiv.style.height = saved + "px";
                }
            });
        });
        observer.observe(fxOverlay, { attributes: true });
    }
}

// Thanh kéo chỉnh chiều cao (giống cơ chế .fx-resize-handle) — dùng lại cho cả 2 thanh của Typer Box
function makeVerticalResizable(el, handle, storageKey, minH, maxH, overlayEl) {
    if (!el || !handle) return;
    var saved = localStorage.getItem(storageKey);
    if (saved) el.style.height = saved + "px";
    var startY, startHeight;
    handle.addEventListener("mousedown", function(e) {
        e.preventDefault();
        startY = e.clientY;
        startHeight = el.offsetHeight;
        document.addEventListener("mousemove", doDrag);
        document.addEventListener("mouseup", stopDrag);
    });
    function doDrag(e) {
        var newHeight = startHeight + (e.clientY - startY);
        newHeight = Math.max(minH, Math.min(maxH, newHeight));
        el.style.height = newHeight + "px";
        localStorage.setItem(storageKey, newHeight);
    }
    function stopDrag() { document.removeEventListener("mousemove", doDrag); document.removeEventListener("mouseup", stopDrag); }
    if (overlayEl) {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === "style" && overlayEl.style.display !== "none") {
                    var s = localStorage.getItem(storageKey);
                    if (s) el.style.height = s + "px";
                }
            });
        });
        observer.observe(overlayEl, { attributes: true });
    }
}
function makeTexterResizable() {
    var overlayEl = document.getElementById("texterOverlay");
    makeVerticalResizable(
        document.getElementById("pasteTextBlock"),
        document.getElementById("pasteTextResizeHandle"),
        "typoCorePasteBoxHeight", 34, 300, overlayEl
    );
    makeVerticalResizable(
        document.getElementById("texterScroll"),
        document.getElementById("texterResizeHandle"),
        "typoCoreTexterScrollHeight", 100, 500, overlayEl
    );
}

// ========== PHÍM TẮT (Win+Ctrl / Win+Alt) — cùng cơ chế poll của TyperTool ==========
// ExtendScript không bắt được sự kiện keydown toàn cục, chỉ đọc được TRẠNG THÁI phím bổ trợ
// đang giữ tại 1 thời điểm (ScriptUI.environment.keyboardState). Nên phải poll liên tục (50ms,
// giống chu kỳ TyperTool dùng) rồi tự làm edge-detection (chỉ bắn khi vừa nhấn, không lặp khi giữ),
// cộng thêm cooldown 2 giây để an toàn — y hệt cơ chế oe() trong TyperTool.
var _hotkeyReady = true;      // hết cooldown 2s chưa
var _hotkeyReleased = true;   // phím đã được nhả ra kể từ lần bắn trước chưa
function hotkeyCanFire() {
    if (!_hotkeyReady || !_hotkeyReleased) return false;
    _hotkeyReady = false;
    _hotkeyReleased = false;
    setTimeout(function() { _hotkeyReady = true; }, 1000);
    return true;
}
var _texterHotkeysEnabled = true;
// ========== MULTIPLE BUBBLE (TypeR) ==========
// Bật: theo dõi Selection trong Photoshop, mỗi lần anh tự chọn 1 vùng mới (Magic Wand/Marquee...)
// thì lưu lại vào hàng đợi. Khi bấm phím tắt Paste (Win+Ctrl) lúc đang bật MB, thay vì dán 1 dòng
// như bình thường, nó dán HÀNG LOẠT: dòng 1 -> vùng 1, dòng 2 -> vùng 2,... theo đúng thứ tự đã chọn.
var _mbActive = false;
var _mbPaused = false;
var _mbSelections = [];
var _mbPollTimer = null;
var _mbStartLineIdx = -1; // dòng đang chọn NGAY TRƯỚC lúc bật MB — để "Clear" trả lại đúng vị trí này
function updateMBUi() {
    var dot = document.getElementById("mbDot");
    var infoBar = document.getElementById("mbInfoBar");
    var infoCount = document.getElementById("mbInfoCount");
    var pauseBtn = document.getElementById("btnMBPause");
    if (dot) dot.classList.toggle("mb-active", _mbActive);
    if (infoBar) infoBar.style.display = _mbActive ? "flex" : "none";
    if (infoCount) infoCount.textContent = _mbSelections.length + " selected";
    if (pauseBtn) pauseBtn.textContent = _mbPaused ? "Resume" : "Pause";
}
function pollMBSelection() {
    cs.evalScript("TR_getSelectionChanged()", function(res) {
        var data;
        try { data = JSON.parse(res); } catch (e) { return; }
        if (!data || data.noChange || data.error) return;
        if (_mbPaused) return; // đang tạm dừng -> không lưu, nhưng vẫn gọi ở trên để Photoshop cập nhật trạng thái mới nhất
        _mbSelections.push({
            top: data.top, left: data.left, right: data.right, bottom: data.bottom,
            width: data.width, height: data.height, xMid: data.xMid, yMid: data.yMid,
            lineIndex: _pasteLineIdx, // gắn kèm đúng dòng đang chọn LÚC bắt được vùng này
            styleId: loadTextPresets().defaultId || null // gắn kèm đúng style đang chọn LÚC bắt được vùng này
        });
        moveLine(1); // tự nhảy sang dòng kế tiếp -> preview hiện ngay dòng sẽ dùng cho bóng thoại kế
        updateMBUi();
        // Bỏ chọn đã được gộp thẳng vào getSelectionChanged() bên host.jsx (chạy atomic,
        // không còn khoảng hở race condition nữa) — JS không cần tự gọi deselect riêng nữa.
        // Nháy xanh nhẹ trên nút MB mỗi lần bắt được 1 vùng chọn mới -> phản hồi ngay, không cần hover
        var btn = document.getElementById("btnMultipleBubble");
        if (btn) { btn.classList.add("flash-ok"); setTimeout(function() { btn.classList.remove("flash-ok"); }, 400); }
    });
}
function toggleMultipleBubble() {
    if (_mbActive) { turnOffMultipleBubble(); return; }
    _mbActive = true;
    _mbPaused = false;
    _mbStartLineIdx = _pasteLineIdx; // nhớ lại dòng hiện tại trước khi bắt đầu đếm
    cs.evalScript("TR_startSelectionMonitoring()");
    if (_mbPollTimer) clearInterval(_mbPollTimer);
    _mbPollTimer = setInterval(pollMBSelection, 700);
    updateMBUi();
}
function turnOffMultipleBubble() {
    _mbActive = false;
    cs.evalScript("TR_stopSelectionMonitoring()");
    if (_mbPollTimer) { clearInterval(_mbPollTimer); _mbPollTimer = null; }
    updateMBUi();
}
function toggleMBPause() {
    _mbPaused = !_mbPaused;
    updateMBUi();
}
function clearMBSelections() {
    _mbSelections = [];
    if (_mbStartLineIdx >= 0) {
        _pasteLineIdx = _mbStartLineIdx; // trả dòng đang chọn về đúng lúc trước khi MB bắt đầu đếm
        renderLinePreview();
    }
    updateMBUi();
}
function doMultipleBubblePaste() {
    if (!_mbSelections.length) {
        alert("No bubble selections captured yet.\nTurn on MB (green dot) and select each speech bubble in Photoshop, then press Win+Ctrl to paste them all.");
        return;
    }
    var currentPreset = getCurrentPreset();
    if (!currentPreset) { alert("No style in Typer Box yet. Select a sample text layer, then click \"+ Add style\" first."); return; }
    if (!_pasteLines.length) { alert("No line to paste in Typer Box."); return; }

    var data = loadTextPresets();
    // Lấy đúng chữ theo lineIndex đã gắn kèm lúc chọn từng vùng (không phải theo thứ tự thô) —
    // nếu dòng đó không còn hợp lệ (đã xóa/đã thành dòng trống) thì quét tới dòng kế tiếp còn dùng được.
    // Tương tự, lấy đúng style đã gắn kèm cho vùng đó (styleId) — nếu style đó đã bị xóa thì mới
    // dùng tạm style hiện tại thay thế.
    var texts = [];
    var styles = [];
    var fallbackIdx = 0;
    for (var s = 0; s < _mbSelections.length; s++) {
        var sel = _mbSelections[s];
        var line = null;
        if (typeof sel.lineIndex === "number" && sel.lineIndex >= 0 && _pasteLines[sel.lineIndex] && !_pasteLines[sel.lineIndex].ignore) {
            line = _pasteLines[sel.lineIndex];
            fallbackIdx = Math.max(fallbackIdx, sel.lineIndex + 1);
        } else {
            while (fallbackIdx < _pasteLines.length) {
                var candidate = _pasteLines[fallbackIdx];
                fallbackIdx++;
                if (candidate && !candidate.ignore) { line = candidate; break; }
            }
        }
        if (!line) break; // hết dòng để dán -> dừng, không tạo thêm layer thừa
        texts.push(line.text);
        var presetForSel = (sel.styleId && data.presets[sel.styleId]) ? data.presets[sel.styleId] : currentPreset;
        var s2 = scaledStyle(presetForSel);
        styles.push({ textProps: s2 ? s2.textProps : null, stroke: presetForSel.stroke });
    }
    if (!texts.length) { alert("No more lines left to paste."); return; }

    var payload = {
        texts: texts,
        styles: styles,
        selections: _mbSelections.slice(0, texts.length),
        padding: 0
    };
    _exec('TR_createTextLayersInStoredSelections(' + JSON.stringify(payload) + ')', document.getElementById("btnMultipleBubble"), function(res) {
        if (res === "") {
            _mbSelections = [];
            _mbStartLineIdx = _pasteLineIdx; // đã dán xong -> mốc "Clear" giờ tính từ đây
            updateMBUi();
            if (isSnapMultiBubble()) turnOffMultipleBubble(); // dán nhiều chỗ THÀNH CÔNG mới tự tắt
        } else {
            alert("Multiple Bubble error: " + res);
        }
    });
}
function firePasteHotkey() {
    if (_mbActive) { doMultipleBubblePaste(); return; }
    if (isLinkQLTexter()) pasteFirstQuickLayoutCase();
    else doPasteToSelection(); // Win+Ctrl = Paste (Typer Box)
}
function fireCenterHotkey() {
    var btn = document.querySelector('[data-tool="center"]'); // Center có sẵn ở Quick Layout / Actions
    runAlignCenter(btn);
}
var _navHotkeyReleased = true; // edge-detect RIÊNG cho phím đổi dòng, KHÔNG áp cooldown 2s như Paste/Center
                                // vì điều hướng lên/xuống cần bấm nhanh liên tục được nhiều lần
var _bHotkeyReleased = true; // edge-detect riêng cho Win+Shift+B (bật/tắt Multiple Bubble)
function pollHotkeys() {
    if (!_texterHotkeysEnabled) return; // Typer Box đang bị ẩn -> tắt hẳn các phím tắt bên dưới
    // Đọc thẳng từ Windows qua Tauri (không qua Photoshop/COM nữa) — xem cep-polyfill.js.
    cs.getHotkeyComboNative(function(combo) {
        if (combo === "winShiftE" || combo === "winShiftD") {
            // Win+Shift+E/D không đụng gì tới Win+Ctrl/Win+Alt -> không cần chờ/debounce gì cả
            if (!_navHotkeyReleased) return;
            _navHotkeyReleased = false;
            if (combo === "winShiftE") moveLine(-1); // Win+Shift+E = dòng trước (▲)
            else moveLine(1);                         // Win+Shift+D = dòng sau (▼)
            return;
        }
        _navHotkeyReleased = true;
        if (combo === "winShiftB") {
            // Win+Shift+B = bật/tắt Multiple Bubble — cần edge-detect riêng vì đây là toggle
            // (giữ phím không được bật/tắt lặp lại liên tục, chỉ bắn đúng 1 lần mỗi lần nhấn)
            if (!_bHotkeyReleased) return;
            _bHotkeyReleased = false;
            toggleMultipleBubble();
            return;
        }
        _bHotkeyReleased = true;
        if (combo === "metaCtrl") {
            if (!hotkeyCanFire()) return;
            firePasteHotkey(); // Win+Ctrl = Paste (Typer Box / Multiple Bubble)
        } else if (combo === "metaAlt") {
            if (!hotkeyCanFire()) return;
            fireCenterHotkey(); // Win+Alt = Center
        } else {
            _hotkeyReleased = true; // không giữ tổ hợp nào -> sẵn sàng cho lần bắn kế tiếp
        }
    });
}
// Khi Typer Box bị ẩn: tắt hẳn phím tắt, đồng thời khóa cứng "Link Quick Layout to Typer Box"
// (mờ đi, không cho tick) — vì Link phụ thuộc hoàn toàn vào Texter đang hoạt động.
function applyTexterStudioLockState(enabled) {
    _texterHotkeysEnabled = enabled;
    updateLinkQLLockState();
}
// Link Q.Layout to Typer Box bị khoá (mờ đi, không cho tick) nếu MỘT trong 2 điều kiện đúng:
// (1) Typer Box đang bị ẩn -> Link vô nghĩa vì không có gì để liên kết tới.
// (2) Auto Shape đang bật -> Auto Shape sẽ tự ghi đè cách cách dòng đã chọn tay qua Quick Layout
//     ngay khi Center chạy, nên bật chung 2 cái là xung đột logic, khoá lại cho khỏi lỡ tay.
function updateLinkQLLockState() {
    var vis = loadVis();
    var texterVisible = vis.texterStudio !== false;
    var autoShapeOn = isAutoShapeEnabled();
    var shouldLock = !texterVisible || autoShapeOn;
    var linkCb = document.getElementById("toggle_linkQuickLayoutTexter");
    if (!linkCb) return;
    linkCb.disabled = shouldLock;
    var row = linkCb.closest(".setting-item");
    if (row) row.classList.toggle("tt-setting-disabled", shouldLock);
    if (shouldLock && isLinkQLTexter()) {
        setLinkQLTexter(false);
        linkCb.checked = false;
    }
}
function startHotkeyPolling() {
    setInterval(pollHotkeys, 50);
}

(function init() {
    restoreLayout();
    var vis = loadVis(); applyVis(vis);
    applyTexterStudioLockState(vis.texterStudio !== false);
    applyFxFeatureVis(loadFxFeatureVis());
    var savedLogo = localStorage.getItem("typoCoreLogoPath");
    if (savedLogo) {
        cs.evalScript('LOGO_PATH = "' + savedLogo.replace(/"/g, '\\"') + '"');
        var btnLogo = document.getElementById("btnLogo"); if (btnLogo) btnLogo.title = savedLogo;
        var actionsSection = document.getElementById('section-actions');
        if (actionsSection) {
            var isVisible = window.getComputedStyle(actionsSection).display !== 'none';
            if (!isVisible) document.body.classList.add('actions-hidden');
            else document.body.classList.remove('actions-hidden');
        }
    }
    setupSettingPopup();
    on("addRowBtn", "click", addNewRow);
    on("saveLayoutBtn", "click", saveAndExitEditMode);
    setupPreviewPopup();

    // Khởi tạo màu mặc định cho các ô màu: trắng, riêng Text Color là đen
    (function initDefaultSwatches() {
        var whiteSwatchIds = ["gradientColor1", "gradientColor2", "strokeColor1", "shadowColor", "glowColor"];
        whiteSwatchIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el && !el.getAttribute("data-color")) setSwatchColor(el, {r:255, g:255, b:255});
        });
        // Stroke: ô bên phải mặc định RỖNG (không có màu)
        var strokeColor2El = document.getElementById("strokeColor2");
        if (strokeColor2El && !strokeColor2El.getAttribute("data-color")) setSwatchColor(strokeColor2El, null);
        var tcEl = document.getElementById("textColorSwatch");
        if (tcEl && !tcEl.getAttribute("data-color")) setSwatchColor(tcEl, {r:0, g:0, b:0});
    })();

    if (vis.autoFX) startAutoFx();

    if (window._prvToolbarMode === 'A' && window._prvGetPreviewSize) {
        var ni = document.getElementById("prvNumInput");
        if (ni) ni.value = window._prvGetPreviewSize();
    }
    var savedFxState = localStorage.getItem("typoCoreFxState");
    if (savedFxState === "open") {
        var fxOverlay = document.getElementById("fxOverlay");
        if (fxOverlay) fxOverlay.style.display = "flex";
    }
    makeFxResizable();
    makeTexterResizable();
    startHotkeyPolling();
    // Nạp trước danh sách app.fonts (delay nhẹ để chắc chắn CSInterface đã sẵn sàng hoàn toàn,
    // tránh trường hợp gọi evalScript quá sớm lúc panel vừa mở làm callback không chạy).
    setTimeout(function() {
        cs.evalScript('TT_getUserFonts()', function(res) {
            try {
                var d = JSON.parse(res);
                _userFontsCache = (d && d.fonts) ? d.fonts : [];
            } catch (e) { _userFontsCache = []; }
            renderStyleList();
            renderLinePreview();
        });
    }, 800);

    // Áp dụng trạng thái Less ban đầu
    if (fxCollapsedMode) {
        var toggleBtn = document.getElementById("btnFxToggleMode");
        if (toggleBtn) toggleBtn.textContent = 'More';
        document.querySelectorAll('.fx-section-body').forEach(function(body) {
            body.style.maxHeight = '0';
            body.style.overflow = 'hidden';
            body.style.padding = '0';
            body.style.margin = '0';
        });
    } else {
        document.querySelectorAll('.fx-section-body').forEach(function(body) {
            body.style.maxHeight = body.scrollHeight + 'px';
            body.style.overflow = '';
            body.style.padding = '';
            body.style.margin = '';
        });
    }
    console.log("[TypoCore] Ready");
})();

// ===== SHADOW ANGLE =====
var shadowAngleCanvas = document.getElementById("shadowAngleCanvas");
var shadowAngleInput = document.getElementById("shadowAngleInput");
var shadowAngleDragging = false;

function drawShadowAngleCircle(deg) {
    if (!shadowAngleCanvas) return;
    var ctx = shadowAngleCanvas.getContext("2d");
    var w = shadowAngleCanvas.width, h = shadowAngleCanvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w/2, cy = h/2, r = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1; ctx.stroke();
    var rad = deg * Math.PI / 180;
    var x = cx + r * Math.cos(rad);
    var y = cy - r * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1; ctx.stroke();
}

function handleShadowAngleDrag(e) {
    if (!shadowAngleDragging) return;
    var rect = shadowAngleCanvas.getBoundingClientRect();
    var cx = rect.left + rect.width/2;
    var cy = rect.top + rect.height/2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var rad = Math.atan2(-dy, dx);
    var deg = rad * 180 / Math.PI;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    var val = Math.round(deg);
    shadowAngleInput.value = val;
    drawShadowAngleCircle(val);
}

if (shadowAngleCanvas) {
    shadowAngleCanvas.addEventListener("mousedown", function(e) {
        e.preventDefault();
        shadowAngleDragging = true;
        handleShadowAngleDrag(e);
        document.addEventListener("mousemove", handleShadowAngleDrag);
        document.addEventListener("mouseup", function() {
            shadowAngleDragging = false;
            document.removeEventListener("mousemove", handleShadowAngleDrag);
            maybeAutoApply();
        });
    });
}

if (shadowAngleInput) {
    shadowAngleInput.addEventListener("input", function() {
        var deg = parseFloat(this.value) || 0;
        drawShadowAngleCircle(deg);
    });
    drawShadowAngleCircle(parseFloat(shadowAngleInput.value) || 0);
}

// ========== PANEL SIZE PERSISTENCE ==========
(function() {
    var W_KEY = 'typoCorePanelW';
    var H_KEY = 'typoCorePanelH';
    var saveTimer = null;
    function saveSize() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        if (w > 30 && h > 30) { localStorage.setItem(W_KEY, w); localStorage.setItem(H_KEY, h); }
    }
    function restoreSize() {
        var w = parseInt(localStorage.getItem(W_KEY));
        var h = parseInt(localStorage.getItem(H_KEY));
        if (w > 30 && h > 30) { cs.resizeContent(w, h); }
    }
    window.addEventListener('resize', function() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveSize, 400);
    });
    setTimeout(restoreSize, 300);
})();

function applyCase(n) { _exec('applyCase(' + n + ')'); }
function splitEven(n) { _exec('splitEven(' + n + ')'); }