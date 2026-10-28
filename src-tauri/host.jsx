#target photoshop
// ============================================================
//  TypoCore v3 – CEP Host Script
//  Hỗ trợ đa stroke, JSON an toàn, Drop Shadow, Stroke Gradient
//  FIX: Tạo gradient descriptor đọc màu đúng từ payload
// ============================================================

// JSON polyfill
if (typeof JSON === "undefined") {
  JSON = {};
}
if (typeof JSON.parse !== "function") {
  JSON.parse = function(s) {
    throw new Error("JSON.parse not available in this ExtendScript engine");
  };
  // Đánh dấu đây là bản "giả", chưa hoạt động thật — jamJSON (định nghĩa bên dưới,
  // trong bản Tauri porting) sẽ tự thay thế JSON.parse toàn cục bằng bộ parser an
  // toàn của nó ngay khi có mặt, để các chỗ gọi thẳng JSON.parse() (VD FX Studio)
  // cũng dùng được trên ExtendScript CS6 không có JSON gốc.
  JSON.parse.__isStub = true;
}
if (typeof JSON.stringify !== "function") {
  JSON.stringify = function(obj) {
    if (obj === null) return "null";
    if (typeof obj === "number" || typeof obj === "boolean") return obj.toString();
    if (typeof obj === "string") return '"' + obj + '"';
    if (obj instanceof Array) {
      var arr = [];
      for (var i = 0; i < obj.length; i++) arr.push(JSON.stringify(obj[i]));
      return "[" + arr.join(",") + "]";
    }
    var str = [];
    for (var key in obj) str.push('"' + key + '":' + JSON.stringify(obj[key]));
    return "{" + str.join(",") + "}";
  };
}

// ========== CORE FUNCTIONS ==========
var memory = {};
var _typoCoreLoaded = true;

// Đọc tổ hợp phím đang giữ (Win+Ctrl / Win+Alt) — dùng cho phím tắt Paste/Center của Texter Studio.
// Viết độc lập, không dùng lại getHotkeyPressed() bên trong engine TyperTool đã bọc IIFE ở cuối file,
// để không phải đụng vào/expose thêm gì từ khối đó.
function getHotkeyCombo() {
  try {
    var k = ScriptUI.environment.keyboardState;
    // Đọc phím chữ cụ thể (nếu Photoshop/OS hỗ trợ keyName) — Win+Shift+E/D dùng cho đổi dòng,
    // không đụng Win+Ctrl (Paste) / Win+Alt (Center) nên không cần chờ/debounce gì cả.
    if (k.metaKey && k.shiftKey && k.keyName) {
      var key = String(k.keyName).toUpperCase();
      if (key === "E") return "winShiftE";
      if (key === "D") return "winShiftD";
      if (key === "B") return "winShiftB"; // Win+Shift+B = bật/tắt Multiple Bubble
    }
    if (k.metaKey && k.ctrlKey) return "metaCtrl"; // Win+Ctrl
    if (k.metaKey && k.altKey) return "metaAlt"; // Win+Alt
    return "";
  } catch (e) {
    return "";
  }
}

function getLayer() {
  if (!app.documents.length) return null;
  var l = app.activeDocument.activeLayer;
  return (l.kind == LayerKind.TEXT) ? l : null;
}

function getText() {
  var layer = getLayer();
  if (!layer) return null;
  var id = layer.id;
  if (!memory[id] || memory[id] != layer.textItem.contents)
    memory[id] = layer.textItem.contents;
  return memory[id];
}

function cleanText(str) {
  return str.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function splitWords(str) {
  return cleanText(str).split(" ");
}

function applyPattern(pattern) {
  var layer = getLayer();
  if (!layer) return "NO_LAYER";
  var words = splitWords(getText());
  var total = words.length;
  var sum = 0;
  for (var i = 0; i < pattern.length; i++) sum += pattern[i];
  var np = pattern.slice();
  if (total > sum) {
    var extra = total - sum;
    var len = np.length;
    if (len % 2 == 1) np[Math.floor(len / 2)] += extra;
    else {
      var m1 = Math.floor(len / 2) - 1,
        m2 = Math.floor(len / 2);
      np[m1] += Math.floor(extra / 2);
      np[m2] += extra - Math.floor(extra / 2);
    }
  }
  var result = "",
    index = 0;
  for (var i = 0; i < np.length; i++) {
    var line = [];
    for (var j = 0; j < np[i]; j++)
      if (words[index]) line.push(words[index++]);
    result += line.join(" ");
    if (i < np.length - 1) result += "\r";
  }
  layer.textItem.contents = result;
  return "OK";
}

var data = {
  1: {
    4: [2, 2],
    6: [2, 2, 2],
    7: [2, 3, 2],
    8: [2, 4, 2],
    10: [2, 3, 3, 2],
    11: [2, 3, 3, 3],
    13: [2, 4, 4, 3],
    14: [3, 4, 4, 3],
    15: [4, 4, 4, 3],
    17: [2, 4, 5, 4, 2],
    20: [3, 5, 5, 4, 3],
    24: [3, 4, 5, 5, 4, 3],
    30: [4, 5, 7, 6, 5, 3],
    18: [2, 4, 6, 4, 2],
    19: [2, 4, 7, 4, 2],
    21: [2, 5, 7, 5, 2],
    22: [2, 5, 8, 5, 2],
    23: [2, 5, 9, 5, 2],
    25: [2, 6, 9, 6, 2],
    26: [2, 6, 10, 6, 2],
    27: [2, 7, 9, 7, 2],
    28: [2, 7, 10, 7, 2],
    29: [2, 8, 9, 8, 2],
    31: [2, 4, 6, 7, 6, 4, 2],
    32: [2, 4, 6, 8, 6, 4, 2],
    33: [2, 4, 7, 7, 7, 4, 2],
    34: [2, 4, 7, 8, 7, 4, 2],
    35: [2, 4, 7, 9, 7, 4, 2],
    36: [2, 4, 8, 8, 8, 4, 2],
    37: [2, 4, 8, 9, 8, 4, 2],
    38: [2, 4, 8, 10, 8, 4, 2],
    39: [2, 5, 8, 9, 8, 5, 2],
    40: [2, 5, 8, 10, 8, 5, 2]
  },
  2: {
    4: [2, 2],
    6: [3, 3],
    7: [4, 3],
    8: [2, 3, 3],
    10: [3, 4, 3],
    11: [4, 4, 3],
    13: [3, 6, 4],
    14: [2, 4, 4, 3],
    15: [5, 6, 5],
    17: [3, 5, 6, 3],
    20: [4, 5, 6, 5],
    24: [4, 6, 6, 5, 3],
    30: [4, 7, 8, 7, 4],
    18: [3, 4, 4, 4, 3],
    19: [3, 4, 5, 4, 3],
    21: [3, 5, 5, 5, 3],
    22: [3, 5, 6, 5, 3],
    23: [3, 6, 5, 6, 3],
    25: [3, 6, 7, 6, 3],
    26: [3, 6, 8, 6, 3],
    27: [3, 7, 7, 7, 3],
    28: [3, 7, 8, 7, 3],
    29: [3, 7, 9, 7, 3],
    31: [4, 7, 9, 7, 4],
    32: [4, 7, 10, 7, 4],
    33: [4, 8, 9, 8, 4],
    34: [4, 8, 10, 8, 4],
    35: [3, 5, 6, 7, 6, 5, 3],
    36: [3, 5, 6, 8, 6, 5, 3],
    37: [3, 5, 7, 7, 7, 5, 3],
    38: [3, 5, 7, 8, 7, 5, 3],
    39: [3, 5, 8, 8, 8, 5, 3],
    40: [3, 5, 8, 9, 8, 5, 3]
  },
  3: {
    4: [1, 2, 1],
    6: [1, 2, 3],
    7: [1, 2, 3, 1],
    8: [1, 2, 3, 2],
    10: [1, 2, 4, 3],
    11: [1, 2, 3, 3, 2],
    13: [2, 4, 4, 3],
    14: [2, 5, 4, 3],
    15: [2, 4, 5, 4],
    17: [2, 4, 5, 4, 2],
    18: [2, 4, 5, 5, 2],
    19: [2, 4, 5, 5, 2],
    20: [2, 4, 6, 4, 4],
    21: [2, 4, 6, 5, 4],
    23: [2, 4, 6, 5, 4, 2],
    24: [2, 4, 6, 5, 4, 3],
    25: [3, 6, 8, 6, 4],
    27: [2, 4, 6, 6, 5, 4],
    29: [4, 7, 8, 6, 4],
    30: [2, 5, 7, 6, 6, 4],
    31: [2, 4, 6, 6, 5, 4, 4],
    33: [3, 6, 8, 6, 6, 5],
    22: [2, 4, 5, 5, 4, 2],
    26: [2, 4, 7, 7, 4, 2],
    28: [2, 4, 7, 9, 4, 2],
    32: [2, 4, 6, 8, 6, 4, 2],
    34: [2, 4, 7, 8, 7, 4, 2],
    35: [2, 4, 7, 9, 7, 4, 2],
    36: [2, 4, 8, 8, 8, 4, 2],
    37: [2, 4, 8, 9, 8, 4, 2],
    38: [2, 4, 8, 10, 8, 4, 2],
    39: [2, 5, 8, 9, 8, 5, 2],
    40: [2, 5, 8, 10, 8, 5, 2]
  },
  4: {
    4: [2, 2],
    6: [2, 4],
    7: [2, 2, 3],
    8: [2, 3, 3],
    9: [2, 3, 3, 1],
    10: [2, 4, 4],
    11: [2, 4, 3, 2],
    13: [3, 6, 4],
    14: [3, 7, 4],
    15: [2, 5, 6, 2],
    18: [3, 5, 6, 4],
    17: [2, 5, 6, 4],
    20: [3, 7, 6, 4],
    21: [3, 6, 7, 5],
    23: [3, 6, 7, 5, 2],
    24: [3, 7, 6, 5, 3],
    25: [2, 4, 6, 6, 4, 3],
    27: [3, 6, 8, 6, 4],
    29: [3, 5, 7, 5, 5, 4],
    30: [3, 7, 7, 7, 6],
    31: [3, 7, 8, 7, 6],
    33: [4, 8, 8, 7, 7],
    19: [3, 4, 5, 4, 3],
    22: [3, 5, 6, 5, 3],
    26: [3, 6, 8, 6, 3],
    28: [3, 7, 8, 7, 3],
    32: [3, 5, 8, 8, 5, 3],
    34: [3, 5, 9, 9, 5, 3],
    35: [3, 5, 9, 10, 5, 3],
    36: [3, 6, 9, 9, 6, 3],
    37: [3, 6, 10, 9, 6, 3],
    38: [3, 6, 10, 10, 6, 3],
    39: [3, 7, 9, 10, 7, 3],
    40: [3, 7, 10, 10, 7, 3]
  },
  5: {
    4: [1, 2, 1],
    6: [3, 2, 1],
    7: [1, 2, 2, 2],
    8: [2, 3, 2, 1],
    10: [1, 4, 3, 2],
    11: [2, 3, 4, 2],
    13: [3, 4, 4, 2],
    14: [3, 4, 4, 2, 1],
    15: [2, 3, 4, 4, 2],
    17: [3, 4, 4, 4, 2],
    20: [3, 5, 5, 5, 2],
    24: [3, 4, 5, 5, 5, 2],
    30: [4, 5, 6, 6, 6, 3],
    18: [2, 3, 4, 4, 3, 2],
    19: [2, 3, 4, 5, 3, 2],
    21: [2, 3, 5, 6, 3, 2],
    22: [2, 3, 5, 7, 3, 2],
    23: [2, 3, 6, 7, 3, 2],
    25: [2, 4, 6, 7, 4, 2],
    26: [2, 4, 6, 8, 4, 2],
    27: [2, 4, 7, 8, 4, 2],
    28: [2, 4, 7, 9, 4, 2],
    29: [2, 4, 8, 9, 4, 2],
    31: [2, 4, 6, 7, 6, 4, 2],
    32: [2, 4, 6, 8, 6, 4, 2],
    33: [2, 4, 7, 7, 7, 4, 2],
    34: [2, 4, 7, 8, 7, 4, 2],
    35: [2, 4, 7, 9, 7, 4, 2],
    36: [2, 4, 8, 8, 8, 4, 2],
    37: [2, 4, 8, 9, 8, 4, 2],
    38: [2, 4, 8, 10, 8, 4, 2],
    39: [2, 5, 8, 9, 8, 5, 2],
    40: [2, 5, 8, 10, 8, 5, 2]
  },
  6: {
    4: [2, 2],
    6: [4, 2],
    7: [2, 2, 2, 1],
    8: [3, 3, 2],
    10: [4, 4, 2],
    11: [1, 4, 4, 2],
    13: [4, 6, 3],
    14: [5, 6, 3],
    15: [5, 6, 4],
    17: [4, 6, 4, 3],
    20: [5, 6, 6, 3],
    24: [6, 7, 7, 4],
    26: [5, 5, 8, 5, 3],
    30: [6, 7, 7, 7, 3],
    18: [2, 3, 4, 4, 3, 2],
    19: [2, 3, 4, 5, 3, 2],
    21: [2, 3, 5, 6, 3, 2],
    22: [2, 3, 5, 7, 3, 2],
    23: [2, 3, 6, 7, 3, 2],
    25: [2, 4, 6, 7, 4, 2],
    27: [2, 4, 7, 8, 4, 2],
    28: [2, 4, 7, 9, 4, 2],
    29: [2, 4, 8, 9, 4, 2],
    31: [2, 5, 5, 7, 5, 5, 2],
    32: [2, 5, 5, 8, 5, 5, 2],
    33: [2, 5, 6, 7, 6, 5, 2],
    34: [2, 5, 6, 8, 6, 5, 2],
    35: [2, 5, 7, 7, 7, 5, 2],
    36: [2, 5, 7, 8, 7, 5, 2],
    37: [2, 5, 7, 9, 7, 5, 2],
    38: [2, 5, 8, 8, 8, 5, 2],
    39: [2, 5, 8, 9, 8, 5, 2],
    40: [2, 5, 8, 10, 8, 5, 2]
  },
  7: {
    4: [2, 2],
    6: [2, 2, 2],
    7: [3, 4],
    8: [2, 4, 2],
    10: [2, 3, 3, 2],
    11: [2, 3, 3, 3],
    12: [2, 4, 3, 3],
    13: [3, 3, 4, 3],
    14: [2, 4, 5, 3],
    15: [2, 5, 4, 4],
    16: [2, 3, 4, 4, 3],
    17: [2, 4, 5, 4, 2],
    18: [3, 4, 4, 4, 3],
    20: [2, 5, 5, 5, 3],
    23: [3, 4, 6, 4, 4, 2],
    24: [2, 3, 5, 6, 5, 3],
    26: [3, 4, 4, 5, 5, 3, 2],
    30: [2, 6, 7, 6, 6, 3],
    19: [2, 3, 4, 4, 3, 3],
    21: [2, 3, 4, 5, 4, 3],
    22: [2, 3, 5, 5, 4, 3],
    25: [2, 4, 5, 6, 5, 3],
    27: [2, 4, 6, 6, 5, 4],
    28: [2, 4, 6, 7, 5, 4],
    29: [2, 4, 7, 7, 5, 4],
    31: [2, 4, 6, 7, 6, 4, 2],
    32: [2, 4, 6, 8, 6, 4, 2],
    33: [2, 4, 7, 7, 7, 4, 2],
    34: [2, 4, 7, 8, 7, 4, 2],
    35: [2, 4, 7, 9, 7, 4, 2],
    36: [2, 4, 8, 8, 8, 4, 2],
    37: [2, 4, 8, 9, 8, 4, 2],
    38: [2, 4, 8, 10, 8, 4, 2],
    39: [2, 5, 8, 9, 8, 5, 2],
    40: [2, 5, 8, 10, 8, 5, 2]
  },
  8: {
    4: [2, 2],
    6: [3, 2, 2],
    7: [3, 3, 1],
    8: [3, 3, 2],
    10: [3, 3, 2, 2],
    11: [3, 5, 3],
    12: [2, 4, 4, 2],
    13: [3, 5, 3, 2],
    14: [3, 5, 4, 2],
    15: [3, 5, 5, 2],
    17: [3, 3, 5, 4, 2],
    20: [3, 5, 6, 4, 2],
    21: [3, 5, 5, 5, 3],
    24: [3, 5, 6, 5, 3, 2],
    26: [3, 5, 5, 6, 4, 3],
    30: [3, 6, 8, 7, 4, 2],
    18: [3, 4, 4, 4, 3],
    19: [3, 4, 5, 4, 3],
    22: [3, 5, 6, 5, 3],
    23: [3, 5, 7, 5, 3],
    25: [3, 6, 7, 6, 3],
    27: [3, 7, 7, 7, 3],
    28: [3, 7, 8, 7, 3],
    29: [3, 7, 9, 7, 3],
    31: [3, 5, 7, 8, 5, 3],
    32: [3, 5, 8, 8, 5, 3],
    33: [3, 5, 8, 9, 5, 3],
    34: [3, 6, 8, 8, 6, 3],
    35: [3, 6, 8, 9, 6, 3],
    36: [3, 6, 9, 9, 6, 3],
    37: [3, 6, 9, 10, 6, 3],
    38: [3, 7, 9, 9, 7, 3],
    39: [3, 7, 10, 9, 7, 3],
    40: [3, 7, 10, 10, 7, 3]
  },
  9: {
    4: [2, 2],
    5: [2, 2, 1],
    6: [2, 3, 1],
    7: [3, 4],
    8: [3, 2, 3],
    10: [4, 3, 3],
    11: [4, 3, 4],
    13: [4, 4, 3, 2],
    14: [4, 4, 3, 3],
    15: [3, 4, 5, 3],
    17: [4, 5, 4, 4],
    19: [3, 4, 5, 4, 3],
    20: [4, 5, 5, 4, 2],
    24: [4, 5, 6, 5, 4],
    30: [4, 5, 6, 6, 6, 4],
    18: [2, 3, 4, 4, 3, 2],
    21: [2, 3, 5, 6, 3, 2],
    22: [2, 3, 5, 7, 3, 2],
    23: [2, 3, 6, 7, 3, 2],
    25: [2, 4, 6, 7, 4, 2],
    26: [2, 4, 6, 8, 4, 2],
    27: [2, 4, 7, 8, 4, 2],
    28: [2, 4, 7, 9, 4, 2],
    29: [2, 4, 8, 9, 4, 2],
    31: [2, 4, 6, 7, 6, 4, 2],
    32: [2, 4, 6, 8, 6, 4, 2],
    33: [2, 4, 7, 7, 7, 4, 2],
    34: [2, 4, 7, 8, 7, 4, 2],
    35: [2, 4, 7, 9, 7, 4, 2],
    36: [2, 4, 8, 8, 8, 4, 2],
    37: [2, 4, 8, 9, 8, 4, 2],
    38: [2, 4, 8, 10, 8, 4, 2],
    39: [2, 5, 8, 9, 8, 5, 2],
    40: [2, 5, 8, 10, 8, 5, 2]
  }
};

function getClosest(n, map) {
  var closest = null,
    min = 9999;
  for (var k in map) {
    var diff = Math.abs(n - parseInt(k));
    if (diff < min) {
      min = diff;
      closest = k;
    }
  }
  return map[closest];
}

function applyCase(n) {
  var layer = getLayer();
  if (!layer) return "NO_LAYER";
  return applyPattern(getClosest(splitWords(getText()).length, data[n]));
}

function splitEven(lines) {
  var layer = getLayer();
  if (!layer) return "NO_LAYER";
  var words = splitWords(getText());
  var total = words.length;
  var base = Math.floor(total / lines);
  var extra = total % lines;

  var pattern = [];
  for (var i = 0; i < lines; i++) {
    pattern.push(base);
  }

  if (extra > 0) {
    if (lines === 3) {
      pattern[1] += extra;
    } else if (lines === 4) {
      if (extra >= 1) {
        pattern[1] += 1;
        extra--;
      }
      if (extra >= 1) {
        pattern[2] += 1;
        extra--;
      }
      if (extra > 0) {
        pattern[0] += extra;
      }
    } else {
      for (var i = 0; i < extra; i++) {
        pattern[i] += 1;
      }
    }
  }

  return applyPattern(pattern);
}

var _typoCoreResizeResult = "";

function resizeBox() {
  _typoCoreResizeResult = "";
  try {
    // (Tauri port) Khôi phục suspendHistory ở đây — hàm này không cần dữ liệu module nào
    // truyền vào (không như _setActiveLayerText), nên an toàn gộp lại thành 1 bước Undo,
    // đồng thời nhanh hơn hẳn so với chạy rời từng bước qua gọi hàm trực tiếp.
    app.activeDocument.suspendHistory("TypoCore Resize Box", "_resizeBoxInternal()");
    return _typoCoreResizeResult || "OK";
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function _resizeBoxInternal() {
  var layer = getLayer();
  if (!layer) {
    _typoCoreResizeResult = "NO_LAYER";
    return;
  }
  try {
    var doc = app.activeDocument;
    var t = layer.textItem;
    var wasPoint = (t.kind == TextType.POINTTEXT);
    var oldBounds = layer.bounds;
    var oldCenterX = (oldBounds[0].as("px") + oldBounds[2].as("px")) / 2;
    var oldCenterY = (oldBounds[1].as("px") + oldBounds[3].as("px")) / 2;
    if (wasPoint) t.kind = TextType.PARAGRAPHTEXT;
    t.width = new UnitValue(1500, "px");
    t.height = new UnitValue(1500, "px");
    t.kind = TextType.POINTTEXT;
    var b = layer.bounds;
    var rW = b[2].as("px") - b[0].as("px");
    var rH = b[3].as("px") - b[1].as("px");
    t.kind = TextType.PARAGRAPHTEXT;
    var padW = 80;
    var padH = 22;
    t.width = new UnitValue(rW + padW, "px");
    t.height = new UnitValue(rH + padH, "px");
    var newBounds = layer.bounds;
    var newCenterX = (newBounds[0].as("px") + newBounds[2].as("px")) / 2;
    var newCenterY = (newBounds[1].as("px") + newBounds[3].as("px")) / 2;
    layer.translate(new UnitValue(oldCenterX - newCenterX, "px"), new UnitValue(oldCenterY - newCenterY, "px"));
    _typoCoreResizeResult = "OK";
  } catch (e) {
    _typoCoreResizeResult = "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

// Lưu file bằng hộp thoại "Save As" thật của hệ điều hành (qua Photoshop) — dùng cho Export style,
// vì cách tải file kiểu trình duyệt (Blob/<a download>) không hiện hộp thoại chọn nơi lưu trong CEP.
function saveTextFile(content, defaultName) {
  try {
    var name = defaultName || "export-typocore.json";
    var startFile = new File(Folder.desktop + "/" + name);
    var f = startFile.saveDlg("Save styles as...");
    if (!f) return "CANCELLED";
    var path = f.fsName;
    if (!/\.json$/i.test(path)) {
      f = new File(path + ".json");
    }
    f.encoding = "UTF8";
    var opened = f.open("w");
    if (!opened) {
      return "ERROR: Cannot open file for writing (" + f.fsName + ") — " + (f.error || "unknown reason");
    }
    var writeOk = f.write(content);
    f.close();
    if (!writeOk) {
      return "ERROR: Write failed (" + f.fsName + ")";
    }
    if (!f.exists) {
      return "ERROR: File was not created (" + f.fsName + ")";
    }
    return "OK";
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

// Canh giữa ĐƠN GIẢN, y hệt bản TypoCore cũ trước khi có engine TypeR — KHÔNG tự Magic Wand,
// KHÔNG chạy chuỗi cắt đuôi, KHÔNG Auto Shape/Fit. Người dùng tự tạo Selection + tự cắt đuôi bóng
// thoại bằng tay (Select > Modify), hàm chỉ lo đúng 1 việc: canh layer chữ vào giữa Selection đó.
// Dùng làm phương án dự phòng đáng tin cậy trong lúc chuỗi cắt đuôi tự động còn đang có lỗi lệch
// chưa xác định được nguyên nhân chính xác.
var _acsResult = "";
function alignCenterSimple() {
  var layer = getLayer();
  if (!layer) return "NO_LAYER";
  _acsResult = "";
  // (Tauri port) Gộp các bước (Duplicate/Rasterize/Delete/Move) thành 1 bước Undo
  // ("TypoCOM Align") thay vì Photoshop chẻ nhỏ ra nhiều bước rời rạc.
  app.activeDocument.suspendHistory("TypoCOM Align", "_alignCenterSimpleInner()");
  return _acsResult || "OK";
}

function _alignCenterSimpleInner() {
  var doc = app.activeDocument;
  var layer = getLayer();
  if (!layer) {
    _acsResult = "NO_LAYER";
    return;
  }
  try {
    var cx, cy, hadSelection = false;
    try {
      var sel = doc.selection.bounds;
      cx = (sel[0].as("px") + sel[2].as("px")) / 2;
      cy = (sel[1].as("px") + sel[3].as("px")) / 2;
      hadSelection = true;
    } catch (e) {
      cx = doc.width.as("px") / 2;
      cy = doc.height.as("px") / 2;
    }

    var dup = layer.duplicate();
    dup.rasterize(RasterizeType.ENTIRELAYER);
    var tb = dup.bounds;
    var tx = (tb[0].as("px") + tb[2].as("px")) / 2;
    var ty = (tb[1].as("px") + tb[3].as("px")) / 2;
    dup.remove();

    layer.translate(new UnitValue(cx - tx, "px"), new UnitValue(cy - ty, "px"));

    if (hadSelection) doc.selection.deselect();
    app.refresh();
    _acsResult = "OK";
  } catch (e) {
    _acsResult = "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function alignCenter(autoShape, autoFit, padding) {
  // Nâng cấp từ TypeR: khi KHÔNG có Selection -> tự Magic Wand nhận diện vùng màu (bóng thoại)
  // ngay cạnh layer text đang chọn, rồi áp chuỗi co/giãn để "cắt đuôi" bóng thoại trước khi canh
  // giữa. Khi ĐÃ có Selection sẵn -> canh giữa layer vào đúng vùng đó (như alignCenter cũ).
  // autoShape/autoFit (tùy chọn, Typer Box Setting): nếu bật, sau khi canh giữa sẽ tự chia lại dòng
  // và/hoặc dò cỡ chữ lớn nhất vừa khít bóng thoại (TypeR - darkmax159159357 fork, gốc Arcanos
  // AL3mla8, MIT License) — dùng chung đúng vùng bóng thoại vừa canh giữa, không dò lại lần nữa.
  // padding (Ref No. trong Typer Box Setting): khoảng lề dùng khi tính vùng chữ trong bóng thoại,
  // mặc định 10 nếu không truyền.
  try {
    var res = TR_alignTextLayerToSelection(!!autoShape, !!autoFit, padding);
    if (res === "") {
      app.refresh();
      return "OK";
    }
    if (res.indexOf("autoFitError:") === 0) {
      // Canh giữa vẫn thành công, chỉ riêng Auto Shape/Fit bị lỗi -> vẫn refresh vì layer đã đổi vị trí
      app.refresh();
      return "AUTOFIT_ERROR:" + res.slice("autoFitError:".length);
    }
    if (res === "doc") return "NO_DOC";
    if (res === "layer") return "NO_LAYER";
    // "noSelection" (Magic Wand không bắt được vùng nào ở đó) | "smallSelection" (vùng quá nhỏ)
    return "ERROR:" + res;
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function applyNow(dSize, dLead) {
  var layer = getLayer();
  if (!layer) return "NO_LAYER";
  try {
    var t = layer.textItem;
    var curSize = t.size.as("pt");
    var curLead = 0;
    try {
      curLead = t.leading.as("pt");
    } catch (e) {}
    if (curLead <= 0) curLead = curSize * 1.2;
    var newSize = curSize + dSize;
    var newLead = curLead + dLead;
    if (newSize < 1) newSize = 1;
    if (newLead < 0) newLead = 0;
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("TxtS"));
    ref.putEnumerated(charIDToTypeID("TxLr"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    var textStyle = new ActionDescriptor();
    textStyle.putUnitDouble(charIDToTypeID("Sz  "), charIDToTypeID("Pts "), newSize);
    textStyle.putUnitDouble(charIDToTypeID("Ldng"), charIDToTypeID("Pts "), newLead);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("TxtS"), textStyle);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
    return "OK";
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function selectLayerByID(id) {
  if (id === undefined || id === null) {
    throw new Error("selectLayerByID nhận id rỗng (" + id + ")");
  }
  var ref = new ActionReference();
  ref.putIdentifier(charIDToTypeID("Lyr "), id);
  var desc = new ActionDescriptor();
  desc.putReference(charIDToTypeID("null"), ref);
  desc.putBoolean(charIDToTypeID("MkVs"), false);
  executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function pasteFX(dataStr) {
  // (Tauri port) Dan lai dung du lieu JSON da Copy (gui kem lam tham so, khong dua
  // vao $.global "nho" giup nua) -- dung lai applyFXToSelectedLayers() da co san va
  // da test hoat dong tot cho FX Studio, ap dung cho 1 hoac nhieu layer dang chon.
  if (!app.documents.length) return "NO_DOC";
  if (!dataStr) return "NO_FX";
  return applyFXToSelectedLayers(dataStr);
}

function selectForm() {
  if (!app.documents.length) return "NO_DOC";
  try {
    var doc = app.activeDocument;
    var workPath = doc.pathItems.getByName("Work Path");
    workPath.makeSelection(0, false, SelectionType.REPLACE);
    workPath.remove();
    app.refresh();
    return "OK";
  } catch (e) {
    return "NO_PATH";
  }
}

// (Tauri port) Logo path KHÔNG dựa vào $.global nữa — pickLogoPath() vẫn trả path về
// cho JS lưu (localStorage), placeLogo()/pasteLogoToAllDocs() nhận path làm tham số,
// JS gửi kèm mỗi lần gọi. $.global từng bị "làm mới" ngoài ý muốn (do reconnect ngầm),
// làm mất path đã chọn — cách này né hẳn vấn đề đó.

function pickLogoPath() {
  try {
    var f = File.openDialog("Chọn file logo", "*.png;*.jpg;*.jpeg;*.tif;*.tiff;*.psd;*.ai;*.eps", false);
    if (!f) return "CANCELLED";
    return f.fsName.replace(/\\/g, "/");
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function placeLogo(path) {
  if (!app.documents.length) return "NO_DOC";
  try {
    if (!path) return "NO_LOGO_SELECTED";
    var f = new File(path);
    if (!f.exists) return "NO_FILE (debug: path=" + path + ")";
    var idPlc = charIDToTypeID("Plc ");
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), f);
    desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
    executeAction(idPlc, desc, DialogModes.NO);
    app.refresh();
    return "OK";
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function pasteLogoToAllDocs(path) {
  if (!app.documents.length) return "NO_DOC";
  if (!path) return "NO_LOGO_SELECTED";
  var logoFile = new File(path);
  if (!logoFile.exists) return "LOGO_FILE_NOT_FOUND";
  var originalDoc = app.activeDocument;
  try {
    for (var i = 0; i < app.documents.length; i++) {
      var doc = app.documents[i];
      app.activeDocument = doc;
      var idPlc = charIDToTypeID("Plc ");
      var desc = new ActionDescriptor();
      desc.putPath(charIDToTypeID("null"), logoFile);
      desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
      executeAction(idPlc, desc, DialogModes.NO);
      var logoLayer = doc.activeLayer;
      if (logoLayer) {
        var docW = doc.width.as("px");
        var docH = doc.height.as("px");
        var bounds = logoLayer.bounds;
        var layerH = bounds[3].as("px") - bounds[1].as("px");
        var newX = 0;
        var newY = (docH - layerH) / 2;
        var currentX = bounds[0].as("px");
        var currentY = bounds[1].as("px");
        logoLayer.translate(newX - currentX, newY - currentY);
      }
    }
    app.activeDocument = originalDoc;
    app.refresh();
    return "OK";
  } catch (e) {
    try {
      app.activeDocument = originalDoc;
    } catch (e2) {}
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function toggleCheck() {
  if (!app.documents.length) return "NO_DOC";
  var doc = app.activeDocument,
    checkLayer = null;

  function findCheck(layers) {
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].name == "CHECK") {
        checkLayer = layers[i];
        return;
      }
      if (layers[i].typename == "LayerSet") findCheck(layers[i].layers);
    }
  }
  findCheck(doc.layers);
  if (checkLayer) {
    try {
      checkLayer.remove();
    } catch (e) {}
    return "REMOVED";
  }

  function getAllFlat(parent, result) {
    for (var i = 0; i < parent.layers.length; i++) {
      result.push(parent.layers[i]);
      if (parent.layers[i].typename == "LayerSet") getAllFlat(parent.layers[i], result);
    }
  }
  var flat = [],
    textLayers = [];
  getAllFlat(doc, flat);
  for (var i = 0; i < flat.length; i++)
    if (flat[i].typename == "ArtLayer" && flat[i].kind == LayerKind.TEXT)
      textLayers.push(flat[i]);
  if (!textLayers.length) return "NO_TEXT";
  var nl = doc.artLayers.add();
  nl.name = "CHECK";
  nl.move(textLayers[textLayers.length - 1], ElementPlacement.PLACEAFTER);
  var color = new SolidColor();
  color.rgb.red = 249;
  color.rgb.green = 255;
  color.rgb.blue = 76;
  doc.selection.selectAll();
  doc.selection.fill(color);
  doc.selection.deselect();
  nl.opacity = 70;
  return "OK";
}

function getTextFont() {
  var layer = getLayer();
  if (!layer) return "NO_LAYER";
  try {
    var font = layer.textItem.font;
    if (font && font.name) return font.name;
    if (font && font.postScriptName) return font.postScriptName;
    return "Arial";
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function groupTextLayers() {
  if (!app.documents.length) return "NO_DOC";
  var doc = app.activeDocument,
    textLayers = [];

  function collect(layers) {
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].typename == "ArtLayer" && layers[i].kind == LayerKind.TEXT)
        textLayers.push(layers[i]);
      else if (layers[i].typename == "LayerSet")
        collect(layers[i].layers);
    }
  }
  collect(doc.layers);
  if (!textLayers.length) return "NO_TEXT";
  var tg = null;
  for (var i = 0; i < doc.layerSets.length; i++) {
    if (doc.layerSets[i].name == "TEXT") {
      tg = doc.layerSets[i];
      break;
    }
  }
  if (!tg) {
    tg = doc.layerSets.add();
    tg.name = "TEXT";
  }
  for (var i = 0; i < textLayers.length; i++) {
    try {
      textLayers[i].move(tg, ElementPlacement.INSIDE);
    } catch (e) {}
  }
  return "OK";
}

// ========== FX MANAGER – UTILITY FUNCTIONS ==========
function safeGetUnitDouble(desc, key) {
  try {
    return desc.getUnitDoubleValue(stringIDToTypeID(key));
  } catch (e) {}
  try {
    return desc.getDouble(stringIDToTypeID(key));
  } catch (e) {}
  return 0;
}

function getColorFromDesc(desc) {
  try {
    var r = desc.getDouble(stringIDToTypeID("red"));
    var g = desc.getDouble(stringIDToTypeID("green"));
    var b = desc.getDouble(stringIDToTypeID("blue"));
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b)
    };
  } catch (e) {
    return {
      r: 0,
      g: 0,
      b: 0
    };
  }
}

function getCurrentLayerEffects() {
  try {
    if (!app.documents.length) return null;
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref);
    var fxKey = stringIDToTypeID("layerEffects");
    if (desc.hasKey(fxKey)) {
      return desc.getObjectValue(fxKey);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ===================== TẠO PHẦN "MÀU" THUẦN CỦA GRADIENT (class Grdn) =====================
// Chỉ chứa color stops + transparency stops, KHÔNG chứa enabled/angle/type/scale.
// Dùng chung cho cả Gradient Overlay (fill effect) và Stroke Gradient (frameFX),
// vì trong action descriptor thật của Photoshop, "gradient" luôn chỉ là phần màu;
// angle/type/scale luôn nằm ở cấp cha (gradientFill hoặc frameFX), không lồng bên trong.
function buildGradientColorObject(colors) {
  if (!colors || colors.length < 2) {
    colors = [{
      r: 0,
      g: 0,
      b: 0
    }, {
      r: 255,
      g: 255,
      b: 255
    }];
  }
  var c1 = colors[0];
  var c2 = colors[1];

  var grad = new ActionDescriptor();
  grad.putString(stringIDToTypeID("name"), "Custom");
  grad.putEnumerated(stringIDToTypeID("gradientForm"), stringIDToTypeID("gradientForm"), stringIDToTypeID("customStops"));
  grad.putInteger(stringIDToTypeID("interfaceIconFrameDimmed"), 4096);

  var colorList = new ActionList();

  // Tạo stop 1
  var stop1 = new ActionDescriptor();
  var colorD1 = new ActionDescriptor();
  colorD1.putDouble(stringIDToTypeID("red"), c1.r);
  colorD1.putDouble(stringIDToTypeID("green"), c1.g);
  colorD1.putDouble(stringIDToTypeID("blue"), c1.b);
  stop1.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), colorD1);
  stop1.putEnumerated(stringIDToTypeID("type"), stringIDToTypeID("colorStopType"), stringIDToTypeID("userStop"));
  stop1.putInteger(stringIDToTypeID("location"), 0);
  stop1.putInteger(stringIDToTypeID("midpoint"), 50);
  colorList.putObject(stringIDToTypeID("colorStop"), stop1);

  // Tạo stop 2
  var stop2 = new ActionDescriptor();
  var colorD2 = new ActionDescriptor();
  colorD2.putDouble(stringIDToTypeID("red"), c2.r);
  colorD2.putDouble(stringIDToTypeID("green"), c2.g);
  colorD2.putDouble(stringIDToTypeID("blue"), c2.b);
  stop2.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), colorD2);
  stop2.putEnumerated(stringIDToTypeID("type"), stringIDToTypeID("colorStopType"), stringIDToTypeID("userStop"));
  stop2.putInteger(stringIDToTypeID("location"), 4096);
  stop2.putInteger(stringIDToTypeID("midpoint"), 50);
  colorList.putObject(stringIDToTypeID("colorStop"), stop2);

  grad.putList(stringIDToTypeID("colors"), colorList);

  // Transparency stops (2 stops)
  var transList = new ActionList();
  for (var t = 0; t < 2; t++) {
    var ts = new ActionDescriptor();
    ts.putUnitDouble(stringIDToTypeID("opacity"), stringIDToTypeID("percentUnit"), 100);
    ts.putInteger(stringIDToTypeID("location"), t === 0 ? 0 : 4096);
    ts.putInteger(stringIDToTypeID("midpoint"), 50);
    transList.putObject(stringIDToTypeID("transferSpec"), ts);
  }
  grad.putList(stringIDToTypeID("transparency"), transList);

  return grad;
}

// ===================== GRADIENT OVERLAY (fill effect) DESCRIPTOR =====================
function createGradientDescriptor(gfData) {
  var gf = new ActionDescriptor();
  gf.putBoolean(stringIDToTypeID("enabled"), true);
  gf.putBoolean(stringIDToTypeID("present"), true);
  gf.putBoolean(stringIDToTypeID("showInDialog"), true);
  gf.putEnumerated(stringIDToTypeID("mode"), stringIDToTypeID("blendMode"), stringIDToTypeID("normal"));
  gf.putUnitDouble(stringIDToTypeID("opacity"), stringIDToTypeID("percentUnit"), 100);
  gf.putUnitDouble(stringIDToTypeID("angle"), stringIDToTypeID("angleUnit"), gfData.angle || 0);
  gf.putEnumerated(stringIDToTypeID("type"), stringIDToTypeID("gradientType"), stringIDToTypeID(gfData.type || "linear"));
  gf.putBoolean(stringIDToTypeID("reverse"), false);
  gf.putBoolean(stringIDToTypeID("dither"), false);
  gf.putBoolean(stringIDToTypeID("align"), true);
  gf.putUnitDouble(stringIDToTypeID("scale"), stringIDToTypeID("percentUnit"), gfData.scale || 100);
  gf.putObject(stringIDToTypeID("gradient"), stringIDToTypeID("gradientClassEvent"), buildGradientColorObject(gfData.colors));
  return gf;
}

// ===================== TẠO STROKE DESCRIPTOR =====================
function createStrokeDescriptor(strokeData) {
  var st = new ActionDescriptor();
  st.putBoolean(stringIDToTypeID("enabled"), true);
  st.putBoolean(stringIDToTypeID("present"), true);
  st.putBoolean(stringIDToTypeID("showInDialog"), true);

  var styleMap = {
    "outsetFrame": "outsetFrame",
    "insetFrame": "insetFrame",
    "centerFrame": "outsetFrame"
  };
  var styleStr = styleMap[strokeData.style] || "outsetFrame";
  st.putEnumerated(stringIDToTypeID("style"), stringIDToTypeID("frameStyle"), stringIDToTypeID(styleStr));

  st.putEnumerated(stringIDToTypeID("mode"), stringIDToTypeID("blendMode"), stringIDToTypeID("normal"));
  st.putUnitDouble(stringIDToTypeID("opacity"), stringIDToTypeID("percentUnit"), 100);
  st.putUnitDouble(stringIDToTypeID("size"), stringIDToTypeID("pixelsUnit"), strokeData.size || 1);
  st.putBoolean(stringIDToTypeID("overprint"), false);

  if (strokeData.paintType === "gradientFill") {
    st.putEnumerated(stringIDToTypeID("paintType"), stringIDToTypeID("frameFill"), stringIDToTypeID("gradientFill"));
    var grad = strokeData.gradient || {};
    // Các thuộc tính gradient (angle/type/scale/reverse/align) nằm CÙNG CẤP với frameFX,
    // không lồng vào bên trong "gradient" — đây là điểm trước đây bị sai khiến
    // Photoshop không áp dụng được stroke gradient và không sync lại được.
    st.putBoolean(stringIDToTypeID("reverse"), false);
    st.putBoolean(stringIDToTypeID("align"), true);
    st.putUnitDouble(stringIDToTypeID("angle"), stringIDToTypeID("angleUnit"), grad.angle || 0);
    st.putEnumerated(stringIDToTypeID("type"), stringIDToTypeID("gradientType"), stringIDToTypeID(grad.type || "linear"));
    st.putUnitDouble(stringIDToTypeID("scale"), stringIDToTypeID("percentUnit"), grad.scale || 100);
    st.putObject(stringIDToTypeID("gradient"), stringIDToTypeID("gradientClassEvent"), buildGradientColorObject(grad.colors));
  } else {
    st.putEnumerated(stringIDToTypeID("paintType"), stringIDToTypeID("frameFill"), stringIDToTypeID("solidColor"));
    var stColor = new ActionDescriptor();
    stColor.putDouble(stringIDToTypeID("red"), strokeData.color.r);
    stColor.putDouble(stringIDToTypeID("green"), strokeData.color.g);
    stColor.putDouble(stringIDToTypeID("blue"), strokeData.color.b);
    st.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), stColor);
  }
  return st;
}

// ===================== DROP SHADOW =====================
function createShadowDescriptor(shadowData) {
  var desc = new ActionDescriptor();
  desc.putBoolean(stringIDToTypeID("enabled"), true);
  desc.putBoolean(stringIDToTypeID("present"), true);
  desc.putBoolean(stringIDToTypeID("showInDialog"), true);

  var modeMap = {
    "normal": "normal",
    "multiply": "multiply",
    "screen": "screen",
    "overlay": "overlay",
    "darken": "darken",
    "lighten": "lighten",
    "colorBurn": "colorBurn",
    "colorDodge": "colorDodge",
    "linearBurn": "linearBurn",
    "linearDodge": "linearDodge",
    "hardLight": "hardLight",
    "softLight": "softLight",
    "difference": "difference",
    "exclusion": "exclusion",
    "hue": "hue",
    "saturation": "saturation",
    "color": "color",
    "luminosity": "luminosity"
  };
  var modeStr = modeMap[shadowData.mode] || "multiply";
  desc.putEnumerated(stringIDToTypeID("mode"), stringIDToTypeID("blendMode"), stringIDToTypeID(modeStr));

  var opacity = parseFloat(shadowData.opacity) || 100;
  var angle = parseFloat(shadowData.angle) || 30;
  var distance = parseFloat(shadowData.distance);
  if (isNaN(distance)) distance = 5;
  var spread = parseFloat(shadowData.spread) || 0;
  var size = parseFloat(shadowData.size) || 5;

  desc.putUnitDouble(stringIDToTypeID("opacity"), stringIDToTypeID("percentUnit"), opacity);
  desc.putUnitDouble(stringIDToTypeID("localLightingAngle"), stringIDToTypeID("angleUnit"), angle);
  desc.putUnitDouble(stringIDToTypeID("distance"), stringIDToTypeID("pixelsUnit"), distance);
  desc.putUnitDouble(stringIDToTypeID("chokeMatte"), stringIDToTypeID("percentUnit"), spread);
  desc.putUnitDouble(stringIDToTypeID("blur"), stringIDToTypeID("pixelsUnit"), size);
  desc.putBoolean(stringIDToTypeID("useGlobalAngle"), false);

  var colorDesc = new ActionDescriptor();
  colorDesc.putDouble(stringIDToTypeID("red"), shadowData.color.r);
  colorDesc.putDouble(stringIDToTypeID("green"), shadowData.color.g);
  colorDesc.putDouble(stringIDToTypeID("blue"), shadowData.color.b);
  desc.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), colorDesc);

  return desc;
}

// ===================== OUTER GLOW =====================
function createGlowDescriptor(glowData) {
  var og = new ActionDescriptor();
  og.putBoolean(stringIDToTypeID("enabled"), true);
  og.putBoolean(stringIDToTypeID("present"), true);
  og.putBoolean(stringIDToTypeID("showInDialog"), true);
  og.putEnumerated(stringIDToTypeID("mode"), stringIDToTypeID("blendMode"), stringIDToTypeID("normal"));
  og.putUnitDouble(stringIDToTypeID("opacity"), stringIDToTypeID("percentUnit"), glowData.opacity || 100);
  og.putEnumerated(stringIDToTypeID("glowTechnique"), stringIDToTypeID("matteTechnique"), stringIDToTypeID("softMatte"));
  og.putUnitDouble(stringIDToTypeID("chokeMatte"), stringIDToTypeID("pixelsUnit"), glowData.chokeMatte || 0);
  og.putUnitDouble(stringIDToTypeID("blur"), stringIDToTypeID("pixelsUnit"), glowData.blur || 10);
  og.putUnitDouble(stringIDToTypeID("noise"), stringIDToTypeID("percentUnit"), 0);
  og.putBoolean(stringIDToTypeID("antiAlias"), false);
  og.putUnitDouble(stringIDToTypeID("inputRange"), stringIDToTypeID("percentUnit"), 50);
  var ogColor = new ActionDescriptor();
  var glowColor = glowData.color || {
    r: 255,
    g: 255,
    b: 255
  };
  ogColor.putDouble(stringIDToTypeID("red"), glowColor.r);
  ogColor.putDouble(stringIDToTypeID("green"), glowColor.g);
  ogColor.putDouble(stringIDToTypeID("blue"), glowColor.b);
  og.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), ogColor);
  return og;
}

// ===================== ÁP DỤNG FX =====================
function _applyFX(data) {
  // (Tauri port) Ép tắt HẾT mọi hộp thoại/cảnh báo của Photoshop trong lúc chạy — mạnh
  // hơn DialogModes.NO ở từng executeAction. Lý do cần: chạy qua COM (không có ai đứng
  // nhìn màn hình Photoshop theo dõi), nếu 1 cảnh báo nào đó bật lên (VD tính năng không
  // khả dụng trên CS6) mà không có DialogModes.NO che kịp, script sẽ đứng chờ vô thời hạn
  // chờ người bấm OK -> app bị treo (đúng triệu chứng "không phản hồi sau 10 giây").
  var __tcPrevDialogs = app.displayDialogs;
  app.displayDialogs = DialogModes.NO;
  try {
    return _applyFXInner(data);
  } finally {
    app.displayDialogs = __tcPrevDialogs;
  }
}

function _applyFXInner(data) {
  // Đánh dấu phiên bản + để lại "dấu vết" từng bước — nếu lỗi hiện ra mà KHÔNG thấy
  // chữ TCV6 ở đầu, nghĩa là bản Photoshop đang chạy KHÔNG PHẢI bản code mới nhất này
  // (khả năng cao do session cũ còn sót lại) — đây là cách xác nhận chắc chắn thay vì
  // đoán tiếp qua nhiều vòng không trúng.
  var __tcTrace = "TCV6";
  try {
    var setDesc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    setDesc.putReference(charIDToTypeID("null"), ref);
    var effDesc = new ActionDescriptor();
    effDesc.putUnitDouble(stringIDToTypeID("scale"), stringIDToTypeID("percentUnit"), 100.0);
    __tcTrace += ">init";
  } catch (__tcFx) { throw new Error(__tcTrace + ">init_FAIL: " + __tcFx.message); }

  if (data.gradientFill && data.gradientFill.enabled) {
    try {
      var gf = createGradientDescriptor(data.gradientFill);
      effDesc.putObject(stringIDToTypeID("gradientFill"), stringIDToTypeID("gradientFill"), gf);
      __tcTrace += ">gradientFill";
    } catch (__tcFx) { throw new Error(__tcTrace + ">gradientFill_FAIL: " + __tcFx.message); }
  }
  if (data.strokes && data.strokes.length > 0) {
    for (var s = 0; s < data.strokes.length; s++) {
      try {
        var st = createStrokeDescriptor(data.strokes[s]);
        var keyStr = s === 0 ? "frameFX" : "frameFX" + (s + 1);
        effDesc.putObject(stringIDToTypeID(keyStr), stringIDToTypeID("frameFX"), st);
        __tcTrace += ">strokes[" + s + "]";
      } catch (__tcFx) { throw new Error(__tcTrace + ">strokes[" + s + "]_FAIL: " + __tcFx.message); }
    }
  }
  if (data.dropShadow && data.dropShadow.enabled) {
    try {
      var sd = createShadowDescriptor(data.dropShadow);
      effDesc.putObject(stringIDToTypeID("dropShadow"), stringIDToTypeID("dropShadow"), sd);
      __tcTrace += ">dropShadow";
    } catch (__tcFx) { throw new Error(__tcTrace + ">dropShadow_FAIL: " + __tcFx.message); }
  }
  if (data.outerGlow && data.outerGlow.enabled) {
    try {
      var og = createGlowDescriptor(data.outerGlow);
      effDesc.putObject(stringIDToTypeID("outerGlow"), stringIDToTypeID("outerGlow"), og);
      __tcTrace += ">outerGlow";
    } catch (__tcFx) { throw new Error(__tcTrace + ">outerGlow_FAIL: " + __tcFx.message); }
  }
  if (data.textColor) {
    try {
      var layer = getLayer();
      if (layer && layer.kind == LayerKind.TEXT) {
        var newColor = new SolidColor();
        newColor.rgb.red = data.textColor.r;
        newColor.rgb.green = data.textColor.g;
        newColor.rgb.blue = data.textColor.b;
        layer.textItem.color = newColor;
        // Áp dụng opacity nếu có
        if (data.textColor.opacity !== undefined) {
          layer.opacity = data.textColor.opacity;
        }
        // Áp dụng fill (Fill Opacity) nếu có
        if (data.textColor.fill !== undefined) {
          layer.fillOpacity = data.textColor.fill;
        }
      }
    } catch (e) {}
  }
  var layerDesc = new ActionDescriptor();
  try {
    layerDesc.putObject(stringIDToTypeID("layerEffects"), stringIDToTypeID("layerEffects"), effDesc);
    setDesc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), layerDesc);
    executeAction(charIDToTypeID("setd"), setDesc, DialogModes.NO);
    __tcTrace += ">executeAction";
  } catch (__tcFx) { throw new Error(__tcTrace + ">executeAction_FAIL: " + __tcFx.message); }
  app.refresh();
  return "OK";
}

function _applyFXMerge(newData) {
  var setDesc = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  setDesc.putReference(charIDToTypeID("null"), ref);
  var currentEffects = getCurrentLayerEffects();
  var effDesc = currentEffects ? currentEffects : new ActionDescriptor();
  if (newData.gradientFill) {
    try {
      var gf = createGradientDescriptor(newData.gradientFill);
      effDesc.putObject(stringIDToTypeID("gradientFill"), stringIDToTypeID("gradientFill"), gf);
    } catch (e) {
      return "ERROR: gradient " + e.message;
    }
  }
  if (newData.strokes) {
    try {
      for (var i = 1; i <= 10; i++) {
        var key = (i === 1) ? "frameFX" : "frameFX" + i;
        try {
          effDesc.erase(stringIDToTypeID(key));
        } catch (e) {}
      }
      for (var s = 0; s < newData.strokes.length; s++) {
        var st = createStrokeDescriptor(newData.strokes[s]);
        var keyStr = (s === 0) ? "frameFX" : "frameFX" + (s + 1);
        effDesc.putObject(stringIDToTypeID(keyStr), stringIDToTypeID("frameFX"), st);
      }
    } catch (e) {
      return "ERROR: stroke " + e.message;
    }
  }
  if (newData.dropShadow && newData.dropShadow.enabled) {
    try {
      effDesc.erase(stringIDToTypeID("dropShadow"));
    } catch (e) {}
    try {
      var sd = createShadowDescriptor(newData.dropShadow);
      effDesc.putObject(stringIDToTypeID("dropShadow"), stringIDToTypeID("dropShadow"), sd);
    } catch (e) {
      return "ERROR: dropShadow " + e.message;
    }
  }
  if (newData.outerGlow && newData.outerGlow.enabled) {
    try {
      effDesc.erase(stringIDToTypeID("outerGlow"));
    } catch (e) {}
    try {
      var og = createGlowDescriptor(newData.outerGlow);
      effDesc.putObject(stringIDToTypeID("outerGlow"), stringIDToTypeID("outerGlow"), og);
    } catch (e) {
      return "ERROR: outerGlow " + e.message;
    }
  }
  var layerDesc = new ActionDescriptor();
  layerDesc.putObject(stringIDToTypeID("layerEffects"), stringIDToTypeID("layerEffects"), effDesc);
  setDesc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), layerDesc);
  executeAction(charIDToTypeID("setd"), setDesc, DialogModes.NO);
  app.refresh();
  return "OK";
}

// ===================== GET FX DATA =====================
function getFXData() {
  try {
    if (!app.documents.length) return "NO_DOC";
    var out = {};
    try {
      var layer = getLayer();
      if (layer && layer.kind == LayerKind.TEXT) {
        var rgb = layer.textItem.color.rgb;
        out.textColor = {
          r: Math.round(rgb.red),
          g: Math.round(rgb.green),
          b: Math.round(rgb.blue),
          opacity: layer.opacity, // Opacity của layer
          fill: layer.fillOpacity // Fill Opacity của layer
        };
      }
    } catch (e) {}

    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref);
    var fxKey = stringIDToTypeID("layerEffects");
    if (desc.hasKey(fxKey)) {
      var fx = desc.getObjectValue(fxKey);

      // Gradient Fill
      try {
        if (fx.hasKey(stringIDToTypeID("gradientFill"))) {
          var gf = fx.getObjectValue(stringIDToTypeID("gradientFill"));
          var gradient = gf.getObjectValue(stringIDToTypeID("gradient"));
          var colors = [];
          if (gradient.hasKey(stringIDToTypeID("colors"))) {
            var colorList = gradient.getList(stringIDToTypeID("colors"));
            for (var i = 0; i < colorList.count; i++) {
              var stop = colorList.getObjectValue(i);
              colors.push(getColorFromDesc(stop.getObjectValue(stringIDToTypeID("color"))));
            }
          }
          var gradType = "linear";
          try {
            gradType = typeIDToStringID(gf.getEnumerationValue(stringIDToTypeID("type")));
          } catch (e) {}
          out.gradientFill = {
            enabled: gf.getBoolean(stringIDToTypeID("enabled")),
            angle: safeGetUnitDouble(gf, "angle"),
            type: gradType,
            colors: colors
          };
        }
      } catch (e) {}

      // Stroke
      try {
        if (fx.hasKey(stringIDToTypeID("frameFX"))) {
          var st = fx.getObjectValue(stringIDToTypeID("frameFX"));
          var paintType = st.getEnumerationValue(stringIDToTypeID("paintType"));
          var paintTypeStr = typeIDToStringID(paintType);
          var strokeObj = {
            enabled: st.getBoolean(stringIDToTypeID("enabled")),
            size: safeGetUnitDouble(st, "size"),
            style: typeIDToStringID(st.getEnumerationValue(stringIDToTypeID("style")))
          };
          if (paintTypeStr === "gradientFill") {
            // angle/type/scale nằm cùng cấp với frameFX (st), "gradient" chỉ chứa color stops
            var grad = st.getObjectValue(stringIDToTypeID("gradient"));
            var type = "linear";
            try {
              type = typeIDToStringID(st.getEnumerationValue(stringIDToTypeID("type")));
            } catch (e) {}
            var colors = [];
            if (grad.hasKey(stringIDToTypeID("colors"))) {
              var colorList = grad.getList(stringIDToTypeID("colors"));
              for (var i = 0; i < colorList.count; i++) {
                var stop = colorList.getObjectValue(i);
                colors.push(getColorFromDesc(stop.getObjectValue(stringIDToTypeID("color"))));
              }
            }
            var angle = safeGetUnitDouble(st, "angle");
            strokeObj.paintType = "gradientFill";
            strokeObj.gradient = {
              type: type,
              angle: angle,
              colors: colors,
              scale: safeGetUnitDouble(st, "scale") || 100
            };
          } else {
            strokeObj.paintType = "solidColor";
            strokeObj.color = getColorFromDesc(st.getObjectValue(stringIDToTypeID("color")));
          }
          out.strokes = [strokeObj];
        }
      } catch (e) {}

      // Drop Shadow
      try {
        if (fx.hasKey(stringIDToTypeID("dropShadow"))) {
          var ds = fx.getObjectValue(stringIDToTypeID("dropShadow"));
          var blendMode = "multiply";
          try {
            blendMode = typeIDToStringID(ds.getEnumerationValue(stringIDToTypeID("mode")));
          } catch (e) {}
          out.dropShadow = {
            enabled: ds.getBoolean(stringIDToTypeID("enabled")),
            mode: blendMode,
            opacity: safeGetUnitDouble(ds, "opacity"),
            angle: safeGetUnitDouble(ds, "localLightingAngle"),
            distance: safeGetUnitDouble(ds, "distance"),
            spread: safeGetUnitDouble(ds, "chokeMatte"),
            size: safeGetUnitDouble(ds, "blur"),
            color: getColorFromDesc(ds.getObjectValue(stringIDToTypeID("color"))),
            useGlobalLight: ds.getBoolean(stringIDToTypeID("useGlobalAngle"))
          };
        }
      } catch (e) {}

      // Outer Glow
      try {
        if (fx.hasKey(stringIDToTypeID("outerGlow"))) {
          var og = fx.getObjectValue(stringIDToTypeID("outerGlow"));
          out.outerGlow = {
            enabled: og.getBoolean(stringIDToTypeID("enabled")),
            opacity: safeGetUnitDouble(og, "opacity"),
            blur: safeGetUnitDouble(og, "blur"),
            chokeMatte: safeGetUnitDouble(og, "chokeMatte"),
            color: getColorFromDesc(og.getObjectValue(stringIDToTypeID("color")))
          };
        }
      } catch (e) {}
    }
    return JSON.stringify(out);
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function getForegroundColor() {
  try {
    var c = app.foregroundColor.rgb;
    return JSON.stringify({
      r: Math.round(c.red),
      g: Math.round(c.green),
      b: Math.round(c.blue)
    });
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function getBackgroundColor() {
  try {
    var c = app.backgroundColor.rgb;
    return JSON.stringify({
      r: Math.round(c.red),
      g: Math.round(c.green),
      b: Math.round(c.blue)
    });
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function applyFXFromJSON(jsonStr) {
  try {
    var data = (typeof jsonStr === "string") ? JSON.parse(jsonStr) : jsonStr;
    if (!data) return "NO_DATA";
    if (!app.documents.length) return "NO_DOC";
    var layer = getLayer();
    if (!layer) return "NO_LAYER";
    return _applyFX(data);
  } catch (e) {
    return "ERROR:" + e.message + " @line " + (e.line || "?");
  }
}

function getSelectedLayersIDs() {
  var ids = [];
  // (Tauri port) Đổi hẳn sang cách lấy danh sách "targetLayers" (theo INDEX, giống hệt
  // cơ chế _forEachSelectedLayer() đã chứng minh nhận đúng nhiều layer trên CS6) thay vì
  // "targetLayersIDs" (theo IDENTIFIER) — API cũ đó không được CS6 hỗ trợ đầy đủ, khiến
  // Photoshop tưởng chỉ có 1 layer đang chọn dù Anh chọn nhiều, gây lỗi lúc executeAction.
  try {
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("targetLayers"));
    ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref);
    var key = stringIDToTypeID("targetLayers");
    if (desc.hasKey(key)) {
      var list = desc.getList(key);
      var bgRef = new ActionReference();
      bgRef.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Bckg"));
      bgRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Back"));
      var offset = executeActionGet(bgRef).getBoolean(charIDToTypeID("Bckg")) ? 0 : 1;
      for (var i = 0; i < list.count; i++) {
        try {
          var idx = list.getReference(i).getIndex() + offset;
          var idRef = new ActionReference();
          idRef.putIndex(charIDToTypeID("Lyr "), idx);
          var idDesc = executeActionGet(idRef);
          var lid = idDesc.getInteger(stringIDToTypeID("layerID"));
          if (lid !== undefined && lid !== null) ids.push(lid);
        } catch (e) {}
      }
    }
  } catch (e) {}
  // Không lấy được ID hợp lệ nào -> dùng thẳng activeLayer.id.
  if (ids.length === 0) {
    try {
      ids.push(app.activeDocument.activeLayer.id);
    } catch (e) {}
  }
  return ids;
}

function applyFXToSelectedLayers(payloadStr) {
  var __tcT2 = "T2start";
  try {
    if (!app.documents.length) return "NO_DOC";
    var doc = app.activeDocument;
    var originalLayer = doc.activeLayer;
    __tcT2 += ">gotDoc";
    var selectedIds = getSelectedLayersIDs();
    __tcT2 += ">gotIds(" + selectedIds.length + ")";
    if (selectedIds.length === 0) return "NO_LAYER";
    var payload;
    if (typeof payloadStr === "string") {
      payload = JSON.parse(payloadStr);
    } else {
      payload = payloadStr;
    }
    __tcT2 += ">parsedPayload";
    if (!payload) return "NO_DATA";

    if (selectedIds.length === 1) {
      // (Tauri port) Chỉ có 1 layer đang chọn -> nó ĐÃ LÀ layer active rồi, không cần
      // chọn lại bằng ID làm gì. Bỏ hẳn bước này vì activeLayer.id trả về undefined
      // trên máy này (CS6) khiến executeAction báo "Illegal argument".
      __tcT2 += ">skipReselect(singleLayer)";
      _applyFX(payload);
      __tcT2 += ">appliedFX";
      return "OK";
    }

    selectLayerByID(selectedIds[0]);
    var tempLayer = doc.activeLayer.duplicate(doc, ElementPlacement.PLACEATEND);
    tempLayer.name = "_typo_temp_fx";
    doc.activeLayer = tempLayer;
    _applyFX(payload);
    doc.activeLayer = tempLayer;
    var styleName = "_typo_fx_" + Number(new Date());
    makeTempStyle(styleName);
    selectLayersByIDs(selectedIds);
    applyTempStyle(styleName);
    doc.activeLayer = tempLayer;
    tempLayer.remove();
    deleteTempStyle(styleName);

    if (payload.textColor) {
      for (var i = 0; i < selectedIds.length; i++) {
        selectLayerByID(selectedIds[i]);
        try {
          if (doc.activeLayer.kind == LayerKind.TEXT) {
            var nc = new SolidColor();
            nc.rgb.red = payload.textColor.r;
            nc.rgb.green = payload.textColor.g;
            nc.rgb.blue = payload.textColor.b;
            doc.activeLayer.textItem.color = nc;
            if (payload.textColor.opacity !== undefined) {
              doc.activeLayer.opacity = payload.textColor.opacity;
            }
            if (payload.textColor.fill !== undefined) {
              doc.activeLayer.fillOpacity = payload.textColor.fill;
            }
          }
        } catch (e) {}
      }
    }
    selectLayerByID(originalLayer.id);
    app.refresh();
    return "OK";
  } catch (e) {
    return "ERROR:[applyFXToSelectedLayers_TCV6|" + __tcT2 + "] " + e.toString() + " @line " + (e.line || "?");
  }
}

function makeTempStyle(name) {
  var desc = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putClass(stringIDToTypeID("style"));
  desc.putReference(charIDToTypeID("null"), ref);
  desc.putString(charIDToTypeID("Nm  "), name);
  var fromRef = new ActionReference();
  fromRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  desc.putReference(stringIDToTypeID("using"), fromRef);
  desc.putBoolean(stringIDToTypeID("blendOptions"), false);
  desc.putBoolean(stringIDToTypeID("layerEffects"), true);
  desc.putBoolean(stringIDToTypeID("pushToDesignLibraries"), false);
  executeAction(charIDToTypeID("Mk  "), desc, DialogModes.NO);
}

function applyTempStyle(name) {
  var desc = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putName(stringIDToTypeID("style"), name);
  desc.putReference(charIDToTypeID("null"), ref);
  var toRef = new ActionReference();
  toRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  desc.putReference(stringIDToTypeID("to"), toRef);
  desc.putBoolean(stringIDToTypeID("group"), true);
  executeAction(stringIDToTypeID("applyStyle"), desc, DialogModes.NO);
}

function deleteTempStyle(name) {
  try {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putName(stringIDToTypeID("style"), name);
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("Dlt "), desc, DialogModes.NO);
  } catch (e) {}
}

function selectLayersByIDs(ids) {
  for (var i = 0; i < ids.length; i++) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putIdentifier(charIDToTypeID("Lyr "), ids[i]);
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putBoolean(stringIDToTypeID("makeVisible"), false);
    desc.putEnumerated(stringIDToTypeID("selectionModifier"), stringIDToTypeID("selectionModifierType"),
      i === 0 ? stringIDToTypeID("replaceSelection") : stringIDToTypeID("addToSelection"));
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
  }
}

// ========== COPY FX ==========

function copyFX() {
  // (Tauri port) Dung lai getFXData() (da co san, convert ActionDescriptor sang JSON
  // thuong) thay vi tu luu qua $.global -- tra thang JSON ve cho JS giu, gui lai khi Paste.
  if (!app.documents.length) return "NO_DOC";
  return getFXData();
}

// ============================================================
//  TyperTools engine (embedded, namespaced) — cung cấp chức năng
//  "Dán chữ vào Selection" / "Dán chữ vào Layer" + đọc style layer.
//  Toàn bộ code gốc TyperTool được bọc trong 1 scope riêng (IIFE)
//  để KHÔNG xung đột biến/hàm với phần TypoCore phía trên.
//  Chỉ các hàm TT_* ở cuối được lộ ra global cho scripts.js gọi.
// ============================================================
(function() {
  if (typeof jamActions !== "object") {
    var jamActions = {};
    (function() {
      jamActions.isActionsFile = function(e) {
        return e.type === "8BAC" || e.name.match(/\.atn$/i);
      };
      jamActions.isActionsPalette = function(e) {
        return e.type === "8BPF" && e.name.match(/^Actions Palette$/i) || e.name.match(/^Actions Palette.psp$/i);
      };

      function l(e, a) {
        var t = e.read(a);
        var r = 0;
        for (var n = 0; n < a; n++) {
          r = (r << 8) + t.charCodeAt(n);
        }
        return r;
      }

      function o(e, a) {
        return e.read(a);
      }

      function u(e) {
        var a = l(e, 4);
        return o(e, a);
      }

      function p(e) {
        var a = "";
        var t = l(e, 4);
        for (var r = 0; r < t; r++) {
          var n = l(e, 2);
          if (n !== 0) {
            a += String.fromCharCode(n);
          }
        }
        return a;
      }

      function f(e) {
        var a = 0;
        var t = o(e, 4);
        switch (t) {
          case "TEXT":
            a = app.stringIDToTypeID(u(e));
            break;
          case "long":
            a = app.charIDToTypeID(o(e, 4));
            break;
          default:
            throw new Error("[jamActions readEventId] Unrecognized event type: '" + t + "'");
            break;
        }
        return a;
      }

      function s(e) {
        e.seek(8, 1);
      }

      function c(e, a) {
        e.seek(a * 8, 1);
      }

      function m(e) {
        e.seek(1, 1);
      }

      function e(e) {
        e.seek(2, 1);
      }

      function g(e) {
        e.seek(4, 1);
      }

      function y(e) {
        e.seek(8, 1);
      }

      function d(e, a) {
        e.seek(a, 1);
      }

      function h(e) {
        var a = l(e, 4);
        d(e, a);
      }

      function v(e) {
        var a = l(e, 4);
        d(e, a * 2);
      }

      function b(e) {
        var a = l(e, 4);
        if (a) {
          d(e, a);
        } else {
          d(e, 4);
        }
      }

      function k(e) {
        v(e);
        b(e);
      }

      function T(e) {
        k(e);
        var a = l(e, 4);
        for (var t = 0; t < a; t++) {
          b(e);
          r(e);
        }
      }

      function j(e) {
        var a = l(e, 4);
        for (var t = 0; t < a; t++) {
          r(e);
        }
      }

      function r(e) {
        var a = o(e, 4);
        switch (a) {
          case "obj ":
            S(e);
            break;
          case "Objc":
          case "GlbO":
            T(e);
            break;
          case "type":
          case "GlbC":
            k(e);
            break;
          case "VlLs":
            j(e);
            break;
          case "doub":
            s(e);
            break;
          case "UntF":
            d(e, 4);
            s(e);
            break;
          case "TEXT":
            v(e);
            break;
          case "enum":
            b(e);
            b(e);
            break;
          case "long":
            g(e);
            break;
          case "comp":
            y(e);
            break;
          case "bool":
            m(e);
            break;
          case "alis":
            h(e);
            break;
          case "Pth ":
            h(e);
            break;
          case "tdta":
            h(e);
            break;
          case "ObAr":
            var t = l(e, 4);
            k(e);
            var r = l(e, 4);
            for (var n = 0; n < r; n++) {
              b(e);
              g(e);
              g(e);
              var i = l(e, 4);
              c(e, i);
            }
            break;
          default:
            throw new Error("[jamActions skipItem] Unrecognized item type: '" + a + "'");
            break;
        }
      }

      function S(e) {
        var a = l(e, 4);
        for (var t = 0; t < a; t++) {
          var r = o(e, 4);
          k(e);
          switch (r) {
            case "Clss":
              break;
            case "prop":
              b(e);
              break;
            case "Enmr":
              b(e);
              b(e);
              break;
            case "rele":
              g(e);
              break;
            case "Idnt":
              g(e);
              break;
            case "indx":
              g(e);
              break;
            case "name":
              v(e);
              break;
            default:
              throw new Error("[jamActions skipReference] Unrecognized item form: '" + r + "'");
              break;
          }
        }
      }
      jamActions.readActionDescriptor = function(e, a) {
        var t = "\0\0\0";
        var r = e.tell();
        if (!a) {
          if (e.read(4) === t) {
            t = "";
          } else {
            throw new Error("[jamActions.readActionDescriptor] Unrecognized version prefix");
          }
        }
        T(e);
        var n = e.tell();
        e.seek(r, 0);
        var i = t + e.read(n - r);
        var o = new ActionDescriptor();
        o.fromStream(i);
        return o;
      };
      jamActions.dataFromActionsFile = function(e, a) {
        var c = this;

        function t(e) {
          var a = {};
          a.name = localize(p(e));
          a.expanded = l(e, 1) !== 0;
          var t = l(e, 4);
          a.actions = [];
          for (var r = 0; r < t; r++) {
            var n = {};
            n.functionKey = l(e, 2);
            n.shiftKey = l(e, 1) !== 0;
            n.commandKey = l(e, 1) !== 0;
            n.colorIndex = l(e, 2);
            n.name = localize(p(e));
            n.expanded = l(e, 1) !== 0;
            var i = l(e, 4);
            n.commands = [];
            for (var o = 0; o < i; o++) {
              var s = {};
              s.expanded = l(e, 1) !== 0;
              s.enabled = l(e, 1) !== 0;
              s.withDialog = l(e, 1) !== 0;
              s.dialogOptions = l(e, 1);
              s.eventId = f(e);
              s.dictionaryName = u(e);
              if (l(e, 4) !== 0) {
                s.actionDescriptor = c.readActionDescriptor(e, true);
              }
              n.commands.push(s);
            }
            a.actions.push(n);
          }
          return a;
        }
        var r;
        if (typeof e === "string") {
          r = new File(e);
        } else if (e instanceof File) {
          r = e;
        } else {
          throw new Error("[jamActions.dataFromActionsFile] Invalid argument");
        }
        var n;
        if (r.open("r")) {
          try {
            r.encoding = "BINARY";
            var i = l(r, 4);
            if (i === 16) {
              n = {};
              n.version = i;
              if (a) {
                n.actionSets = [];
                var o = l(r, 4);
                for (var s = 0; s < o; s++) {
                  n.actionSets.push(t(r));
                }
              } else {
                n.actionSet = t(r);
              }
            } else {
              n = "Unsupported actions file version: " + i;
            }
          } catch (e) {
            n = e.message;
          } finally {
            r.close();
          }
        } else {
          n = "Cannot open file";
        }
        return n;
      };
      jamActions.isLocalPlayCommand = function(e, a) {
        var t = null;
        if (e.eventId === app.stringIDToTypeID("play")) {
          var r = app.stringIDToTypeID("target");
          if (e.actionDescriptor.hasKey(r)) {
            var n = e.actionDescriptor.getReference(r);
            do {
              try {
                var i = n.getDesiredClass();
              } catch (e) {
                break;
              }
              switch (i) {
                case app.stringIDToTypeID("command"):
                  var o = n.getIndex() - 1;
                  break;
                case app.stringIDToTypeID("action"):
                  var s = n.getName();
                  break;
                case app.stringIDToTypeID("actionSet"):
                  var c = n.getName();
                  break;
              }
              n = n.getContainer();
            } while (n);
          }
          var l = app.stringIDToTypeID("continue");
          if (e.actionDescriptor.hasKey(l)) {
            var u = e.actionDescriptor.getBoolean(l);
          }
          if (typeof c !== "undefined" && c === a) {
            t = [s, o, u];
          }
        }
        return t;
      };
      jamActions.determineDialogMode = function(e) {
        var a;
        switch (e.dialogOptions) {
          case 0:
            a = e.withDialog ? DialogModes.ALL : DialogModes.NO;
            break;
          case 2:
            a = DialogModes.NO;
            break;
          case 1:
          case 3:
            a = DialogModes.ALL;
            break;
        }
        return a;
      };
      var I = null;
      jamActions.setCommandHandler = function(e) {
        I = e;
      };
      jamActions.traverseAction = function(e, a, r, n) {
        function t(e) {
          var a = n ? e.length : r + 1;
          for (var t = r; t < a; t++) {
            if (I !== null) {
              I(e[t]);
            }
          }
        }
        if (typeof r === "undefined") {
          r = 0;
          n = true;
        }
        var i = e.actions;
        if (typeof a === "string") {
          var o = a;
          for (var s = 0; s < i.length; s++) {
            var c = i[s];
            if (c.name === o) {
              t(c.commands);
              break;
            }
          }
        } else if (typeof a === "number") {
          var s = a;
          if (s >= 0 && s < i.length) {
            t(i[s].commands);
          }
        }
      };
    })();
  }
  if (typeof jamEngine !== "object") {
    var jamEngine = {};
    (function() {
      var b;
      jamEngine.meaningfulIds = false;
      jamEngine.parseFriendly = false;
      jamEngine.displayDialogs = DialogModes.ERROR;
      var r = {
        "'Algn'": ["align", "alignment"],
        "'AntA'": ["antiAlias", "antiAliasedPICTAcquire"],
        "'BckL'": ["backgroundLayer", "backgroundLevel"],
        "'BlcG'": ["blackGenerationType", "blackGenerationCurve"],
        "'BlcL'": ["blackLevel", "blackLimit"],
        "'Blks'": ["blacks", "blocks"],
        "'BlrM'": ["blurMethod", "blurMore"],
        "'BrgC'": ["brightnessEvent", "brightnessContrast"],
        "'BrsD'": ["brushDetail", "brushesDefine"],
        "'Brsh'": ["brush", "brushes"],
        "'Clcl'": ["calculation", "calculations"],
        "'ClrP'": ["colorPalette", "coloredPencil"],
        "'Cnst'": ["constant", "constrain"],
        "'CntC'": ["centerCropMarks", "conteCrayon"],
        "'Cntr'": ["center", "contrast"],
        "'CrtD'": ["createDroplet", "createDuplicate"],
        "'CstP'": ["customPalette", "customPhosphors"],
        "'Cstm'": ["custom", "customPattern"],
        "'Drkn'": ["darken", "darkness"],
        "'Dstr'": ["distort", "distortion", "distribute", "distribution"],
        "'Dstt'": ["desaturate", "destWhiteMax"],
        "'FlIn'": ["fileInfo", "fillInverse"],
        "'Gd  '": ["good", "guide"],
        "'GnrP'": ["generalPreferences", "generalPrefs", "preferencesClass"],
        "'GrSt'": ["grainStippled", "graySetup"],
        "'Grdn'": ["gradientClassEvent", "gridMinor"],
        "'Grn '": ["grain", "green"],
        "'Grns'": ["graininess", "greens"],
        "'HstP'": ["historyPreferences", "historyPrefs"],
        "'HstS'": ["historyState", "historyStateSourceType"],
        "'ImgP'": ["imageCachePreferences", "imagePoint"],
        "'In  '": ["in", "stampIn"],
        "'IntW'": ["interfaceWhite", "intersectWith"],
        "'Intr'": ["interfaceIconFrameDimmed", "interlace", "interpolation", "intersect"],
        "'JPEG'": ["JPEG", "JPEGFormat"],
        "'LghD'": ["lightDirection", "lightDirectional"],
        "'LghO'": ["lightOmni", "lightenOnly"],
        "'LghS'": ["lightSource", "lightSpot"],
        "'Lns '": ["lens", "lines"],
        "'Mgnt'": ["magenta", "magentas"],
        "'MrgL'": ["mergeLayers", "mergedLayers"],
        "'Mxm '": ["maximum", "maximumQuality"],
        "'NTSC'": ["NTSC", "NTSCColors"],
        "'NmbL'": ["numberOfLayers", "numberOfLevels"],
        "'PlgP'": ["pluginPicker", "pluginPrefs"],
        "'Pncl'": ["pencilEraser", "pencilWidth"],
        "'Pnt '": ["paint", "point"],
        "'Prsp'": ["perspective", "perspectiveIndex"],
        "'PrvM'": ["previewMacThumbnail", "previewMagenta"],
        "'Pstr'": ["posterization", "posterize"],
        "'RGBS'": ["RGBSetup", "RGBSetupSource"],
        "'Rds '": ["radius", "reds"],
        "'ScrD'": ["scratchDisks", "screenDot"],
        "'ShdI'": ["shadingIntensity", "shadowIntensity"],
        "'ShpC'": ["shapeCurveType", "shapingCurve"],
        "'ShrE'": ["sharpenEdges", "shearEd"],
        "'Shrp'": ["sharpen", "sharpness"],
        "'SplC'": ["splitChannels", "supplementalCategories"],
        "'Spot'": ["spot", "spotColor"],
        "'SprS'": ["separationSetup", "sprayedStrokes"],
        "'StrL'": ["strokeLength", "strokeLocation"],
        "'Strt'": ["saturation", "start"],
        "'TEXT'": ["char", "textType"],
        "'TIFF'": ["TIFF", "TIFFFormat"],
        "'TglO'": ["toggleOptionsPalette", "toggleOthers"],
        "'TrnG'": ["transparencyGamutPreferences", "transparencyGrid", "transparencyGridSize"],
        "'TrnS'": ["transferSpec", "transparencyShape", "transparencyStop"],
        "'Trns'": ["transparency", "transparent"],
        "'TxtC'": ["textClickPoint", "textureCoverage"],
        "'TxtF'": ["textureFile", "textureFill"],
        "'UsrM'": ["userMaskEnabled", "userMaskOptions"],
        "'c@#^'": ["inherits", "pInherits"],
        "'comp'": ["comp", "sInt64"],
        "'doub'": ["floatType", "IEEE64BitFloatingPoint", "longFloat"],
        "'long'": ["integer", "longInteger", "sInt32"],
        "'magn'": ["magnitude", "uInt32"],
        "'null'": ["null", "target"],
        "'shor'": ["sInt16", "sMInt", "shortInteger"],
        "'sing'": ["IEEE32BitFloatingPoint", "sMFloat", "shortFloat"]
      };
      jamEngine.getConflictingStringIdStrs = function(e) {
        return r[e] || null;
      };
      jamEngine.uniIdStrToId = function(e) {
        var a = 0;
        if (typeof e === "string") {
          if (e.length === 1 + 4 + 1 && e.charAt(0) === "'" && e.charAt(5) === "'") {
            a = app.charIDToTypeID(e.substring(1, 5));
          } else {
            a = app.stringIDToTypeID(e);
          }
        }
        return a;
      };
      var l = app.charIDToTypeID("    ");
      jamEngine.idToUniIdStrs = function(e) {
        var a = "";
        var t = app.typeIDToStringID(e);
        if (e >= l) {
          a = "'" + app.typeIDToCharID(e) + "'";
          if (t !== "") {
            if (a in r) {
              t = r[a];
            }
          }
        }
        return [a, t];
      };
      jamEngine.equivalentUniIdStrs = function(e, a) {
        return this.uniIdStrToId(e) === this.uniIdStrToId(a);
      };

      function g(e, a) {
        if (a.constructor === Array) {
          var t = a.length;
          for (var r = 0; r < t; r++) {
            var n = b.parseCompact(a[r]);
            var i = b.uniIdStrToId(n[0]);
            var o = b.parseCompact(n[1]);
            var s = o[0];
            var c = o[1];
            switch (s) {
              case "<class>":
                e.putClass(i);
                break;
              case "<enumerated>":
                var l = b.parseCompact(c);
                e.putEnumerated(i, b.uniIdStrToId(l[0]), b.uniIdStrToId(l[1]));
                break;
              case "<identifier>":
                e.putIdentifier(i, c);
                break;
              case "<index>":
                e.putIndex(i, c);
                break;
              case "<name>":
                e.putName(i, c);
                break;
              case "<offset>":
                e.putOffset(i, c);
                break;
              case "<property>":
                e.putProperty(i, b.uniIdStrToId(c));
                break;
              default:
                throw new Error("[jamEngine putInReference] Unknown reference form: " + s);
                break;
            }
          }
        } else {
          throw new Error("[jamEngine putInReference] JavaScript array expected");
        }
      }

      function y(e, a) {
        if (a.constructor === Array) {
          var t = a.length;
          for (var r = 0; r < t; r++) {
            var n = b.parseCompact(a[r]);
            var i = n[0];
            var o = n[1];
            switch (i) {
              case "<boolean>":
                e.putBoolean(o);
                break;
              case "<class>":
                e.putClass(b.uniIdStrToId(o));
                break;
              case "<data>":
                e.putData(o);
                break;
              case "<double>":
                e.putDouble(o);
                break;
              case "<enumerated>":
                var s = b.parseCompact(o);
                e.putEnumerated(b.uniIdStrToId(s[0]), b.uniIdStrToId(s[1]));
                break;
              case "<integer>":
                e.putInteger(o);
                break;
              case "<largeInteger>":
                e.putLargeInteger(o);
                break;
              case "<list>":
                var c = new ActionList();
                y(c, o);
                e.putList(c);
                break;
              case "<object>":
                var l = b.parseCompact(o);
                if (l[1]) {
                  var u = new ActionDescriptor();
                  d(u, l[1]);
                  e.putObject(b.uniIdStrToId(l[0]), u);
                } else {
                  e.putClass(b.uniIdStrToId(l[0]));
                }
                break;
              case "<path>":
                var p = new File(o);
                e.putPath(p);
                break;
              case "<reference>":
                var f = new ActionReference();
                g(f, o);
                e.putReference(f);
                break;
              case "<string>":
                e.putString(o);
                break;
              case "<unitDouble>":
                var m = b.parseCompact(o);
                e.putUnitDouble(b.uniIdStrToId(m[0]), m[1]);
                break;
              default:
                throw new Error("[jamEngine putInList] Unknown list type: " + i);
                break;
            }
          }
        } else {
          throw new Error("[jamEngine putInList] JavaScript array expected");
        }
      }

      function d(e, a) {
        if (a.constructor === Object) {
          for (var t in a) {
            if (a.hasOwnProperty(t)) {
              var r = b.uniIdStrToId(t);
              var n = b.parseCompact(a[t]);
              var i = n[0];
              var o = n[1];
              switch (i) {
                case "<boolean>":
                  e.putBoolean(r, o);
                  break;
                case "<class>":
                  e.putClass(r, b.uniIdStrToId(o));
                  break;
                case "<data>":
                  e.putData(r, o);
                  break;
                case "<double>":
                  e.putDouble(r, o);
                  break;
                case "<enumerated>":
                  var s = b.parseCompact(o);
                  e.putEnumerated(r, b.uniIdStrToId(s[0]), b.uniIdStrToId(s[1]));
                  break;
                case "<integer>":
                  e.putInteger(r, o);
                  break;
                case "<largeInteger>":
                  e.putLargeInteger(r, o);
                  break;
                case "<list>":
                  var c = new ActionList();
                  y(c, o);
                  e.putList(r, c);
                  break;
                case "<object>":
                  var l = b.parseCompact(o);
                  if (l[1]) {
                    var u = new ActionDescriptor();
                    d(u, l[1]);
                    e.putObject(r, b.uniIdStrToId(l[0]), u);
                  } else {
                    e.putClass(r, b.uniIdStrToId(l[0]));
                  }
                  break;
                case "<path>":
                  var p = new File(o);
                  e.putPath(r, p);
                  break;
                case "<reference>":
                  var f = new ActionReference();
                  g(f, o);
                  e.putReference(r, f);
                  break;
                case "<string>":
                  e.putString(r, o);
                  break;
                case "<unitDouble>":
                  var m = b.parseCompact(o);
                  e.putUnitDouble(r, b.uniIdStrToId(m[0]), m[1]);
                  break;
                default:
                  throw new Error("[jamEngine putInDescriptor] Unknown descriptor type: " + i);
                  break;
              }
            }
          }
        } else {
          throw new Error("[jamEngine putInDescriptor] JavaScript object expected");
        }
      }
      var u = {
        "'Algn'": {
          "<classKey>": {
            "bevelEmboss": "align",
            "frameFX": "align",
            "gradientFill": "align",
            "gradientLayer": "align",
            "patternFill": "align",
            "patternLayer": "align"
          },
          "<event>": "align",
          "<key>": "alignment"
        },
        "'AntA'": {
          "<class>": "antiAliasedPICTAcquire",
          "<key>": "antiAlias"
        },
        "'BckL'": {
          "<class>": "backgroundLayer",
          "<key>": "backgroundLevel"
        },
        "'BlcG'": {
          "<enumType>": "blackGenerationType",
          "<key>": "blackGenerationCurve"
        },
        "'BlcL'": {
          "<classKey>": {
            "'GEfc'": "blackLevel",
            "CMYKSetup": "blackLimit"
          },
          "<eventKey>": {
            "reticulation": "blackLevel"
          }
        },
        "'Blks'": {
          "<typeValue>": {
            "colors": "blacks",
            "extrudeType": "blocks"
          }
        },
        "'BlrM'": {
          "<enumType>": "blurMethod",
          "<event>": "blurMore",
          "<key>": "blurMethod"
        },
        "'BrgC'": {
          "<class>": "brightnessContrast",
          "<event>": "brightnessContrast"
        },
        "'BrsD'": {
          "<enumValue>": "brushesDefine",
          "<key>": "brushDetail"
        },
        "'Brsh'": {
          "<class>": "brush",
          "<classKey>": {
            "brushPreset": "brush",
            "currentToolOptions": "brush",
            "displayPrefs": "brush"
          },
          "<key>": "brushes"
        },
        "'Clcl'": {
          "<class>": "calculation",
          "<enumValue>": "calculations",
          "<key>": "calculation"
        },
        "'ClrP'": {
          "<typeValue>": {
            "'GEft'": "coloredPencil"
          },
          "<enumType>": "colorPalette",
          "<event>": "coloredPencil"
        },
        "'Cnst'": {
          "<classKey>": {
            "channelMatrix": "constant"
          },
          "<unknown>": "constrain"
        },
        "'CntC'": {
          "<typeValue>": {
            "'GEft'": "conteCrayon"
          },
          "<event>": "conteCrayon",
          "<key>": "centerCropMarks"
        },
        "'Cntr'": {
          "<classKey>": {
            "'GEfc'": "contrast",
            "brightnessContrast": "contrast",
            "document": "center",
            "polygon": "center",
            "quadrilateral": "center"
          },
          "<eventKey>": {
            "adaptCorrect": "contrast",
            "brightnessEvent": "contrast",
            "grain": "contrast",
            "halftoneScreen": "contrast",
            "sumie": "contrast",
            "tornEdges": "contrast",
            "waterPaper": "contrast"
          },
          "<enumValue>": "center"
        },
        "'CrtD'": {
          "<enumValue>": "createDuplicate",
          "<event>": "createDroplet"
        },
        "'CstP'": {
          "<class>": "customPhosphors",
          "<key>": "customPalette"
        },
        "'Cstm'": {
          "<enumValue>": "customPattern",
          "<event>": "custom",
          "<key>": "custom"
        },
        "'Drkn'": {
          "<enumValue>": "darken",
          "<key>": "darkness"
        },
        "'Dstr'": {
          "<classKey>": {
            "'GEfc'": "distortion"
          },
          "<eventKey>": {
            "glass": "distortion",
            "addNoise": "distribution"
          },
          "<enumType>": "distribution",
          "<enumValue>": "distort",
          "<event>": "distribute"
        },
        "'Dstt'": {
          "<enumValue>": "desaturate",
          "<event>": "desaturate",
          "<key>": "destWhiteMax"
        },
        "'FlIn'": {
          "<typeValue>": {
            "fillColor": "fillInverse",
            "menuItemType": "fileInfo"
          },
          "<class>": "fileInfo",
          "<key>": "fileInfo"
        },
        "'Gd  '": {
          "<class>": "guide",
          "<enumValue>": "good"
        },
        "'GnrP'": {
          "<class>": "preferencesClass",
          "<enumValue>": "generalPreferences",
          "<key>": "generalPrefs"
        },
        "'GrSt'": {
          "<class>": "graySetup",
          "<enumValue>": "grainStippled",
          "<key>": "graySetup"
        },
        "'Grdn'": {
          "<class>": "gradientClassEvent",
          "<event>": "gradientClassEvent",
          "<key>": "gridMinor"
        },
        "'Grn '": {
          "<typeValue>": {
            "'GEft'": "grain"
          },
          "<classKey>": {
            "'GEfc'": "grain",
            "RGBColor": "green",
            "blackAndWhite": "green",
            "channelMatrix": "green",
            "channelMixer": "green"
          },
          "<eventKey>": {
            "blackAndWhite": "green",
            "channelMixer": "green",
            "filmGrain": "grain"
          },
          "<enumValue>": "green",
          "<event>": "grain"
        },
        "'Grns'": {
          "<enumValue>": "greens",
          "<key>": "graininess"
        },
        "'HstP'": {
          "<enumValue>": "historyPreferences",
          "<key>": "historyPrefs"
        },
        "'HstS'": {
          "<class>": "historyState",
          "<enumType>": "historyStateSourceType"
        },
        "'ImgP'": {
          "<class>": "imagePoint",
          "<enumValue>": "imageCachePreferences"
        },
        "'In  '": {
          "<enumValue>": "stampIn",
          "<key>": "in"
        },
        "'IntW'": {
          "<event>": "intersectWith",
          "<key>": "interfaceWhite"
        },
        "'Intr'": {
          "<typeValue>": {
            "shapeOperation": "intersect"
          },
          "<classKey>": {
            "GIFFormat": "interlace",
            "SaveForWeb": "interlace",
            "application": "interfaceIconFrameDimmed",
            "computedBrush": "interpolation",
            "dBrush": "interpolation",
            "gradientClassEvent": "interpolation",
            "photoshopEPSFormat": "interpolation",
            "sampledBrush": "interpolation"
          },
          "<eventKey>": {
            "convertMode": "interpolation",
            "imageSize": "interpolation",
            "transform": "interpolation"
          },
          "<event>": "intersect"
        },
        "'JPEG'": {
          "<class>": "JPEGFormat",
          "<enumValue>": "JPEG"
        },
        "'LghD'": {
          "<enumType>": "lightDirection",
          "<enumValue>": "lightDirectional",
          "<key>": "lightDirection"
        },
        "'LghO'": {
          "<typeValue>": {
            "diffuseMode": "lightenOnly",
            "lightType": "lightOmni"
          }
        },
        "'LghS'": {
          "<class>": "lightSource",
          "<enumValue>": "lightSpot",
          "<key>": "lightSource"
        },
        "'Lns '": {
          "<enumType>": "lens",
          "<enumValue>": "lines",
          "<key>": "lens"
        },
        "'Mgnt'": {
          "<typeValue>": {
            "channel": "magenta",
            "colors": "magentas",
            "guideGridColor": "magenta"
          },
          "<key>": "magenta"
        },
        "'MrgL'": {
          "<enumValue>": "mergedLayers",
          "<event>": "mergeLayers"
        },
        "'Mxm '": {
          "<enumValue>": "maximumQuality",
          "<event>": "maximum",
          "<key>": "maximum"
        },
        "'NTSC'": {
          "<enumValue>": "NTSC",
          "<event>": "NTSCColors"
        },
        "'NmbL'": {
          "<classKey>": {
            "'GEfc'": "numberOfLevels",
            "document": "numberOfLayers"
          },
          "<eventKey>": {
            "cutout": "numberOfLevels"
          }
        },
        "'PlgP'": {
          "<class>": "pluginPrefs",
          "<enumValue>": "pluginPicker",
          "<key>": "pluginPrefs"
        },
        "'Pncl'": {
          "<enumValue>": "pencilEraser",
          "<key>": "pencilWidth"
        },
        "'Pnt '": {
          "<typeValue>": {
            "textType": "point"
          },
          "<class>": "point",
          "<event>": "paint"
        },
        "'Prsp'": {
          "<enumValue>": "perspective",
          "<key>": "perspectiveIndex"
        },
        "'PrvM'": {
          "<enumValue>": "previewMagenta",
          "<key>": "previewMacThumbnail"
        },
        "'Pstr'": {
          "<class>": "posterize",
          "<event>": "posterize",
          "<key>": "posterization"
        },
        "'RGBS'": {
          "<enumType>": "RGBSetupSource",
          "<key>": "RGBSetup"
        },
        "'Rds '": {
          "<enumValue>": "reds",
          "<key>": "radius"
        },
        "'ScrD'": {
          "<enumValue>": "screenDot",
          "<key>": "scratchDisks"
        },
        "'ShdI'": {
          "<classKey>": {
            "'GEfc'": "shadowIntensity"
          },
          "<eventKey>": {
            "watercolor": "shadowIntensity"
          },
          "<unknown>": "shadingIntensity"
        },
        "'ShpC'": {
          "<classKey>": {
            "application": "shapingCurve"
          },
          "<class>": "shapingCurve",
          "<key>": "shapeCurveType"
        },
        "'ShrE'": {
          "<event>": "sharpenEdges",
          "<key>": "shearEd"
        },
        "'Shrp'": {
          "<event>": "sharpen",
          "<key>": "sharpness"
        },
        "'SplC'": {
          "<event>": "splitChannels",
          "<key>": "supplementalCategories"
        },
        "'Spot'": {
          "<enumValue>": "spotColor",
          "<key>": "spot"
        },
        "'SprS'": {
          "<typeValue>": {
            "'GEft'": "sprayedStrokes"
          },
          "<enumValue>": "separationSetup",
          "<event>": "sprayedStrokes"
        },
        "'StrL'": {
          "<enumType>": "strokeLocation",
          "<key>": "strokeLength"
        },
        "'Strt'": {
          "<classKey>": {
            "currentToolOptions": "saturation",
            "fileNamingRules": "start",
            "HSBColorClass": "saturation",
            "hueSatAdjustment": "saturation",
            "hueSatAdjustmentV2": "saturation",
            "lineClass": "start",
            "range": "start",
            "vibrance": "saturation"
          },
          "<eventKey>": {
            "replaceColor": "saturation",
            "variations": "saturation",
            "vibrance": "saturation"
          },
          "<enumValue>": "saturation"
        },
        "'TEXT'": {
          "<enumType>": "textType",
          "<key>": "textType"
        },
        "'TIFF'": {
          "<class>": "TIFFFormat",
          "<enumValue>": "TIFF"
        },
        "'TglO'": {
          "<enumValue>": "toggleOptionsPalette",
          "<key>": "toggleOthers"
        },
        "'TrnG'": {
          "<classKey>": {
            "application": "transparencyGrid",
            "transparencyPrefs": "transparencyGridSize"
          },
          "<enumType>": "transparencyGridSize",
          "<enumValue>": "transparencyGamutPreferences"
        },
        "'TrnS'": {
          "<classKey>": {
            "bevelEmboss": "transparencyShape",
            "dropShadow": "transparencyShape",
            "innerGlow": "transparencyShape",
            "innerShadow": "transparencyShape",
            "outerGlow": "transparencyShape"
          },
          "<class>": "transparencyStop",
          "<unknown>": "transferSpec"
        },
        "'Trns'": {
          "<enumValue>": "transparent",
          "<key>": "transparency"
        },
        "'TxtC'": {
          "<classKey>": {
            "'GEfc'": "textureCoverage",
            "textLayer": "textClickPoint"
          },
          "<eventKey>": {
            "underpainting": "textureCoverage"
          }
        },
        "'TxtF'": {
          "<event>": "textureFill",
          "<key>": "textureFile"
        },
        "'UsrM'": {
          "<enumType>": "userMaskOptions",
          "<key>": "userMaskEnabled"
        },
        "'null'": {
          "<class>": "null",
          "<enumValue>": "null",
          "<event>": "null",
          "<key>": "target"
        }
      };

      function k(e, r) {
        var a;
        var t = e[0];
        var n = e[1];
        if (n < l) {
          a = app.typeIDToStringID(n);
        } else {
          a = "'" + app.typeIDToCharID(n) + "'";
          if (b.meaningfulIds) {
            if (a in u) {
              function i(e) {
                var a = "";
                for (var t in e) {
                  if (e.hasOwnProperty(t)) {
                    if (r[1] === b.uniIdStrToId(t)) {
                      a = e[t];
                      break;
                    }
                  }
                }
                return a;
              }
              var o = "";
              var s = u[a];
              if (r) {
                switch (t) {
                  case "<key>":
                    if (r[0] === "<class>" && "<classKey>" in s) {
                      o = i(s["<classKey>"]);
                    } else if (r[0] === "<event>" && "<eventKey>" in s) {
                      o = i(s["<eventKey>"]);
                    }
                    break;
                  case "<enumValue>":
                    if (r[0] === "<enumType>" && "<typeValue>" in s) {
                      o = i(s["<typeValue>"]);
                    }
                    break;
                }
              }
              if (o !== "") {
                a = o;
              } else if (t in s) {
                a = s[t];
              }
            } else {
              var c = app.typeIDToStringID(n);
              if (c !== "") {
                a = c;
              }
            }
          }
        }
        return a;
      }
      var v = "";
      var s = app.stringIDToTypeID("get");
      var c = app.stringIDToTypeID("target");
      var p = app.stringIDToTypeID("property");

      function T(e) {
        var a = 0;
        var t = [];
        do {
          try {
            var r = e.getDesiredClass();
          } catch (e) {
            break;
          }
          if (a !== 0) {
            var n = b.buildCompact("<property>", k(["<key>", a], ["<class>", r]));
            t.push(b.buildCompact(k(["<class>", p]), n));
            a = 0;
          }
          var i;
          var o = e.getForm();
          switch (o) {
            case ReferenceFormType.CLASSTYPE:
              i = b.buildCompact("<class>", null);
              break;
            case ReferenceFormType.ENUMERATED:
              var s = ["<enumType>", e.getEnumeratedType()];
              var c = ["<enumValue>", e.getEnumeratedValue()];
              i = b.buildCompact("<enumerated>", b.buildCompact(k(s), k(c, s)));
              break;
            case ReferenceFormType.IDENTIFIER:
              i = b.buildCompact("<identifier>", e.getIdentifier());
              break;
            case ReferenceFormType.INDEX:
              i = b.buildCompact("<index>", e.getIndex());
              break;
            case ReferenceFormType.NAME:
              i = b.buildCompact("<name>", e.getName());
              break;
            case ReferenceFormType.OFFSET:
              i = b.buildCompact("<offset>", e.getOffset());
              break;
            case ReferenceFormType.PROPERTY:
              if (r === p) {
                a = e.getProperty();
              } else {
                i = b.buildCompact("<property>", k(["<key>", e.getProperty()], ["<class>", r]));
              }
              break;
            default:
              throw new Error("[jamEngine getFromReference] Unknown reference form type: " + o);
              break;
          }
          if (r !== p) {
            t.push(b.buildCompact(k(["<class>", r]), i));
          }
          e = e.getContainer();
        } while (e);
        return t;
      }

      function j(e) {
        var a = [];
        var t = e.count;
        for (var r = 0; r < t; r++) {
          var n;
          var i;
          try {
            i = e.getType(r);
          } catch (e) {
            continue;
          }
          switch (i) {
            case DescValueType.BOOLEANTYPE:
              n = b.buildCompact("<boolean>", e.getBoolean(r));
              break;
            case DescValueType.CLASSTYPE:
              n = b.buildCompact("<class>", k(["<class>", e.getClass(r)]));
              break;
            case DescValueType.DOUBLETYPE:
              n = b.buildCompact("<double>", e.getDouble(r));
              break;
            case DescValueType.ENUMERATEDTYPE:
              var o = ["<enumType>", e.getEnumerationType(r)];
              var s = ["<enumValue>", e.getEnumerationValue(r)];
              n = b.buildCompact("<enumerated>", b.buildCompact(k(o), k(s, o)));
              break;
            case DescValueType.INTEGERTYPE:
              n = b.buildCompact("<integer>", e.getInteger(r));
              break;
            case DescValueType.LISTTYPE:
              n = b.buildCompact("<list>", j(e.getList(r)));
              break;
            case DescValueType.OBJECTTYPE:
              var c = ["<class>", e.getObjectType(r)];
              var l = e.getObjectValue(r);
              n = b.buildCompact("<object>", b.buildCompact(k(c), S(l, c)));
              break;
            case DescValueType.ALIASTYPE:
              try {
                var u = e.getPath(r);
                n = b.buildCompact("<path>", u.fsName);
              } catch (e) {
                n = b.buildCompact("<path>", v);
              }
              break;
            case DescValueType.REFERENCETYPE:
              n = b.buildCompact("<reference>", T(e.getReference(r)));
              break;
            case DescValueType.STRINGTYPE:
              n = b.buildCompact("<string>", e.getString(r));
              break;
            case DescValueType.UNITDOUBLE:
              var p = ["<unit>", e.getUnitDoubleType(r)];
              var f = e.getUnitDoubleValue(r);
              n = b.buildCompact("<unitDouble>", b.buildCompact(k(p), f));
              break;
            default:
              var m;
              var g;
              try {
                m = i === DescValueType.RAWTYPE;
              } catch (e) {}
              try {
                g = i === DescValueType.LARGEINTEGERTYPE;
              } catch (e) {}
              if (m) {
                n = b.buildCompact("<data>", e.getData(r));
              } else if (g) {
                n = b.buildCompact("<largeInteger>", e.getLargeInteger(r));
              } else {
                throw new Error("[jamEngine getFromList] Unknown descriptor value type: " + i);
              }
              break;
          }
          a[r] = n;
        }
        return a;
      }

      function S(e, a) {
        if (e) {
          var t = {};
          var r;
          try {
            r = e.count;
          } catch (e) {
            return null;
          }
          for (var n = 0; n < r; n++) {
            var i = e.getKey(n);
            var o = k(["<key>", i], a);
            var s;
            var c;
            try {
              c = e.getType(i);
            } catch (e) {
              continue;
            }
            switch (c) {
              case DescValueType.BOOLEANTYPE:
                s = b.buildCompact("<boolean>", e.getBoolean(i));
                break;
              case DescValueType.CLASSTYPE:
                s = b.buildCompact("<class>", k(["<class>", e.getClass(i)]));
                break;
              case DescValueType.DOUBLETYPE:
                s = b.buildCompact("<double>", e.getDouble(i));
                break;
              case DescValueType.ENUMERATEDTYPE:
                var l = ["<enumType>", e.getEnumerationType(i)];
                var u = ["<enumValue>", e.getEnumerationValue(i)];
                s = b.buildCompact("<enumerated>", b.buildCompact(k(l), k(u, l)));
                break;
              case DescValueType.INTEGERTYPE:
                s = b.buildCompact("<integer>", e.getInteger(i));
                break;
              case DescValueType.LISTTYPE:
                s = b.buildCompact("<list>", j(e.getList(i)));
                break;
              case DescValueType.OBJECTTYPE:
                var p = ["<class>", e.getObjectType(i)];
                var f = e.getObjectValue(i);
                s = b.buildCompact("<object>", b.buildCompact(k(p), S(f, p)));
                break;
              case DescValueType.ALIASTYPE:
                try {
                  var m = e.getPath(i);
                  s = b.buildCompact("<path>", m.fsName);
                } catch (e) {
                  s = b.buildCompact("<path>", v);
                }
                break;
              case DescValueType.REFERENCETYPE:
                s = b.buildCompact("<reference>", T(e.getReference(i)));
                break;
              case DescValueType.STRINGTYPE:
                s = b.buildCompact("<string>", e.getString(i));
                break;
              case DescValueType.UNITDOUBLE:
                var g = ["<unit>", e.getUnitDoubleType(i)];
                var y = e.getUnitDoubleValue(i);
                s = b.buildCompact("<unitDouble>", b.buildCompact(k(g), y));
                break;
              default:
                var d;
                var h;
                try {
                  d = c === DescValueType.RAWTYPE;
                } catch (e) {}
                try {
                  h = c === DescValueType.LARGEINTEGERTYPE;
                } catch (e) {}
                if (d) {
                  s = b.buildCompact("<data>", e.getData(i));
                } else if (h) {
                  s = b.buildCompact("<largeInteger>", e.getLargeInteger(i));
                } else {
                  throw new Error("[jamEngine getFromDescriptor] Unknown descriptor value type: " + c);
                }
                break;
            }
            t[o] = s;
          }
          return t;
        } else {
          return null;
        }
      }
      jamEngine.jsonToActionDescriptor = function(e) {
        b = this;
        var a;
        if (e) {
          a = new ActionDescriptor();
          d(a, e);
        }
        return a;
      };
      jamEngine.jsonToActionReference = function(e) {
        b = this;
        var a;
        if (e) {
          a = new ActionReference();
          g(a, e);
        }
        return a;
      };
      jamEngine.eventIdAndActionDescriptorToJson = function(e, a) {
        b = this;
        var t = ["<event>", e];
        return {
          "<event>": k(t),
          "<descriptor>": S(a, t)
        };
      };
      jamEngine.classIdAndActionDescriptorToJson = function(e, a) {
        b = this;
        var t = ["<class>", e];
        return {
          "<class>": k(t),
          "<descriptor>": S(a, t)
        };
      };
      jamEngine.actionReferenceToJson = function(e) {
        b = this;
        return T(e);
      };

      function f(e) {
        classId = 0;
        do {
          try {
            var a = e.getDesiredClass();
          } catch (e) {
            break;
          }
          if (a !== p) {
            classId = a;
            break;
          }
          e = e.getContainer();
        } while (e);
        return classId;
      }
      jamEngine.jsonPlay = function(e, a, t) {
        var r = this.uniIdStrToId(e);
        var n = this.jsonToActionDescriptor(a);
        var i;
        if (r === s) {
          var o = n.getReference(c);
          i = ["<class>", f(o)];
        } else {
          i = ["<event>", r];
        }
        return S(app.executeAction(r, n, t || this.displayDialogs), i);
      };
      jamEngine.jsonGet = function(e) {
        var a = this.jsonToActionReference(e);
        return S(app.executeActionGet(a), ["<class>", f(a)]);
      };
      jamEngine.normalizeJsonItem = function(e, a) {
        function v(e) {
          var a = b.parseCompact(e);
          var t = a[0];
          var r = a[1];
          var n;
          switch (t) {
            case "<boolean>":
            case "<data>":
            case "<double>":
            case "<identifier>":
            case "<index>":
            case "<integer>":
            case "<largeInteger>":
            case "<name>":
            case "<offset>":
            case "<path>":
            case "<string>":
              n = r;
              break;
            case "<class>":
              n = r && k(["<class>", b.uniIdStrToId(r)]);
              break;
            case "<enumerated>":
              var i = b.parseCompact(r);
              var o = ["<enumType>", b.uniIdStrToId(i[0])];
              var s = ["<enumValue>", b.uniIdStrToId(i[1])];
              n = b.buildCompact(k(o), k(s, o));
              break;
            case "<list>":
              n = [];
              for (var c = 0; c < r.length; c++) {
                n.push(v(r[c]));
              }
              break;
            case "<object>":
              var l = b.parseCompact(r);
              var u = ["<class>", b.uniIdStrToId(l[0])];
              var p = l[1];
              var f;
              if (p === null) {
                f = null;
              } else {
                f = {};
                for (var m in p) {
                  if (p.hasOwnProperty(m)) {
                    var g = ["<key>", b.uniIdStrToId(m)];
                    f[k(g, u)] = v(p[m]);
                  }
                }
              }
              n = b.buildCompact(k(u), f);
              break;
            case "<property>":
              n = k(["<key>", b.uniIdStrToId(r)]);
              break;
            case "<reference>":
              n = [];
              for (var c = 0; c < r.length; c++) {
                var y = b.parseCompact(r[c]);
                n.push(b.buildCompact(k(["<class>", b.uniIdStrToId(y[0])]), v(y[1])));
              }
              break;
            case "<unitDouble>":
              var d = b.parseCompact(r);
              var h = ["<unit>", b.uniIdStrToId(d[0])];
              n = b.buildCompact(k(h), d[1]);
              break;
            default:
              throw new Error("[jamEngine.normalizeJsonItem] Unknown item type: " + t);
              break;
          }
          return b.buildCompact(t, n);
        }
        b = this;
        var t = this.meaningfulIds;
        var r = this.parseFriendly;
        if (a && a.constructor === Object) {
          if (typeof a.meaningfulIds !== "undefined") {
            this.meaningfulIds = a.meaningfulIds;
          }
          if (typeof a.parseFriendly !== "undefined") {
            this.parseFriendly = a.parseFriendly;
          }
        }
        var n = v(e);
        this.meaningfulIds = t;
        this.parseFriendly = r;
        return n;
      };

      function i(e) {
        var a = [];
        for (var t = 0; t < e.length; t++) {
          var r = e[t];
          var n = {};
          var i = r[0];
          var o = r[1][0];
          var s = r[1][1];
          switch (o) {
            case "<class>":
            case "<identifier>":
            case "<index>":
            case "<name>":
            case "<offset>":
            case "<property":
              n[i] = s;
              break;
            case "<enumerated>":
              n[i] = s[1];
              break;
            default:
              throw new Error("[jamEngine simplifyRef] Unexpected element form: " + o);
              break;
          }
          a.push(n);
        }
        return a;
      }

      function o(e, a) {
        var t;
        var r = e[0];
        var n = e[1];
        switch (r) {
          case "<boolean>":
          case "<class>":
          case "<data>":
          case "<double>":
          case "<integer>":
          case "<largeInteger>":
          case "<path>":
          case "<string>":
            t = n;
            break;
          case "<list>":
            t = m(n, a);
            break;
          case "<enumerated>":
          case "<unitDouble>":
            t = n[1];
            break;
          case "<object>":
            t = h(n[1], a);
            break;
          case "<reference>":
            t = i(n);
            break;
          default:
            throw new Error("[jamEngine simplifyItem] Unexpected item type: " + r);
            break;
        }
        return t;
      }

      function m(e, a) {
        var t = [];
        for (var r = 0; r < e.length; r++) {
          t.push(o(e[r], a));
        }
        return t;
      }

      function h(e, t) {
        var a = function(e, a) {
          return o(e[a], t);
        };
        var r = {};
        for (var n in e) {
          if (e.hasOwnProperty(n)) {
            var i = undefined;
            if (typeof t === "function") {
              i = t(e, n, a);
            }
            if (typeof i === "undefined") {
              i = o(e[n], t);
            }
            r[n] = i;
          }
        }
        return r;
      }
      jamEngine.simplifyObject = function(e, a) {
        return h(this.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        })[1][1], a);
      };
      jamEngine.simplifyList = function(e, a) {
        return m(this.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        })[1], a);
      };
      jamEngine.parseCompact = function(e) {
        var a = [];
        if (e.constructor === Object) {
          var t = [];
          for (var r in e) {
            if (e.hasOwnProperty(r)) {
              t.push(r);
            }
          }
          if (t.length === 1) {
            a[0] = t[0];
            a[1] = e[t[0]];
          } else {
            throw new Error("[jamEngine.parseCompact] Syntax error: " + e.toSource());
          }
        } else if (e.constructor === Array) {
          if (e.length === 2) {
            a[0] = e[0];
            a[1] = e[1];
          } else {
            throw new Error("[jamEngine.parseCompact] Syntax error: " + e.toSource());
          }
        } else {
          throw new Error("[jamEngine.parseCompact] JavaScript object or array expected");
        }
        return a;
      };
      jamEngine.compactToExplicit = function(e, a, t) {
        var r = {};
        var n = this.parseCompact(e);
        r[a || "<type>"] = n[0];
        r[t || "<value>"] = n[1];
        return r;
      };
      jamEngine.buildCompact = function(e, a) {
        var t;
        if (typeof e === "string") {
          if (this.parseFriendly) {
            t = [e, a];
          } else {
            t = {};
            t[e] = a;
          }
        } else {
          throw new Error("[jamEngine.buildCompact] String expected");
        }
        return t;
      };
      jamEngine.explicitToCompact = function(e, a, t) {
        var r;
        if (e.constructor === Object) {
          r = this.buildCompact(e[a || "<type>"], e[t || "<value>"]);
        } else {
          throw new Error("[jamEngine.explicitToCompact] JavaScript object expected");
        }
        return r;
      };
      for (var e in r) {
        if (r.hasOwnProperty(e)) {
          var a = r[e];
          for (var t = a.length - 1; t >= 0; t--) {
            var n = a[t];
            if (!(app.charIDToTypeID(e.substring(1, 5)) === app.stringIDToTypeID(n))) {
              a.splice(t, 1);
            }
          }
          if (a.length < 2) {
            delete r[e];
          }
        }
      }
      for (var e in u) {
        if (u.hasOwnProperty(e)) {
          if (e in r) {
            var I = u[e];
            for (var x in I) {
              if (I.hasOwnProperty(x)) {
                switch (x) {
                  case "<class>":
                  case "<event>":
                  case "<enumType>":
                  case "<enumValue>":
                  case "<key>":
                  case "<unknown>":
                    if (app.charIDToTypeID(e.substring(1, 5)) != app.stringIDToTypeID(I[x])) {
                      throw new Error("[jamEngine] " + '"' + e + '" and "' + I[x] + '" are not equivalent ID strings');
                    }
                    break;
                  case "<classKey>":
                  case "<eventKey>":
                  case "<typeValue>":
                    for (var E in I[x]) {
                      if (I[x].hasOwnProperty(E)) {
                        if (app.charIDToTypeID(e.substring(1, 5)) != app.stringIDToTypeID(I[x][E])) {
                          throw new Error("[jamEngine] " + '"' + e + '" and "' + I[x][E] + '" are not equivalent ID strings');
                        }
                      }
                    }
                    break;
                }
              }
            }
          } else {
            delete u[e];
          }
        }
      }
    })();
  }
  if (typeof jamHelpers !== "object") {
    var jamHelpers = {};
    (function() {
      jamHelpers.toColorObject = function(e) {
        var a;
        if (e.constructor === Object) {
          function o(e) {
            var a = {};
            for (var t in e) {
              if (e.hasOwnProperty(t)) {
                var r = e[t];
                var n = null;
                switch (t) {
                  case "book":
                  case "name":
                    n = ["<string>", localize(r)];
                    break;
                  case "bookKey":
                    n = ["<data>", r];
                    break;
                  case "bookID":
                    n = ["<integer>", r];
                    break;
                  case "a":
                  case "b":
                  case "black":
                  case "blue":
                  case "brightness":
                  case "cyan":
                  case "gray":
                  case "green":
                  case "luminance":
                  case "magenta":
                  case "red":
                  case "saturation":
                  case "yellowColor":
                    n = ["<double>", r];
                    break;
                  case "hue":
                    n = ["<unitDouble>", ["angleUnit", r]];
                    break;
                  case "color":
                    var i;
                    if ("book" in r && "name" in r || "bookID" in r && "bookKey" in r) {
                      i = "bookColor";
                    } else if ("cyan" in r && "magenta" in r && "yellowColor" in r && "black" in r) {
                      i = "CMYKColorClass";
                    } else if ("gray" in r) {
                      i = "grayscale";
                    } else if ("hue" in r && "saturation" in r && "brightness" in r) {
                      i = "HSBColorClass";
                    } else if ("luminance" in r && "a" in r && "b" in r) {
                      i = "labColor";
                    } else if ("red" in r && "green" in r && "blue" in r) {
                      i = "RGBColor";
                    }
                    n = ["<object>", [i, o(r)]];
                    break;
                }
                if (n) {
                  a[t] = n;
                }
              }
            }
            return a;
          }
          a = o({
            "color": e
          })["color"];
        } else if (e.constructor === Array) {
          var t = e[0];
          switch (jamEngine.uniIdStrToId(t)) {
            case jamEngine.uniIdStrToId("bookColor"):
              switch (e[1].length) {
                case 2:
                  if (typeof e[1][0] === "string") {
                    a = ["<object>", ["bookColor", {
                      "book": ["<string>", e[1][0]],
                      "name": ["<string>", e[1][1]]
                    }]];
                  } else if (typeof e[1][0] === "number") {
                    a = ["<object>", ["bookColor", {
                      "bookID": ["<integer>", e[1][0]],
                      "bookKey": ["<data>", e[1][1]]
                    }]];
                  }
                  break;
                case 4:
                  a = ["<object>", ["bookColor", {
                    "book": ["<string>", e[1][0]],
                    "name": ["<string>", e[1][1]],
                    "bookID": ["<integer>", e[1][2]],
                    "bookKey": ["<data>", e[1][3]]
                  }]];
                  break;
              }
              break;
            case jamEngine.uniIdStrToId("CMYKColorClass"):
              a = ["<object>", ["CMYKColorClass", {
                "cyan": ["<double>", e[1][0]],
                "magenta": ["<double>", e[1][1]],
                "yellowColor": ["<double>", e[1][2]],
                "black": ["<double>", e[1][3]]
              }]];
              break;
            case jamEngine.uniIdStrToId("grayscale"):
              a = ["<object>", ["grayscale", {
                "gray": ["<double>", e[1].constructor === Array ? e[1][0] : e[1]]
              }]];
              break;
            case jamEngine.uniIdStrToId("HSBColorClass"):
              a = ["<object>", ["HSBColorClass", {
                "hue": ["<unitDouble>", ["angleUnit", e[1][0]]],
                "saturation": ["<double>", e[1][1]],
                "brightness": ["<double>", e[1][2]]
              }]];
              break;
            case jamEngine.uniIdStrToId("labColor"):
              a = ["<object>", ["labColor", {
                "luminance": ["<double>", e[1][0]],
                "a": ["<double>", e[1][1]],
                "b": ["<double>", e[1][2]]
              }]];
              break;
            case jamEngine.uniIdStrToId("RGBColor"):
              a = ["<object>", ["RGBColor", {
                "red": ["<double>", e[1][0]],
                "green": ["<double>", e[1][1]],
                "blue": ["<double>", e[1][2]]
              }]];
              break;
            default:
              throw new Error("[jamHelpers.toColorObject] Unrecognized color class: " + t);
              break;
          }
        }
        return a;
      };
      jamHelpers.fromColorObject = function(e, a) {
        var t;
        if (a) {
          t = jamEngine.simplifyObject(e);
        } else {
          var r = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          var n = r[1][0];
          var i = r[1][1];
          switch (n) {
            case "bookColor":
              var o = i["book"][1];
              var s = i["name"][1];
              if ("bookID" in i && "bookKey" in i) {
                var c = i["bookID"][1];
                var l = i["bookKey"][1];
                t = [n, [o, s, c, l]];
              } else {
                t = [n, [o, s]];
              }
              break;
            case "CMYKColorClass":
              var u = i["cyan"][1];
              var p = i["magenta"][1];
              var f = i["yellowColor"][1];
              var m = i["black"][1];
              t = [n, [u, p, f, m]];
              break;
            case "grayscale":
              var g = i["gray"][1];
              t = [n, [g]];
              break;
            case "HSBColorClass":
              var y = i["hue"][1][1];
              var d = i["saturation"][1];
              var h = i["brightness"][1];
              t = [n, [y, d, h]];
              break;
            case "labColor":
              var v = i["luminance"][1];
              var b = i["a"][1];
              var k = i["b"][1];
              t = [n, [v, b, k]];
              break;
            case "RGBColor":
              var T = i["red"][1];
              var j = i["green"][1];
              var S = i["blue"][1];
              t = [n, [T, j, S]];
              break;
            default:
              throw new Error("[jamHelpers.fromColorObject] Unrecognized color class: " + n);
              break;
          }
        }
        return t;
      };
      jamHelpers.nameToColorObject = function(e, a) {
        return this.toColorObject(jamColors.nameToColor(e, a));
      };
      jamHelpers.hexToColorObject = function(e) {
        return this.toColorObject(["RGBColor", jamColors.hexToRgb(e)]);
      };
      jamHelpers.hexFromColorObject = function(e, a, t) {
        var r = this.fromColorObject(e);
        return r[0] === "RGBColor" ? jamColors.rgbToHex(r[1], a, t) : null;
      };
      jamHelpers.toGradientObject = function(e) {
        var a;
        if (e.constructor === Object) {
          var s = this;

          function c(e) {
            var a = {};
            for (var t in e) {
              if (e.hasOwnProperty(t)) {
                var r = e[t];
                var n = null;
                var i;
                switch (t) {
                  case "showTransparency":
                  case "vectorColor":
                    n = ["<boolean>", r];
                    break;
                  case "name":
                    n = ["<string>", localize(r)];
                    break;
                  case "gradientForm":
                    n = ["<enumerated>", ["gradientForm", r]];
                    break;
                  case "type":
                    n = ["<enumerated>", ["colorStopType", r]];
                    break;
                  case "colorSpace":
                    n = ["<enumerated>", ["colorSpace", r]];
                    break;
                  case "location":
                  case "midpoint":
                  case "randomSeed":
                  case "smoothness":
                    n = ["<integer>", r];
                    break;
                  case "interpolation":
                    n = ["<double>", r];
                    break;
                  case "opacity":
                    n = ["<unitDouble>", ["percentUnit", r]];
                    break;
                  case "colors":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["colorStop", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "transparency":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["transparencyStop", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "minimum":
                  case "maximum":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<integer>", r[o]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "color":
                    n = s.toColorObject(r);
                    break;
                  case "gradient":
                    n = ["<object>", ["gradientClassEvent", c(r)]];
                    break;
                }
                if (n) {
                  a[t] = n;
                }
              }
            }
            return a;
          }
          a = c({
            "gradient": e
          })["gradient"];
        } else if (e.constructor === Array) {
          var t = {};
          var r = e[0];
          if (r) {
            t["name"] = ["<string>", r];
          }
          var n = e[1];
          t["gradientForm"] = ["<enumerated>", ["gradientForm", n]];
          switch (jamEngine.uniIdStrToId(n)) {
            case jamEngine.uniIdStrToId("customStops"):
              t["interpolation"] = ["<double>", e[2]];
              var i = e[3];
              var o = [];
              for (var l = 0; l < i.length; l++) {
                var u = {};
                u["location"] = ["<integer>", i[l][0]];
                u["midpoint"] = ["<integer>", i[l][1]];
                var p = i[l][2];
                u["type"] = ["<enumerated>", ["colorStopType", p]];
                switch (jamEngine.uniIdStrToId(p)) {
                  case jamEngine.uniIdStrToId("userStop"):
                    u["color"] = this.toColorObject(i[l][3]);
                    break;
                  case jamEngine.uniIdStrToId("backgroundColor"):
                  case jamEngine.uniIdStrToId("foregroundColor"):
                    break;
                  default:
                    throw new Error("[jamHelpers.toGradientObject] Unrecognized color stop type: " + p);
                    break;
                }
                o.push(["<object>", ["colorStop", u]]);
              }
              t["colors"] = ["<list>", o];
              var f = e[4];
              if (typeof f !== "undefined") {
                var m = [];
                for (var g = 0; g < f.length; g++) {
                  var y = {};
                  y["location"] = ["<integer>", f[g][0]];
                  y["midpoint"] = ["<integer>", f[g][1]];
                  y["opacity"] = ["<unitDouble>", ["percentUnit", f[g][2]]];
                  m.push(["<object>", ["transparencyStop", y]]);
                }
                t["transparency"] = ["<list>", m];
              }
              break;
            case jamEngine.uniIdStrToId("colorNoise"):
              t["randomSeed"] = ["<integer>", e[2]];
              t["showTransparency"] = ["<boolean>", e[3]];
              t["vectorColor"] = ["<boolean>", e[4]];
              t["smoothness"] = ["<integer>", e[5]];
              var d = e[6];
              t["colorSpace"] = ["<enumerated>", ["colorSpace", d]];
              switch (jamEngine.uniIdStrToId(d)) {
                case jamEngine.uniIdStrToId("RGBColor"):
                case jamEngine.uniIdStrToId("HSBColorEnum"):
                case jamEngine.uniIdStrToId("labColor"):
                  break;
                default:
                  throw new Error("[jamHelpers.toGradientObject] Unrecognized color space: " + d);
                  break;
              }
              t["minimum"] = this.toIntegerList(e[7]);
              t["maximum"] = this.toIntegerList(e[8]);
              break;
            default:
              throw new Error("[jamHelpers.toGradientObject] Unrecognized gradient form: " + n);
              break;
          }
          a = ["<object>", ["gradientClassEvent", t]];
        }
        return a;
      };
      jamHelpers.fromGradientObject = function(e, a) {
        var t;
        if (a) {
          t = jamEngine.simplifyObject(e);
        } else {
          t = [];
          var r = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          var n = r[1][1];
          var i = n["name"];
          t.push(i ? i[1] : null);
          var o = n["gradientForm"][1][1];
          t.push(o);
          switch (o) {
            case "customStops":
              t.push(n["interpolation"][1]);
              var s = n["colors"][1];
              var c = [];
              for (var l = 0; l < s.length; l++) {
                var u = s[l][1][1];
                var p = [];
                p.push(u["location"][1]);
                p.push(u["midpoint"][1]);
                var f = u["type"][1][1];
                p.push(f);
                switch (f) {
                  case "userStop":
                    p.push(this.fromColorObject(u["color"]));
                    break;
                  case "backgroundColor":
                  case "foregroundColor":
                    break;
                  default:
                    throw new Error("[jamHelpers.fromGradientObject] Unrecognized color stop type: " + f);
                    break;
                }
                c.push(p);
              }
              t.push(c);
              var m = n["transparency"][1];
              var g = [];
              for (var y = 0; y < m.length; y++) {
                var d = m[y][1][1];
                var h = [];
                h.push(d["location"][1]);
                h.push(d["midpoint"][1]);
                h.push(d["opacity"][1][1]);
                g.push(h);
              }
              t.push(g);
              break;
            case "colorNoise":
              t.push(n["randomSeed"][1]);
              t.push(n["showTransparency"][1]);
              t.push(n["vectorColor"][1]);
              t.push(n["smoothness"][1]);
              var v = n["colorSpace"][1][1];
              t.push(v);
              switch (v) {
                case "RGBColor":
                case "HSBColorEnum":
                case "labColor":
                  break;
                default:
                  throw new Error("[jamHelpers.fromGradientObject] Unrecognized color space: " + v);
                  break;
              }
              t.push(this.fromIntegerList(n["minimum"]));
              t.push(this.fromIntegerList(n["maximum"]));
              break;
            default:
              throw new Error("[jamHelpers.fromGradientObject] Unrecognized gradient form: " + o);
              break;
          }
        }
        return t;
      };
      jamHelpers.toCurvesAdjustmentList = function(e) {
        var a = [];
        for (var t = 0; t < e.length; t++) {
          var r = e[t];
          var n = ["<reference>", [
            ["channel", ["<enumerated>", ["channel", r[0]]]]
          ]];
          var i = r[1];
          var o = i[0];
          var s = i[1];
          var c = [];
          switch (jamEngine.uniIdStrToId(o)) {
            case jamEngine.uniIdStrToId("mapping"):
              for (var l = 0; l < s.length; l++) {
                c.push(["<integer>", s[l]]);
              }
              var u = ["<list>", c];
              a.push(["<object>", ["curvesAdjustment", {
                "channel": n,
                "mapping": u
              }]]);
              break;
            case jamEngine.uniIdStrToId("curve"):
              for (var l = 0; l < s.length; l++) {
                var p = ["<object>", ["point", {
                  "horizontal": ["<double>", s[l][0]],
                  "vertical": ["<double>", s[l][1]]
                }]];
                c.push(p);
              }
              var f = ["<list>", c];
              a.push(["<object>", ["curvesAdjustment", {
                "channel": n,
                "curve": f
              }]]);
              break;
            default:
              throw new Error("[jamHelpers.toCurvesAdjustmentList] Unrecognized curve type");
              break;
          }
        }
        return ["<list>", a];
      };
      jamHelpers.toHueSatAdjustmentV2List = function(e) {
        var a = [];
        for (var t = 0; t < e.length; t++) {
          var r = e[t];
          var n;
          if (r.length === 3 && t === 0) {
            n = {
              "hue": ["<integer>", r[0]],
              "saturation": ["<integer>", r[1]],
              "lightness": ["<integer>", r[2]]
            };
          } else if (r.length === 1 + 4 + 3) {
            n = {
              "localRange": ["<integer>", r[0]],
              "beginRamp": ["<integer>", r[1]],
              "beginSustain": ["<integer>", r[2]],
              "endSustain": ["<integer>", r[3]],
              "endRamp": ["<integer>", r[4]],
              "hue": ["<integer>", r[5]],
              "saturation": ["<integer>", r[6]],
              "lightness": ["<integer>", r[7]]
            };
          }
          a.push(["<object>", ["hueSatAdjustmentV2", n]]);
        }
        return ["<list>", a];
      };
      jamHelpers.toBlendRangeList = function(e) {
        var a = [];
        var t;
        for (var r = 0; r < e.length; r++) {
          var n = e[r];
          if (n.constructor === Object) {
            function i(e) {
              var a = {};
              for (var t in e) {
                if (e.hasOwnProperty(t)) {
                  var r = e[t];
                  var n = null;
                  switch (t) {
                    case "channel":
                      n = ["<reference>", [
                        ["channel", ["<enumerated>", ["channel", r]]]
                      ]];
                      break;
                    case "srcBlackMin":
                    case "srcBlackMax":
                    case "srcWhiteMin":
                    case "srcWhiteMax":
                    case "destBlackMin":
                    case "destBlackMax":
                    case "destWhiteMin":
                    case "destWhiteMax":
                      n = ["<integer>", r];
                      break;
                    case "blendRange":
                      n = ["<object>", ["blendRange", i(r)]];
                      break;
                  }
                  if (n) {
                    a[t] = n;
                  }
                }
              }
              return a;
            }
            t = i({
              "blendRange": n
            })["blendRange"];
          } else if (n.constructor === Array) {
            t = ["<object>", ["blendRange", {
              "channel": ["<reference>", [
                ["channel", ["<enumerated>", ["channel", n[0]]]]
              ]],
              "srcBlackMin": ["<integer>", n[1]],
              "srcBlackMax": ["<integer>", n[2]],
              "srcWhiteMin": ["<integer>", n[3]],
              "srcWhiteMax": ["<integer>", n[4]],
              "destBlackMin": ["<integer>", n[5]],
              "destBlackMax": ["<integer>", n[6]],
              "destWhiteMin": ["<integer>", n[7]],
              "destWhiteMax": ["<integer>", n[8]]
            }]];
          }
          a.push(t);
        }
        return ["<list>", a];
      };
      jamHelpers.fromBlendRangeList = function(e, a) {
        var t;
        if (a) {
          var r = function(e, a, t) {
            var r = undefined;
            if (a === "channel") {
              var n = t(e, a);
              r = n[0]["channel"];
            }
            return r;
          };
          t = jamEngine.simplifyList(e, r);
        } else {
          t = [];
          var n = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          for (index = 0; index < n[1].length; index++) {
            var i = n[1][index][1][1];
            var o = [i["channel"][1][0][1][1][1], i["srcBlackMin"][1], i["srcBlackMax"][1], i["srcWhiteMin"][1], i["srcWhiteMax"][1], i["destBlackMin"][1], i["destBlackMax"][1], i["destWhiteMin"][1], i["destWhiteMax"][1]];
            t.push(o);
          }
        }
        return t;
      };
      jamHelpers.toIntegerList = function(e) {
        var a = [];
        for (var t = 0; t < e.length; t++) {
          a.push(["<integer>", e[t]]);
        }
        return ["<list>", a];
      };
      jamHelpers.fromIntegerList = function(e) {
        var a = jamEngine.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        });
        var t = [];
        var r = a[1];
        for (var n = 0; n < r.length; n++) {
          t.push(r[n][1]);
        }
        return t;
      };

      function b(e, a) {
        return typeof a === "undefined" ? ["<double>", e] : ["<unitDouble>", [a, e]];
      }
      jamHelpers.toPointObject = function(e) {
        var a = e[0];
        var t = e[1];
        var r = ["<object>", ["point", {
          "horizontal": b(a[0], t),
          "vertical": b(a[1], t)
        }]];
        return r;
      };
      jamHelpers.toPointList = function(e) {
        var a = e[0];
        var t = e[1];
        var r = [];
        for (var n = 0; n < a.length; n++) {
          r.push(["<object>", ["point", {
            "horizontal": b(a[n][0], t),
            "vertical": b(a[n][1], t)
          }]]);
        }
        return ["<list>", r];
      };
      jamHelpers.fromPointList = function(e) {
        var a = [];
        var t = jamEngine.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        });
        var r = [];
        var n;

        function i(e) {
          var a;
          switch (e[0]) {
            case "<unitDouble>":
              n = e[1][0];
              a = e[1][1];
              break;
            case "<double>":
              n = undefined;
              a = e[1];
              break;
          }
          return a;
        }
        var o = t[1];
        for (var s = 0; s < o.length; s++) {
          r.push([i(o[s][1][1]["horizontal"]), i(o[s][1][1]["vertical"])]);
        }
        a.push(r);
        if (n) {
          a.push(n);
        }
        return a;
      };
      jamHelpers.toOffsetObject = function(e) {
        var a = e[0];
        var t = e[1];
        var r = ["<object>", ["offset", {
          "horizontal": b(a[0], t),
          "vertical": b(a[1], t)
        }]];
        return r;
      };
      jamHelpers.toRectangleObject = function(e) {
        var a = e[0];
        var t = e[1];
        var r = {
          "left": b(a[0], t),
          "top": b(a[1], t),
          "right": b(a[2], t),
          "bottom": b(a[3], t)
        };
        if (a.length === 5) {
          r["radius"] = b(a[4], t);
        }
        return ["<object>", ["rectangle", r]];
      };
      jamHelpers.toEllipseObject = function(e) {
        var a = e[0];
        var t = e[1];
        var r = ["<object>", ["ellipse", {
          "left": b(a[0], t),
          "top": b(a[1], t),
          "right": b(a[2], t),
          "bottom": b(a[3], t)
        }]];
        return r;
      };
      jamHelpers.toCustomShapeObject = function(e) {
        var a = e[0];
        var t = e[1];
        var r = ["<object>", ["customShape", {
          "name": ["<string>", a[0]],
          "left": b(a[1], t),
          "top": b(a[2], t),
          "right": b(a[3], t),
          "bottom": b(a[4], t)
        }]];
        return r;
      };
      jamHelpers.toCurvePointList = function(e) {
        var a = [];
        var t;
        for (var r = 0; r < e.length; r++) {
          var n = e[r];
          if (n.constructor === Object) {
            function i(e) {
              var a = {};
              for (var t in e) {
                if (e.hasOwnProperty(t)) {
                  var r = e[t];
                  var n = null;
                  switch (t) {
                    case "continuity":
                      n = ["<boolean>", r];
                      break;
                    case "horizontal":
                    case "vertical":
                      n = ["<double>", r];
                      break;
                    case "curvePoint":
                      n = ["<object>", ["curvePoint", i(r)]];
                      break;
                  }
                  if (n) {
                    a[t] = n;
                  }
                }
              }
              return a;
            }
            t = i({
              "curvePoint": n
            })["curvePoint"];
          } else if (n.constructor === Array) {
            switch (n.length) {
              case 2:
                t = ["<object>", ["curvePoint", {
                  "horizontal": ["<double>", n[0]],
                  "vertical": ["<double>", n[1]]
                }]];
                break;
              case 3:
                t = ["<object>", ["curvePoint", {
                  "horizontal": ["<double>", n[0]],
                  "vertical": ["<double>", n[1]],
                  "continuity": ["<boolean>", n[2]]
                }]];
                break;
            }
          }
          a.push(t);
        }
        return ["<list>", a];
      };
      jamHelpers.fromCurvePointList = function(e, a) {
        var t;
        if (a) {
          t = jamEngine.simplifyList(e);
        } else {
          t = [];
          var r = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          for (index = 0; index < r[1].length; index++) {
            var n = r[1][index][1][1];
            var i = [n["horizontal"][1], n["vertical"][1]];
            if ("continuity" in n) {
              i.push(n["continuity"][1]);
            }
            t.push(i);
          }
        }
        return t;
      };
      jamHelpers.toRationalPointList = function(e) {
        var a = e[0];
        var t = e[1];
        var r = [];
        for (var n = 0; n < a.length; n++) {
          r.push(["<object>", ["rationalPoint", {
            "horizontal": b(a[n][0], t),
            "vertical": b(a[n][1], t)
          }]]);
        }
        return ["<list>", r];
      };
      jamHelpers.toPathComponentList = function(e) {
        var a;
        if (e.constructor === Object) {
          var s;
          if ("unit" in e) {
            s = e["unit"];
          }
          var t = e["pathComponents"];

          function c(e) {
            var a = {};
            for (var t in e) {
              if (e.hasOwnProperty(t)) {
                var r = e[t];
                var n = null;
                var i;
                switch (t) {
                  case "closedSubpath":
                  case "smooth":
                  case "windingFill":
                    n = ["<boolean>", r];
                    break;
                  case "shapeOperation":
                    n = ["<enumerated>", ["shapeOperation", r]];
                    break;
                  case "horizontal":
                  case "vertical":
                    n = b(r, s);
                    break;
                  case "anchor":
                  case "backward":
                  case "forward":
                    n = ["<object>", ["point", c(r)]];
                    break;
                  case "subpathListKey":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["subpathsList", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "points":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["pathPoint", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "pathComponents":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["pathComponent", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                }
                if (n) {
                  a[t] = n;
                }
              }
            }
            return a;
          }
          a = c({
            "pathComponents": t
          })["pathComponents"];
        } else if (e.constructor === Array) {
          var r = [];
          var t = e[0];
          var s = e[1];
          for (var n = 0; n < t.length; n++) {
            var i = t[n][0];
            var o = t[n][1];
            var l = t[n][2];
            var u = [];
            for (var p = 0; p < o.length; p++) {
              var f = o[p][0];
              var m = o[p][1];
              var g = [];
              for (var y = 0; y < f.length; y++) {
                var d = f[y];
                switch (d.length) {
                  case 1:
                    g.push(["<object>", ["pathPoint", {
                      "anchor": ["<object>", ["point", {
                        "horizontal": b(d[0][0], s),
                        "vertical": b(d[0][1], s)
                      }]]
                    }]]);
                    break;
                  case 3:
                  case 4:
                    g.push(["<object>", ["pathPoint", {
                      "anchor": ["<object>", ["point", {
                        "horizontal": b(d[0][0], s),
                        "vertical": b(d[0][1], s)
                      }]],
                      "forward": ["<object>", ["point", {
                        "horizontal": b(d[1][0], s),
                        "vertical": b(d[1][1], s)
                      }]],
                      "backward": ["<object>", ["point", {
                        "horizontal": b(d[2][0], s),
                        "vertical": b(d[2][1], s)
                      }]],
                      "smooth": ["<boolean>", d[3] || false]
                    }]]);
                    break;
                }
              }
              var h = {};
              if (m) {
                h["closedSubpath"] = ["<boolean>", m];
              }
              h["points"] = ["<list>", g];
              u.push(["<object>", ["subpathsList", h]]);
            }
            var v = {};
            v["shapeOperation"] = ["<enumerated>", ["shapeOperation", i]];
            if (l) {
              v["windingFill"] = ["<boolean>", l];
            }
            v["subpathListKey"] = ["<list>", u];
            r.push(["<object>", ["pathComponent", v]]);
          }
          a = ["<list>", r];
        }
        return a;
      };
      jamHelpers.fromPathComponentList = function(e, a) {
        var t;
        if (a) {
          t = {};
          var r;
          var n = false;

          function i(e, a) {
            if (!n) {
              if (a === "horizontal") {
                var t = e[a];
                if (t[0] === "<unitDouble>") {
                  r = t[1][0];
                }
                n = true;
              }
            }
            return undefined;
          }
          t["pathComponents"] = jamEngine.simplifyList(e, i);
          if (r) {
            t["unit"] = r;
          }
        } else {
          t = [];
          var o = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          var s = [];
          var r;

          function c(e) {
            var a;
            switch (e[0]) {
              case "<unitDouble>":
                r = e[1][0];
                a = e[1][1];
                break;
              case "<double>":
                r = undefined;
                a = e[1];
                break;
            }
            return a;
          }
          var l = o[1];
          for (var u = 0; u < l.length; u++) {
            var p = l[u][1][1];
            var f = p["shapeOperation"][1][1];
            var m = "windingFill" in p ? p["windingFill"][1] : false;
            var g = [];
            var y = p["subpathListKey"][1];
            for (var d = 0; d < y.length; d++) {
              var h = y[d][1][1];
              var v = "closedSubpath" in h ? h["closedSubpath"][1] : false;
              var b = [];
              var k = h["points"][1];
              for (var T = 0; T < k.length; T++) {
                var j = k[T][1][1];
                var S = [];
                var I = j["anchor"][1][1];
                S.push([c(I["horizontal"]), c(I["vertical"])]);
                if ("forward" in j) {
                  var x = j["forward"][1][1];
                  S.push([c(x["horizontal"]), c(x["vertical"])]);
                }
                if ("backward" in j) {
                  var E = j["backward"][1][1];
                  S.push([c(E["horizontal"]), c(E["vertical"])]);
                }
                var D = "smooth" in j ? j["smooth"][1] : false;
                if (D) {
                  S.push(D);
                }
                b.push(S);
              }
              var C = [];
              C.push(b);
              if (v) {
                C.push(v);
              }
              g.push(C);
            }
            var w = [];
            w.push(f);
            w.push(g);
            if (m) {
              w.push(m);
            }
            s.push(w);
          }
          t.push(s);
          if (r) {
            t.push(r);
          }
        }
        return t;
      };
    })();
  }
  if (typeof jamJSON !== "object") {
    var jamJSON = {};
    (function() {
      var state;
      var stack;
      var container;
      var key;
      var value;
      var escapes = {
        "\\": "\\",
        '"': '"',
        "/": "/",
        "t": "\t",
        "n": "\n",
        "r": "\r",
        "f": "\f",
        "b": "\b"
      };
      var action = {
        "{": {
          "go": function() {
            stack.push({
              "state": "ok"
            });
            container = {};
            state = "firstokey";
          },
          "ovalue": function() {
            stack.push({
              "container": container,
              "state": "ocomma",
              "key": key
            });
            container = {};
            state = "firstokey";
          },
          "firstavalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = {};
            state = "firstokey";
          },
          "avalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = {};
            state = "firstokey";
          }
        },
        "}": {
          "firstokey": function() {
            var e = stack.pop();
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          },
          "ocomma": function() {
            var e = stack.pop();
            container[key] = value;
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          }
        },
        "[": {
          "go": function() {
            stack.push({
              "state": "ok"
            });
            container = [];
            state = "firstavalue";
          },
          "ovalue": function() {
            stack.push({
              "container": container,
              "state": "ocomma",
              "key": key
            });
            container = [];
            state = "firstavalue";
          },
          "firstavalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = [];
            state = "firstavalue";
          },
          "avalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = [];
            state = "firstavalue";
          }
        },
        "]": {
          "firstavalue": function() {
            var e = stack.pop();
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          },
          "acomma": function() {
            var e = stack.pop();
            container.push(value);
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          }
        },
        ":": {
          "colon": function() {
            if (container.hasOwnProperty(key)) {
              throw new SyntaxError("[jamJSON.parse] Duplicate key: “" + key + "”");
            }
            state = "ovalue";
          }
        },
        ",": {
          "ocomma": function() {
            container[key] = value;
            state = "okey";
          },
          "acomma": function() {
            container.push(value);
            state = "avalue";
          }
        },
        "true": {
          "go": function() {
            value = true;
            state = "ok";
          },
          "ovalue": function() {
            value = true;
            state = "ocomma";
          },
          "firstavalue": function() {
            value = true;
            state = "acomma";
          },
          "avalue": function() {
            value = true;
            state = "acomma";
          }
        },
        "false": {
          "go": function() {
            value = false;
            state = "ok";
          },
          "ovalue": function() {
            value = false;
            state = "ocomma";
          },
          "firstavalue": function() {
            value = false;
            state = "acomma";
          },
          "avalue": function() {
            value = false;
            state = "acomma";
          }
        },
        "null": {
          "go": function() {
            value = null;
            state = "ok";
          },
          "ovalue": function() {
            value = null;
            state = "ocomma";
          },
          "firstavalue": function() {
            value = null;
            state = "acomma";
          },
          "avalue": function() {
            value = null;
            state = "acomma";
          }
        }
      };
      var number = {
        "go": function() {
          state = "ok";
        },
        "ovalue": function() {
          state = "ocomma";
        },
        "firstavalue": function() {
          state = "acomma";
        },
        "avalue": function() {
          state = "acomma";
        }
      };
      var string = {
        "go": function() {
          state = "ok";
        },
        "firstokey": function() {
          key = value;
          state = "colon";
        },
        "okey": function() {
          key = value;
          state = "colon";
        },
        "ovalue": function() {
          state = "ocomma";
        },
        "firstavalue": function() {
          state = "acomma";
        },
        "avalue": function() {
          state = "acomma";
        }
      };
      var commentFunc = function() {};

      function debackslashify(e) {
        return e.replace(/\\(?:u(.{4})|([^u]))/g, function(e, a, t) {
          return a ? String.fromCharCode(parseInt(a, 16)) : escapes[t];
        });
      }
      jamJSON.parse = function(text, validate, allowComments) {
        if (validate) {
          var tx = /^[\x20\t\n\r]*(?:([,:\[\]{}]|true|false|null)|(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+\-]?[0-9]+)?)|"((?:[^\r\n\t\\\"]|\\(?:["\\\/trnfb]|u[0-9a-fA-F]{4}))*)")/;
          var txc = /^[\x20\t\n\r]*(?:(\/(?:\/.*|\*(?:.|[\r\n])*?\*\/))|([,:\[\]{}]|true|false|null)|(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+\-]?[0-9]+)?)|"((?:[^\r\n\t\\\"]|\\(?:["\\\/trnfb]|u[0-9a-fA-F]{4}))*)")/;
          var r;
          var i;
          var actionFunc;
          state = "go";
          stack = [];
          try {
            while (true) {
              i = allowComments ? 1 : 0;
              r = allowComments ? txc.exec(text) : tx.exec(text);
              if (!r) {
                break;
              }
              if (allowComments && r[1]) {
                actionFunc = commentFunc;
              } else if (r[i + 1]) {
                actionFunc = action[r[i + 1]][state];
              } else if (r[i + 2]) {
                value = +r[i + 2];
                actionFunc = number[state];
              } else {
                value = debackslashify(r[i + 3]);
                actionFunc = string[state];
              }
              if (actionFunc) {
                actionFunc();
                text = text.slice(r[0].length);
              } else {
                break;
              }
            }
          } catch (e) {
            state = e;
          }
          if (state !== "ok" || /[^\x20\t\n\r]/.test(text)) {
            throw state instanceof SyntaxError ? state : new SyntaxError("[jamJSON.parse] Invalid JSON");
          }
          return value;
        } else {
          return JSON.parse(text); // dùng JSON gốc thay vì eval() (ExtendScript hiện đại luôn có sẵn JSON)
        }
      };
      if (typeof JSON !== "undefined" && JSON.parse && JSON.parse.__isStub) { JSON.parse = function(t) { return jamJSON.parse(t, true); }; }
      var escapable = /[\\\"\x00-\x1F\x7F-\x9F\u00AD\u0600-\u0604\u070F\u17B4\u17B5\u200C-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g;
      var meta = {
        "\b": "\\b",
        "\t": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
        '"': '\\"',
        "\\": "\\\\"
      };
      var gap;
      var indent;
      var prefixIndent;

      function quote(e) {
        escapable.lastIndex = 0;
        return escapable.test(e) ? '"' + e.replace(escapable, function(e) {
          var a = meta[e];
          return typeof a === "string" ? a : "\\u" + ("0000" + e.charCodeAt(0).toString(16).toUpperCase()).slice(-4);
        }) + '"' : '"' + e + '"';
      }

      function str(e) {
        var a;
        var t;
        var r;
        var n = gap;
        var i;
        switch (typeof e) {
          case "string":
            return quote(e);
          case "number":
            return isFinite(e) ? String(e) : "null";
          case "boolean":
          case "null":
            return String(e);
          case "object":
            if (!e) {
              return "null";
            }
            gap += indent;
            i = [];
            if (e.constructor === Array) {
              for (a = 0; a < e.length; a++) {
                i[a] = str(e[a]);
              }
              var o = gap ? "[\n" + prefixIndent + n + "]" : "[ ]";
              var s = gap ? "[\n" + prefixIndent + gap + i.join(",\n" + prefixIndent + gap) + "\n" + prefixIndent + n + "]" : "[ " + i.join(", ") + " ]";
              r = i.length === 0 ? o : s;
              gap = n;
              return r;
            } else {
              for (t in e) {
                if (e.hasOwnProperty(t)) {
                  r = str(e[t]);
                  if (r) {
                    i.push(quote(t) + (gap && (r.charAt(0) === "{" || r.charAt(0) === "[") ? ":\n" + prefixIndent + gap : ": ") + r);
                  }
                }
              }
              var c = gap ? "{\n" + prefixIndent + n + "}" : "{ }";
              var l = gap ? "{\n" + prefixIndent + gap + i.join(",\n" + prefixIndent + gap) + "\n" + prefixIndent + n + "}" : "{ " + i.join(", ") + " }";
              r = i.length === 0 ? c : l;
              gap = n;
              return r;
            }
          default:
            throw new SyntaxError("[jamJSON.stringify] Invalid JSON");
        }
      }
      jamJSON.stringify = function(e, a, t) {
        var r;
        gap = "";
        indent = "";
        prefixIndent = "";
        if (typeof a === "number") {
          for (r = 0; r < a; r++) {
            indent += " ";
          }
        } else if (typeof a === "string") {
          indent = a;
        }
        if (typeof t === "number") {
          for (r = 0; r < t; r++) {
            prefixIndent += " ";
          }
        } else if (typeof t === "string") {
          prefixIndent = t;
        }
        return prefixIndent + str(e);
      };
    })();
  }
  if (typeof jamText !== "object") {
    var jamText = {};
    (function() {
      jamText.toLayerTextObject = function(e) {
        var l;
        if ("typeUnit" in e) {
          l = e["typeUnit"];
        }
        var a = e["layerText"];

        function u(e, a) {
          var t = {};
          for (var r in e) {
            if (e.hasOwnProperty(r)) {
              var n = e[r];
              var i = null;
              var o;
              switch (r) {
                case "bookKey":
                  i = ["<data>", n];
                  break;
                case "rowMajorOrder":
                case "syntheticBold":
                case "syntheticItalic":
                case "autoLeading":
                case "ligature":
                case "altligature":
                case "contextualLigatures":
                case "alternateLigatures":
                case "oldStyle":
                case "fractions":
                case "ordinals":
                case "swash":
                case "titling":
                case "connectionForms":
                case "stylisticAlternates":
                case "ornaments":
                case "proportionalMetrics":
                case "kana":
                case "italics":
                case "ruby":
                case "enableWariChu":
                case "noBreak":
                case "fill":
                case "stroke":
                case "fillFirst":
                case "fillOverPrint":
                case "strokeOverPrint":
                case "hyphenate":
                case "hyphenateCapitalized":
                case "hangingRoman":
                case "keepTogether":
                case "kurikaeshiMojiShori":
                case "textEveryLineComposer":
                case "flip":
                  i = ["<boolean>", n];
                  break;
                case "textKey":
                case "fontPostScriptName":
                case "fontName":
                case "fontStyleName":
                case "book":
                case "name":
                  i = ["<string>", n];
                  break;
                case "rowCount":
                case "columnCount":
                case "from":
                case "to":
                case "fontScript":
                case "fontTechnology":
                case "tracking":
                case "wariChuCount":
                case "wariChuLineGap":
                case "wariChuWidow":
                case "wariChuOrphan":
                case "tcyUpDown":
                case "tcyLeftRight":
                case "jiDori":
                case "bookID":
                case "dropCapMultiplier":
                case "hyphenateWordSize":
                case "hyphenatePreLength":
                case "hyphenatePostLength":
                case "hyphenateLimit":
                case "autoTCY":
                case "kerning":
                case "pathTypeSpacing":
                  i = ["<integer>", n];
                  break;
                case "warpValue":
                case "warpPerspective":
                case "warpPerspectiveOther":
                case "xx":
                case "xy":
                case "yx":
                case "yy":
                case "tx":
                case "ty":
                case "top":
                case "left":
                case "bottom":
                case "right":
                case "horizontalScale":
                case "verticalScale":
                case "characterRotation":
                case "mojiZume":
                case "wariChuScale":
                case "a":
                case "b":
                case "black":
                case "blue":
                case "brightness":
                case "cyan":
                case "gray":
                case "green":
                case "luminance":
                case "magenta":
                case "red":
                case "saturation":
                case "yellowColor":
                case "lineDashoffset":
                case "autoLeadingPercentage":
                case "hyphenationZone":
                case "hyphenationPreference":
                case "justificationWordMinimum":
                case "justificationWordDesired":
                case "justificationWordMaximum":
                case "justificationLetterMinimum":
                case "justificationLetterDesired":
                case "justificationLetterMaximum":
                case "justificationGlyphMinimum":
                case "justificationGlyphDesired":
                case "justificationGlyphMaximum":
                case "defaultTabWidth":
                case "start":
                case "end":
                  i = ["<double>", n];
                  break;
                case "rowGutter":
                case "columnGutter":
                case "spacing":
                case "firstBaselineMinimum":
                case "size":
                case "leading":
                case "baselineShift":
                case "underlineOffset":
                case "lineWidth":
                case "miterLimit":
                case "firstLineIndent":
                case "startIndent":
                case "endIndent":
                case "spaceBefore":
                case "spaceAfter":
                  i = l ? ["<unitDouble>", [l, n]] : ["<double>", n];
                  break;
                case "horizontal":
                case "vertical":
                  i = a ? ["<unitDouble>", [a, n]] : ["<double>", n];
                  break;
                case "hue":
                  i = ["<unitDouble>", ["angleUnit", n]];
                  break;
                case "warpStyle":
                case "textGridding":
                case "orientation":
                case "textType":
                case "frameBaselineAlignment":
                case "autoKern":
                case "fontCaps":
                case "baseline":
                case "otbaseline":
                case "strikethrough":
                case "underline":
                case "figureStyle":
                case "baselineDirection":
                case "textLanguage":
                case "japaneseAlternate":
                case "gridAlignment":
                case "wariChuJustification":
                case "lineCap":
                case "lineJoin":
                case "leadingType":
                case "burasagari":
                case "preferredKinsokuOrder":
                case "pathTypeEffect":
                case "pathTypeAlignment":
                case "pathTypeAlignTo":
                  i = ["<enumerated>", [r, n]];
                  break;
                case "antiAlias":
                  i = ["<enumerated>", ["antiAliasType", n]];
                  break;
                case "warpRotate":
                  i = ["<enumerated>", ["orientation", n]];
                  break;
                case "alignment":
                case "singleWordJustification":
                  i = ["<enumerated>", ["alignmentType", n]];
                  break;
                case "textShape":
                case "textStyleRange":
                case "paragraphStyleRange":
                case "kerningRange":
                  o = [];
                  for (var s = 0; s < n.length; s++) {
                    o.push(["<object>", [r, u(n[s])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "warp":
                case "transform":
                case "textStyle":
                case "paragraphStyle":
                  i = ["<object>", [r, u(n)]];
                  break;
                case "defaultStyle":
                  i = ["<object>", ["textStyle", u(n)]];
                  break;
                case "color":
                case "strokeColor":
                  var c;
                  if ("book" in n && "name" in n || "bookID" in n && "bookKey" in n) {
                    c = "bookColor";
                  } else if ("cyan" in n && "magenta" in n && "yellowColor" in n && "black" in n) {
                    c = "CMYKColorClass";
                  } else if ("gray" in n) {
                    c = "grayscale";
                  } else if ("hue" in n && "saturation" in n && "brightness" in n) {
                    c = "HSBColorClass";
                  } else if ("luminance" in n && "a" in n && "b" in n) {
                    c = "labColor";
                  } else if ("red" in n && "green" in n && "blue" in n) {
                    c = "RGBColor";
                  }
                  i = ["<object>", [c, u(n)]];
                  break;
                case "textClickPoint":
                  i = ["<object>", ["point", u(n, "percentUnit")]];
                  break;
                case "base":
                  i = ["<object>", ["point", u(n)]];
                  break;
                case "bounds":
                  i = ["<object>", ["rectangle", u(n)]];
                  break;
                case "path":
                  i = ["<object>", ["pathClass", {
                    "pathComponents": jamHelpers.toPathComponentList(n)
                  }]];
                  break;
                case "tRange":
                  i = ["<object>", ["range", u(n)]];
                  break;
                case "textLayer":
                  i = ["<object>", ["textLayer", u(n)]];
                  break;
                case "mojiKumiName":
                case "kinsokuSetName":
                  if (true) {
                    i = ["<enumerated>", [r, n]];
                  } else {
                    i = ["<string>", n];
                  }
                  break;
                case "leftAki":
                case "rightAki":
                  if (true) {
                    i = ["<double>", n];
                  } else {
                    i = l ? ["<unitDouble>", [l, n]] : ["<double>", n];
                  }
                  break;
              }
              if (i) {
                t[r] = i;
              }
            }
          }
          return t;
        }
        return u({
          "textLayer": a
        })["textLayer"];
      };
      jamText.fromLayerTextObject = function(e) {
        var a = {};
        var n;
        var i = false;

        function t(e, a) {
          var t;
          if (a === "path") {
            t = jamHelpers.fromPathComponentList(e[a][1][1]["pathComponents"], true);
          } else if (!i) {
            switch (a) {
              case "rowGutter":
              case "columnGutter":
              case "spacing":
              case "firstBaselineMinimum":
              case "size":
              case "leading":
              case "baselineShift":
              case "underlineOffset":
              case "lineWidth":
              case "miterLimit":
              case "firstLineIndent":
              case "startIndent":
              case "endIndent":
              case "spaceBefore":
              case "spaceAfter":
              case "leftAki":
              case "rightAki":
                var r = e[a];
                if (r[0] === "<unitDouble>") {
                  n = r[1][0];
                }
                i = true;
                break;
            }
          }
          return t;
        }
        a["layerText"] = jamEngine.simplifyObject(e, t);
        if (n) {
          a["typeUnit"] = n;
        }
        return a;
      };
      jamText.setLayerText = function(e) {
        var a = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var r = false;
        try {
          resultObj = jamEngine.jsonGet([{
            "property": {
              "<property>": "textKey"
            }
          }, {
            "layer": {
              "<enumerated>": {
                "ordinal": "targetEnum"
              }
            }
          }]);
          if ("textKey" in resultObj) {
            r = true;
          }
        } catch (e) {}
        jamEngine.meaningfulIds = a;
        jamEngine.parseFriendly = t;
        if (r) {
          jamEngine.jsonPlay("set", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]],
            "to": this.toLayerTextObject(e)
          });
        } else {
          jamEngine.jsonPlay("make", {
            "target": ["<reference>", [
              ["textLayer", ["<class>", null]]
            ]],
            "using": this.toLayerTextObject(e)
          });
        }
      };
      jamText.getLayerText = function() {
        var e = null;
        var a = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        try {
          var r = jamEngine.jsonGet([{
            "property": {
              "<property>": "textKey"
            }
          }, {
            "layer": {
              "<enumerated>": {
                "ordinal": "targetEnum"
              }
            }
          }]);
          if ("textKey" in r) {
            e = this.fromLayerTextObject(r["textKey"]);
          }
        } catch (e) {}
        jamEngine.meaningfulIds = a;
        jamEngine.parseFriendly = t;
        return e;
      };
    })();
  }
  if (typeof jamStyles !== "object") {
    var jamStyles = {};
    (function() {
      jamStyles.isStylesFile = function(e) {
        return e.type === "8BSL" || e.name.match(/\.asl$/i);
      };
      jamStyles.isStylesPalette = function(e) {
        return e.name.match(/^Styles.psp$/i);
      };
      jamStyles.toLayerEffectsObject = function(e) {
        function u(e, a) {
          var t = {};
          for (var r in e) {
            if (e.hasOwnProperty(r)) {
              var n = e[r];
              var i = null;
              var o;
              switch (r) {
                case "align":
                case "antiAlias":
                case "antialiasGloss":
                case "continuity":
                case "dither":
                case "enabled":
                case "invert":
                case "invertTexture":
                case "layerConceals":
                case "linked":
                case "reverse":
                case "showTransparency":
                case "useGlobalAngle":
                case "useShape":
                case "useTexture":
                case "vectorColor":
                  i = ["<boolean>", n];
                  break;
                case "book":
                case "ID":
                case "name":
                  i = ["<string>", localize(n)];
                  break;
                case "bookKey":
                  i = ["<data>", n];
                  break;
                case "bookID":
                case "location":
                case "midpoint":
                case "randomSeed":
                case "smoothness":
                  i = ["<integer>", n];
                  break;
                case "a":
                case "b":
                case "black":
                case "blue":
                case "brightness":
                case "cyan":
                case "gray":
                case "green":
                case "interpolation":
                case "luminance":
                case "magenta":
                case "red":
                case "saturation":
                case "yellowColor":
                  i = ["<double>", n];
                  break;
                case "angle":
                case "hue":
                case "localLightingAngle":
                case "localLightingAltitude":
                  i = ["<unitDouble>", ["angleUnit", n]];
                  break;
                case "chokeMatte":
                case "highlightOpacity":
                case "inputRange":
                case "noise":
                case "opacity":
                case "scale":
                case "shadingNoise":
                case "shadowOpacity":
                case "strengthRatio":
                case "textureDepth":
                  i = ["<unitDouble>", ["percentUnit", n]];
                  break;
                case "blur":
                case "distance":
                case "size":
                case "softness":
                  i = ["<unitDouble>", ["pixelsUnit", n]];
                  break;
                case "horizontal":
                case "vertical":
                  i = a ? ["<unitDouble>", [a, n]] : ["<double>", n];
                  break;
                case "type":
                  var s;
                  switch (n) {
                    case "linear":
                    case "radial":
                    case "angle":
                    case "reflected":
                    case "diamond":
                    case "shapeburst":
                      s = "gradientType";
                      break;
                    case "foregroundColor":
                    case "backgroundColor":
                    case "userStop":
                      s = "colorStopType";
                      break;
                  }
                  i = ["<enumerated>", [s, n]];
                  break;
                case "colorSpace":
                  i = ["<enumerated>", ["colorSpace", n]];
                  break;
                case "gradientForm":
                  i = ["<enumerated>", ["gradientForm", n]];
                  break;
                case "paintType":
                  i = ["<enumerated>", ["frameFill", n]];
                  break;
                case "bevelDirection":
                  i = ["<enumerated>", ["bevelEmbossStampStyle", n]];
                  break;
                case "bevelStyle":
                  i = ["<enumerated>", ["bevelEmbossStyle", n]];
                  break;
                case "bevelTechnique":
                  i = ["<enumerated>", ["bevelTechnique", n]];
                  break;
                case "glowTechnique":
                  i = ["<enumerated>", ["matteTechnique", n]];
                  break;
                case "innerGlowSource":
                  i = ["<enumerated>", ["innerGlowSourceType", n]];
                  break;
                case "style":
                  i = ["<enumerated>", ["frameStyle", n]];
                  break;
                case "highlightMode":
                case "mode":
                case "shadowMode":
                  i = ["<enumerated>", ["blendMode", n]];
                  break;
                case "bevelEmboss":
                case "chromeFX":
                case "dropShadow":
                case "frameFX":
                case "gradientFill":
                case "innerGlow":
                case "innerShadow":
                case "outerGlow":
                case "pattern":
                case "patternFill":
                case "solidFill":
                  i = ["<object>", [r, u(n)]];
                  break;
                case "color":
                case "highlightColor":
                case "shadowColor":
                  var c;
                  if ("book" in n && "name" in n || "bookID" in n && "bookKey" in n) {
                    c = "bookColor";
                  } else if ("cyan" in n && "magenta" in n && "yellowColor" in n && "black" in n) {
                    c = "CMYKColorClass";
                  } else if ("gray" in n) {
                    c = "grayscale";
                  } else if ("hue" in n && "saturation" in n && "brightness" in n) {
                    c = "HSBColorClass";
                  } else if ("luminance" in n && "a" in n && "b" in n) {
                    c = "labColor";
                  } else if ("red" in n && "green" in n && "blue" in n) {
                    c = "RGBColor";
                  }
                  i = ["<object>", [c, u(n)]];
                  break;
                case "gradient":
                  i = ["<object>", ["gradientClassEvent", u(n)]];
                  break;
                case "mappingShape":
                case "transparencyShape":
                  i = ["<object>", ["shapingCurve", u(n)]];
                  break;
                case "offset":
                  i = ["<object>", ["point", u(n, "percentUnit")]];
                  break;
                case "phase":
                  i = ["<object>", ["point", u(n)]];
                  break;
                case "minimum":
                case "maximum":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<integer>", n[l]]);
                  }
                  i = ["<list>", o];
                  break;
                case "colors":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<object>", ["colorStop", u(n[l])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "transparency":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<object>", ["transparencyStop", u(n[l])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "curve":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<object>", ["curvePoint", u(n[l])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "layerEffects":
                  i = ["<object>", ["layerEffects", u(n)]];
                  break;
              }
              if (i) {
                t[r] = i;
              }
            }
          }
          return t;
        }
        return u({
          "layerEffects": e
        })["layerEffects"];
      };
      jamStyles.fromLayerEffectsObject = function(e) {
        return jamEngine.simplifyObject(e);
      };
      jamStyles.toBlendOptionsObject = function(e) {
        function s(e) {
          var a = {};
          for (var t in e) {
            if (e.hasOwnProperty(t)) {
              var r = e[t];
              var n = null;
              var i;
              switch (t) {
                case "blendClipped":
                case "blendInterior":
                case "layerMaskAsGlobalMask":
                case "transparencyShapesLayer":
                case "vectorMaskAsGlobalMask":
                  n = ["<boolean>", r];
                  break;
                case "srcBlackMin":
                case "srcBlackMax":
                case "srcWhiteMin":
                case "srcWhiteMax":
                case "destBlackMin":
                case "destBlackMax":
                case "destWhiteMin":
                case "destWhiteMax":
                  n = ["<integer>", r];
                  break;
                case "fillOpacity":
                case "opacity":
                  n = ["<unitDouble>", ["percentUnit", r]];
                  break;
                case "mode":
                  n = ["<enumerated>", ["blendMode", r]];
                  break;
                case "knockout":
                  n = ["<enumerated>", ["knockout", r]];
                  break;
                case "channel":
                  n = ["<reference>", [
                    ["channel", ["<enumerated>", ["channel", r]]]
                  ]];
                  break;
                case "blendRange":
                  i = [];
                  for (var o = 0; o < r.length; o++) {
                    i.push(["<object>", ["blendRange", s(r[o])]]);
                  }
                  n = ["<list>", i];
                  break;
                case "channelRestrictions":
                  i = [];
                  for (var o = 0; o < r.length; o++) {
                    i.push(["<enumerated>", ["channel", r[o]]]);
                  }
                  n = ["<list>", i];
                  break;
                case "blendOptions":
                  n = ["<object>", ["blendOptions", s(r)]];
                  break;
              }
              if (n) {
                a[t] = n;
              }
            }
          }
          return a;
        }
        return s({
          "blendOptions": e
        })["blendOptions"];
      };
      jamStyles.fromBlendOptionsObject = function(e) {
        var a = function(e, a, t) {
          var r = undefined;
          if (a === "channel") {
            var n = t(e, a);
            r = n[0]["channel"];
          }
          return r;
        };
        return jamEngine.simplifyObject(e, a);
      };
      jamStyles.toDocumentModeObject = function(e) {
        function i(e) {
          var a = {};
          for (var t in e) {
            if (e.hasOwnProperty(t)) {
              var r = e[t];
              var n = null;
              switch (t) {
                case "colorSpace":
                  n = ["<enumerated>", ["colorSpace", r]];
                  break;
                case "depth":
                  n = ["<integer>", r];
                  break;
                case "documentMode":
                  n = ["<object>", ["documentMode", i(r)]];
                  break;
              }
              if (n) {
                a[t] = n;
              }
            }
          }
          return a;
        }
        return i({
          "documentMode": e
        })["documentMode"];
      };
      jamStyles.fromDocumentModeObject = function(e) {
        return jamEngine.simplifyObject(e);
      };

      function p() {
        var e = {};
        var a = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var r;
        r = jamEngine.jsonGet([
          ["property", ["<property>", "mode"]],
          ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        e["colorSpace"] = r["mode"][1][1];
        r = jamEngine.jsonGet([
          ["property", ["<property>", "depth"]],
          ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        e["depth"] = r["depth"][1];
        jamEngine.meaningfulIds = a;
        jamEngine.parseFriendly = t;
        return e;
      }

      function f() {
        var e = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var t = jamEngine.jsonGet([
          ["property", ["<property>", "resolution"]],
          ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        jamEngine.meaningfulIds = e;
        jamEngine.parseFriendly = a;
        return t["resolution"][1][1];
      }
      jamStyles.setLayerStyle = function(e, a) {
        if (e && ("blendOptions" in e || "layerEffects" in e)) {
          var t = {};
          if ("blendOptions" in e) {
            defaultBlendOptionsObj = {
              "mode": "normal",
              "opacity": 100,
              "fillOpacity": 100,
              "channelRestrictions": [],
              "knockout": "none",
              "blendInterior": false,
              "blendClipped": true,
              "transparencyShapesLayer": true,
              "layerMaskAsGlobalMask": false,
              "vectorMaskAsGlobalMask": false,
              "blendRange": []
            };
            var r = p();
            var n;
            var i;
            switch (r["colorSpace"]) {
              case "CMYKColorEnum":
              case "CMYK64":
                n = ["cyan", "magenta", "yellow", "black"];
                i = ["gray", "cyan", "magenta", "yellow", "black"];
                break;
              case "duotone":
              case "grayScale":
              case "gray16":
                n = ["black"];
                i = ["black"];
                break;
              case "labColor":
              case "lab48":
                n = ["lightness", "a", "b"];
                i = ["lightness", "a", "b"];
                break;
              case "RGBColor":
              case "RGB48":
                n = ["red", "green", "blue"];
                i = ["gray", "red", "green", "blue"];
                break;
            }
            defaultBlendOptionsObj["channelRestrictions"] = n;
            for (var o = 0; o < i.length; o++) {
              defaultBlendRangeObj = {
                "channel": i[o],
                "srcBlackMin": 0,
                "srcBlackMax": 0,
                "srcWhiteMin": 255,
                "srcWhiteMax": 255,
                "destBlackMin": 0,
                "destBlackMax": 0,
                "destWhiteMin": 255,
                "destWhiteMax": 255
              };
              defaultBlendOptionsObj["blendRange"].push(defaultBlendRangeObj);
            }
            var s = jamUtils.mergeData(e["blendOptions"], defaultBlendOptionsObj);
            var c = this.toBlendOptionsObject(s)[1][1];
            for (var l in c) {
              if (c.hasOwnProperty(l)) {
                t[l] = c[l];
              }
            }
          }
          var u;
          if ("layerEffects" in e) {
            u = e["layerEffects"];
            t["layerEffects"] = this.toLayerEffectsObject(u);
          }
          jamEngine.jsonPlay("set", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]],
            "to": ["<object>", ["layer", t]]
          });
          if (u) {
            if ("scale" in u && !a) {
              this.scaleLayerEffects(f() / 72 / (u["scale"] / 100) * 100);
            }
          }
        } else {
          this.clearLayerStyle();
        }
      };

      function u() {
        var e = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var t = jamEngine.jsonGet([
          ["property", ["<property>", "presetManager"]],
          ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        var r = t["presetManager"][1];
        var n;
        for (var i = 0; i < r.length; i++) {
          var o = r[i][1];
          if (o[0] === "styleClass") {
            n = o[1]["name"][1].length;
            break;
          }
        }
        jamEngine.meaningfulIds = e;
        jamEngine.parseFriendly = a;
        return n;
      }

      function m() {
        var e = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var t = false;
        try {
          var r = jamEngine.jsonGet([
            ["property", ["<property>", "background"]],
            ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]);
          t = !r["background"][1];
        } catch (e) {}
        var e = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        return t;
      }
      jamStyles.getLayerStyle = function() {
        var e = null;
        if (m()) {
          var a = u();
          var t = new Date();
          var r = "Temp-Layer-Style-" + t.getTime();
          try {
            jamEngine.jsonPlay("make", {
              "target": ["<reference>", [
                ["style", ["<class>", null]]
              ]],
              "name": ["<string>", r],
              "using": ["<reference>", [
                ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
              ]],
              "blendOptions": ["<boolean>", true],
              "layerEffects": ["<boolean>", true]
            });
          } catch (e) {}
          var n = u();
          if (n === a + 1) {
            var i = new File(Folder.temp + "/" + r + ".asl");
            jamEngine.jsonPlay("set", {
              "target": ["<path>", i.fsName],
              "to": ["<list>", [
                ["<reference>", [
                  ["style", ["<index>", n]]
                ]]
              ]]
            });
            jamEngine.jsonPlay("delete", {
              "target": ["<list>", [
                ["<reference>", [
                  ["style", ["<index>", n]]
                ]]
              ]]
            });
            var o = this.dataFromStylesFile(i);
            if (typeof o === "string") {
              alert(o + "\n" + "Styles file: “" + File.decode(i.name) + "”");
            } else {
              e = o["styles"][0];
              if ("name" in e) {
                delete e["name"];
              }
              if ("ID" in e) {
                delete e["ID"];
              }
              if ("documentMode" in e) {
                delete e["documentMode"];
              }
              if ("layerEffects" in e) {
                var s = e["layerEffects"];
                if ("masterFXSwitch" in s) {
                  delete s["masterFXSwitch"];
                }
              }
            }
            if (arguments.length > 0) {
              var c = arguments[0];
              if (c && c.constructor === Object) {
                if ("patterns" in c) {
                  var l = this.patternsFromStylesFile(i);
                  if (typeof l === "string") {
                    alert(l + "\n" + "Styles file: “" + File.decode(i.name) + "”");
                  } else {
                    c["patterns"] = l;
                  }
                }
              }
            }
            i.remove();
          }
        }
        return e;
      };
      jamStyles.copyLayerStyle = function() {
        try {
          jamEngine.jsonPlay("copyEffects", null);
        } catch (e) {}
      };
      jamStyles.pasteLayerStyle = function() {
        try {
          jamEngine.jsonPlay("pasteEffects", {});
        } catch (e) {}
      };
      jamStyles.clearLayerStyle = function() {
        try {
          jamEngine.jsonPlay("disableLayerStyle", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]]
          });
        } catch (e) {}
      };
      jamStyles.applyLayerStyle = function(e, a) {
        var t = {
          "target": ["<reference>", [
            ["style", ["<name>", e]]
          ]],
          "to": ["<reference>", [
            ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]]
        };
        if (typeof a !== "undefined" && a) {
          t["merge"] = ["<boolean>", a];
        }
        jamEngine.jsonPlay("applyStyle", t);
      };
      jamStyles.scaleLayerEffects = function(e) {
        jamEngine.jsonPlay("scaleEffectsEvent", {
          "scale": ["<unitDouble>", ["percentUnit", e]]
        });
      };
      jamStyles.removeLayerEffect = function(e) {
        try {
          jamEngine.jsonPlay("disableSingleFX", {
            "target": ["<reference>", [
              [e, ["<class>", null]],
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]]
          });
        } catch (e) {}
      };
      jamStyles.removeLayerEffects = function(e) {
        for (var a = 0; a < e.length; a++) {
          this.removeLayerEffect(e[a]);
        }
      };
      jamStyles.removeAllLayerEffects = function() {
        try {
          jamEngine.jsonPlay("disableLayerFX", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]]
          });
        } catch (e) {}
      };
      jamStyles.showHideLayerEffects = function(e, a) {
        var t = [];
        for (var r = 0; r < e.length; r++) {
          t.push(["<reference>", [
            [e[r],
              ["<class>", null]
            ],
            ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]]);
        }
        try {
          jamEngine.jsonPlay(a ? "show" : "hide", {
            "target": ["<list>", t]
          }, DialogModes.NO);
        } catch (e) {}
      };
      jamStyles.showHideLayerEffect = function(e, a) {
        this.showHideLayerEffects([e], a);
      };
      jamStyles.showHideAllLayerEffects = function(e) {
        this.showHideLayerEffects(["layerEffects"], e);
      };
      jamStyles.showHideAllDocumentEffects = function(e) {
        jamEngine.jsonPlay("set", {
          "target": ["<reference>", [
            ["property", ["<property>", "layerFXVisible"]],
            ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]],
          "to": ["<object>", ["layerFXVisible", {
            "layerFXVisible": ["<boolean>", e || false]
          }]]
        });
      };

      function t(e, a, t) {
        var r = {
          "globalLightingAngle": ["<unitDouble>", ["angleUnit", a]]
        };
        if (typeof t !== "undefined") {
          r["globalAltitude"] = ["<unitDouble>", ["angleUnit", t]];
        }
        jamEngine.jsonPlay("set", {
          "target": ["<reference>", [
            ["property", ["<property>", "globalAngle"]],
            [e, ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]],
          "to": ["<object>", ["globalAngle", r]]
        });
      }
      jamStyles.setApplicationGlobalAngle = function(e, a) {
        t("application", e, a);
      };
      jamStyles.setDocumentGlobalAngle = function(e, a) {
        t("document", e, a);
      };

      function x(e, a) {
        var t = e.read(a);
        var r = 0;
        for (var n = 0; n < a; n++) {
          r = (r << 8) + t.charCodeAt(n);
        }
        return r;
      }

      function E(e) {
        var a = "";
        var t = x(e, 4);
        for (var r = 0; r < t; r++) {
          var n = x(e, 2);
          if (n !== 0) {
            a += String.fromCharCode(n);
          }
        }
        return a;
      }

      function l(e, a) {
        return e.read(a);
      }

      function D(e) {
        var a = x(e, 1);
        return l(e, a);
      }
      jamStyles.dataFromStylesFile = function(e, a) {
        var t = ["Bitmap", "Grayscale", "Indexed", "RGB", "CMYK", null, null, "Multichannel", "Duotone", "Lab"];
        var r;
        if (typeof e === "string") {
          r = new File(e);
        } else if (e instanceof File) {
          r = e;
        }
        var n;
        if (r.open("r")) {
          try {
            r.encoding = "BINARY";
            var i;
            if (this.isStylesPalette(r)) {
              i = 2;
            } else if (this.isStylesFile(r)) {
              i = x(r, 2);
            }
            if (i === 2) {
              var o = r.read(4);
              if (o === "8BSL") {
                var s = x(r, 2);
                if (s === 3) {
                  var c = x(r, 4);
                  var l = r.tell() + c;
                  if (a) {
                    var u = [];
                    while (r.tell() < l) {
                      var p = {};
                      var f = x(r, 4);
                      var m = r.tell() + f;
                      var g = x(r, 4);
                      p["version"] = g;
                      if (g === 1) {
                        p["imageMode"] = t[x(r, 4)];
                        p["height"] = x(r, 2);
                        p["width"] = x(r, 2);
                        p["name"] = E(r);
                        p["ID"] = D(r);
                      } else {
                        p["error"] = "Unsupported version";
                      }
                      u.push(p);
                      r.seek(m + (4 - f % 4) % 4, 0);
                    }
                  }
                  r.seek(l, 0);
                  var y = jamEngine.meaningfulIds;
                  var d = jamEngine.parseFriendly;
                  jamEngine.meaningfulIds = true;
                  jamEngine.parseFriendly = true;
                  var h;
                  var v;
                  var b = [];
                  var k = x(r, 4);
                  for (var T = 0; T < k; T++) {
                    var j = {};
                    var S = x(r, 4);
                    var I = r.tell() + S;
                    h = jamActions.readActionDescriptor(r);
                    v = jamEngine.classIdAndActionDescriptorToJson(0, h)["<descriptor>"];
                    j["name"] = v["name"][1];
                    j["ID"] = v["ID"][1];
                    h = jamActions.readActionDescriptor(r);
                    v = jamEngine.classIdAndActionDescriptorToJson(0, h)["<descriptor>"];
                    if ("documentMode" in v) {
                      j["documentMode"] = this.fromDocumentModeObject(v["documentMode"]);
                    }
                    if ("blendOptions" in v) {
                      j["blendOptions"] = this.fromBlendOptionsObject(v["blendOptions"]);
                    }
                    if ("layerEffects" in v) {
                      j["layerEffects"] = this.fromLayerEffectsObject(v["layerEffects"]);
                    }
                    b.push(j);
                    r.seek(I, 0);
                  }
                  jamEngine.meaningfulIds = y;
                  jamEngine.parseFriendly = d;
                  n = {};
                  if (a) {
                    n["patterns"] = u;
                  }
                  n["styles"] = b;
                } else {
                  throw new Error("[jamStyles.dataFromStylesFile] Unrecognized sub-version: " + s);
                }
              } else {
                throw new Error("[jamStyles.dataFromStylesFile] Unrecognized magic number: " + o);
              }
            } else {
              throw new Error("[jamStyles.dataFromStylesFile] Unrecognized format version: " + i);
            }
          } catch (e) {
            n = e.message;
          } finally {
            r.close();
          }
        } else {
          n = "[jamStyles.dataFromStylesFile] Cannot open file";
        }
        return n;
      };
      jamStyles.patternsFromStylesFile = function(e) {
        var a;
        if (typeof e === "string") {
          a = new File(e);
        } else if (e instanceof File) {
          a = e;
        }
        var t;
        if (a.open("r")) {
          try {
            a.encoding = "BINARY";
            var r;
            if (this.isStylesPalette(a)) {
              r = 2;
            } else if (this.isStylesFile(a)) {
              r = x(a, 2);
            }
            if (r === 2) {
              var n = a.read(4);
              if (n === "8BSL") {
                var i = x(a, 2);
                if (i === 3) {
                  var o = x(a, 4);
                  var s = a.tell() + o;
                  var t = [];
                  while (a.tell() < s) {
                    var c = x(a, 4);
                    t.push(l(a, c));
                    a.seek((4 - c % 4) % 4, 1);
                  }
                } else {
                  throw new Error("[jamStyles.patternsFromStylesFile] Unrecognized sub-version: " + i);
                }
              } else {
                throw new Error("[jamStyles.patternsFromStylesFile] Unrecognized magic number: " + n);
              }
            } else {
              throw new Error("[jamStyles.patternsFromStylesFile] Unrecognized format version: " + r);
            }
          } catch (e) {
            t = e.message;
          } finally {
            a.close();
          }
        } else {
          t = "[jamStyles.patternsFromStylesFile] Cannot open file";
        }
        return t;
      };
      jamStyles.patternsFileFromPatterns = function(e, a) {
        var t;
        if (typeof e === "string") {
          t = new File(e);
        } else if (e instanceof File) {
          t = e;
        }
        if (t.open("w", "8BPT", "8BIM")) {
          t.encoding = "BINARY";
          t.write("8BPT");
          t.write("\0");
          var r = a.length;
          t.write(String.fromCharCode(r >> 24 & 255, r >> 16 & 255, r >> 8 & 255, r & 255));
          for (var n = 0; n < r; n++) {
            t.write(a[n]);
          }
          t.close();
        }
      };
    })();
  }
  if (typeof jamUtils !== "object") {
    var jamUtils = {};
    (function() {
      jamUtils.toDistanceUnit = function(e, a) {
        return e / a * 72;
      };
      jamUtils.fromDistanceUnit = function(e, a) {
        return e / 72 * a;
      };
      jamUtils.fontExists = function(e) {
        var a = true;
        var t = false;
        if (a) {
          for (var r = 0; r < app.fonts.length; r++) {
            if (app.fonts[r].postScriptName === e) {
              t = true;
              break;
            }
          }
        } else {
          var n = jamEngine.meaningfulIds;
          var i = jamEngine.parseFriendly;
          jamEngine.meaningfulIds = true;
          jamEngine.parseFriendly = true;
          var o = jamEngine.jsonGet([
            ["property", ["<property>", "fontList"]],
            ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]);
          var s = o["fontList"][1][1]["fontPostScriptName"][1];
          for (var r = 0; r < s.length; r++) {
            if (s[r][1] === e) {
              t = true;
              break;
            }
          }
          jamEngine.meaningfulIds = n;
          jamEngine.parseFriendly = i;
        }
        return t;
      };
      jamUtils.loadAction = function(e, a, t) {
        try {
          jamEngine.jsonGet([
            ["action", ["<name>", e]],
            ["actionSet", ["<name>", a]]
          ]);
          var r = true;
        } catch (e) {
          var r = false;
        }
        if (!r) {
          jamEngine.jsonPlay("open", {
            "target": ["<path>", t]
          });
        }
      };
      jamUtils.loadActionSet = function(e, a) {
        try {
          jamEngine.jsonGet([
            ["actionSet", ["<name>", e]]
          ]);
          var t = true;
        } catch (e) {
          var t = false;
        }
        if (!t) {
          jamEngine.jsonPlay("open", {
            "target": ["<path>", a]
          });
        }
      };
      jamUtils.loadPreset = function(e, a, t) {
        var r = false;
        var n = true;
        var i = {
          "brush": "brush",
          "colors": "color",
          "gradientClassEvent": "gradientClassEvent",
          "style": "styleClass",
          "pattern": "'PttR'",
          "shapingCurve": "shapingCurve",
          "customShape": "customShape",
          "toolPreset": "toolPreset"
        };
        var o = i[e];
        var s = jamEngine.meaningfulIds;
        var c = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var l = false;
        var u = jamEngine.jsonGet([
          ["property", ["<property>", "presetManager"]],
          ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        var p = u["presetManager"][1];
        for (var f = 0; f < p.length; f++) {
          var m = p[f][1];
          if (m[0] === o) {
            var g = m[1]["name"][1];
            for (var y = 0; y < g.length; y++) {
              if (g[y][1] === a) {
                l = true;
                break;
              }
            }
            break;
          }
        }
        if (!l) {
          if (r) {
            app.load(new File(t));
          } else if (n) {
            jamEngine.jsonPlay("open", {
              "target": ["<path>", t]
            });
          } else {
            jamEngine.jsonPlay("set", {
              "target": ["<reference>", [
                ["property", ["<property>", e]],
                ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
              ]],
              "to": ["<path>", t],
              "append": ["<boolean>", true]
            });
          }
        }
        jamEngine.meaningfulIds = s;
        jamEngine.parseFriendly = c;
      };

      function r(e) {
        var a;
        if (e instanceof File) {
          a = e;
        } else if (typeof e === "string") {
          a = new File(e);
        } else {
          throw new Error("[jamUtils getFileObject] Invalid argument");
        }
        return a;
      }
      jamUtils.readTextFile = function(e) {
        var a = null;
        var t = r(e);
        if (t.open("r")) {
          a = t.read();
          t.close();
        }
        return a;
      };
      jamUtils.readJsonFile = function(e) {
        return jamJSON.parse(this.readTextFile(e), true);
      };
      jamUtils.writeTextFile = function(e, a) {
        var t = r(e);
        if (t.open("w", "TEXT")) {
          t.encoding = "UTF-8";
          t.lineFeed = "unix";
          t.write("\ufeff");
          t.write(a);
          t.close();
        }
      };
      jamUtils.writeJsonFile = function(e, a, t) {
        this.writeTextFile(e, jamJSON.stringify(a, t));
      };
      jamUtils.cloneData = function(e) {
        var a;
        if (e === null) {
          a = e;
        } else if (e.constructor === Object) {
          a = {};
          for (var t in e) {
            if (e.hasOwnProperty(t)) {
              a[t] = this.cloneData(e[t]);
            }
          }
        } else if (e.constructor === Array) {
          a = [];
          for (var r = 0; r < e.length; r++) {
            a.push(this.cloneData(e[r]));
          }
        } else {
          a = e;
        }
        return a;
      };
      jamUtils.mergeData = function(e, a) {
        for (var t in a) {
          if (a.hasOwnProperty(t)) {
            if (t in e) {
              if (a[t] !== null && a[t].constructor === Object) {
                e[t] = this.mergeData(e[t], a[t]);
              }
            } else {
              e[t] = this.cloneData(a[t]);
            }
          }
        }
        return e;
      };
      var o = "jsonCustomOptions";
      jamUtils.getCustomOptions = function(e, a) {
        var t = jamEngine.meaningfulIds;
        var r = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = false;
        try {
          var n = jamEngine.classIdAndActionDescriptorToJson(jamEngine.uniIdStrToId(e), app.getCustomOptions(e));
          var i = jamJSON.parse(n["<descriptor>"][o]["<string>"], true);
        } catch (e) {
          var i = {};
        }
        jamEngine.meaningfulIds = t;
        jamEngine.parseFriendly = r;
        return this.mergeData(i, a);
      };
      jamUtils.putCustomOptions = function(e, a, t) {
        var r = {};
        r[o] = ["<string>", jamJSON.stringify(a)];
        app.putCustomOptions(e, jamEngine.jsonToActionDescriptor(r), t);
      };
      jamUtils.eraseCustomOptions = function(e) {
        app.eraseCustomOptions(e);
      };
      jamUtils.dataToHexaString = function(e, a) {
        var t = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        var r = "";
        var n = e.length;
        for (var i = 0; i < n; i++) {
          var o = e.charCodeAt(i);
          if (o >= 0 && o <= 255) {
            r += t[(o & 240) >> 4] + t[o & 15];
          } else {
            throw new Error("[jamUtils.dataToHexaString] Invalid data string");
          }
        }
        if (a) {
          r = r.toLowerCase();
        }
        return r;
      };
      jamUtils.hexaToDataString = function(e) {
        var a = "";
        var t = e.length;
        if (t % 2 === 0 && /^[0-9A-Fa-f]*$/.test(e)) {
          for (var r = 0; r < t; r += 2) {
            var n = e.slice(r, r + 2);
            a += String.fromCharCode(parseInt(n, 16));
          }
        } else {
          throw new Error("[jamUtils.hexaToDataString] Invalid hexa string");
        }
        return a;
      };
    })();
  }
  var charID = {
    "Back": 1113678699,
    "Background": 1113811815,
    "Bottom": 1114926957,
    "By": 1115234336,
    "Channel": 1130917484,
    "Contract": 1131312227,
    "Document": 1147366766,
    "Expand": 1165521006,
    "FrameSelect": 1718838636,
    "Horizontal": 1215461998,
    "Layer": 1283027488,
    "Left": 1281713780,
    "Move": 1836021349,
    "None": 1315925605,
    "Null": 1853189228,
    "Offset": 1332114292,
    "Ordinal": 1332896878,
    "PixelUnit": 592476268,
    "Point": 1349415968,
    "Property": 1349677170,
    "Right": 1382508660,
    "Select": 1936483188,
    "Set": 1936028772,
    "Size": 1400512544,
    "Target": 1416783732,
    "Text": 1417180192,
    "TextLayer": 1417170034,
    "TextShapeType": 1413830740,
    "TextStyle": 1417180243,
    "TextStyleRange": 1417180276,
    "To": 1411391520,
    "Top": 1416589344,
    "Vertical": 1450341475
  };

  function _changeToPointText() {
    var e = new ActionReference();
    e.putProperty(charID.Property, charID.TextShapeType);
    e.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var a = new ActionDescriptor();
    a.putReference(charID.Null, e);
    a.putEnumerated(charID.To, charID.TextShapeType, charID.Point);
    executeAction(charID.Set, a, DialogModes.NO);
  }

  function _changeToBoxText() {
    var e = new ActionReference();
    e.putProperty(charID.Property, charID.TextShapeType);
    e.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var a = new ActionDescriptor();
    a.putReference(charID.Null, e);
    a.putEnumerated(charID.To, charID.TextShapeType, stringIDToTypeID("box"));
    executeAction(charID.Set, a, DialogModes.NO);
  }

  function _layerIsTextLayer() {
    var e = _getCurrent(charID.Layer, charID.Text);
    return e.hasKey(charID.Text);
  }

  function _textLayerIsPointText() {
    var e = _getCurrent(charID.Layer, charID.Text).getObjectValue(charID.Text);
    var a = e.getList(stringIDToTypeID("textShape")).getObjectValue(0).getEnumerationValue(charID.TextShapeType);
    return a === charID.Point;
  }

  function _convertPixelToPoint(e) {
    return parseInt(e) / activeDocument.resolution * 72;
  }

  function _createCurrent(e, a) {
    var t = new ActionReference();
    if (a > 0) t.putProperty(charID.Property, a);
    t.putEnumerated(e, charID.Ordinal, charID.Target);
    return t;
  }

  function _getCurrent(e, a) {
    return executeActionGet(_createCurrent(e, a));
  }

  function _deselect() {
    var e = new ActionReference();
    e.putProperty(charID.Channel, charID.FrameSelect);
    var a = new ActionDescriptor();
    a.putReference(charID.Null, e);
    a.putEnumerated(charID.To, charID.Ordinal, charID.None);
    executeAction(charID.Set, a, DialogModes.NO);
  }

  function _getBoundsFromDescriptor(e) {
    var a = e.getInteger(charID.Top);
    var t = e.getInteger(charID.Left);
    var r = e.getInteger(charID.Right);
    var n = e.getInteger(charID.Bottom);
    return {
      "top": a,
      "left": t,
      "right": r,
      "bottom": n,
      "width": r - t,
      "height": n - a,
      "xMid": (t + r) / 2,
      "yMid": (a + n) / 2
    };
  }

  function _getCurrentSelectionBounds() {
    var e = _getCurrent(charID.Document, charID.FrameSelect);
    if (e.hasKey(charID.FrameSelect)) {
      var a = e.getObjectValue(charID.FrameSelect);
      return _getBoundsFromDescriptor(a);
    }
  }

  function _getCurrentTextLayerBounds() {
    var e = stringIDToTypeID("bounds");
    var a = _getCurrent(charID.Layer, e).getObjectValue(e);
    return _getBoundsFromDescriptor(a);
  }

  function _modifySelectionBounds(e) {
    if (e == 0) return;
    var a = new ActionDescriptor();
    a.putUnitDouble(charID.By, charID.PixelUnit, Math.abs(e));
    executeAction(e > 0 ? charID.Expand : charID.Contract, a, DialogModes.NO);
  }

  function _moveLayer(e, a) {
    var t = new ActionDescriptor();
    t.putUnitDouble(charID.Horizontal, charID.PixelUnit, e);
    t.putUnitDouble(charID.Vertical, charID.PixelUnit, a);
    var r = new ActionDescriptor();
    r.putReference(charID.Null, _createCurrent(charID.Layer));
    r.putObject(charID.To, charID.Offset, t);
    executeAction(charID.Move, r, DialogModes.NO);
  }

  function _createAndSetLayerText(e, a, t) {
    e.style.textProps.layerText.textKey = e.text.replace(/\n+/g, "\r");
    e.style.textProps.layerText.textStyleRange[0].to = e.text.length;
    e.style.textProps.layerText.paragraphStyleRange[0].to = e.text.length;
    e.style.textProps.layerText.textShape = [{
      "textType": "box",
      "orientation": "horizontal",
      "bounds": {
        "top": 0,
        "left": 0,
        "right": _convertPixelToPoint(a),
        "bottom": _convertPixelToPoint(t)
      }
    }];
    jamEngine.jsonPlay("make", {
      "target": ["<reference>", [
        ["textLayer", ["<class>", null]]
      ]],
      "using": jamText.toLayerTextObject(e.style.textProps)
    });
  }

  function _setTextBoxSize(e, a) {
    var t = [{
      "textType": "box",
      "orientation": "horizontal",
      "bounds": {
        "top": 0,
        "left": 0,
        "right": _convertPixelToPoint(e),
        "bottom": _convertPixelToPoint(a)
      }
    }];
    jamText.setLayerText({
      "layerText": {
        "textShape": t
      }
    });
  }

  function _checkSelection() {
    var e = _getCurrentSelectionBounds();
    if (e === undefined) {
      return {
        "error": "noSelection"
      };
    }
    _modifySelectionBounds(-10);
    e = _getCurrentSelectionBounds();
    if (e === undefined || e.width * e.height < 200) {
      return {
        "error": "smallSelection"
      };
    }
    return e;
  }

  function _forEachSelectedLayer(e) {
    var a = [];
    var t = new ActionReference();
    var r = stringIDToTypeID("targetLayers");
    t.putProperty(charID.Property, r);
    t.putEnumerated(charID.Document, charID.Ordinal, charID.Target);
    var n = executeActionGet(t);
    if (n.hasKey(r)) {
      n = n.getList(r);
      var i = new ActionReference();
      i.putProperty(charID.Property, charID.Background);
      i.putEnumerated(charID.Layer, charID.Ordinal, charID.Back);
      var o = executeActionGet(i).getBoolean(charID.Background) ? 0 : 1;
      for (var s = 0; s < n.count; s++) {
        a.push(n.getReference(s).getIndex() + o);
      }
    }
    if (a.length > 1) {
      for (var c = 0; c < a.length; c++) {
        var l = new ActionDescriptor();
        var u = new ActionReference();
        u.putIndex(charID.Layer, a[c]);
        l.putReference(charID.Null, u);
        executeAction(charID.Select, l, DialogModes.NO);
        e(a[c]);
      }
      var p = new ActionReference();
      for (var f = 0; f < a.length; f++) {
        p.putIndex(charID.Layer, a[f]);
      }
      var m = new ActionDescriptor();
      m.putReference(charID.Null, p);
      executeAction(charID.Select, m, DialogModes.NO);
    } else if (a.length === 1) {
      e(a[0]);
    } else {
      // (Tauri port) CS6 không trả về "targetLayers" hợp lệ (hasKey false) -> a rỗng ->
      // trước đây callback e() KHÔNG BAO GIỜ được gọi, im lặng "thành công" mà không làm
      // gì cả. Fallback: coi như đang thao tác trên layer active hiện tại, gọi thẳng e().
      e();
    }
  }
  var setActiveLayerTextData;
  var setActiveLayerTextResult;

  function _setActiveLayerText() {
    if (!setActiveLayerTextData) {
      setActiveLayerTextResult = "";
      return;
    } else if (!documents.length) {
      setActiveLayerTextResult = "doc";
      return;
    } else if (!_layerIsTextLayer()) {
      setActiveLayerTextResult = "layer";
      return;
    }
    var l = setActiveLayerTextData.text;
    var u = setActiveLayerTextData.style;
    try {
    _forEachSelectedLayer(function() {
      var e = _getCurrentTextLayerBounds();
      var a = _textLayerIsPointText();
      if (a) _changeToBoxText();
      var t = jamText.getLayerText();
      var r;
      if (l && u) {
        r = u.textProps;
        r.layerText.textKey = l.replace(/\n+/g, "\r");
        r.layerText.textStyleRange[0].to = l.length;
        r.layerText.paragraphStyleRange[0].to = l.length;
      } else if (l) {
        r = {
          "layerText": {
            "textKey": l.replace(/\n+/g, "\r")
          }
        };
        if (t.layerText.textStyleRange && t.layerText.textStyleRange[0]) {
          r.layerText.textStyleRange = [t.layerText.textStyleRange[0]];
          r.layerText.textStyleRange[0].to = l.length;
        }
        if (t.layerText.paragraphStyleRange && t.layerText.paragraphStyleRange[0]) {
          r.layerText.paragraphStyleRange = [t.layerText.paragraphStyleRange[0]];
          r.layerText.paragraphStyleRange[0].to = l.length;
        }
      } else if (u) {
        var n = t.layerText.textKey || "";
        r = u.textProps;
        r.layerText.textStyleRange[0].to = n.length;
        r.layerText.paragraphStyleRange[0].to = n.length;
      }
      r.layerText.textShape = [t.layerText.textShape[0]];
      r.layerText.textShape[0].bounds.bottom *= 15;
      r.typeUnit = t.typeUnit;
      jamText.setLayerText(r);
      var i = _getCurrentTextLayerBounds();
      if (a) {
        _changeToPointText();
      } else {
        var o = 12;
        if (u) {
          o = u.textProps.layerText.textStyleRange[0].textStyle.size;
        } else if (t.layerText.textStyleRange && t.layerText.textStyleRange[0]) {
          o = t.layerText.textStyleRange[0].textStyle.size;
        }
        r.layerText.textShape[0].bounds.bottom = _convertPixelToPoint(i.height + o + 2);
        jamText.setLayerText({
          "layerText": {
            "textShape": r.layerText.textShape
          }
        });
      }
      if (!e.bottom) e = i;
      var s = e.xMid - i.xMid;
      var c = e.yMid - i.yMid;
      _moveLayer(s, c);
    });
    } catch (__tcErr2) {
      setActiveLayerTextResult = "ERR_DETAIL:" + __tcErr2.message + " @line " + (__tcErr2.line || "?");
      return;
    }
    setActiveLayerTextResult = "";
  }
  var createTextLayerInSelectionData;
  var createTextLayerInSelectionPoint;
  var createTextLayerInSelectionResult;

  function _createTextLayerInSelection() {
    if (!documents.length) {
      createTextLayerInSelectionResult = "doc";
      return;
    }
    var e = _checkSelection();
    if (e.error) {
      createTextLayerInSelectionResult = e.error;
      return;
    }
    var a = e.width * .9;
    var t = e.height * 15;
    _createAndSetLayerText(createTextLayerInSelectionData, a, t);
    var r = _getCurrentTextLayerBounds();
    if (createTextLayerInSelectionPoint) {
      _changeToPointText();
    } else {
      var n = jamText.getLayerText();
      var i = n.layerText.textStyleRange[0].textStyle.size;
      _setTextBoxSize(a, r.height + i + 2);
    }
    var o = e.xMid - r.xMid;
    var s = e.yMid - r.yMid;
    _moveLayer(o, s);
    createTextLayerInSelectionResult = "";
  }
  var alignTextLayerToSelectionResult;

  function _alignTextLayerToSelection() {
    if (!documents.length) {
      alignTextLayerToSelectionResult = "doc";
      return;
    } else if (!_layerIsTextLayer()) {
      alignTextLayerToSelectionResult = "layer";
      return;
    }
    var e = _checkSelection();
    if (e.error) {
      createTextLayerInSelectionResult = e.error;
      return;
    }
    var a = _textLayerIsPointText();
    var t = e.width * .9;
    var r = e.height * 15;
    _setTextBoxSize(t, r);
    var n = _getCurrentTextLayerBounds();
    if (a) {
      _changeToPointText();
    } else {
      var i = jamText.getLayerText();
      var o = i.layerText.textStyleRange[0].textStyle.size;
      _setTextBoxSize(t, n.height + o + 2);
    }
    _deselect();
    var s = e.xMid - n.xMid;
    var c = e.yMid - n.yMid;
    _moveLayer(s, c);
    alignTextLayerToSelectionResult = "";
  }
  var changeActiveLayerTextSizeVal;
  var changeActiveLayerTextSizeResult;

  function _changeActiveLayerTextSize() {
    if (!documents.length) {
      changeActiveLayerTextSizeResult = "doc";
      return;
    } else if (!_layerIsTextLayer()) {
      changeActiveLayerTextSizeResult = "layer";
      return;
    } else if (!changeActiveLayerTextSizeVal) {
      changeActiveLayerTextSizeResult = "";
      return;
    }
    _forEachSelectedLayer(function() {
      var e = jamText.getLayerText();
      var a = e.layerText.textKey.replace(/\n+/g, "");
      if (!a) {
        changeActiveLayerTextSizeResult = "layer";
        return;
      }
      var t = _getCurrentTextLayerBounds();
      var r = _textLayerIsPointText();
      var n = {
        "typeUnit": e.typeUnit,
        "layerText": {
          "textKey": a,
          "textGridding": e.textGridding || "none",
          "orientation": e.orientation || "horizontal",
          "antiAlias": e.antiAlias || "antiAliasSmooth",
          "textStyleRange": [e.layerText.textStyleRange[0]]
        }
      };
      if (e.layerText.paragraphStyleRange) {
        var i = e.layerText.paragraphStyleRange[0].paragraphStyle;
        n.layerText.paragraphStyleRange = [e.layerText.paragraphStyleRange[0]];
        n.layerText.paragraphStyleRange[0].paragraphStyle.textEveryLineComposer = i.textEveryLineComposer || false;
        n.layerText.paragraphStyleRange[0].paragraphStyle.burasagari = i.burasagari || "burasagariNone";
        n.layerText.paragraphStyleRange[0].to = a.length;
      }
      var o = n.layerText.textStyleRange[0].textStyle.size + changeActiveLayerTextSizeVal;
      n.layerText.textStyleRange[0].textStyle.size = o;
      n.layerText.textStyleRange[0].to = a.length;
      if (!r) {
        if (changeActiveLayerTextSizeVal > 0) {
          n.layerText.textShape = [e.layerText.textShape[0]];
          n.layerText.textShape[0].bounds.bottom *= 1.12;
          n.layerText.textShape[0].bounds.right *= 1.06;
        }
      }
      jamText.setLayerText(n);
      var s = _getCurrentTextLayerBounds();
      var c = t.xMid - s.xMid;
      var l = t.yMid - s.yMid;
      _moveLayer(c, l);
    });
    changeActiveLayerTextSizeResult = "";
  }

  function _changeSize_alt() {
    var m = changeActiveLayerTextSizeVal > 0;
    _forEachSelectedLayer(function() {
      var e = new ActionReference();
      e.putProperty(charID.Property, charID.Text);
      e.putEnumerated(charID.Layer, charID.Ordinal, charID.Target);
      var a = executeActionGet(e);
      if (a.hasKey(charID.Text)) {
        var t = a.getObjectValue(charID.Text);
        var r = t.getList(charID.TextStyleRange);
        var n = [];
        var i = [];
        var o = true;
        for (var s = 0; s < r.count; s++) {
          var c = r.getObjectValue(s).getObjectValue(charID.TextStyle);
          n[s] = c.getDouble(charID.Size);
          i[s] = c.getUnitDoubleType(charID.Size);
          if (s > 0 && (n[s] !== n[s - 1] || i[s] !== i[s - 1])) {
            o = false;
            break;
          }
        }
        var l = .2;
        if (i[0] === charID.PixelUnit) l = 1;
        else if (i[0] === 592473716) l = .5;
        if (!m) l *= -1;
        if (o) {
          var u = new ActionDescriptor();
          var p = new ActionReference();
          p.putProperty(charID.Property, charID.TextStyle);
          p.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
          u.putReference(charID.Null, p);
          var f = new ActionDescriptor();
          f.putUnitDouble(charID.Size, i[0], n[0] + l);
          u.putObject(charID.To, charID.TextStyle, f);
          executeAction(charID.Set, u, DialogModes.NO);
        }
      }
    });
    changeActiveLayerTextSizeResult = "";
  }

  function nativeAlert(e) {
    if (!e) return "";
    alert(e.text, e.title, e.isError);
  }

  function nativeConfirm(e) {
    if (!e) return "";
    var a = confirm(e.text, false, e.title);
    return a ? "1" : "";
  }

  function getUserFonts() {
    var e = [];
    for (var a = 0; a < app.fonts.length; a++) {
      var t = app.fonts[a];
      e.push({
        "name": t.name,
        "postScriptName": t.postScriptName,
        "family": t.family,
        "style": t.style
      });
    }
    return jamJSON.stringify({
      "fonts": e
    });
  }

  function getHotkeyPressed() {
    var e = ScriptUI.environment.keyboardState;
    if (e.metaKey && e.ctrlKey) {
      return "metaCtrl";
    } else if (e.metaKey && e.altKey) {
      return "metaAlt";
    } else if (e.metaKey && e.shiftKey) {
      return "metaShift";
    } else {
      return "";
    }
  }

  function getActiveLayerText() {
    if (!documents.length) {
      return "";
    } else if (activeDocument.activeLayer.kind != LayerKind.TEXT) {
      return "";
    }
    return jamJSON.stringify({
      "textProps": jamText.getLayerText()
    });
  }

  function setActiveLayerText(e) {
    setActiveLayerTextData = e;
    /* (Tauri port) suspendHistory(name, "fn()") theo kiểu chuỗi tên bị mất dữ liệu
   qua COM (biến module không "xuyên" qua được cách gọi này như bên CEP) -- đổi
   sang gọi hàm trực tiếp. Đánh đổi: mất gộp chung 1 bước Undo ("TyperTools Change"),
   nhưng đổi lại thao tác chạy đúng thay vì báo OK giả mà không làm gì cả. */
    _setActiveLayerText();
    return setActiveLayerTextResult;
  }

  function createTextLayerInSelection(e, a) {
    createTextLayerInSelectionData = e;
    createTextLayerInSelectionPoint = a;
    /* (Tauri port) suspendHistory(name, "fn()") theo kiểu chuỗi tên bị mất dữ liệu
   qua COM (biến module không "xuyên" qua được cách gọi này như bên CEP) -- đổi
   sang gọi hàm trực tiếp. Đánh đổi: mất gộp chung 1 bước Undo ("TyperTools Paste"),
   nhưng đổi lại thao tác chạy đúng thay vì báo OK giả mà không làm gì cả. */
    _createTextLayerInSelection();
    return createTextLayerInSelectionResult;
  }

  function alignTextLayerToSelection() {
    /* (Tauri port) suspendHistory(name, "fn()") theo kiểu chuỗi tên bị mất dữ liệu
   qua COM (biến module không "xuyên" qua được cách gọi này như bên CEP) -- đổi
   sang gọi hàm trực tiếp. Đánh đổi: mất gộp chung 1 bước Undo ("TyperTools Align"),
   nhưng đổi lại thao tác chạy đúng thay vì báo OK giả mà không làm gì cả. */
    _alignTextLayerToSelection();
    return alignTextLayerToSelectionResult;
  }

  function changeActiveLayerTextSize(e) {
    changeActiveLayerTextSizeVal = e;
    /* (Tauri port) suspendHistory(name, "fn()") theo kiểu chuỗi tên bị mất dữ liệu
   qua COM (biến module không "xuyên" qua được cách gọi này như bên CEP) -- đổi
   sang gọi hàm trực tiếp. Đánh đổi: mất gộp chung 1 bước Undo ("TyperTools Resize"),
   nhưng đổi lại thao tác chạy đúng thay vì báo OK giả mà không làm gì cả. */
    _changeActiveLayerTextSize();
    return changeActiveLayerTextSizeResult;
  }

  // ========== TT_BRIDGE: gọi vào lõi TyperTool đã bọc phía trên ==========
  $.global.TT_pasteToSelection = function(payload) {
    try {
      if (!payload || !payload.style || !payload.style.textProps) return "NO_STYLE";
      var res = createTextLayerInSelection(payload, false);
      if (res) return "ERR:" + res; // "doc" | "sel" ...
      if (payload.stroke) TR_setLayerStroke(payload.stroke);
      app.refresh();
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TT_pasteToLayer = function(payload) {
    try {
      var res = setActiveLayerText(payload);
      if (res) return "ERR:" + res; // "doc" | "layer"
      if (payload.stroke) TR_setLayerStroke(payload.stroke);
      app.refresh();
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TT_getActiveStyle = function() {
    try {
      var s = getActiveLayerText();
      return s || "";
    } catch (e) {
      return "";
    }
  };

  $.global.TT_getUserFonts = function() {
    try {
      // getUserFonts() (trong engine TyperTool) đã tự trả về chuỗi JSON hoàn chỉnh
      // dạng {"fonts":[...]} rồi — bọc thêm 1 lớp jamJSON.stringify() ở đây là lỗi
      // double-encode, khiến client nhận về "fonts" là 1 CHUỖI thay vì mảng, .forEach()
      // báo lỗi âm thầm và dropdown Font không bao giờ được đổ dữ liệu.
      return getUserFonts();
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TT_changeSize = function(delta) {
    try {
      var res = changeActiveLayerTextSize(delta);
      if (res) return "ERR:" + res; // "doc" | "layer"
      app.refresh();
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TT_alignToSelection = function() {
    try {
      var res = alignTextLayerToSelection();
      if (res) return "ERR:" + res; // "doc" | "layer" | "noSelection" | "smallSelection"
      app.refresh();
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

})();


// ============================================================
//  TypeR engine (embedded, namespaced) — cung cấp Align nâng cao
//  (tự nhận diện + cắt đuôi bóng thoại) và Multiple Bubble.
//  Toàn bộ code gốc TypeR được bọc trong 1 scope riêng (IIFE),
//  namespace tách biệt hoàn toàn với engine TyperTool đã bọc trước đó
//  và với phần code gốc của TypoCore — không đụng chạm gì lẫn nhau.
//  Chỉ các hàm TR_* ở cuối được lộ ra global cho scripts.js gọi.
// ============================================================
(function() {
  if (typeof jamActions !== "object") {
    var jamActions = {};
    (function() {
      jamActions.isActionsFile = function(e) {
        return e.type === "8BAC" || e.name.match(/\.atn$/i);
      };
      jamActions.isActionsPalette = function(e) {
        return e.type === "8BPF" && e.name.match(/^Actions Palette$/i) || e.name.match(/^Actions Palette.psp$/i);
      };

      function l(e, t) {
        var a = e.read(t);
        var r = 0;
        for (var n = 0; n < t; n++) {
          r = (r << 8) + a.charCodeAt(n);
        }
        return r;
      }

      function o(e, t) {
        return e.read(t);
      }

      function u(e) {
        var t = l(e, 4);
        return o(e, t);
      }

      function p(e) {
        var t = "";
        var a = l(e, 4);
        for (var r = 0; r < a; r++) {
          var n = l(e, 2);
          if (n !== 0) {
            t += String.fromCharCode(n);
          }
        }
        return t;
      }

      function f(e) {
        var t = 0;
        var a = o(e, 4);
        switch (a) {
          case "TEXT":
            t = app.stringIDToTypeID(u(e));
            break;
          case "long":
            t = app.charIDToTypeID(o(e, 4));
            break;
          default:
            throw new Error("[jamActions readEventId] Unrecognized event type: '" + a + "'");
            break;
        }
        return t;
      }

      function s(e) {
        e.seek(8, 1);
      }

      function c(e, t) {
        e.seek(t * 8, 1);
      }

      function y(e) {
        e.seek(1, 1);
      }

      function e(e) {
        e.seek(2, 1);
      }

      function g(e) {
        e.seek(4, 1);
      }

      function d(e) {
        e.seek(8, 1);
      }

      function m(e, t) {
        e.seek(t, 1);
      }

      function h(e) {
        var t = l(e, 4);
        m(e, t);
      }

      function v(e) {
        var t = l(e, 4);
        m(e, t * 2);
      }

      function b(e) {
        var t = l(e, 4);
        if (t) {
          m(e, t);
        } else {
          m(e, 4);
        }
      }

      function T(e) {
        v(e);
        b(e);
      }

      function S(e) {
        T(e);
        var t = l(e, 4);
        for (var a = 0; a < t; a++) {
          b(e);
          r(e);
        }
      }

      function I(e) {
        var t = l(e, 4);
        for (var a = 0; a < t; a++) {
          r(e);
        }
      }

      function r(e) {
        var t = o(e, 4);
        switch (t) {
          case "obj ":
            x(e);
            break;
          case "Objc":
          case "GlbO":
            S(e);
            break;
          case "type":
          case "GlbC":
            T(e);
            break;
          case "VlLs":
            I(e);
            break;
          case "doub":
            s(e);
            break;
          case "UntF":
            m(e, 4);
            s(e);
            break;
          case "TEXT":
            v(e);
            break;
          case "enum":
            b(e);
            b(e);
            break;
          case "long":
            g(e);
            break;
          case "comp":
            d(e);
            break;
          case "bool":
            y(e);
            break;
          case "alis":
            h(e);
            break;
          case "Pth ":
            h(e);
            break;
          case "tdta":
            h(e);
            break;
          case "ObAr":
            var a = l(e, 4);
            T(e);
            var r = l(e, 4);
            for (var n = 0; n < r; n++) {
              b(e);
              g(e);
              g(e);
              var i = l(e, 4);
              c(e, i);
            }
            break;
          default:
            throw new Error("[jamActions skipItem] Unrecognized item type: '" + t + "'");
            break;
        }
      }

      function x(e) {
        var t = l(e, 4);
        for (var a = 0; a < t; a++) {
          var r = o(e, 4);
          T(e);
          switch (r) {
            case "Clss":
              break;
            case "prop":
              b(e);
              break;
            case "Enmr":
              b(e);
              b(e);
              break;
            case "rele":
              g(e);
              break;
            case "Idnt":
              g(e);
              break;
            case "indx":
              g(e);
              break;
            case "name":
              v(e);
              break;
            default:
              throw new Error("[jamActions skipReference] Unrecognized item form: '" + r + "'");
              break;
          }
        }
      }
      jamActions.readActionDescriptor = function(e, t) {
        var a = "\0\0\0";
        var r = e.tell();
        if (!t) {
          if (e.read(4) === a) {
            a = "";
          } else {
            throw new Error("[jamActions.readActionDescriptor] Unrecognized version prefix");
          }
        }
        S(e);
        var n = e.tell();
        e.seek(r, 0);
        var i = a + e.read(n - r);
        var o = new ActionDescriptor();
        o.fromStream(i);
        return o;
      };
      jamActions.dataFromActionsFile = function(e, t) {
        var c = this;

        function a(e) {
          var t = {};
          t.name = localize(p(e));
          t.expanded = l(e, 1) !== 0;
          var a = l(e, 4);
          t.actions = [];
          for (var r = 0; r < a; r++) {
            var n = {};
            n.functionKey = l(e, 2);
            n.shiftKey = l(e, 1) !== 0;
            n.commandKey = l(e, 1) !== 0;
            n.colorIndex = l(e, 2);
            n.name = localize(p(e));
            n.expanded = l(e, 1) !== 0;
            var i = l(e, 4);
            n.commands = [];
            for (var o = 0; o < i; o++) {
              var s = {};
              s.expanded = l(e, 1) !== 0;
              s.enabled = l(e, 1) !== 0;
              s.withDialog = l(e, 1) !== 0;
              s.dialogOptions = l(e, 1);
              s.eventId = f(e);
              s.dictionaryName = u(e);
              if (l(e, 4) !== 0) {
                s.actionDescriptor = c.readActionDescriptor(e, true);
              }
              n.commands.push(s);
            }
            t.actions.push(n);
          }
          return t;
        }
        var r;
        if (typeof e === "string") {
          r = new File(e);
        } else if (e instanceof File) {
          r = e;
        } else {
          throw new Error("[jamActions.dataFromActionsFile] Invalid argument");
        }
        var n;
        if (r.open("r")) {
          try {
            r.encoding = "BINARY";
            var i = l(r, 4);
            if (i === 16) {
              n = {};
              n.version = i;
              if (t) {
                n.actionSets = [];
                var o = l(r, 4);
                for (var s = 0; s < o; s++) {
                  n.actionSets.push(a(r));
                }
              } else {
                n.actionSet = a(r);
              }
            } else {
              n = "Unsupported actions file version: " + i;
            }
          } catch (e) {
            n = e.message;
          } finally {
            r.close();
          }
        } else {
          n = "Cannot open file";
        }
        return n;
      };
      jamActions.isLocalPlayCommand = function(e, t) {
        var a = null;
        if (e.eventId === app.stringIDToTypeID("play")) {
          var r = app.stringIDToTypeID("target");
          if (e.actionDescriptor.hasKey(r)) {
            var n = e.actionDescriptor.getReference(r);
            do {
              try {
                var i = n.getDesiredClass();
              } catch (e) {
                break;
              }
              switch (i) {
                case app.stringIDToTypeID("command"):
                  var o = n.getIndex() - 1;
                  break;
                case app.stringIDToTypeID("action"):
                  var s = n.getName();
                  break;
                case app.stringIDToTypeID("actionSet"):
                  var c = n.getName();
                  break;
              }
              n = n.getContainer();
            } while (n);
          }
          var l = app.stringIDToTypeID("continue");
          if (e.actionDescriptor.hasKey(l)) {
            var u = e.actionDescriptor.getBoolean(l);
          }
          if (typeof c !== "undefined" && c === t) {
            a = [s, o, u];
          }
        }
        return a;
      };
      jamActions.determineDialogMode = function(e) {
        var t;
        switch (e.dialogOptions) {
          case 0:
            t = e.withDialog ? DialogModes.ALL : DialogModes.NO;
            break;
          case 2:
            t = DialogModes.NO;
            break;
          case 1:
          case 3:
            t = DialogModes.ALL;
            break;
        }
        return t;
      };
      var D = null;
      jamActions.setCommandHandler = function(e) {
        D = e;
      };
      jamActions.traverseAction = function(e, t, r, n) {
        function a(e) {
          var t = n ? e.length : r + 1;
          for (var a = r; a < t; a++) {
            if (D !== null) {
              D(e[a]);
            }
          }
        }
        if (typeof r === "undefined") {
          r = 0;
          n = true;
        }
        var i = e.actions;
        if (typeof t === "string") {
          var o = t;
          for (var s = 0; s < i.length; s++) {
            var c = i[s];
            if (c.name === o) {
              a(c.commands);
              break;
            }
          }
        } else if (typeof t === "number") {
          var s = t;
          if (s >= 0 && s < i.length) {
            a(i[s].commands);
          }
        }
      };
    })();
  }
  if (typeof jamEngine !== "object") {
    var jamEngine = {};
    (function() {
      var b;
      jamEngine.meaningfulIds = false;
      jamEngine.parseFriendly = false;
      jamEngine.displayDialogs = DialogModes.ERROR;
      var r = {
        "'Algn'": ["align", "alignment"],
        "'AntA'": ["antiAlias", "antiAliasedPICTAcquire"],
        "'BckL'": ["backgroundLayer", "backgroundLevel"],
        "'BlcG'": ["blackGenerationType", "blackGenerationCurve"],
        "'BlcL'": ["blackLevel", "blackLimit"],
        "'Blks'": ["blacks", "blocks"],
        "'BlrM'": ["blurMethod", "blurMore"],
        "'BrgC'": ["brightnessEvent", "brightnessContrast"],
        "'BrsD'": ["brushDetail", "brushesDefine"],
        "'Brsh'": ["brush", "brushes"],
        "'Clcl'": ["calculation", "calculations"],
        "'ClrP'": ["colorPalette", "coloredPencil"],
        "'Cnst'": ["constant", "constrain"],
        "'CntC'": ["centerCropMarks", "conteCrayon"],
        "'Cntr'": ["center", "contrast"],
        "'CrtD'": ["createDroplet", "createDuplicate"],
        "'CstP'": ["customPalette", "customPhosphors"],
        "'Cstm'": ["custom", "customPattern"],
        "'Drkn'": ["darken", "darkness"],
        "'Dstr'": ["distort", "distortion", "distribute", "distribution"],
        "'Dstt'": ["desaturate", "destWhiteMax"],
        "'FlIn'": ["fileInfo", "fillInverse"],
        "'Gd  '": ["good", "guide"],
        "'GnrP'": ["generalPreferences", "generalPrefs", "preferencesClass"],
        "'GrSt'": ["grainStippled", "graySetup"],
        "'Grdn'": ["gradientClassEvent", "gridMinor"],
        "'Grn '": ["grain", "green"],
        "'Grns'": ["graininess", "greens"],
        "'HstP'": ["historyPreferences", "historyPrefs"],
        "'HstS'": ["historyState", "historyStateSourceType"],
        "'ImgP'": ["imageCachePreferences", "imagePoint"],
        "'In  '": ["in", "stampIn"],
        "'IntW'": ["interfaceWhite", "intersectWith"],
        "'Intr'": ["interfaceIconFrameDimmed", "interlace", "interpolation", "intersect"],
        "'JPEG'": ["JPEG", "JPEGFormat"],
        "'LghD'": ["lightDirection", "lightDirectional"],
        "'LghO'": ["lightOmni", "lightenOnly"],
        "'LghS'": ["lightSource", "lightSpot"],
        "'Lns '": ["lens", "lines"],
        "'Mgnt'": ["magenta", "magentas"],
        "'MrgL'": ["mergeLayers", "mergedLayers"],
        "'Mxm '": ["maximum", "maximumQuality"],
        "'NTSC'": ["NTSC", "NTSCColors"],
        "'NmbL'": ["numberOfLayers", "numberOfLevels"],
        "'PlgP'": ["pluginPicker", "pluginPrefs"],
        "'Pncl'": ["pencilEraser", "pencilWidth"],
        "'Pnt '": ["paint", "point"],
        "'Prsp'": ["perspective", "perspectiveIndex"],
        "'PrvM'": ["previewMacThumbnail", "previewMagenta"],
        "'Pstr'": ["posterization", "posterize"],
        "'RGBS'": ["RGBSetup", "RGBSetupSource"],
        "'Rds '": ["radius", "reds"],
        "'ScrD'": ["scratchDisks", "screenDot"],
        "'ShdI'": ["shadingIntensity", "shadowIntensity"],
        "'ShpC'": ["shapeCurveType", "shapingCurve"],
        "'ShrE'": ["sharpenEdges", "shearEd"],
        "'Shrp'": ["sharpen", "sharpness"],
        "'SplC'": ["splitChannels", "supplementalCategories"],
        "'Spot'": ["spot", "spotColor"],
        "'SprS'": ["separationSetup", "sprayedStrokes"],
        "'StrL'": ["strokeLength", "strokeLocation"],
        "'Strt'": ["saturation", "start"],
        "'TEXT'": ["char", "textType"],
        "'TIFF'": ["TIFF", "TIFFFormat"],
        "'TglO'": ["toggleOptionsPalette", "toggleOthers"],
        "'TrnG'": ["transparencyGamutPreferences", "transparencyGrid", "transparencyGridSize"],
        "'TrnS'": ["transferSpec", "transparencyShape", "transparencyStop"],
        "'Trns'": ["transparency", "transparent"],
        "'TxtC'": ["textClickPoint", "textureCoverage"],
        "'TxtF'": ["textureFile", "textureFill"],
        "'UsrM'": ["userMaskEnabled", "userMaskOptions"],
        "'c@#^'": ["inherits", "pInherits"],
        "'comp'": ["comp", "sInt64"],
        "'doub'": ["floatType", "IEEE64BitFloatingPoint", "longFloat"],
        "'long'": ["integer", "longInteger", "sInt32"],
        "'magn'": ["magnitude", "uInt32"],
        "'null'": ["null", "target"],
        "'shor'": ["sInt16", "sMInt", "shortInteger"],
        "'sing'": ["IEEE32BitFloatingPoint", "sMFloat", "shortFloat"]
      };
      jamEngine.getConflictingStringIdStrs = function(e) {
        return r[e] || null;
      };
      jamEngine.uniIdStrToId = function(e) {
        var t = 0;
        if (typeof e === "string") {
          if (e.length === 1 + 4 + 1 && e.charAt(0) === "'" && e.charAt(5) === "'") {
            t = app.charIDToTypeID(e.substring(1, 5));
          } else {
            t = app.stringIDToTypeID(e);
          }
        }
        return t;
      };
      var l = app.charIDToTypeID("    ");
      jamEngine.idToUniIdStrs = function(e) {
        var t = "";
        var a = app.typeIDToStringID(e);
        if (e >= l) {
          t = "'" + app.typeIDToCharID(e) + "'";
          if (a !== "") {
            if (t in r) {
              a = r[t];
            }
          }
        }
        return [t, a];
      };
      jamEngine.equivalentUniIdStrs = function(e, t) {
        return this.uniIdStrToId(e) === this.uniIdStrToId(t);
      };

      function g(e, t) {
        if (t.constructor === Array) {
          var a = t.length;
          for (var r = 0; r < a; r++) {
            var n = b.parseCompact(t[r]);
            var i = b.uniIdStrToId(n[0]);
            var o = b.parseCompact(n[1]);
            var s = o[0];
            var c = o[1];
            switch (s) {
              case "<class>":
                e.putClass(i);
                break;
              case "<enumerated>":
                var l = b.parseCompact(c);
                e.putEnumerated(i, b.uniIdStrToId(l[0]), b.uniIdStrToId(l[1]));
                break;
              case "<identifier>":
                e.putIdentifier(i, c);
                break;
              case "<index>":
                e.putIndex(i, c);
                break;
              case "<name>":
                e.putName(i, c);
                break;
              case "<offset>":
                e.putOffset(i, c);
                break;
              case "<property>":
                e.putProperty(i, b.uniIdStrToId(c));
                break;
              default:
                throw new Error("[jamEngine putInReference] Unknown reference form: " + s);
                break;
            }
          }
        } else {
          throw new Error("[jamEngine putInReference] JavaScript array expected");
        }
      }

      function d(e, t) {
        if (t.constructor === Array) {
          var a = t.length;
          for (var r = 0; r < a; r++) {
            var n = b.parseCompact(t[r]);
            var i = n[0];
            var o = n[1];
            switch (i) {
              case "<boolean>":
                e.putBoolean(o);
                break;
              case "<class>":
                e.putClass(b.uniIdStrToId(o));
                break;
              case "<data>":
                e.putData(o);
                break;
              case "<double>":
                e.putDouble(o);
                break;
              case "<enumerated>":
                var s = b.parseCompact(o);
                e.putEnumerated(b.uniIdStrToId(s[0]), b.uniIdStrToId(s[1]));
                break;
              case "<integer>":
                e.putInteger(o);
                break;
              case "<largeInteger>":
                e.putLargeInteger(o);
                break;
              case "<list>":
                var c = new ActionList();
                d(c, o);
                e.putList(c);
                break;
              case "<object>":
                var l = b.parseCompact(o);
                if (l[1]) {
                  var u = new ActionDescriptor();
                  m(u, l[1]);
                  e.putObject(b.uniIdStrToId(l[0]), u);
                } else {
                  e.putClass(b.uniIdStrToId(l[0]));
                }
                break;
              case "<path>":
                var p = new File(o);
                e.putPath(p);
                break;
              case "<reference>":
                var f = new ActionReference();
                g(f, o);
                e.putReference(f);
                break;
              case "<string>":
                e.putString(o);
                break;
              case "<unitDouble>":
                var y = b.parseCompact(o);
                e.putUnitDouble(b.uniIdStrToId(y[0]), y[1]);
                break;
              default:
                throw new Error("[jamEngine putInList] Unknown list type: " + i);
                break;
            }
          }
        } else {
          throw new Error("[jamEngine putInList] JavaScript array expected");
        }
      }

      function m(e, t) {
        if (t.constructor === Object) {
          for (var a in t) {
            if (t.hasOwnProperty(a)) {
              var r = b.uniIdStrToId(a);
              var n = b.parseCompact(t[a]);
              var i = n[0];
              var o = n[1];
              switch (i) {
                case "<boolean>":
                  e.putBoolean(r, o);
                  break;
                case "<class>":
                  e.putClass(r, b.uniIdStrToId(o));
                  break;
                case "<data>":
                  e.putData(r, o);
                  break;
                case "<double>":
                  e.putDouble(r, o);
                  break;
                case "<enumerated>":
                  var s = b.parseCompact(o);
                  e.putEnumerated(r, b.uniIdStrToId(s[0]), b.uniIdStrToId(s[1]));
                  break;
                case "<integer>":
                  e.putInteger(r, o);
                  break;
                case "<largeInteger>":
                  e.putLargeInteger(r, o);
                  break;
                case "<list>":
                  var c = new ActionList();
                  d(c, o);
                  e.putList(r, c);
                  break;
                case "<object>":
                  var l = b.parseCompact(o);
                  if (l[1]) {
                    var u = new ActionDescriptor();
                    m(u, l[1]);
                    e.putObject(r, b.uniIdStrToId(l[0]), u);
                  } else {
                    e.putClass(r, b.uniIdStrToId(l[0]));
                  }
                  break;
                case "<path>":
                  var p = new File(o);
                  e.putPath(r, p);
                  break;
                case "<reference>":
                  var f = new ActionReference();
                  g(f, o);
                  e.putReference(r, f);
                  break;
                case "<string>":
                  e.putString(r, o);
                  break;
                case "<unitDouble>":
                  var y = b.parseCompact(o);
                  e.putUnitDouble(r, b.uniIdStrToId(y[0]), y[1]);
                  break;
                default:
                  throw new Error("[jamEngine putInDescriptor] Unknown descriptor type: " + i);
                  break;
              }
            }
          }
        } else {
          throw new Error("[jamEngine putInDescriptor] JavaScript object expected");
        }
      }
      var u = {
        "'Algn'": {
          "<classKey>": {
            "bevelEmboss": "align",
            "frameFX": "align",
            "gradientFill": "align",
            "gradientLayer": "align",
            "patternFill": "align",
            "patternLayer": "align"
          },
          "<event>": "align",
          "<key>": "alignment"
        },
        "'AntA'": {
          "<class>": "antiAliasedPICTAcquire",
          "<key>": "antiAlias"
        },
        "'BckL'": {
          "<class>": "backgroundLayer",
          "<key>": "backgroundLevel"
        },
        "'BlcG'": {
          "<enumType>": "blackGenerationType",
          "<key>": "blackGenerationCurve"
        },
        "'BlcL'": {
          "<classKey>": {
            "'GEfc'": "blackLevel",
            "CMYKSetup": "blackLimit"
          },
          "<eventKey>": {
            "reticulation": "blackLevel"
          }
        },
        "'Blks'": {
          "<typeValue>": {
            "colors": "blacks",
            "extrudeType": "blocks"
          }
        },
        "'BlrM'": {
          "<enumType>": "blurMethod",
          "<event>": "blurMore",
          "<key>": "blurMethod"
        },
        "'BrgC'": {
          "<class>": "brightnessContrast",
          "<event>": "brightnessContrast"
        },
        "'BrsD'": {
          "<enumValue>": "brushesDefine",
          "<key>": "brushDetail"
        },
        "'Brsh'": {
          "<class>": "brush",
          "<classKey>": {
            "brushPreset": "brush",
            "currentToolOptions": "brush",
            "displayPrefs": "brush"
          },
          "<key>": "brushes"
        },
        "'Clcl'": {
          "<class>": "calculation",
          "<enumValue>": "calculations",
          "<key>": "calculation"
        },
        "'ClrP'": {
          "<typeValue>": {
            "'GEft'": "coloredPencil"
          },
          "<enumType>": "colorPalette",
          "<event>": "coloredPencil"
        },
        "'Cnst'": {
          "<classKey>": {
            "channelMatrix": "constant"
          },
          "<unknown>": "constrain"
        },
        "'CntC'": {
          "<typeValue>": {
            "'GEft'": "conteCrayon"
          },
          "<event>": "conteCrayon",
          "<key>": "centerCropMarks"
        },
        "'Cntr'": {
          "<classKey>": {
            "'GEfc'": "contrast",
            "brightnessContrast": "contrast",
            "document": "center",
            "polygon": "center",
            "quadrilateral": "center"
          },
          "<eventKey>": {
            "adaptCorrect": "contrast",
            "brightnessEvent": "contrast",
            "grain": "contrast",
            "halftoneScreen": "contrast",
            "sumie": "contrast",
            "tornEdges": "contrast",
            "waterPaper": "contrast"
          },
          "<enumValue>": "center"
        },
        "'CrtD'": {
          "<enumValue>": "createDuplicate",
          "<event>": "createDroplet"
        },
        "'CstP'": {
          "<class>": "customPhosphors",
          "<key>": "customPalette"
        },
        "'Cstm'": {
          "<enumValue>": "customPattern",
          "<event>": "custom",
          "<key>": "custom"
        },
        "'Drkn'": {
          "<enumValue>": "darken",
          "<key>": "darkness"
        },
        "'Dstr'": {
          "<classKey>": {
            "'GEfc'": "distortion"
          },
          "<eventKey>": {
            "glass": "distortion",
            "addNoise": "distribution"
          },
          "<enumType>": "distribution",
          "<enumValue>": "distort",
          "<event>": "distribute"
        },
        "'Dstt'": {
          "<enumValue>": "desaturate",
          "<event>": "desaturate",
          "<key>": "destWhiteMax"
        },
        "'FlIn'": {
          "<typeValue>": {
            "fillColor": "fillInverse",
            "menuItemType": "fileInfo"
          },
          "<class>": "fileInfo",
          "<key>": "fileInfo"
        },
        "'Gd  '": {
          "<class>": "guide",
          "<enumValue>": "good"
        },
        "'GnrP'": {
          "<class>": "preferencesClass",
          "<enumValue>": "generalPreferences",
          "<key>": "generalPrefs"
        },
        "'GrSt'": {
          "<class>": "graySetup",
          "<enumValue>": "grainStippled",
          "<key>": "graySetup"
        },
        "'Grdn'": {
          "<class>": "gradientClassEvent",
          "<event>": "gradientClassEvent",
          "<key>": "gridMinor"
        },
        "'Grn '": {
          "<typeValue>": {
            "'GEft'": "grain"
          },
          "<classKey>": {
            "'GEfc'": "grain",
            "RGBColor": "green",
            "blackAndWhite": "green",
            "channelMatrix": "green",
            "channelMixer": "green"
          },
          "<eventKey>": {
            "blackAndWhite": "green",
            "channelMixer": "green",
            "filmGrain": "grain"
          },
          "<enumValue>": "green",
          "<event>": "grain"
        },
        "'Grns'": {
          "<enumValue>": "greens",
          "<key>": "graininess"
        },
        "'HstP'": {
          "<enumValue>": "historyPreferences",
          "<key>": "historyPrefs"
        },
        "'HstS'": {
          "<class>": "historyState",
          "<enumType>": "historyStateSourceType"
        },
        "'ImgP'": {
          "<class>": "imagePoint",
          "<enumValue>": "imageCachePreferences"
        },
        "'In  '": {
          "<enumValue>": "stampIn",
          "<key>": "in"
        },
        "'IntW'": {
          "<event>": "intersectWith",
          "<key>": "interfaceWhite"
        },
        "'Intr'": {
          "<typeValue>": {
            "shapeOperation": "intersect"
          },
          "<classKey>": {
            "GIFFormat": "interlace",
            "SaveForWeb": "interlace",
            "application": "interfaceIconFrameDimmed",
            "computedBrush": "interpolation",
            "dBrush": "interpolation",
            "gradientClassEvent": "interpolation",
            "photoshopEPSFormat": "interpolation",
            "sampledBrush": "interpolation"
          },
          "<eventKey>": {
            "convertMode": "interpolation",
            "imageSize": "interpolation",
            "transform": "interpolation"
          },
          "<event>": "intersect"
        },
        "'JPEG'": {
          "<class>": "JPEGFormat",
          "<enumValue>": "JPEG"
        },
        "'LghD'": {
          "<enumType>": "lightDirection",
          "<enumValue>": "lightDirectional",
          "<key>": "lightDirection"
        },
        "'LghO'": {
          "<typeValue>": {
            "diffuseMode": "lightenOnly",
            "lightType": "lightOmni"
          }
        },
        "'LghS'": {
          "<class>": "lightSource",
          "<enumValue>": "lightSpot",
          "<key>": "lightSource"
        },
        "'Lns '": {
          "<enumType>": "lens",
          "<enumValue>": "lines",
          "<key>": "lens"
        },
        "'Mgnt'": {
          "<typeValue>": {
            "channel": "magenta",
            "colors": "magentas",
            "guideGridColor": "magenta"
          },
          "<key>": "magenta"
        },
        "'MrgL'": {
          "<enumValue>": "mergedLayers",
          "<event>": "mergeLayers"
        },
        "'Mxm '": {
          "<enumValue>": "maximumQuality",
          "<event>": "maximum",
          "<key>": "maximum"
        },
        "'NTSC'": {
          "<enumValue>": "NTSC",
          "<event>": "NTSCColors"
        },
        "'NmbL'": {
          "<classKey>": {
            "'GEfc'": "numberOfLevels",
            "document": "numberOfLayers"
          },
          "<eventKey>": {
            "cutout": "numberOfLevels"
          }
        },
        "'PlgP'": {
          "<class>": "pluginPrefs",
          "<enumValue>": "pluginPicker",
          "<key>": "pluginPrefs"
        },
        "'Pncl'": {
          "<enumValue>": "pencilEraser",
          "<key>": "pencilWidth"
        },
        "'Pnt '": {
          "<typeValue>": {
            "textType": "point"
          },
          "<class>": "point",
          "<event>": "paint"
        },
        "'Prsp'": {
          "<enumValue>": "perspective",
          "<key>": "perspectiveIndex"
        },
        "'PrvM'": {
          "<enumValue>": "previewMagenta",
          "<key>": "previewMacThumbnail"
        },
        "'Pstr'": {
          "<class>": "posterize",
          "<event>": "posterize",
          "<key>": "posterization"
        },
        "'RGBS'": {
          "<enumType>": "RGBSetupSource",
          "<key>": "RGBSetup"
        },
        "'Rds '": {
          "<enumValue>": "reds",
          "<key>": "radius"
        },
        "'ScrD'": {
          "<enumValue>": "screenDot",
          "<key>": "scratchDisks"
        },
        "'ShdI'": {
          "<classKey>": {
            "'GEfc'": "shadowIntensity"
          },
          "<eventKey>": {
            "watercolor": "shadowIntensity"
          },
          "<unknown>": "shadingIntensity"
        },
        "'ShpC'": {
          "<classKey>": {
            "application": "shapingCurve"
          },
          "<class>": "shapingCurve",
          "<key>": "shapeCurveType"
        },
        "'ShrE'": {
          "<event>": "sharpenEdges",
          "<key>": "shearEd"
        },
        "'Shrp'": {
          "<event>": "sharpen",
          "<key>": "sharpness"
        },
        "'SplC'": {
          "<event>": "splitChannels",
          "<key>": "supplementalCategories"
        },
        "'Spot'": {
          "<enumValue>": "spotColor",
          "<key>": "spot"
        },
        "'SprS'": {
          "<typeValue>": {
            "'GEft'": "sprayedStrokes"
          },
          "<enumValue>": "separationSetup",
          "<event>": "sprayedStrokes"
        },
        "'StrL'": {
          "<enumType>": "strokeLocation",
          "<key>": "strokeLength"
        },
        "'Strt'": {
          "<classKey>": {
            "currentToolOptions": "saturation",
            "fileNamingRules": "start",
            "HSBColorClass": "saturation",
            "hueSatAdjustment": "saturation",
            "hueSatAdjustmentV2": "saturation",
            "lineClass": "start",
            "range": "start",
            "vibrance": "saturation"
          },
          "<eventKey>": {
            "replaceColor": "saturation",
            "variations": "saturation",
            "vibrance": "saturation"
          },
          "<enumValue>": "saturation"
        },
        "'TEXT'": {
          "<enumType>": "textType",
          "<key>": "textType"
        },
        "'TIFF'": {
          "<class>": "TIFFFormat",
          "<enumValue>": "TIFF"
        },
        "'TglO'": {
          "<enumValue>": "toggleOptionsPalette",
          "<key>": "toggleOthers"
        },
        "'TrnG'": {
          "<classKey>": {
            "application": "transparencyGrid",
            "transparencyPrefs": "transparencyGridSize"
          },
          "<enumType>": "transparencyGridSize",
          "<enumValue>": "transparencyGamutPreferences"
        },
        "'TrnS'": {
          "<classKey>": {
            "bevelEmboss": "transparencyShape",
            "dropShadow": "transparencyShape",
            "innerGlow": "transparencyShape",
            "innerShadow": "transparencyShape",
            "outerGlow": "transparencyShape"
          },
          "<class>": "transparencyStop",
          "<unknown>": "transferSpec"
        },
        "'Trns'": {
          "<enumValue>": "transparent",
          "<key>": "transparency"
        },
        "'TxtC'": {
          "<classKey>": {
            "'GEfc'": "textureCoverage",
            "textLayer": "textClickPoint"
          },
          "<eventKey>": {
            "underpainting": "textureCoverage"
          }
        },
        "'TxtF'": {
          "<event>": "textureFill",
          "<key>": "textureFile"
        },
        "'UsrM'": {
          "<enumType>": "userMaskOptions",
          "<key>": "userMaskEnabled"
        },
        "'null'": {
          "<class>": "null",
          "<enumValue>": "null",
          "<event>": "null",
          "<key>": "target"
        }
      };

      function T(e, r) {
        var t;
        var a = e[0];
        var n = e[1];
        if (n < l) {
          t = app.typeIDToStringID(n);
        } else {
          t = "'" + app.typeIDToCharID(n) + "'";
          if (b.meaningfulIds) {
            if (t in u) {
              function i(e) {
                var t = "";
                for (var a in e) {
                  if (e.hasOwnProperty(a)) {
                    if (r[1] === b.uniIdStrToId(a)) {
                      t = e[a];
                      break;
                    }
                  }
                }
                return t;
              }
              var o = "";
              var s = u[t];
              if (r) {
                switch (a) {
                  case "<key>":
                    if (r[0] === "<class>" && "<classKey>" in s) {
                      o = i(s["<classKey>"]);
                    } else if (r[0] === "<event>" && "<eventKey>" in s) {
                      o = i(s["<eventKey>"]);
                    }
                    break;
                  case "<enumValue>":
                    if (r[0] === "<enumType>" && "<typeValue>" in s) {
                      o = i(s["<typeValue>"]);
                    }
                    break;
                }
              }
              if (o !== "") {
                t = o;
              } else if (a in s) {
                t = s[a];
              }
            } else {
              var c = app.typeIDToStringID(n);
              if (c !== "") {
                t = c;
              }
            }
          }
        }
        return t;
      }
      var v = "";
      var s = app.stringIDToTypeID("get");
      var c = app.stringIDToTypeID("target");
      var p = app.stringIDToTypeID("property");

      function S(e) {
        var t = 0;
        var a = [];
        do {
          try {
            var r = e.getDesiredClass();
          } catch (e) {
            break;
          }
          if (t !== 0) {
            var n = b.buildCompact("<property>", T(["<key>", t], ["<class>", r]));
            a.push(b.buildCompact(T(["<class>", p]), n));
            t = 0;
          }
          var i;
          var o = e.getForm();
          switch (o) {
            case ReferenceFormType.CLASSTYPE:
              i = b.buildCompact("<class>", null);
              break;
            case ReferenceFormType.ENUMERATED:
              var s = ["<enumType>", e.getEnumeratedType()];
              var c = ["<enumValue>", e.getEnumeratedValue()];
              i = b.buildCompact("<enumerated>", b.buildCompact(T(s), T(c, s)));
              break;
            case ReferenceFormType.IDENTIFIER:
              i = b.buildCompact("<identifier>", e.getIdentifier());
              break;
            case ReferenceFormType.INDEX:
              i = b.buildCompact("<index>", e.getIndex());
              break;
            case ReferenceFormType.NAME:
              i = b.buildCompact("<name>", e.getName());
              break;
            case ReferenceFormType.OFFSET:
              i = b.buildCompact("<offset>", e.getOffset());
              break;
            case ReferenceFormType.PROPERTY:
              if (r === p) {
                t = e.getProperty();
              } else {
                i = b.buildCompact("<property>", T(["<key>", e.getProperty()], ["<class>", r]));
              }
              break;
            default:
              throw new Error("[jamEngine getFromReference] Unknown reference form type: " + o);
              break;
          }
          if (r !== p) {
            a.push(b.buildCompact(T(["<class>", r]), i));
          }
          e = e.getContainer();
        } while (e);
        return a;
      }

      function I(e) {
        var t = [];
        var a = e.count;
        for (var r = 0; r < a; r++) {
          var n;
          var i;
          try {
            i = e.getType(r);
          } catch (e) {
            continue;
          }
          switch (i) {
            case DescValueType.BOOLEANTYPE:
              n = b.buildCompact("<boolean>", e.getBoolean(r));
              break;
            case DescValueType.CLASSTYPE:
              n = b.buildCompact("<class>", T(["<class>", e.getClass(r)]));
              break;
            case DescValueType.DOUBLETYPE:
              n = b.buildCompact("<double>", e.getDouble(r));
              break;
            case DescValueType.ENUMERATEDTYPE:
              var o = ["<enumType>", e.getEnumerationType(r)];
              var s = ["<enumValue>", e.getEnumerationValue(r)];
              n = b.buildCompact("<enumerated>", b.buildCompact(T(o), T(s, o)));
              break;
            case DescValueType.INTEGERTYPE:
              n = b.buildCompact("<integer>", e.getInteger(r));
              break;
            case DescValueType.LISTTYPE:
              n = b.buildCompact("<list>", I(e.getList(r)));
              break;
            case DescValueType.OBJECTTYPE:
              var c = ["<class>", e.getObjectType(r)];
              var l = e.getObjectValue(r);
              n = b.buildCompact("<object>", b.buildCompact(T(c), x(l, c)));
              break;
            case DescValueType.ALIASTYPE:
              try {
                var u = e.getPath(r);
                n = b.buildCompact("<path>", u.fsName);
              } catch (e) {
                n = b.buildCompact("<path>", v);
              }
              break;
            case DescValueType.REFERENCETYPE:
              n = b.buildCompact("<reference>", S(e.getReference(r)));
              break;
            case DescValueType.STRINGTYPE:
              n = b.buildCompact("<string>", e.getString(r));
              break;
            case DescValueType.UNITDOUBLE:
              var p = ["<unit>", e.getUnitDoubleType(r)];
              var f = e.getUnitDoubleValue(r);
              n = b.buildCompact("<unitDouble>", b.buildCompact(T(p), f));
              break;
            default:
              var y;
              var g;
              try {
                y = i === DescValueType.RAWTYPE;
              } catch (e) {}
              try {
                g = i === DescValueType.LARGEINTEGERTYPE;
              } catch (e) {}
              if (y) {
                n = b.buildCompact("<data>", e.getData(r));
              } else if (g) {
                n = b.buildCompact("<largeInteger>", e.getLargeInteger(r));
              } else {
                throw new Error("[jamEngine getFromList] Unknown descriptor value type: " + i);
              }
              break;
          }
          t[r] = n;
        }
        return t;
      }

      function x(e, t) {
        if (e) {
          var a = {};
          var r;
          try {
            r = e.count;
          } catch (e) {
            return null;
          }
          for (var n = 0; n < r; n++) {
            var i = e.getKey(n);
            var o = T(["<key>", i], t);
            var s;
            var c;
            try {
              c = e.getType(i);
            } catch (e) {
              continue;
            }
            switch (c) {
              case DescValueType.BOOLEANTYPE:
                s = b.buildCompact("<boolean>", e.getBoolean(i));
                break;
              case DescValueType.CLASSTYPE:
                s = b.buildCompact("<class>", T(["<class>", e.getClass(i)]));
                break;
              case DescValueType.DOUBLETYPE:
                s = b.buildCompact("<double>", e.getDouble(i));
                break;
              case DescValueType.ENUMERATEDTYPE:
                var l = ["<enumType>", e.getEnumerationType(i)];
                var u = ["<enumValue>", e.getEnumerationValue(i)];
                s = b.buildCompact("<enumerated>", b.buildCompact(T(l), T(u, l)));
                break;
              case DescValueType.INTEGERTYPE:
                s = b.buildCompact("<integer>", e.getInteger(i));
                break;
              case DescValueType.LISTTYPE:
                s = b.buildCompact("<list>", I(e.getList(i)));
                break;
              case DescValueType.OBJECTTYPE:
                var p = ["<class>", e.getObjectType(i)];
                var f = e.getObjectValue(i);
                s = b.buildCompact("<object>", b.buildCompact(T(p), x(f, p)));
                break;
              case DescValueType.ALIASTYPE:
                try {
                  var y = e.getPath(i);
                  s = b.buildCompact("<path>", y.fsName);
                } catch (e) {
                  s = b.buildCompact("<path>", v);
                }
                break;
              case DescValueType.REFERENCETYPE:
                s = b.buildCompact("<reference>", S(e.getReference(i)));
                break;
              case DescValueType.STRINGTYPE:
                s = b.buildCompact("<string>", e.getString(i));
                break;
              case DescValueType.UNITDOUBLE:
                var g = ["<unit>", e.getUnitDoubleType(i)];
                var d = e.getUnitDoubleValue(i);
                s = b.buildCompact("<unitDouble>", b.buildCompact(T(g), d));
                break;
              default:
                var m;
                var h;
                try {
                  m = c === DescValueType.RAWTYPE;
                } catch (e) {}
                try {
                  h = c === DescValueType.LARGEINTEGERTYPE;
                } catch (e) {}
                if (m) {
                  s = b.buildCompact("<data>", e.getData(i));
                } else if (h) {
                  s = b.buildCompact("<largeInteger>", e.getLargeInteger(i));
                } else {
                  throw new Error("[jamEngine getFromDescriptor] Unknown descriptor value type: " + c);
                }
                break;
            }
            a[o] = s;
          }
          return a;
        } else {
          return null;
        }
      }
      jamEngine.jsonToActionDescriptor = function(e) {
        b = this;
        var t;
        if (e) {
          t = new ActionDescriptor();
          m(t, e);
        }
        return t;
      };
      jamEngine.jsonToActionReference = function(e) {
        b = this;
        var t;
        if (e) {
          t = new ActionReference();
          g(t, e);
        }
        return t;
      };
      jamEngine.eventIdAndActionDescriptorToJson = function(e, t) {
        b = this;
        var a = ["<event>", e];
        return {
          "<event>": T(a),
          "<descriptor>": x(t, a)
        };
      };
      jamEngine.classIdAndActionDescriptorToJson = function(e, t) {
        b = this;
        var a = ["<class>", e];
        return {
          "<class>": T(a),
          "<descriptor>": x(t, a)
        };
      };
      jamEngine.actionReferenceToJson = function(e) {
        b = this;
        return S(e);
      };

      function f(e) {
        classId = 0;
        do {
          try {
            var t = e.getDesiredClass();
          } catch (e) {
            break;
          }
          if (t !== p) {
            classId = t;
            break;
          }
          e = e.getContainer();
        } while (e);
        return classId;
      }
      jamEngine.jsonPlay = function(e, t, a) {
        var r = this.uniIdStrToId(e);
        var n = this.jsonToActionDescriptor(t);
        var i;
        if (r === s) {
          var o = n.getReference(c);
          i = ["<class>", f(o)];
        } else {
          i = ["<event>", r];
        }
        return x(app.executeAction(r, n, a || this.displayDialogs), i);
      };
      jamEngine.jsonGet = function(e) {
        var t = this.jsonToActionReference(e);
        return x(app.executeActionGet(t), ["<class>", f(t)]);
      };
      jamEngine.normalizeJsonItem = function(e, t) {
        function v(e) {
          var t = b.parseCompact(e);
          var a = t[0];
          var r = t[1];
          var n;
          switch (a) {
            case "<boolean>":
            case "<data>":
            case "<double>":
            case "<identifier>":
            case "<index>":
            case "<integer>":
            case "<largeInteger>":
            case "<name>":
            case "<offset>":
            case "<path>":
            case "<string>":
              n = r;
              break;
            case "<class>":
              n = r && T(["<class>", b.uniIdStrToId(r)]);
              break;
            case "<enumerated>":
              var i = b.parseCompact(r);
              var o = ["<enumType>", b.uniIdStrToId(i[0])];
              var s = ["<enumValue>", b.uniIdStrToId(i[1])];
              n = b.buildCompact(T(o), T(s, o));
              break;
            case "<list>":
              n = [];
              for (var c = 0; c < r.length; c++) {
                n.push(v(r[c]));
              }
              break;
            case "<object>":
              var l = b.parseCompact(r);
              var u = ["<class>", b.uniIdStrToId(l[0])];
              var p = l[1];
              var f;
              if (p === null) {
                f = null;
              } else {
                f = {};
                for (var y in p) {
                  if (p.hasOwnProperty(y)) {
                    var g = ["<key>", b.uniIdStrToId(y)];
                    f[T(g, u)] = v(p[y]);
                  }
                }
              }
              n = b.buildCompact(T(u), f);
              break;
            case "<property>":
              n = T(["<key>", b.uniIdStrToId(r)]);
              break;
            case "<reference>":
              n = [];
              for (var c = 0; c < r.length; c++) {
                var d = b.parseCompact(r[c]);
                n.push(b.buildCompact(T(["<class>", b.uniIdStrToId(d[0])]), v(d[1])));
              }
              break;
            case "<unitDouble>":
              var m = b.parseCompact(r);
              var h = ["<unit>", b.uniIdStrToId(m[0])];
              n = b.buildCompact(T(h), m[1]);
              break;
            default:
              throw new Error("[jamEngine.normalizeJsonItem] Unknown item type: " + a);
              break;
          }
          return b.buildCompact(a, n);
        }
        b = this;
        var a = this.meaningfulIds;
        var r = this.parseFriendly;
        if (t && t.constructor === Object) {
          if (typeof t.meaningfulIds !== "undefined") {
            this.meaningfulIds = t.meaningfulIds;
          }
          if (typeof t.parseFriendly !== "undefined") {
            this.parseFriendly = t.parseFriendly;
          }
        }
        var n = v(e);
        this.meaningfulIds = a;
        this.parseFriendly = r;
        return n;
      };

      function i(e) {
        var t = [];
        for (var a = 0; a < e.length; a++) {
          var r = e[a];
          var n = {};
          var i = r[0];
          var o = r[1][0];
          var s = r[1][1];
          switch (o) {
            case "<class>":
            case "<identifier>":
            case "<index>":
            case "<name>":
            case "<offset>":
            case "<property":
              n[i] = s;
              break;
            case "<enumerated>":
              n[i] = s[1];
              break;
            default:
              throw new Error("[jamEngine simplifyRef] Unexpected element form: " + o);
              break;
          }
          t.push(n);
        }
        return t;
      }

      function o(e, t) {
        var a;
        var r = e[0];
        var n = e[1];
        switch (r) {
          case "<boolean>":
          case "<class>":
          case "<data>":
          case "<double>":
          case "<integer>":
          case "<largeInteger>":
          case "<path>":
          case "<string>":
            a = n;
            break;
          case "<list>":
            a = y(n, t);
            break;
          case "<enumerated>":
          case "<unitDouble>":
            a = n[1];
            break;
          case "<object>":
            a = h(n[1], t);
            break;
          case "<reference>":
            a = i(n);
            break;
          default:
            throw new Error("[jamEngine simplifyItem] Unexpected item type: " + r);
            break;
        }
        return a;
      }

      function y(e, t) {
        var a = [];
        for (var r = 0; r < e.length; r++) {
          a.push(o(e[r], t));
        }
        return a;
      }

      function h(e, a) {
        var t = function(e, t) {
          return o(e[t], a);
        };
        var r = {};
        for (var n in e) {
          if (e.hasOwnProperty(n)) {
            var i = undefined;
            if (typeof a === "function") {
              i = a(e, n, t);
            }
            if (typeof i === "undefined") {
              i = o(e[n], a);
            }
            r[n] = i;
          }
        }
        return r;
      }
      jamEngine.simplifyObject = function(e, t) {
        return h(this.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        })[1][1], t);
      };
      jamEngine.simplifyList = function(e, t) {
        return y(this.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        })[1], t);
      };
      jamEngine.parseCompact = function(e) {
        var t = [];
        if (e.constructor === Object) {
          var a = [];
          for (var r in e) {
            if (e.hasOwnProperty(r)) {
              a.push(r);
            }
          }
          if (a.length === 1) {
            t[0] = a[0];
            t[1] = e[a[0]];
          } else {
            throw new Error("[jamEngine.parseCompact] Syntax error: " + e.toSource());
          }
        } else if (e.constructor === Array) {
          if (e.length === 2) {
            t[0] = e[0];
            t[1] = e[1];
          } else {
            throw new Error("[jamEngine.parseCompact] Syntax error: " + e.toSource());
          }
        } else {
          throw new Error("[jamEngine.parseCompact] JavaScript object or array expected");
        }
        return t;
      };
      jamEngine.compactToExplicit = function(e, t, a) {
        var r = {};
        var n = this.parseCompact(e);
        r[t || "<type>"] = n[0];
        r[a || "<value>"] = n[1];
        return r;
      };
      jamEngine.buildCompact = function(e, t) {
        var a;
        if (typeof e === "string") {
          if (this.parseFriendly) {
            a = [e, t];
          } else {
            a = {};
            a[e] = t;
          }
        } else {
          throw new Error("[jamEngine.buildCompact] String expected");
        }
        return a;
      };
      jamEngine.explicitToCompact = function(e, t, a) {
        var r;
        if (e.constructor === Object) {
          r = this.buildCompact(e[t || "<type>"], e[a || "<value>"]);
        } else {
          throw new Error("[jamEngine.explicitToCompact] JavaScript object expected");
        }
        return r;
      };
      for (var e in r) {
        if (r.hasOwnProperty(e)) {
          var t = r[e];
          for (var a = t.length - 1; a >= 0; a--) {
            var n = t[a];
            if (!(app.charIDToTypeID(e.substring(1, 5)) === app.stringIDToTypeID(n))) {
              t.splice(a, 1);
            }
          }
          if (t.length < 2) {
            delete r[e];
          }
        }
      }
      for (var e in u) {
        if (u.hasOwnProperty(e)) {
          if (e in r) {
            var D = u[e];
            for (var k in D) {
              if (D.hasOwnProperty(k)) {
                switch (k) {
                  case "<class>":
                  case "<event>":
                  case "<enumType>":
                  case "<enumValue>":
                  case "<key>":
                  case "<unknown>":
                    if (app.charIDToTypeID(e.substring(1, 5)) != app.stringIDToTypeID(D[k])) {
                      throw new Error("[jamEngine] " + '"' + e + '" and "' + D[k] + '" are not equivalent ID strings');
                    }
                    break;
                  case "<classKey>":
                  case "<eventKey>":
                  case "<typeValue>":
                    for (var j in D[k]) {
                      if (D[k].hasOwnProperty(j)) {
                        if (app.charIDToTypeID(e.substring(1, 5)) != app.stringIDToTypeID(D[k][j])) {
                          throw new Error("[jamEngine] " + '"' + e + '" and "' + D[k][j] + '" are not equivalent ID strings');
                        }
                      }
                    }
                    break;
                }
              }
            }
          } else {
            delete u[e];
          }
        }
      }
    })();
  }
  if (typeof jamHelpers !== "object") {
    var jamHelpers = {};
    (function() {
      jamHelpers.toColorObject = function(e) {
        var t;
        if (e.constructor === Object) {
          function o(e) {
            var t = {};
            for (var a in e) {
              if (e.hasOwnProperty(a)) {
                var r = e[a];
                var n = null;
                switch (a) {
                  case "book":
                  case "name":
                    n = ["<string>", localize(r)];
                    break;
                  case "bookKey":
                    n = ["<data>", r];
                    break;
                  case "bookID":
                    n = ["<integer>", r];
                    break;
                  case "a":
                  case "b":
                  case "black":
                  case "blue":
                  case "brightness":
                  case "cyan":
                  case "gray":
                  case "green":
                  case "luminance":
                  case "magenta":
                  case "red":
                  case "saturation":
                  case "yellowColor":
                    n = ["<double>", r];
                    break;
                  case "hue":
                    n = ["<unitDouble>", ["angleUnit", r]];
                    break;
                  case "color":
                    var i;
                    if ("book" in r && "name" in r || "bookID" in r && "bookKey" in r) {
                      i = "bookColor";
                    } else if ("cyan" in r && "magenta" in r && "yellowColor" in r && "black" in r) {
                      i = "CMYKColorClass";
                    } else if ("gray" in r) {
                      i = "grayscale";
                    } else if ("hue" in r && "saturation" in r && "brightness" in r) {
                      i = "HSBColorClass";
                    } else if ("luminance" in r && "a" in r && "b" in r) {
                      i = "labColor";
                    } else if ("red" in r && "green" in r && "blue" in r) {
                      i = "RGBColor";
                    }
                    n = ["<object>", [i, o(r)]];
                    break;
                }
                if (n) {
                  t[a] = n;
                }
              }
            }
            return t;
          }
          t = o({
            "color": e
          })["color"];
        } else if (e.constructor === Array) {
          var a = e[0];
          switch (jamEngine.uniIdStrToId(a)) {
            case jamEngine.uniIdStrToId("bookColor"):
              switch (e[1].length) {
                case 2:
                  if (typeof e[1][0] === "string") {
                    t = ["<object>", ["bookColor", {
                      "book": ["<string>", e[1][0]],
                      "name": ["<string>", e[1][1]]
                    }]];
                  } else if (typeof e[1][0] === "number") {
                    t = ["<object>", ["bookColor", {
                      "bookID": ["<integer>", e[1][0]],
                      "bookKey": ["<data>", e[1][1]]
                    }]];
                  }
                  break;
                case 4:
                  t = ["<object>", ["bookColor", {
                    "book": ["<string>", e[1][0]],
                    "name": ["<string>", e[1][1]],
                    "bookID": ["<integer>", e[1][2]],
                    "bookKey": ["<data>", e[1][3]]
                  }]];
                  break;
              }
              break;
            case jamEngine.uniIdStrToId("CMYKColorClass"):
              t = ["<object>", ["CMYKColorClass", {
                "cyan": ["<double>", e[1][0]],
                "magenta": ["<double>", e[1][1]],
                "yellowColor": ["<double>", e[1][2]],
                "black": ["<double>", e[1][3]]
              }]];
              break;
            case jamEngine.uniIdStrToId("grayscale"):
              t = ["<object>", ["grayscale", {
                "gray": ["<double>", e[1].constructor === Array ? e[1][0] : e[1]]
              }]];
              break;
            case jamEngine.uniIdStrToId("HSBColorClass"):
              t = ["<object>", ["HSBColorClass", {
                "hue": ["<unitDouble>", ["angleUnit", e[1][0]]],
                "saturation": ["<double>", e[1][1]],
                "brightness": ["<double>", e[1][2]]
              }]];
              break;
            case jamEngine.uniIdStrToId("labColor"):
              t = ["<object>", ["labColor", {
                "luminance": ["<double>", e[1][0]],
                "a": ["<double>", e[1][1]],
                "b": ["<double>", e[1][2]]
              }]];
              break;
            case jamEngine.uniIdStrToId("RGBColor"):
              t = ["<object>", ["RGBColor", {
                "red": ["<double>", e[1][0]],
                "green": ["<double>", e[1][1]],
                "blue": ["<double>", e[1][2]]
              }]];
              break;
            default:
              throw new Error("[jamHelpers.toColorObject] Unrecognized color class: " + a);
              break;
          }
        }
        return t;
      };
      jamHelpers.fromColorObject = function(e, t) {
        var a;
        if (t) {
          a = jamEngine.simplifyObject(e);
        } else {
          var r = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          var n = r[1][0];
          var i = r[1][1];
          switch (n) {
            case "bookColor":
              var o = i["book"][1];
              var s = i["name"][1];
              if ("bookID" in i && "bookKey" in i) {
                var c = i["bookID"][1];
                var l = i["bookKey"][1];
                a = [n, [o, s, c, l]];
              } else {
                a = [n, [o, s]];
              }
              break;
            case "CMYKColorClass":
              var u = i["cyan"][1];
              var p = i["magenta"][1];
              var f = i["yellowColor"][1];
              var y = i["black"][1];
              a = [n, [u, p, f, y]];
              break;
            case "grayscale":
              var g = i["gray"][1];
              a = [n, [g]];
              break;
            case "HSBColorClass":
              var d = i["hue"][1][1];
              var m = i["saturation"][1];
              var h = i["brightness"][1];
              a = [n, [d, m, h]];
              break;
            case "labColor":
              var v = i["luminance"][1];
              var b = i["a"][1];
              var T = i["b"][1];
              a = [n, [v, b, T]];
              break;
            case "RGBColor":
              var S = i["red"][1];
              var I = i["green"][1];
              var x = i["blue"][1];
              a = [n, [S, I, x]];
              break;
            default:
              throw new Error("[jamHelpers.fromColorObject] Unrecognized color class: " + n);
              break;
          }
        }
        return a;
      };
      jamHelpers.nameToColorObject = function(e, t) {
        return this.toColorObject(jamColors.nameToColor(e, t));
      };
      jamHelpers.hexToColorObject = function(e) {
        return this.toColorObject(["RGBColor", jamColors.hexToRgb(e)]);
      };
      jamHelpers.hexFromColorObject = function(e, t, a) {
        var r = this.fromColorObject(e);
        return r[0] === "RGBColor" ? jamColors.rgbToHex(r[1], t, a) : null;
      };
      jamHelpers.toGradientObject = function(e) {
        var t;
        if (e.constructor === Object) {
          var s = this;

          function c(e) {
            var t = {};
            for (var a in e) {
              if (e.hasOwnProperty(a)) {
                var r = e[a];
                var n = null;
                var i;
                switch (a) {
                  case "showTransparency":
                  case "vectorColor":
                    n = ["<boolean>", r];
                    break;
                  case "name":
                    n = ["<string>", localize(r)];
                    break;
                  case "gradientForm":
                    n = ["<enumerated>", ["gradientForm", r]];
                    break;
                  case "type":
                    n = ["<enumerated>", ["colorStopType", r]];
                    break;
                  case "colorSpace":
                    n = ["<enumerated>", ["colorSpace", r]];
                    break;
                  case "location":
                  case "midpoint":
                  case "randomSeed":
                  case "smoothness":
                    n = ["<integer>", r];
                    break;
                  case "interpolation":
                    n = ["<double>", r];
                    break;
                  case "opacity":
                    n = ["<unitDouble>", ["percentUnit", r]];
                    break;
                  case "colors":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["colorStop", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "transparency":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["transparencyStop", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "minimum":
                  case "maximum":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<integer>", r[o]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "color":
                    n = s.toColorObject(r);
                    break;
                  case "gradient":
                    n = ["<object>", ["gradientClassEvent", c(r)]];
                    break;
                }
                if (n) {
                  t[a] = n;
                }
              }
            }
            return t;
          }
          t = c({
            "gradient": e
          })["gradient"];
        } else if (e.constructor === Array) {
          var a = {};
          var r = e[0];
          if (r) {
            a["name"] = ["<string>", r];
          }
          var n = e[1];
          a["gradientForm"] = ["<enumerated>", ["gradientForm", n]];
          switch (jamEngine.uniIdStrToId(n)) {
            case jamEngine.uniIdStrToId("customStops"):
              a["interpolation"] = ["<double>", e[2]];
              var i = e[3];
              var o = [];
              for (var l = 0; l < i.length; l++) {
                var u = {};
                u["location"] = ["<integer>", i[l][0]];
                u["midpoint"] = ["<integer>", i[l][1]];
                var p = i[l][2];
                u["type"] = ["<enumerated>", ["colorStopType", p]];
                switch (jamEngine.uniIdStrToId(p)) {
                  case jamEngine.uniIdStrToId("userStop"):
                    u["color"] = this.toColorObject(i[l][3]);
                    break;
                  case jamEngine.uniIdStrToId("backgroundColor"):
                  case jamEngine.uniIdStrToId("foregroundColor"):
                    break;
                  default:
                    throw new Error("[jamHelpers.toGradientObject] Unrecognized color stop type: " + p);
                    break;
                }
                o.push(["<object>", ["colorStop", u]]);
              }
              a["colors"] = ["<list>", o];
              var f = e[4];
              if (typeof f !== "undefined") {
                var y = [];
                for (var g = 0; g < f.length; g++) {
                  var d = {};
                  d["location"] = ["<integer>", f[g][0]];
                  d["midpoint"] = ["<integer>", f[g][1]];
                  d["opacity"] = ["<unitDouble>", ["percentUnit", f[g][2]]];
                  y.push(["<object>", ["transparencyStop", d]]);
                }
                a["transparency"] = ["<list>", y];
              }
              break;
            case jamEngine.uniIdStrToId("colorNoise"):
              a["randomSeed"] = ["<integer>", e[2]];
              a["showTransparency"] = ["<boolean>", e[3]];
              a["vectorColor"] = ["<boolean>", e[4]];
              a["smoothness"] = ["<integer>", e[5]];
              var m = e[6];
              a["colorSpace"] = ["<enumerated>", ["colorSpace", m]];
              switch (jamEngine.uniIdStrToId(m)) {
                case jamEngine.uniIdStrToId("RGBColor"):
                case jamEngine.uniIdStrToId("HSBColorEnum"):
                case jamEngine.uniIdStrToId("labColor"):
                  break;
                default:
                  throw new Error("[jamHelpers.toGradientObject] Unrecognized color space: " + m);
                  break;
              }
              a["minimum"] = this.toIntegerList(e[7]);
              a["maximum"] = this.toIntegerList(e[8]);
              break;
            default:
              throw new Error("[jamHelpers.toGradientObject] Unrecognized gradient form: " + n);
              break;
          }
          t = ["<object>", ["gradientClassEvent", a]];
        }
        return t;
      };
      jamHelpers.fromGradientObject = function(e, t) {
        var a;
        if (t) {
          a = jamEngine.simplifyObject(e);
        } else {
          a = [];
          var r = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          var n = r[1][1];
          var i = n["name"];
          a.push(i ? i[1] : null);
          var o = n["gradientForm"][1][1];
          a.push(o);
          switch (o) {
            case "customStops":
              a.push(n["interpolation"][1]);
              var s = n["colors"][1];
              var c = [];
              for (var l = 0; l < s.length; l++) {
                var u = s[l][1][1];
                var p = [];
                p.push(u["location"][1]);
                p.push(u["midpoint"][1]);
                var f = u["type"][1][1];
                p.push(f);
                switch (f) {
                  case "userStop":
                    p.push(this.fromColorObject(u["color"]));
                    break;
                  case "backgroundColor":
                  case "foregroundColor":
                    break;
                  default:
                    throw new Error("[jamHelpers.fromGradientObject] Unrecognized color stop type: " + f);
                    break;
                }
                c.push(p);
              }
              a.push(c);
              var y = n["transparency"][1];
              var g = [];
              for (var d = 0; d < y.length; d++) {
                var m = y[d][1][1];
                var h = [];
                h.push(m["location"][1]);
                h.push(m["midpoint"][1]);
                h.push(m["opacity"][1][1]);
                g.push(h);
              }
              a.push(g);
              break;
            case "colorNoise":
              a.push(n["randomSeed"][1]);
              a.push(n["showTransparency"][1]);
              a.push(n["vectorColor"][1]);
              a.push(n["smoothness"][1]);
              var v = n["colorSpace"][1][1];
              a.push(v);
              switch (v) {
                case "RGBColor":
                case "HSBColorEnum":
                case "labColor":
                  break;
                default:
                  throw new Error("[jamHelpers.fromGradientObject] Unrecognized color space: " + v);
                  break;
              }
              a.push(this.fromIntegerList(n["minimum"]));
              a.push(this.fromIntegerList(n["maximum"]));
              break;
            default:
              throw new Error("[jamHelpers.fromGradientObject] Unrecognized gradient form: " + o);
              break;
          }
        }
        return a;
      };
      jamHelpers.toCurvesAdjustmentList = function(e) {
        var t = [];
        for (var a = 0; a < e.length; a++) {
          var r = e[a];
          var n = ["<reference>", [
            ["channel", ["<enumerated>", ["channel", r[0]]]]
          ]];
          var i = r[1];
          var o = i[0];
          var s = i[1];
          var c = [];
          switch (jamEngine.uniIdStrToId(o)) {
            case jamEngine.uniIdStrToId("mapping"):
              for (var l = 0; l < s.length; l++) {
                c.push(["<integer>", s[l]]);
              }
              var u = ["<list>", c];
              t.push(["<object>", ["curvesAdjustment", {
                "channel": n,
                "mapping": u
              }]]);
              break;
            case jamEngine.uniIdStrToId("curve"):
              for (var l = 0; l < s.length; l++) {
                var p = ["<object>", ["point", {
                  "horizontal": ["<double>", s[l][0]],
                  "vertical": ["<double>", s[l][1]]
                }]];
                c.push(p);
              }
              var f = ["<list>", c];
              t.push(["<object>", ["curvesAdjustment", {
                "channel": n,
                "curve": f
              }]]);
              break;
            default:
              throw new Error("[jamHelpers.toCurvesAdjustmentList] Unrecognized curve type");
              break;
          }
        }
        return ["<list>", t];
      };
      jamHelpers.toHueSatAdjustmentV2List = function(e) {
        var t = [];
        for (var a = 0; a < e.length; a++) {
          var r = e[a];
          var n;
          if (r.length === 3 && a === 0) {
            n = {
              "hue": ["<integer>", r[0]],
              "saturation": ["<integer>", r[1]],
              "lightness": ["<integer>", r[2]]
            };
          } else if (r.length === 1 + 4 + 3) {
            n = {
              "localRange": ["<integer>", r[0]],
              "beginRamp": ["<integer>", r[1]],
              "beginSustain": ["<integer>", r[2]],
              "endSustain": ["<integer>", r[3]],
              "endRamp": ["<integer>", r[4]],
              "hue": ["<integer>", r[5]],
              "saturation": ["<integer>", r[6]],
              "lightness": ["<integer>", r[7]]
            };
          }
          t.push(["<object>", ["hueSatAdjustmentV2", n]]);
        }
        return ["<list>", t];
      };
      jamHelpers.toBlendRangeList = function(e) {
        var t = [];
        var a;
        for (var r = 0; r < e.length; r++) {
          var n = e[r];
          if (n.constructor === Object) {
            function i(e) {
              var t = {};
              for (var a in e) {
                if (e.hasOwnProperty(a)) {
                  var r = e[a];
                  var n = null;
                  switch (a) {
                    case "channel":
                      n = ["<reference>", [
                        ["channel", ["<enumerated>", ["channel", r]]]
                      ]];
                      break;
                    case "srcBlackMin":
                    case "srcBlackMax":
                    case "srcWhiteMin":
                    case "srcWhiteMax":
                    case "destBlackMin":
                    case "destBlackMax":
                    case "destWhiteMin":
                    case "destWhiteMax":
                      n = ["<integer>", r];
                      break;
                    case "blendRange":
                      n = ["<object>", ["blendRange", i(r)]];
                      break;
                  }
                  if (n) {
                    t[a] = n;
                  }
                }
              }
              return t;
            }
            a = i({
              "blendRange": n
            })["blendRange"];
          } else if (n.constructor === Array) {
            a = ["<object>", ["blendRange", {
              "channel": ["<reference>", [
                ["channel", ["<enumerated>", ["channel", n[0]]]]
              ]],
              "srcBlackMin": ["<integer>", n[1]],
              "srcBlackMax": ["<integer>", n[2]],
              "srcWhiteMin": ["<integer>", n[3]],
              "srcWhiteMax": ["<integer>", n[4]],
              "destBlackMin": ["<integer>", n[5]],
              "destBlackMax": ["<integer>", n[6]],
              "destWhiteMin": ["<integer>", n[7]],
              "destWhiteMax": ["<integer>", n[8]]
            }]];
          }
          t.push(a);
        }
        return ["<list>", t];
      };
      jamHelpers.fromBlendRangeList = function(e, t) {
        var a;
        if (t) {
          var r = function(e, t, a) {
            var r = undefined;
            if (t === "channel") {
              var n = a(e, t);
              r = n[0]["channel"];
            }
            return r;
          };
          a = jamEngine.simplifyList(e, r);
        } else {
          a = [];
          var n = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          for (index = 0; index < n[1].length; index++) {
            var i = n[1][index][1][1];
            var o = [i["channel"][1][0][1][1][1], i["srcBlackMin"][1], i["srcBlackMax"][1], i["srcWhiteMin"][1], i["srcWhiteMax"][1], i["destBlackMin"][1], i["destBlackMax"][1], i["destWhiteMin"][1], i["destWhiteMax"][1]];
            a.push(o);
          }
        }
        return a;
      };
      jamHelpers.toIntegerList = function(e) {
        var t = [];
        for (var a = 0; a < e.length; a++) {
          t.push(["<integer>", e[a]]);
        }
        return ["<list>", t];
      };
      jamHelpers.fromIntegerList = function(e) {
        var t = jamEngine.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        });
        var a = [];
        var r = t[1];
        for (var n = 0; n < r.length; n++) {
          a.push(r[n][1]);
        }
        return a;
      };

      function b(e, t) {
        return typeof t === "undefined" ? ["<double>", e] : ["<unitDouble>", [t, e]];
      }
      jamHelpers.toPointObject = function(e) {
        var t = e[0];
        var a = e[1];
        var r = ["<object>", ["point", {
          "horizontal": b(t[0], a),
          "vertical": b(t[1], a)
        }]];
        return r;
      };
      jamHelpers.toPointList = function(e) {
        var t = e[0];
        var a = e[1];
        var r = [];
        for (var n = 0; n < t.length; n++) {
          r.push(["<object>", ["point", {
            "horizontal": b(t[n][0], a),
            "vertical": b(t[n][1], a)
          }]]);
        }
        return ["<list>", r];
      };
      jamHelpers.fromPointList = function(e) {
        var t = [];
        var a = jamEngine.normalizeJsonItem(e, {
          "meaningfulIds": true,
          "parseFriendly": true
        });
        var r = [];
        var n;

        function i(e) {
          var t;
          switch (e[0]) {
            case "<unitDouble>":
              n = e[1][0];
              t = e[1][1];
              break;
            case "<double>":
              n = undefined;
              t = e[1];
              break;
          }
          return t;
        }
        var o = a[1];
        for (var s = 0; s < o.length; s++) {
          r.push([i(o[s][1][1]["horizontal"]), i(o[s][1][1]["vertical"])]);
        }
        t.push(r);
        if (n) {
          t.push(n);
        }
        return t;
      };
      jamHelpers.toOffsetObject = function(e) {
        var t = e[0];
        var a = e[1];
        var r = ["<object>", ["offset", {
          "horizontal": b(t[0], a),
          "vertical": b(t[1], a)
        }]];
        return r;
      };
      jamHelpers.toRectangleObject = function(e) {
        var t = e[0];
        var a = e[1];
        var r = {
          "left": b(t[0], a),
          "top": b(t[1], a),
          "right": b(t[2], a),
          "bottom": b(t[3], a)
        };
        if (t.length === 5) {
          r["radius"] = b(t[4], a);
        }
        return ["<object>", ["rectangle", r]];
      };
      jamHelpers.toEllipseObject = function(e) {
        var t = e[0];
        var a = e[1];
        var r = ["<object>", ["ellipse", {
          "left": b(t[0], a),
          "top": b(t[1], a),
          "right": b(t[2], a),
          "bottom": b(t[3], a)
        }]];
        return r;
      };
      jamHelpers.toCustomShapeObject = function(e) {
        var t = e[0];
        var a = e[1];
        var r = ["<object>", ["customShape", {
          "name": ["<string>", t[0]],
          "left": b(t[1], a),
          "top": b(t[2], a),
          "right": b(t[3], a),
          "bottom": b(t[4], a)
        }]];
        return r;
      };
      jamHelpers.toCurvePointList = function(e) {
        var t = [];
        var a;
        for (var r = 0; r < e.length; r++) {
          var n = e[r];
          if (n.constructor === Object) {
            function i(e) {
              var t = {};
              for (var a in e) {
                if (e.hasOwnProperty(a)) {
                  var r = e[a];
                  var n = null;
                  switch (a) {
                    case "continuity":
                      n = ["<boolean>", r];
                      break;
                    case "horizontal":
                    case "vertical":
                      n = ["<double>", r];
                      break;
                    case "curvePoint":
                      n = ["<object>", ["curvePoint", i(r)]];
                      break;
                  }
                  if (n) {
                    t[a] = n;
                  }
                }
              }
              return t;
            }
            a = i({
              "curvePoint": n
            })["curvePoint"];
          } else if (n.constructor === Array) {
            switch (n.length) {
              case 2:
                a = ["<object>", ["curvePoint", {
                  "horizontal": ["<double>", n[0]],
                  "vertical": ["<double>", n[1]]
                }]];
                break;
              case 3:
                a = ["<object>", ["curvePoint", {
                  "horizontal": ["<double>", n[0]],
                  "vertical": ["<double>", n[1]],
                  "continuity": ["<boolean>", n[2]]
                }]];
                break;
            }
          }
          t.push(a);
        }
        return ["<list>", t];
      };
      jamHelpers.fromCurvePointList = function(e, t) {
        var a;
        if (t) {
          a = jamEngine.simplifyList(e);
        } else {
          a = [];
          var r = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          for (index = 0; index < r[1].length; index++) {
            var n = r[1][index][1][1];
            var i = [n["horizontal"][1], n["vertical"][1]];
            if ("continuity" in n) {
              i.push(n["continuity"][1]);
            }
            a.push(i);
          }
        }
        return a;
      };
      jamHelpers.toRationalPointList = function(e) {
        var t = e[0];
        var a = e[1];
        var r = [];
        for (var n = 0; n < t.length; n++) {
          r.push(["<object>", ["rationalPoint", {
            "horizontal": b(t[n][0], a),
            "vertical": b(t[n][1], a)
          }]]);
        }
        return ["<list>", r];
      };
      jamHelpers.toPathComponentList = function(e) {
        var t;
        if (e.constructor === Object) {
          var s;
          if ("unit" in e) {
            s = e["unit"];
          }
          var a = e["pathComponents"];

          function c(e) {
            var t = {};
            for (var a in e) {
              if (e.hasOwnProperty(a)) {
                var r = e[a];
                var n = null;
                var i;
                switch (a) {
                  case "closedSubpath":
                  case "smooth":
                  case "windingFill":
                    n = ["<boolean>", r];
                    break;
                  case "shapeOperation":
                    n = ["<enumerated>", ["shapeOperation", r]];
                    break;
                  case "horizontal":
                  case "vertical":
                    n = b(r, s);
                    break;
                  case "anchor":
                  case "backward":
                  case "forward":
                    n = ["<object>", ["point", c(r)]];
                    break;
                  case "subpathListKey":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["subpathsList", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "points":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["pathPoint", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                  case "pathComponents":
                    i = [];
                    for (var o = 0; o < r.length; o++) {
                      i.push(["<object>", ["pathComponent", c(r[o])]]);
                    }
                    n = ["<list>", i];
                    break;
                }
                if (n) {
                  t[a] = n;
                }
              }
            }
            return t;
          }
          t = c({
            "pathComponents": a
          })["pathComponents"];
        } else if (e.constructor === Array) {
          var r = [];
          var a = e[0];
          var s = e[1];
          for (var n = 0; n < a.length; n++) {
            var i = a[n][0];
            var o = a[n][1];
            var l = a[n][2];
            var u = [];
            for (var p = 0; p < o.length; p++) {
              var f = o[p][0];
              var y = o[p][1];
              var g = [];
              for (var d = 0; d < f.length; d++) {
                var m = f[d];
                switch (m.length) {
                  case 1:
                    g.push(["<object>", ["pathPoint", {
                      "anchor": ["<object>", ["point", {
                        "horizontal": b(m[0][0], s),
                        "vertical": b(m[0][1], s)
                      }]]
                    }]]);
                    break;
                  case 3:
                  case 4:
                    g.push(["<object>", ["pathPoint", {
                      "anchor": ["<object>", ["point", {
                        "horizontal": b(m[0][0], s),
                        "vertical": b(m[0][1], s)
                      }]],
                      "forward": ["<object>", ["point", {
                        "horizontal": b(m[1][0], s),
                        "vertical": b(m[1][1], s)
                      }]],
                      "backward": ["<object>", ["point", {
                        "horizontal": b(m[2][0], s),
                        "vertical": b(m[2][1], s)
                      }]],
                      "smooth": ["<boolean>", m[3] || false]
                    }]]);
                    break;
                }
              }
              var h = {};
              if (y) {
                h["closedSubpath"] = ["<boolean>", y];
              }
              h["points"] = ["<list>", g];
              u.push(["<object>", ["subpathsList", h]]);
            }
            var v = {};
            v["shapeOperation"] = ["<enumerated>", ["shapeOperation", i]];
            if (l) {
              v["windingFill"] = ["<boolean>", l];
            }
            v["subpathListKey"] = ["<list>", u];
            r.push(["<object>", ["pathComponent", v]]);
          }
          t = ["<list>", r];
        }
        return t;
      };
      jamHelpers.fromPathComponentList = function(e, t) {
        var a;
        if (t) {
          a = {};
          var r;
          var n = false;

          function i(e, t) {
            if (!n) {
              if (t === "horizontal") {
                var a = e[t];
                if (a[0] === "<unitDouble>") {
                  r = a[1][0];
                }
                n = true;
              }
            }
            return undefined;
          }
          a["pathComponents"] = jamEngine.simplifyList(e, i);
          if (r) {
            a["unit"] = r;
          }
        } else {
          a = [];
          var o = jamEngine.normalizeJsonItem(e, {
            "meaningfulIds": true,
            "parseFriendly": true
          });
          var s = [];
          var r;

          function c(e) {
            var t;
            switch (e[0]) {
              case "<unitDouble>":
                r = e[1][0];
                t = e[1][1];
                break;
              case "<double>":
                r = undefined;
                t = e[1];
                break;
            }
            return t;
          }
          var l = o[1];
          for (var u = 0; u < l.length; u++) {
            var p = l[u][1][1];
            var f = p["shapeOperation"][1][1];
            var y = "windingFill" in p ? p["windingFill"][1] : false;
            var g = [];
            var d = p["subpathListKey"][1];
            for (var m = 0; m < d.length; m++) {
              var h = d[m][1][1];
              var v = "closedSubpath" in h ? h["closedSubpath"][1] : false;
              var b = [];
              var T = h["points"][1];
              for (var S = 0; S < T.length; S++) {
                var I = T[S][1][1];
                var x = [];
                var D = I["anchor"][1][1];
                x.push([c(D["horizontal"]), c(D["vertical"])]);
                if ("forward" in I) {
                  var k = I["forward"][1][1];
                  x.push([c(k["horizontal"]), c(k["vertical"])]);
                }
                if ("backward" in I) {
                  var j = I["backward"][1][1];
                  x.push([c(j["horizontal"]), c(j["vertical"])]);
                }
                var E = "smooth" in I ? I["smooth"][1] : false;
                if (E) {
                  x.push(E);
                }
                b.push(x);
              }
              var C = [];
              C.push(b);
              if (v) {
                C.push(v);
              }
              g.push(C);
            }
            var w = [];
            w.push(f);
            w.push(g);
            if (y) {
              w.push(y);
            }
            s.push(w);
          }
          a.push(s);
          if (r) {
            a.push(r);
          }
        }
        return a;
      };
    })();
  }
  if (typeof jamJSON !== "object") {
    var jamJSON = {};
    (function() {
      var state;
      var stack;
      var container;
      var key;
      var value;
      var escapes = {
        "\\": "\\",
        '"': '"',
        "/": "/",
        "t": "\t",
        "n": "\n",
        "r": "\r",
        "f": "\f",
        "b": "\b"
      };
      var action = {
        "{": {
          "go": function() {
            stack.push({
              "state": "ok"
            });
            container = {};
            state = "firstokey";
          },
          "ovalue": function() {
            stack.push({
              "container": container,
              "state": "ocomma",
              "key": key
            });
            container = {};
            state = "firstokey";
          },
          "firstavalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = {};
            state = "firstokey";
          },
          "avalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = {};
            state = "firstokey";
          }
        },
        "}": {
          "firstokey": function() {
            var e = stack.pop();
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          },
          "ocomma": function() {
            var e = stack.pop();
            container[key] = value;
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          }
        },
        "[": {
          "go": function() {
            stack.push({
              "state": "ok"
            });
            container = [];
            state = "firstavalue";
          },
          "ovalue": function() {
            stack.push({
              "container": container,
              "state": "ocomma",
              "key": key
            });
            container = [];
            state = "firstavalue";
          },
          "firstavalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = [];
            state = "firstavalue";
          },
          "avalue": function() {
            stack.push({
              "container": container,
              "state": "acomma"
            });
            container = [];
            state = "firstavalue";
          }
        },
        "]": {
          "firstavalue": function() {
            var e = stack.pop();
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          },
          "acomma": function() {
            var e = stack.pop();
            container.push(value);
            value = container;
            container = e.container;
            key = e.key;
            state = e.state;
          }
        },
        ":": {
          "colon": function() {
            if (container.hasOwnProperty(key)) {
              throw new SyntaxError("[jamJSON.parse] Duplicate key: “" + key + "”");
            }
            state = "ovalue";
          }
        },
        ",": {
          "ocomma": function() {
            container[key] = value;
            state = "okey";
          },
          "acomma": function() {
            container.push(value);
            state = "avalue";
          }
        },
        "true": {
          "go": function() {
            value = true;
            state = "ok";
          },
          "ovalue": function() {
            value = true;
            state = "ocomma";
          },
          "firstavalue": function() {
            value = true;
            state = "acomma";
          },
          "avalue": function() {
            value = true;
            state = "acomma";
          }
        },
        "false": {
          "go": function() {
            value = false;
            state = "ok";
          },
          "ovalue": function() {
            value = false;
            state = "ocomma";
          },
          "firstavalue": function() {
            value = false;
            state = "acomma";
          },
          "avalue": function() {
            value = false;
            state = "acomma";
          }
        },
        "null": {
          "go": function() {
            value = null;
            state = "ok";
          },
          "ovalue": function() {
            value = null;
            state = "ocomma";
          },
          "firstavalue": function() {
            value = null;
            state = "acomma";
          },
          "avalue": function() {
            value = null;
            state = "acomma";
          }
        }
      };
      var number = {
        "go": function() {
          state = "ok";
        },
        "ovalue": function() {
          state = "ocomma";
        },
        "firstavalue": function() {
          state = "acomma";
        },
        "avalue": function() {
          state = "acomma";
        }
      };
      var string = {
        "go": function() {
          state = "ok";
        },
        "firstokey": function() {
          key = value;
          state = "colon";
        },
        "okey": function() {
          key = value;
          state = "colon";
        },
        "ovalue": function() {
          state = "ocomma";
        },
        "firstavalue": function() {
          state = "acomma";
        },
        "avalue": function() {
          state = "acomma";
        }
      };
      var commentFunc = function() {};

      function debackslashify(e) {
        return e.replace(/\\(?:u(.{4})|([^u]))/g, function(e, t, a) {
          return t ? String.fromCharCode(parseInt(t, 16)) : escapes[a];
        });
      }
      jamJSON.parse = function(text, validate, allowComments) {
        if (validate) {
          var tx = /^[\x20\t\n\r]*(?:([,:\[\]{}]|true|false|null)|(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+\-]?[0-9]+)?)|"((?:[^\r\n\t\\\"]|\\(?:["\\\/trnfb]|u[0-9a-fA-F]{4}))*)")/;
          var txc = /^[\x20\t\n\r]*(?:(\/(?:\/.*|\*(?:.|[\r\n])*?\*\/))|([,:\[\]{}]|true|false|null)|(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+\-]?[0-9]+)?)|"((?:[^\r\n\t\\\"]|\\(?:["\\\/trnfb]|u[0-9a-fA-F]{4}))*)")/;
          var r;
          var i;
          var actionFunc;
          state = "go";
          stack = [];
          try {
            while (true) {
              i = allowComments ? 1 : 0;
              r = allowComments ? txc.exec(text) : tx.exec(text);
              if (!r) {
                break;
              }
              if (allowComments && r[1]) {
                actionFunc = commentFunc;
              } else if (r[i + 1]) {
                actionFunc = action[r[i + 1]][state];
              } else if (r[i + 2]) {
                value = +r[i + 2];
                actionFunc = number[state];
              } else {
                value = debackslashify(r[i + 3]);
                actionFunc = string[state];
              }
              if (actionFunc) {
                actionFunc();
                text = text.slice(r[0].length);
              } else {
                break;
              }
            }
          } catch (e) {
            state = e;
          }
          if (state !== "ok" || /[^\x20\t\n\r]/.test(text)) {
            throw state instanceof SyntaxError ? state : new SyntaxError("[jamJSON.parse] Invalid JSON");
          }
          return value;
        } else {
          return JSON.parse(text); // dùng JSON gốc thay vì eval() (ExtendScript hiện đại luôn có sẵn JSON)
        }
      };
      if (typeof JSON !== "undefined" && JSON.parse && JSON.parse.__isStub) { JSON.parse = function(t) { return jamJSON.parse(t, true); }; }
      var escapable = /[\\\"\x00-\x1F\x7F-\x9F\u00AD\u0600-\u0604\u070F\u17B4\u17B5\u200C-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g;
      var meta = {
        "\b": "\\b",
        "\t": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
        '"': '\\"',
        "\\": "\\\\"
      };
      var gap;
      var indent;
      var prefixIndent;

      function quote(e) {
        escapable.lastIndex = 0;
        return escapable.test(e) ? '"' + e.replace(escapable, function(e) {
          var t = meta[e];
          return typeof t === "string" ? t : "\\u" + ("0000" + e.charCodeAt(0).toString(16).toUpperCase()).slice(-4);
        }) + '"' : '"' + e + '"';
      }

      function str(e) {
        var t;
        var a;
        var r;
        var n = gap;
        var i;
        switch (typeof e) {
          case "string":
            return quote(e);
          case "number":
            return isFinite(e) ? String(e) : "null";
          case "boolean":
          case "null":
            return String(e);
          case "object":
            if (!e) {
              return "null";
            }
            gap += indent;
            i = [];
            if (e.constructor === Array) {
              for (t = 0; t < e.length; t++) {
                i[t] = str(e[t]);
              }
              var o = gap ? "[\n" + prefixIndent + n + "]" : "[ ]";
              var s = gap ? "[\n" + prefixIndent + gap + i.join(",\n" + prefixIndent + gap) + "\n" + prefixIndent + n + "]" : "[ " + i.join(", ") + " ]";
              r = i.length === 0 ? o : s;
              gap = n;
              return r;
            } else {
              for (a in e) {
                if (e.hasOwnProperty(a)) {
                  r = str(e[a]);
                  if (r) {
                    i.push(quote(a) + (gap && (r.charAt(0) === "{" || r.charAt(0) === "[") ? ":\n" + prefixIndent + gap : ": ") + r);
                  }
                }
              }
              var c = gap ? "{\n" + prefixIndent + n + "}" : "{ }";
              var l = gap ? "{\n" + prefixIndent + gap + i.join(",\n" + prefixIndent + gap) + "\n" + prefixIndent + n + "}" : "{ " + i.join(", ") + " }";
              r = i.length === 0 ? c : l;
              gap = n;
              return r;
            }
          default:
            throw new SyntaxError("[jamJSON.stringify] Invalid JSON");
        }
      }
      jamJSON.stringify = function(e, t, a) {
        var r;
        gap = "";
        indent = "";
        prefixIndent = "";
        if (typeof t === "number") {
          for (r = 0; r < t; r++) {
            indent += " ";
          }
        } else if (typeof t === "string") {
          indent = t;
        }
        if (typeof a === "number") {
          for (r = 0; r < a; r++) {
            prefixIndent += " ";
          }
        } else if (typeof a === "string") {
          prefixIndent = a;
        }
        return prefixIndent + str(e);
      };
    })();
  }
  if (typeof jamText !== "object") {
    var jamText = {};
    (function() {
      jamText.toLayerTextObject = function(e) {
        var l;
        if ("typeUnit" in e) {
          l = e["typeUnit"];
        }
        var t = e["layerText"];

        function u(e, t) {
          var a = {};
          for (var r in e) {
            if (e.hasOwnProperty(r)) {
              var n = e[r];
              var i = null;
              var o;
              switch (r) {
                case "bookKey":
                  i = ["<data>", n];
                  break;
                case "rowMajorOrder":
                case "syntheticBold":
                case "syntheticItalic":
                case "autoLeading":
                case "ligature":
                case "altligature":
                case "contextualLigatures":
                case "alternateLigatures":
                case "oldStyle":
                case "fractions":
                case "ordinals":
                case "swash":
                case "titling":
                case "connectionForms":
                case "stylisticAlternates":
                case "ornaments":
                case "proportionalMetrics":
                case "kana":
                case "italics":
                case "ruby":
                case "enableWariChu":
                case "noBreak":
                case "fill":
                case "stroke":
                case "fillFirst":
                case "fillOverPrint":
                case "strokeOverPrint":
                case "hyphenate":
                case "hyphenateCapitalized":
                case "hangingRoman":
                case "keepTogether":
                case "kurikaeshiMojiShori":
                case "textEveryLineComposer":
                case "flip":
                  i = ["<boolean>", n];
                  break;
                case "textKey":
                case "fontPostScriptName":
                case "fontName":
                case "fontStyleName":
                case "book":
                case "name":
                  i = ["<string>", n];
                  break;
                case "rowCount":
                case "columnCount":
                case "from":
                case "to":
                case "fontScript":
                case "fontTechnology":
                case "tracking":
                case "wariChuCount":
                case "wariChuLineGap":
                case "wariChuWidow":
                case "wariChuOrphan":
                case "tcyUpDown":
                case "tcyLeftRight":
                case "jiDori":
                case "bookID":
                case "dropCapMultiplier":
                case "hyphenateWordSize":
                case "hyphenatePreLength":
                case "hyphenatePostLength":
                case "hyphenateLimit":
                case "autoTCY":
                case "kerning":
                case "pathTypeSpacing":
                  i = ["<integer>", n];
                  break;
                case "warpValue":
                case "warpPerspective":
                case "warpPerspectiveOther":
                case "xx":
                case "xy":
                case "yx":
                case "yy":
                case "tx":
                case "ty":
                case "top":
                case "left":
                case "bottom":
                case "right":
                case "horizontalScale":
                case "verticalScale":
                case "characterRotation":
                case "mojiZume":
                case "wariChuScale":
                case "a":
                case "b":
                case "black":
                case "blue":
                case "brightness":
                case "cyan":
                case "gray":
                case "green":
                case "luminance":
                case "magenta":
                case "red":
                case "saturation":
                case "yellowColor":
                case "lineDashoffset":
                case "autoLeadingPercentage":
                case "hyphenationZone":
                case "hyphenationPreference":
                case "justificationWordMinimum":
                case "justificationWordDesired":
                case "justificationWordMaximum":
                case "justificationLetterMinimum":
                case "justificationLetterDesired":
                case "justificationLetterMaximum":
                case "justificationGlyphMinimum":
                case "justificationGlyphDesired":
                case "justificationGlyphMaximum":
                case "defaultTabWidth":
                case "start":
                case "end":
                  i = ["<double>", n];
                  break;
                case "rowGutter":
                case "columnGutter":
                case "spacing":
                case "firstBaselineMinimum":
                case "size":
                case "leading":
                case "baselineShift":
                case "underlineOffset":
                case "lineWidth":
                case "miterLimit":
                case "firstLineIndent":
                case "startIndent":
                case "endIndent":
                case "spaceBefore":
                case "spaceAfter":
                  i = l ? ["<unitDouble>", [l, n]] : ["<double>", n];
                  break;
                case "horizontal":
                case "vertical":
                  i = t ? ["<unitDouble>", [t, n]] : ["<double>", n];
                  break;
                case "hue":
                  i = ["<unitDouble>", ["angleUnit", n]];
                  break;
                case "warpStyle":
                case "textGridding":
                case "orientation":
                case "textType":
                case "frameBaselineAlignment":
                case "autoKern":
                case "fontCaps":
                case "baseline":
                case "otbaseline":
                case "strikethrough":
                case "underline":
                case "figureStyle":
                case "baselineDirection":
                case "textLanguage":
                case "japaneseAlternate":
                case "gridAlignment":
                case "wariChuJustification":
                case "lineCap":
                case "lineJoin":
                case "leadingType":
                case "burasagari":
                case "preferredKinsokuOrder":
                case "pathTypeEffect":
                case "pathTypeAlignment":
                case "pathTypeAlignTo":
                  i = ["<enumerated>", [r, n]];
                  break;
                case "antiAlias":
                  i = ["<enumerated>", ["antiAliasType", n]];
                  break;
                case "warpRotate":
                  i = ["<enumerated>", ["orientation", n]];
                  break;
                case "alignment":
                case "singleWordJustification":
                  i = ["<enumerated>", ["alignmentType", n]];
                  break;
                case "textShape":
                case "textStyleRange":
                case "paragraphStyleRange":
                case "kerningRange":
                  o = [];
                  for (var s = 0; s < n.length; s++) {
                    o.push(["<object>", [r, u(n[s])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "warp":
                case "transform":
                case "textStyle":
                case "paragraphStyle":
                  i = ["<object>", [r, u(n)]];
                  break;
                case "defaultStyle":
                  i = ["<object>", ["textStyle", u(n)]];
                  break;
                case "color":
                case "strokeColor":
                  var c;
                  if ("book" in n && "name" in n || "bookID" in n && "bookKey" in n) {
                    c = "bookColor";
                  } else if ("cyan" in n && "magenta" in n && "yellowColor" in n && "black" in n) {
                    c = "CMYKColorClass";
                  } else if ("gray" in n) {
                    c = "grayscale";
                  } else if ("hue" in n && "saturation" in n && "brightness" in n) {
                    c = "HSBColorClass";
                  } else if ("luminance" in n && "a" in n && "b" in n) {
                    c = "labColor";
                  } else if ("red" in n && "green" in n && "blue" in n) {
                    c = "RGBColor";
                  }
                  i = ["<object>", [c, u(n)]];
                  break;
                case "textClickPoint":
                  i = ["<object>", ["point", u(n, "percentUnit")]];
                  break;
                case "base":
                  i = ["<object>", ["point", u(n)]];
                  break;
                case "bounds":
                  i = ["<object>", ["rectangle", u(n)]];
                  break;
                case "path":
                  i = ["<object>", ["pathClass", {
                    "pathComponents": jamHelpers.toPathComponentList(n)
                  }]];
                  break;
                case "tRange":
                  i = ["<object>", ["range", u(n)]];
                  break;
                case "textLayer":
                  i = ["<object>", ["textLayer", u(n)]];
                  break;
                case "mojiKumiName":
                case "kinsokuSetName":
                  if (true) {
                    i = ["<enumerated>", [r, n]];
                  } else {
                    i = ["<string>", n];
                  }
                  break;
                case "leftAki":
                case "rightAki":
                  if (true) {
                    i = ["<double>", n];
                  } else {
                    i = l ? ["<unitDouble>", [l, n]] : ["<double>", n];
                  }
                  break;
              }
              if (i) {
                a[r] = i;
              }
            }
          }
          return a;
        }
        return u({
          "textLayer": t
        })["textLayer"];
      };
      jamText.fromLayerTextObject = function(e) {
        var t = {};
        var n;
        var i = false;

        function a(e, t) {
          var a;
          if (t === "path") {
            a = jamHelpers.fromPathComponentList(e[t][1][1]["pathComponents"], true);
          } else if (!i) {
            switch (t) {
              case "rowGutter":
              case "columnGutter":
              case "spacing":
              case "firstBaselineMinimum":
              case "size":
              case "leading":
              case "baselineShift":
              case "underlineOffset":
              case "lineWidth":
              case "miterLimit":
              case "firstLineIndent":
              case "startIndent":
              case "endIndent":
              case "spaceBefore":
              case "spaceAfter":
              case "leftAki":
              case "rightAki":
                var r = e[t];
                if (r[0] === "<unitDouble>") {
                  n = r[1][0];
                }
                i = true;
                break;
            }
          }
          return a;
        }
        t["layerText"] = jamEngine.simplifyObject(e, a);
        if (n) {
          t["typeUnit"] = n;
        }
        return t;
      };
      jamText.setLayerText = function(e) {
        var t = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var r = false;
        try {
          resultObj = jamEngine.jsonGet([{
            "property": {
              "<property>": "textKey"
            }
          }, {
            "layer": {
              "<enumerated>": {
                "ordinal": "targetEnum"
              }
            }
          }]);
          if ("textKey" in resultObj) {
            r = true;
          }
        } catch (e) {}
        jamEngine.meaningfulIds = t;
        jamEngine.parseFriendly = a;
        if (r) {
          jamEngine.jsonPlay("set", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]],
            "to": this.toLayerTextObject(e)
          });
        } else {
          jamEngine.jsonPlay("make", {
            "target": ["<reference>", [
              ["textLayer", ["<class>", null]]
            ]],
            "using": this.toLayerTextObject(e)
          });
        }
      };
      jamText.getLayerText = function() {
        var e = null;
        var t = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        try {
          var r = jamEngine.jsonGet([{
            "property": {
              "<property>": "textKey"
            }
          }, {
            "layer": {
              "<enumerated>": {
                "ordinal": "targetEnum"
              }
            }
          }]);
          if ("textKey" in r) {
            e = this.fromLayerTextObject(r["textKey"]);
          }
        } catch (e) {}
        jamEngine.meaningfulIds = t;
        jamEngine.parseFriendly = a;
        return e;
      };
    })();
  }
  if (typeof jamStyles !== "object") {
    var jamStyles = {};
    (function() {
      jamStyles.isStylesFile = function(e) {
        return e.type === "8BSL" || e.name.match(/\.asl$/i);
      };
      jamStyles.isStylesPalette = function(e) {
        return e.name.match(/^Styles.psp$/i);
      };
      jamStyles.toLayerEffectsObject = function(e) {
        function u(e, t) {
          var a = {};
          for (var r in e) {
            if (e.hasOwnProperty(r)) {
              var n = e[r];
              var i = null;
              var o;
              switch (r) {
                case "align":
                case "antiAlias":
                case "antialiasGloss":
                case "continuity":
                case "dither":
                case "enabled":
                case "invert":
                case "invertTexture":
                case "layerConceals":
                case "linked":
                case "reverse":
                case "showTransparency":
                case "useGlobalAngle":
                case "useShape":
                case "useTexture":
                case "vectorColor":
                  i = ["<boolean>", n];
                  break;
                case "book":
                case "ID":
                case "name":
                  i = ["<string>", localize(n)];
                  break;
                case "bookKey":
                  i = ["<data>", n];
                  break;
                case "bookID":
                case "location":
                case "midpoint":
                case "randomSeed":
                case "smoothness":
                  i = ["<integer>", n];
                  break;
                case "a":
                case "b":
                case "black":
                case "blue":
                case "brightness":
                case "cyan":
                case "gray":
                case "green":
                case "interpolation":
                case "luminance":
                case "magenta":
                case "red":
                case "saturation":
                case "yellowColor":
                  i = ["<double>", n];
                  break;
                case "angle":
                case "hue":
                case "localLightingAngle":
                case "localLightingAltitude":
                  i = ["<unitDouble>", ["angleUnit", n]];
                  break;
                case "chokeMatte":
                case "highlightOpacity":
                case "inputRange":
                case "noise":
                case "opacity":
                case "scale":
                case "shadingNoise":
                case "shadowOpacity":
                case "strengthRatio":
                case "textureDepth":
                  i = ["<unitDouble>", ["percentUnit", n]];
                  break;
                case "blur":
                case "distance":
                case "size":
                case "softness":
                  i = ["<unitDouble>", ["pixelsUnit", n]];
                  break;
                case "horizontal":
                case "vertical":
                  i = t ? ["<unitDouble>", [t, n]] : ["<double>", n];
                  break;
                case "type":
                  var s;
                  switch (n) {
                    case "linear":
                    case "radial":
                    case "angle":
                    case "reflected":
                    case "diamond":
                    case "shapeburst":
                      s = "gradientType";
                      break;
                    case "foregroundColor":
                    case "backgroundColor":
                    case "userStop":
                      s = "colorStopType";
                      break;
                  }
                  i = ["<enumerated>", [s, n]];
                  break;
                case "colorSpace":
                  i = ["<enumerated>", ["colorSpace", n]];
                  break;
                case "gradientForm":
                  i = ["<enumerated>", ["gradientForm", n]];
                  break;
                case "paintType":
                  i = ["<enumerated>", ["frameFill", n]];
                  break;
                case "bevelDirection":
                  i = ["<enumerated>", ["bevelEmbossStampStyle", n]];
                  break;
                case "bevelStyle":
                  i = ["<enumerated>", ["bevelEmbossStyle", n]];
                  break;
                case "bevelTechnique":
                  i = ["<enumerated>", ["bevelTechnique", n]];
                  break;
                case "glowTechnique":
                  i = ["<enumerated>", ["matteTechnique", n]];
                  break;
                case "innerGlowSource":
                  i = ["<enumerated>", ["innerGlowSourceType", n]];
                  break;
                case "style":
                  i = ["<enumerated>", ["frameStyle", n]];
                  break;
                case "highlightMode":
                case "mode":
                case "shadowMode":
                  i = ["<enumerated>", ["blendMode", n]];
                  break;
                case "bevelEmboss":
                case "chromeFX":
                case "dropShadow":
                case "frameFX":
                case "gradientFill":
                case "innerGlow":
                case "innerShadow":
                case "outerGlow":
                case "pattern":
                case "patternFill":
                case "solidFill":
                  i = ["<object>", [r, u(n)]];
                  break;
                case "color":
                case "highlightColor":
                case "shadowColor":
                  var c;
                  if ("book" in n && "name" in n || "bookID" in n && "bookKey" in n) {
                    c = "bookColor";
                  } else if ("cyan" in n && "magenta" in n && "yellowColor" in n && "black" in n) {
                    c = "CMYKColorClass";
                  } else if ("gray" in n) {
                    c = "grayscale";
                  } else if ("hue" in n && "saturation" in n && "brightness" in n) {
                    c = "HSBColorClass";
                  } else if ("luminance" in n && "a" in n && "b" in n) {
                    c = "labColor";
                  } else if ("red" in n && "green" in n && "blue" in n) {
                    c = "RGBColor";
                  }
                  i = ["<object>", [c, u(n)]];
                  break;
                case "gradient":
                  i = ["<object>", ["gradientClassEvent", u(n)]];
                  break;
                case "mappingShape":
                case "transparencyShape":
                  i = ["<object>", ["shapingCurve", u(n)]];
                  break;
                case "offset":
                  i = ["<object>", ["point", u(n, "percentUnit")]];
                  break;
                case "phase":
                  i = ["<object>", ["point", u(n)]];
                  break;
                case "minimum":
                case "maximum":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<integer>", n[l]]);
                  }
                  i = ["<list>", o];
                  break;
                case "colors":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<object>", ["colorStop", u(n[l])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "transparency":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<object>", ["transparencyStop", u(n[l])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "curve":
                  o = [];
                  for (var l = 0; l < n.length; l++) {
                    o.push(["<object>", ["curvePoint", u(n[l])]]);
                  }
                  i = ["<list>", o];
                  break;
                case "layerEffects":
                  i = ["<object>", ["layerEffects", u(n)]];
                  break;
              }
              if (i) {
                a[r] = i;
              }
            }
          }
          return a;
        }
        return u({
          "layerEffects": e
        })["layerEffects"];
      };
      jamStyles.fromLayerEffectsObject = function(e) {
        return jamEngine.simplifyObject(e);
      };
      jamStyles.toBlendOptionsObject = function(e) {
        function s(e) {
          var t = {};
          for (var a in e) {
            if (e.hasOwnProperty(a)) {
              var r = e[a];
              var n = null;
              var i;
              switch (a) {
                case "blendClipped":
                case "blendInterior":
                case "layerMaskAsGlobalMask":
                case "transparencyShapesLayer":
                case "vectorMaskAsGlobalMask":
                  n = ["<boolean>", r];
                  break;
                case "srcBlackMin":
                case "srcBlackMax":
                case "srcWhiteMin":
                case "srcWhiteMax":
                case "destBlackMin":
                case "destBlackMax":
                case "destWhiteMin":
                case "destWhiteMax":
                  n = ["<integer>", r];
                  break;
                case "fillOpacity":
                case "opacity":
                  n = ["<unitDouble>", ["percentUnit", r]];
                  break;
                case "mode":
                  n = ["<enumerated>", ["blendMode", r]];
                  break;
                case "knockout":
                  n = ["<enumerated>", ["knockout", r]];
                  break;
                case "channel":
                  n = ["<reference>", [
                    ["channel", ["<enumerated>", ["channel", r]]]
                  ]];
                  break;
                case "blendRange":
                  i = [];
                  for (var o = 0; o < r.length; o++) {
                    i.push(["<object>", ["blendRange", s(r[o])]]);
                  }
                  n = ["<list>", i];
                  break;
                case "channelRestrictions":
                  i = [];
                  for (var o = 0; o < r.length; o++) {
                    i.push(["<enumerated>", ["channel", r[o]]]);
                  }
                  n = ["<list>", i];
                  break;
                case "blendOptions":
                  n = ["<object>", ["blendOptions", s(r)]];
                  break;
              }
              if (n) {
                t[a] = n;
              }
            }
          }
          return t;
        }
        return s({
          "blendOptions": e
        })["blendOptions"];
      };
      jamStyles.fromBlendOptionsObject = function(e) {
        var t = function(e, t, a) {
          var r = undefined;
          if (t === "channel") {
            var n = a(e, t);
            r = n[0]["channel"];
          }
          return r;
        };
        return jamEngine.simplifyObject(e, t);
      };
      jamStyles.toDocumentModeObject = function(e) {
        function i(e) {
          var t = {};
          for (var a in e) {
            if (e.hasOwnProperty(a)) {
              var r = e[a];
              var n = null;
              switch (a) {
                case "colorSpace":
                  n = ["<enumerated>", ["colorSpace", r]];
                  break;
                case "depth":
                  n = ["<integer>", r];
                  break;
                case "documentMode":
                  n = ["<object>", ["documentMode", i(r)]];
                  break;
              }
              if (n) {
                t[a] = n;
              }
            }
          }
          return t;
        }
        return i({
          "documentMode": e
        })["documentMode"];
      };
      jamStyles.fromDocumentModeObject = function(e) {
        return jamEngine.simplifyObject(e);
      };

      function p() {
        var e = {};
        var t = jamEngine.meaningfulIds;
        var a = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var r;
        r = jamEngine.jsonGet([
          ["property", ["<property>", "mode"]],
          ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        e["colorSpace"] = r["mode"][1][1];
        r = jamEngine.jsonGet([
          ["property", ["<property>", "depth"]],
          ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        e["depth"] = r["depth"][1];
        jamEngine.meaningfulIds = t;
        jamEngine.parseFriendly = a;
        return e;
      }

      function f() {
        var e = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var a = jamEngine.jsonGet([
          ["property", ["<property>", "resolution"]],
          ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        jamEngine.meaningfulIds = e;
        jamEngine.parseFriendly = t;
        return a["resolution"][1][1];
      }
      jamStyles.setLayerStyle = function(e, t) {
        if (e && ("blendOptions" in e || "layerEffects" in e)) {
          var a = {};
          if ("blendOptions" in e) {
            defaultBlendOptionsObj = {
              "mode": "normal",
              "opacity": 100,
              "fillOpacity": 100,
              "channelRestrictions": [],
              "knockout": "none",
              "blendInterior": false,
              "blendClipped": true,
              "transparencyShapesLayer": true,
              "layerMaskAsGlobalMask": false,
              "vectorMaskAsGlobalMask": false,
              "blendRange": []
            };
            var r = p();
            var n;
            var i;
            switch (r["colorSpace"]) {
              case "CMYKColorEnum":
              case "CMYK64":
                n = ["cyan", "magenta", "yellow", "black"];
                i = ["gray", "cyan", "magenta", "yellow", "black"];
                break;
              case "duotone":
              case "grayScale":
              case "gray16":
                n = ["black"];
                i = ["black"];
                break;
              case "labColor":
              case "lab48":
                n = ["lightness", "a", "b"];
                i = ["lightness", "a", "b"];
                break;
              case "RGBColor":
              case "RGB48":
                n = ["red", "green", "blue"];
                i = ["gray", "red", "green", "blue"];
                break;
            }
            defaultBlendOptionsObj["channelRestrictions"] = n;
            for (var o = 0; o < i.length; o++) {
              defaultBlendRangeObj = {
                "channel": i[o],
                "srcBlackMin": 0,
                "srcBlackMax": 0,
                "srcWhiteMin": 255,
                "srcWhiteMax": 255,
                "destBlackMin": 0,
                "destBlackMax": 0,
                "destWhiteMin": 255,
                "destWhiteMax": 255
              };
              defaultBlendOptionsObj["blendRange"].push(defaultBlendRangeObj);
            }
            var s = jamUtils.mergeData(e["blendOptions"], defaultBlendOptionsObj);
            var c = this.toBlendOptionsObject(s)[1][1];
            for (var l in c) {
              if (c.hasOwnProperty(l)) {
                a[l] = c[l];
              }
            }
          }
          var u;
          if ("layerEffects" in e) {
            u = e["layerEffects"];
            a["layerEffects"] = this.toLayerEffectsObject(u);
          }
          jamEngine.jsonPlay("set", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]],
            "to": ["<object>", ["layer", a]]
          });
          if (u) {
            if ("scale" in u && !t) {
              this.scaleLayerEffects(f() / 72 / (u["scale"] / 100) * 100);
            }
          }
        } else {
          this.clearLayerStyle();
        }
      };

      function u() {
        var e = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var a = jamEngine.jsonGet([
          ["property", ["<property>", "presetManager"]],
          ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        var r = a["presetManager"][1];
        var n;
        for (var i = 0; i < r.length; i++) {
          var o = r[i][1];
          if (o[0] === "styleClass") {
            n = o[1]["name"][1].length;
            break;
          }
        }
        jamEngine.meaningfulIds = e;
        jamEngine.parseFriendly = t;
        return n;
      }

      function y() {
        var e = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var a = false;
        try {
          var r = jamEngine.jsonGet([
            ["property", ["<property>", "background"]],
            ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]);
          a = !r["background"][1];
        } catch (e) {}
        var e = jamEngine.meaningfulIds;
        var t = jamEngine.parseFriendly;
        return a;
      }
      jamStyles.getLayerStyle = function() {
        var e = null;
        if (y()) {
          var t = u();
          var a = new Date();
          var r = "Temp-Layer-Style-" + a.getTime();
          try {
            jamEngine.jsonPlay("make", {
              "target": ["<reference>", [
                ["style", ["<class>", null]]
              ]],
              "name": ["<string>", r],
              "using": ["<reference>", [
                ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
              ]],
              "blendOptions": ["<boolean>", true],
              "layerEffects": ["<boolean>", true]
            });
          } catch (e) {}
          var n = u();
          if (n === t + 1) {
            var i = new File(Folder.temp + "/" + r + ".asl");
            jamEngine.jsonPlay("set", {
              "target": ["<path>", i.fsName],
              "to": ["<list>", [
                ["<reference>", [
                  ["style", ["<index>", n]]
                ]]
              ]]
            });
            jamEngine.jsonPlay("delete", {
              "target": ["<list>", [
                ["<reference>", [
                  ["style", ["<index>", n]]
                ]]
              ]]
            });
            var o = this.dataFromStylesFile(i);
            if (typeof o === "string") {
              alert(o + "\n" + "Styles file: “" + File.decode(i.name) + "”");
            } else {
              e = o["styles"][0];
              if ("name" in e) {
                delete e["name"];
              }
              if ("ID" in e) {
                delete e["ID"];
              }
              if ("documentMode" in e) {
                delete e["documentMode"];
              }
              if ("layerEffects" in e) {
                var s = e["layerEffects"];
                if ("masterFXSwitch" in s) {
                  delete s["masterFXSwitch"];
                }
              }
            }
            if (arguments.length > 0) {
              var c = arguments[0];
              if (c && c.constructor === Object) {
                if ("patterns" in c) {
                  var l = this.patternsFromStylesFile(i);
                  if (typeof l === "string") {
                    alert(l + "\n" + "Styles file: “" + File.decode(i.name) + "”");
                  } else {
                    c["patterns"] = l;
                  }
                }
              }
            }
            i.remove();
          }
        }
        return e;
      };
      jamStyles.copyLayerStyle = function() {
        try {
          jamEngine.jsonPlay("copyEffects", null);
        } catch (e) {}
      };
      jamStyles.pasteLayerStyle = function() {
        try {
          jamEngine.jsonPlay("pasteEffects", {});
        } catch (e) {}
      };
      jamStyles.clearLayerStyle = function() {
        try {
          jamEngine.jsonPlay("disableLayerStyle", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]]
          });
        } catch (e) {}
      };
      jamStyles.applyLayerStyle = function(e, t) {
        var a = {
          "target": ["<reference>", [
            ["style", ["<name>", e]]
          ]],
          "to": ["<reference>", [
            ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]]
        };
        if (typeof t !== "undefined" && t) {
          a["merge"] = ["<boolean>", t];
        }
        jamEngine.jsonPlay("applyStyle", a);
      };
      jamStyles.scaleLayerEffects = function(e) {
        jamEngine.jsonPlay("scaleEffectsEvent", {
          "scale": ["<unitDouble>", ["percentUnit", e]]
        });
      };
      jamStyles.removeLayerEffect = function(e) {
        try {
          jamEngine.jsonPlay("disableSingleFX", {
            "target": ["<reference>", [
              [e, ["<class>", null]],
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]]
          });
        } catch (e) {}
      };
      jamStyles.removeLayerEffects = function(e) {
        for (var t = 0; t < e.length; t++) {
          this.removeLayerEffect(e[t]);
        }
      };
      jamStyles.removeAllLayerEffects = function() {
        try {
          jamEngine.jsonPlay("disableLayerFX", {
            "target": ["<reference>", [
              ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
            ]]
          });
        } catch (e) {}
      };
      jamStyles.showHideLayerEffects = function(e, t) {
        var a = [];
        for (var r = 0; r < e.length; r++) {
          a.push(["<reference>", [
            [e[r],
              ["<class>", null]
            ],
            ["layer", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]]);
        }
        try {
          jamEngine.jsonPlay(t ? "show" : "hide", {
            "target": ["<list>", a]
          }, DialogModes.NO);
        } catch (e) {}
      };
      jamStyles.showHideLayerEffect = function(e, t) {
        this.showHideLayerEffects([e], t);
      };
      jamStyles.showHideAllLayerEffects = function(e) {
        this.showHideLayerEffects(["layerEffects"], e);
      };
      jamStyles.showHideAllDocumentEffects = function(e) {
        jamEngine.jsonPlay("set", {
          "target": ["<reference>", [
            ["property", ["<property>", "layerFXVisible"]],
            ["document", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]],
          "to": ["<object>", ["layerFXVisible", {
            "layerFXVisible": ["<boolean>", e || false]
          }]]
        });
      };

      function a(e, t, a) {
        var r = {
          "globalLightingAngle": ["<unitDouble>", ["angleUnit", t]]
        };
        if (typeof a !== "undefined") {
          r["globalAltitude"] = ["<unitDouble>", ["angleUnit", a]];
        }
        jamEngine.jsonPlay("set", {
          "target": ["<reference>", [
            ["property", ["<property>", "globalAngle"]],
            [e, ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]],
          "to": ["<object>", ["globalAngle", r]]
        });
      }
      jamStyles.setApplicationGlobalAngle = function(e, t) {
        a("application", e, t);
      };
      jamStyles.setDocumentGlobalAngle = function(e, t) {
        a("document", e, t);
      };

      function k(e, t) {
        var a = e.read(t);
        var r = 0;
        for (var n = 0; n < t; n++) {
          r = (r << 8) + a.charCodeAt(n);
        }
        return r;
      }

      function j(e) {
        var t = "";
        var a = k(e, 4);
        for (var r = 0; r < a; r++) {
          var n = k(e, 2);
          if (n !== 0) {
            t += String.fromCharCode(n);
          }
        }
        return t;
      }

      function l(e, t) {
        return e.read(t);
      }

      function E(e) {
        var t = k(e, 1);
        return l(e, t);
      }
      jamStyles.dataFromStylesFile = function(e, t) {
        var a = ["Bitmap", "Grayscale", "Indexed", "RGB", "CMYK", null, null, "Multichannel", "Duotone", "Lab"];
        var r;
        if (typeof e === "string") {
          r = new File(e);
        } else if (e instanceof File) {
          r = e;
        }
        var n;
        if (r.open("r")) {
          try {
            r.encoding = "BINARY";
            var i;
            if (this.isStylesPalette(r)) {
              i = 2;
            } else if (this.isStylesFile(r)) {
              i = k(r, 2);
            }
            if (i === 2) {
              var o = r.read(4);
              if (o === "8BSL") {
                var s = k(r, 2);
                if (s === 3) {
                  var c = k(r, 4);
                  var l = r.tell() + c;
                  if (t) {
                    var u = [];
                    while (r.tell() < l) {
                      var p = {};
                      var f = k(r, 4);
                      var y = r.tell() + f;
                      var g = k(r, 4);
                      p["version"] = g;
                      if (g === 1) {
                        p["imageMode"] = a[k(r, 4)];
                        p["height"] = k(r, 2);
                        p["width"] = k(r, 2);
                        p["name"] = j(r);
                        p["ID"] = E(r);
                      } else {
                        p["error"] = "Unsupported version";
                      }
                      u.push(p);
                      r.seek(y + (4 - f % 4) % 4, 0);
                    }
                  }
                  r.seek(l, 0);
                  var d = jamEngine.meaningfulIds;
                  var m = jamEngine.parseFriendly;
                  jamEngine.meaningfulIds = true;
                  jamEngine.parseFriendly = true;
                  var h;
                  var v;
                  var b = [];
                  var T = k(r, 4);
                  for (var S = 0; S < T; S++) {
                    var I = {};
                    var x = k(r, 4);
                    var D = r.tell() + x;
                    h = jamActions.readActionDescriptor(r);
                    v = jamEngine.classIdAndActionDescriptorToJson(0, h)["<descriptor>"];
                    I["name"] = v["name"][1];
                    I["ID"] = v["ID"][1];
                    h = jamActions.readActionDescriptor(r);
                    v = jamEngine.classIdAndActionDescriptorToJson(0, h)["<descriptor>"];
                    if ("documentMode" in v) {
                      I["documentMode"] = this.fromDocumentModeObject(v["documentMode"]);
                    }
                    if ("blendOptions" in v) {
                      I["blendOptions"] = this.fromBlendOptionsObject(v["blendOptions"]);
                    }
                    if ("layerEffects" in v) {
                      I["layerEffects"] = this.fromLayerEffectsObject(v["layerEffects"]);
                    }
                    b.push(I);
                    r.seek(D, 0);
                  }
                  jamEngine.meaningfulIds = d;
                  jamEngine.parseFriendly = m;
                  n = {};
                  if (t) {
                    n["patterns"] = u;
                  }
                  n["styles"] = b;
                } else {
                  throw new Error("[jamStyles.dataFromStylesFile] Unrecognized sub-version: " + s);
                }
              } else {
                throw new Error("[jamStyles.dataFromStylesFile] Unrecognized magic number: " + o);
              }
            } else {
              throw new Error("[jamStyles.dataFromStylesFile] Unrecognized format version: " + i);
            }
          } catch (e) {
            n = e.message;
          } finally {
            r.close();
          }
        } else {
          n = "[jamStyles.dataFromStylesFile] Cannot open file";
        }
        return n;
      };
      jamStyles.patternsFromStylesFile = function(e) {
        var t;
        if (typeof e === "string") {
          t = new File(e);
        } else if (e instanceof File) {
          t = e;
        }
        var a;
        if (t.open("r")) {
          try {
            t.encoding = "BINARY";
            var r;
            if (this.isStylesPalette(t)) {
              r = 2;
            } else if (this.isStylesFile(t)) {
              r = k(t, 2);
            }
            if (r === 2) {
              var n = t.read(4);
              if (n === "8BSL") {
                var i = k(t, 2);
                if (i === 3) {
                  var o = k(t, 4);
                  var s = t.tell() + o;
                  var a = [];
                  while (t.tell() < s) {
                    var c = k(t, 4);
                    a.push(l(t, c));
                    t.seek((4 - c % 4) % 4, 1);
                  }
                } else {
                  throw new Error("[jamStyles.patternsFromStylesFile] Unrecognized sub-version: " + i);
                }
              } else {
                throw new Error("[jamStyles.patternsFromStylesFile] Unrecognized magic number: " + n);
              }
            } else {
              throw new Error("[jamStyles.patternsFromStylesFile] Unrecognized format version: " + r);
            }
          } catch (e) {
            a = e.message;
          } finally {
            t.close();
          }
        } else {
          a = "[jamStyles.patternsFromStylesFile] Cannot open file";
        }
        return a;
      };
      jamStyles.patternsFileFromPatterns = function(e, t) {
        var a;
        if (typeof e === "string") {
          a = new File(e);
        } else if (e instanceof File) {
          a = e;
        }
        if (a.open("w", "8BPT", "8BIM")) {
          a.encoding = "BINARY";
          a.write("8BPT");
          a.write("\0");
          var r = t.length;
          a.write(String.fromCharCode(r >> 24 & 255, r >> 16 & 255, r >> 8 & 255, r & 255));
          for (var n = 0; n < r; n++) {
            a.write(t[n]);
          }
          a.close();
        }
      };
    })();
  }
  if (typeof jamUtils !== "object") {
    var jamUtils = {};
    (function() {
      jamUtils.toDistanceUnit = function(e, t) {
        return e / t * 72;
      };
      jamUtils.fromDistanceUnit = function(e, t) {
        return e / 72 * t;
      };
      jamUtils.fontExists = function(e) {
        var t = true;
        var a = false;
        if (t) {
          for (var r = 0; r < app.fonts.length; r++) {
            if (app.fonts[r].postScriptName === e) {
              a = true;
              break;
            }
          }
        } else {
          var n = jamEngine.meaningfulIds;
          var i = jamEngine.parseFriendly;
          jamEngine.meaningfulIds = true;
          jamEngine.parseFriendly = true;
          var o = jamEngine.jsonGet([
            ["property", ["<property>", "fontList"]],
            ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
          ]);
          var s = o["fontList"][1][1]["fontPostScriptName"][1];
          for (var r = 0; r < s.length; r++) {
            if (s[r][1] === e) {
              a = true;
              break;
            }
          }
          jamEngine.meaningfulIds = n;
          jamEngine.parseFriendly = i;
        }
        return a;
      };
      jamUtils.loadAction = function(e, t, a) {
        try {
          jamEngine.jsonGet([
            ["action", ["<name>", e]],
            ["actionSet", ["<name>", t]]
          ]);
          var r = true;
        } catch (e) {
          var r = false;
        }
        if (!r) {
          jamEngine.jsonPlay("open", {
            "target": ["<path>", a]
          });
        }
      };
      jamUtils.loadActionSet = function(e, t) {
        try {
          jamEngine.jsonGet([
            ["actionSet", ["<name>", e]]
          ]);
          var a = true;
        } catch (e) {
          var a = false;
        }
        if (!a) {
          jamEngine.jsonPlay("open", {
            "target": ["<path>", t]
          });
        }
      };
      jamUtils.loadPreset = function(e, t, a) {
        var r = false;
        var n = true;
        var i = {
          "brush": "brush",
          "colors": "color",
          "gradientClassEvent": "gradientClassEvent",
          "style": "styleClass",
          "pattern": "'PttR'",
          "shapingCurve": "shapingCurve",
          "customShape": "customShape",
          "toolPreset": "toolPreset"
        };
        var o = i[e];
        var s = jamEngine.meaningfulIds;
        var c = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = true;
        var l = false;
        var u = jamEngine.jsonGet([
          ["property", ["<property>", "presetManager"]],
          ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
        ]);
        var p = u["presetManager"][1];
        for (var f = 0; f < p.length; f++) {
          var y = p[f][1];
          if (y[0] === o) {
            var g = y[1]["name"][1];
            for (var d = 0; d < g.length; d++) {
              if (g[d][1] === t) {
                l = true;
                break;
              }
            }
            break;
          }
        }
        if (!l) {
          if (r) {
            app.load(new File(a));
          } else if (n) {
            jamEngine.jsonPlay("open", {
              "target": ["<path>", a]
            });
          } else {
            jamEngine.jsonPlay("set", {
              "target": ["<reference>", [
                ["property", ["<property>", e]],
                ["application", ["<enumerated>", ["ordinal", "targetEnum"]]]
              ]],
              "to": ["<path>", a],
              "append": ["<boolean>", true]
            });
          }
        }
        jamEngine.meaningfulIds = s;
        jamEngine.parseFriendly = c;
      };

      function r(e) {
        var t;
        if (e instanceof File) {
          t = e;
        } else if (typeof e === "string") {
          t = new File(e);
        } else {
          throw new Error("[jamUtils getFileObject] Invalid argument");
        }
        return t;
      }
      jamUtils.readTextFile = function(e) {
        var t = null;
        var a = r(e);
        if (a.open("r")) {
          t = a.read();
          a.close();
        }
        return t;
      };
      jamUtils.readJsonFile = function(e) {
        return jamJSON.parse(this.readTextFile(e), true);
      };
      jamUtils.writeTextFile = function(e, t) {
        var a = r(e);
        if (a.open("w", "TEXT")) {
          a.encoding = "UTF-8";
          a.lineFeed = "unix";
          a.write("\ufeff");
          a.write(t);
          a.close();
        }
      };
      jamUtils.writeJsonFile = function(e, t, a) {
        this.writeTextFile(e, jamJSON.stringify(t, a));
      };
      jamUtils.cloneData = function(e) {
        var t;
        if (e === null) {
          t = e;
        } else if (e.constructor === Object) {
          t = {};
          for (var a in e) {
            if (e.hasOwnProperty(a)) {
              t[a] = this.cloneData(e[a]);
            }
          }
        } else if (e.constructor === Array) {
          t = [];
          for (var r = 0; r < e.length; r++) {
            t.push(this.cloneData(e[r]));
          }
        } else {
          t = e;
        }
        return t;
      };
      jamUtils.mergeData = function(e, t) {
        for (var a in t) {
          if (t.hasOwnProperty(a)) {
            if (a in e) {
              if (t[a] !== null && t[a].constructor === Object) {
                e[a] = this.mergeData(e[a], t[a]);
              }
            } else {
              e[a] = this.cloneData(t[a]);
            }
          }
        }
        return e;
      };
      var o = "jsonCustomOptions";
      jamUtils.getCustomOptions = function(e, t) {
        var a = jamEngine.meaningfulIds;
        var r = jamEngine.parseFriendly;
        jamEngine.meaningfulIds = true;
        jamEngine.parseFriendly = false;
        try {
          var n = jamEngine.classIdAndActionDescriptorToJson(jamEngine.uniIdStrToId(e), app.getCustomOptions(e));
          var i = jamJSON.parse(n["<descriptor>"][o]["<string>"], true);
        } catch (e) {
          var i = {};
        }
        jamEngine.meaningfulIds = a;
        jamEngine.parseFriendly = r;
        return this.mergeData(i, t);
      };
      jamUtils.putCustomOptions = function(e, t, a) {
        var r = {};
        r[o] = ["<string>", jamJSON.stringify(t)];
        app.putCustomOptions(e, jamEngine.jsonToActionDescriptor(r), a);
      };
      jamUtils.eraseCustomOptions = function(e) {
        app.eraseCustomOptions(e);
      };
      jamUtils.dataToHexaString = function(e, t) {
        var a = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        var r = "";
        var n = e.length;
        for (var i = 0; i < n; i++) {
          var o = e.charCodeAt(i);
          if (o >= 0 && o <= 255) {
            r += a[(o & 240) >> 4] + a[o & 15];
          } else {
            throw new Error("[jamUtils.dataToHexaString] Invalid data string");
          }
        }
        if (t) {
          r = r.toLowerCase();
        }
        return r;
      };
      jamUtils.hexaToDataString = function(e) {
        var t = "";
        var a = e.length;
        if (a % 2 === 0 && /^[0-9A-Fa-f]*$/.test(e)) {
          for (var r = 0; r < a; r += 2) {
            var n = e.slice(r, r + 2);
            t += String.fromCharCode(parseInt(n, 16));
          }
        } else {
          throw new Error("[jamUtils.hexaToDataString] Invalid hexa string");
        }
        return t;
      };
    })();
  }
  var charID = {
    "Back": 1113678699,
    "Background": 1113811815,
    "Bottom": 1114926957,
    "By": 1115234336,
    "Channel": 1130917484,
    "Contract": 1131312227,
    "Document": 1147366766,
    "Expand": 1165521006,
    "FrameSelect": 1718838636,
    "Horizontal": 1215461998,
    "Layer": 1283027488,
    "Left": 1281713780,
    "Move": 1836021349,
    "None": 1315925605,
    "Null": 1853189228,
    "Offset": 1332114292,
    "Ordinal": 1332896878,
    "PixelUnit": 592476268,
    "Point": 1349415968,
    "Property": 1349677170,
    "Right": 1382508660,
    "Select": 1936483188,
    "Set": 1936028772,
    "Size": 1400512544,
    "Target": 1416783732,
    "Text": 1417180192,
    "TextLayer": 1417170034,
    "TextShapeType": 1413830740,
    "TextStyle": 1417180243,
    "TextStyleRange": 1417180276,
    "To": 1411391520,
    "Top": 1416589344,
    "Vertical": 1450341475
  };
  var _SAFE_PARAGRAPH_PROPS = ["align", "alignment", "firstLineIndent", "startIndent", "endIndent", "spaceBefore", "spaceAfter", "autoLeadingPercentage", "leadingType", "hyphenate", "hyphenateWordSize", "hyphenatePreLength", "hyphenatePostLength", "hyphenateLimit", "hyphenationZone", "hyphenateCapitalized", "hangingRoman", "burasagari", "textEveryLineComposer", "textComposerEngine"];
  var _DEFAULT_SELECTION_SCALE = .9;
  var _MIN_TEXTBOX_WIDTH = 10;
  var _TEMP_SELECTION_CHANNEL = "__TyperSelectionTemp__";
  var _DEFAULT_ADJUST_SEQUENCE = [-5, -5, -5, -5, -5, -5, 5, 5, 5, 5, 5, 5];
  var _hostState = {
    "fallbackTextSize": 20,
    "setActiveLayerText": {
      "data": null,
      "result": ""
    },
    "createTextLayerInSelection": {
      "data": null,
      "result": "",
      "point": false,
      "padding": 0
    },
    "alignTextLayerToSelection": {
      "result": "",
      "resize": false,
      "padding": 0
    },
    "changeActiveLayerTextSize": {
      "value": 0,
      "result": ""
    },
    "selectionMonitor": {
      "lastBoundsKey": null,
      "callback": null
    },
    "createTextLayersInStoredSelections": {
      "data": null,
      "result": "",
      "point": false,
      "padding": 0,
      "selections": []
    },
    "lastOpenedDocId": null
  };

  function _clone(e) {
    if (!e || typeof e !== "object") return e;
    if (e instanceof Array) {
      var t = [];
      for (var a = 0; a < e.length; a++) {
        t[a] = _clone(e[a]);
      }
      return t;
    }
    var r = {};
    for (var n in e) {
      if (e.hasOwnProperty(n)) {
        r[n] = _clone(e[n]);
      }
    }
    return r;
  }

  function _getHostDefaultStyle() {
    return {
      "layerText": {
        "textGridding": "none",
        "orientation": "horizontal",
        "antiAlias": "antiAliasSmooth",
        "textStyleRange": [{
          "from": 0,
          "to": 100,
          "textStyle": {
            "fontPostScriptName": "Tahoma",
            "fontName": "Tahoma",
            "fontStyleName": "Regular",
            "fontScript": 0,
            "fontTechnology": 1,
            "fontAvailable": true,
            "size": 14,
            "impliedFontSize": 14,
            "horizontalScale": 100,
            "verticalScale": 100,
            "autoLeading": true,
            "tracking": 0,
            "baselineShift": 0,
            "impliedBaselineShift": 0,
            "autoKern": "metricsKern",
            "fontCaps": "normal",
            "digitSet": "defaultDigits",
            "diacXOffset": 0,
            "markYDistFromBaseline": 100,
            "otbaseline": "normal",
            "ligature": false,
            "altligature": false,
            "connectionForms": false,
            "contextualLigatures": false,
            "baselineDirection": "withStream",
            "color": {
              "red": 0,
              "green": 0,
              "blue": 0
            }
          }
        }],
        "paragraphStyleRange": [{
          "from": 0,
          "to": 100,
          "paragraphStyle": {
            "burasagari": "burasagariNone",
            "singleWordJustification": "justifyAll",
            "justificationMethodType": "justifMethodAutomatic",
            "textEveryLineComposer": false,
            "alignment": "center",
            "hangingRoman": true,
            "hyphenate": true
          }
        }]
      },
      "typeUnit": "pixelsUnit"
    };
  }

  function _getHostDefaultStroke() {
    return {
      "enabled": false,
      "size": 0,
      "opacity": 100,
      "position": "outer",
      "color": {
        "r": 255,
        "g": 255,
        "b": 255
      }
    };
  }

  function _ensureStyle(e) {
    var t = e ? _clone(e) : {};
    if (!t.textProps || !t.textProps.layerText) {
      t.textProps = _getHostDefaultStyle();
    }
    if (typeof t.stroke === "undefined") {
      t.stroke = _getHostDefaultStroke();
    }
    return t;
  }

  function _changeToPointText() {
    try {
      if (app.activeDocument && app.activeDocument.activeLayer && app.activeDocument.activeLayer.textItem) {
        app.activeDocument.activeLayer.textItem.kind = TextType.POINTTEXT;
        return;
      }
    } catch (e) {}
    var e = new ActionReference();
    e.putProperty(charID.Property, charID.TextShapeType);
    e.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var t = new ActionDescriptor();
    t.putReference(charID.Null, e);
    t.putEnumerated(charID.To, charID.TextShapeType, charID.Point);
    executeAction(charID.Set, t, DialogModes.NO);
  }

  function _changeToBoxText() {
    var e = new ActionReference();
    e.putProperty(charID.Property, charID.TextShapeType);
    e.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var t = new ActionDescriptor();
    t.putReference(charID.Null, e);
    t.putEnumerated(charID.To, charID.TextShapeType, stringIDToTypeID("box"));
    executeAction(charID.Set, t, DialogModes.NO);
  }

  function _layerIsTextLayer() {
    var e = _getCurrent(charID.Layer, charID.Text);
    return e.hasKey(charID.Text);
  }

  function _textLayerIsPointText() {
    var e = _getCurrent(charID.Layer, charID.Text).getObjectValue(charID.Text);
    var t = e.getList(stringIDToTypeID("textShape")).getObjectValue(0).getEnumerationValue(charID.TextShapeType);
    return t === charID.Point;
  }

  function _getTextLayerSize() {
    try {
      var e = jamText.getLayerText();
      if (e && e.layerText && e.layerText.textStyleRange && e.layerText.textStyleRange[0] && e.layerText.textStyleRange[0].textStyle && e.layerText.textStyleRange[0].textStyle.size) {
        return e.layerText.textStyleRange[0].textStyle.size;
      }
    } catch (e) {}
    return _hostState.fallbackTextSize || 20;
  }

  function _convertPixelToPoint(e) {
    return parseInt(e) / activeDocument.resolution * 72;
  }

  function _createCurrent(e, t) {
    var a = new ActionReference();
    if (t > 0) a.putProperty(charID.Property, t);
    a.putEnumerated(e, charID.Ordinal, charID.Target);
    return a;
  }

  function _getCurrent(e, t) {
    return executeActionGet(_createCurrent(e, t));
  }

  function _deselect() {
    var e = new ActionReference();
    e.putProperty(charID.Channel, charID.FrameSelect);
    var t = new ActionDescriptor();
    t.putReference(charID.Null, e);
    t.putEnumerated(charID.To, charID.Ordinal, charID.None);
    executeAction(charID.Set, t, DialogModes.NO);
  }

  function _getBoundsFromDescriptor(e) {
    var t = e.getInteger(charID.Top);
    var a = e.getInteger(charID.Left);
    var r = e.getInteger(charID.Right);
    var n = e.getInteger(charID.Bottom);
    return {
      "top": t,
      "left": a,
      "right": r,
      "bottom": n,
      "width": r - a,
      "height": n - t,
      "xMid": (a + r) / 2,
      "yMid": (t + n) / 2
    };
  }

  function _getCurrentSelectionBounds() {
    var e = _getCurrent(charID.Document, charID.FrameSelect);
    if (e.hasKey(charID.FrameSelect)) {
      var t = e.getObjectValue(charID.FrameSelect);
      return _getBoundsFromDescriptor(t);
    }
  }

  function _getCurrentTextLayerBounds() {
    var e = stringIDToTypeID("bounds");
    var t = _getCurrent(charID.Layer, e).getObjectValue(e);
    return _getBoundsFromDescriptor(t);
  }

  function _modifySelectionBounds(e) {
    if (e == 0) return;
    var t = new ActionDescriptor();
    t.putUnitDouble(charID.By, charID.PixelUnit, Math.abs(e));
    executeAction(e > 0 ? charID.Expand : charID.Contract, t, DialogModes.NO);
  }

  function _getAdjustedSelectionBounds(e, t) {
    if (!e || t === 0) return e;
    var a;
    try {
      a = app.activeDocument;
    } catch (e) {
      a = null;
    }
    if (!a || !a.selection) {
      return _getAdjustedSelectionBoundsFallback(e, t);
    }
    var r = _createTempSelectionChannel(a);
    if (!r) {
      return _getAdjustedSelectionBoundsFallback(e, t);
    }
    var n = null;
    try {
      _modifySelectionBounds(t);
      n = _getCurrentSelectionBounds();
    } catch (e) {
      n = null;
    } finally {
      try {
        a.selection.load(r);
      } catch (e) {}
      try {
        r.remove();
      } catch (e) {}
    }
    if (!n) {
      return _getAdjustedSelectionBoundsFallback(e, t);
    }
    return n;
  }

  function _createTempSelectionChannel(e) {
    var t = null;
    try {
      t = e.channels.getByName(_TEMP_SELECTION_CHANNEL);
      t.remove();
    } catch (e) {}
    try {
      t = e.channels.add();
      t.name = _TEMP_SELECTION_CHANNEL;
      e.selection.store(t);
      return t;
    } catch (e) {
      if (t) {
        try {
          t.remove();
        } catch (e) {}
      }
      return null;
    }
  }

  function _getAdjustedSelectionBoundsFallback(e, t) {
    if (!e || t === 0) return e;
    var a = Math.abs(t);
    if (t < 0) {
      if (e.width <= a * 2 || e.height <= a * 2) {
        return null;
      }
      var r = {
        "top": e.top + a,
        "left": e.left + a,
        "right": e.right - a,
        "bottom": e.bottom - a
      };
      r.width = r.right - r.left;
      r.height = r.bottom - r.top;
      r.xMid = (r.left + r.right) / 2;
      r.yMid = (r.top + r.bottom) / 2;
      return r;
    } else {
      var n = {
        "top": Math.max(e.top - a, 0),
        "left": Math.max(e.left - a, 0),
        "right": e.right + a,
        "bottom": e.bottom + a
      };
      n.width = n.right - n.left;
      n.height = n.bottom - n.top;
      n.xMid = (n.left + n.right) / 2;
      n.yMid = (n.top + n.bottom) / 2;
      return n;
    }
  }

  function _clampAdjustAmount(e, t) {
    if (!e || t >= 0) return t;
    var a = Math.floor(Math.min(e.width, e.height) / 2 - 1);
    if (a <= 0) return 0;
    return -Math.min(Math.abs(t), a);
  }

  function _getAdjustedSelectionBoundsSequence(e, t, a) {
    if (!e || !t || !t.length) return e;
    var r;
    try {
      r = app.activeDocument;
    } catch (e) {
      r = null;
    }
    if (!r || !r.selection) {
      return _getAdjustedSelectionBoundsSequenceFallback(e, t);
    }
    var n = _createTempSelectionChannel(r);
    if (!n) {
      return _getAdjustedSelectionBoundsSequenceFallback(e, t);
    }
    var i = e;
    try {
      if (a && a > 0) {
        _modifySelectionBounds(a);
        i = _getCurrentSelectionBounds();
        if (!i) {
          i = e;
        }
        var o = _clampAdjustAmount(i, -a);
        if (o !== 0) {
          _modifySelectionBounds(o);
          i = _getCurrentSelectionBounds();
          if (!i) {
            i = e;
          }
        }
      }
      for (var s = 0; s < t.length; s++) {
        var c = _clampAdjustAmount(i, t[s]);
        if (c === 0) continue;
        _modifySelectionBounds(c);
        i = _getCurrentSelectionBounds();
        if (!i) break;
      }
    } catch (e) {
      i = null;
    } finally {
      try {
        r.selection.load(n);
      } catch (e) {}
      try {
        n.remove();
      } catch (e) {}
    }
    if (!i) {
      return _getAdjustedSelectionBoundsSequenceFallback(e, t);
    }
    return i;
  }

  function _getAdjustedSelectionBoundsSequenceFallback(e, t) {
    if (!e || !t || !t.length) return e;
    var a = e;
    for (var r = 0; r < t.length; r++) {
      var n = _clampAdjustAmount(a, t[r]);
      a = _getAdjustedSelectionBoundsFallback(a, n);
      if (!a) break;
    }
    return a;
  }

  function _selectionBoundsKey(e) {
    if (!e) return "";
    return e.xMid + "_" + e.yMid + "_" + e.width + "_" + e.height;
  }

  function _calculateSelectionDimensions(e, t) {
    if (!e) return {
      "width": 0,
      "height": 0
    };
    var a = e.width * _DEFAULT_SELECTION_SCALE;
    if (t > 0) {
      a = Math.max(a - t * 2, _MIN_TEXTBOX_WIDTH);
    }
    return {
      "width": a,
      "height": e.height
    };
  }

  function _resizeTextBoxToContent(e, t) {
    var a = jamText.getLayerText();
    var r = a.layerText.textStyleRange[0].textStyle.size;
    _setTextBoxSize(e, t.height + r + 2);
  }

  function _positionLayerWithinSelection(e, t) {
    if (!e || !t) return;
    var a = e.xMid - t.xMid;
    var r = e.yMid - t.yMid;
    _moveLayer(a, r);
  }

  function _createMagicWandSelection(e) {
    try {
      var t = _getCurrentTextLayerBounds();
      var a = Math.max(t.left - 5, 0);
      var r = Math.max(t.yMid, 0);
      var n = new ActionDescriptor();
      var i = new ActionReference();
      i.putProperty(charID.Channel, charID.FrameSelect);
      n.putReference(charID.Null, i);
      var o = new ActionDescriptor();
      o.putUnitDouble(charID.Horizontal, charID.PixelUnit, a);
      o.putUnitDouble(charID.Vertical, charID.PixelUnit, r);
      n.putObject(charID.To, stringIDToTypeID("paint"), o);
      n.putInteger(stringIDToTypeID("tolerance"), e || 20);
      n.putBoolean(stringIDToTypeID("merged"), true);
      n.putBoolean(stringIDToTypeID("antiAlias"), true);
      executeAction(charID.Set, n, DialogModes.NO);
    } catch (e) {}
  }

  function _moveLayer(e, t) {
    var a = new ActionDescriptor();
    a.putUnitDouble(charID.Horizontal, charID.PixelUnit, e);
    a.putUnitDouble(charID.Vertical, charID.PixelUnit, t);
    var r = new ActionDescriptor();
    r.putReference(charID.Null, _createCurrent(charID.Layer));
    r.putObject(charID.To, charID.Offset, a);
    executeAction(charID.Move, r, DialogModes.NO);
  }

  function _getLayerStroke() {
    var e = new ActionReference();
    e.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Lefx"));
    e.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var t = executeActionGet(e);
    if (!t.hasKey(charIDToTypeID("Lefx"))) return null;
    var a = t.getObjectValue(charIDToTypeID("Lefx"));
    if (!a.hasKey(charIDToTypeID("FrFX"))) return null;
    var r = a.getObjectValue(charIDToTypeID("FrFX"));
    var n = r.getObjectValue(charIDToTypeID("Clr "));
    return {
      "enabled": r.getBoolean(charIDToTypeID("enab")),
      "position": r.getEnumerationValue(charIDToTypeID("Styl")) == charIDToTypeID("OutF") ? "outer" : "other",
      "size": r.getUnitDoubleValue(charIDToTypeID("Sz  ")),
      "opacity": r.getUnitDoubleValue(charIDToTypeID("Opct")),
      "color": {
        "r": n.getDouble(charIDToTypeID("Rd  ")),
        "g": n.getDouble(charIDToTypeID("Grn ")),
        "b": n.getDouble(charIDToTypeID("Bl  "))
      }
    };
  }

  function _setLayerStroke(e) {
    if (!e || !e.enabled || !(e.size > 0)) return;
    var t = new ActionDescriptor();
    var a = new ActionReference();
    a.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Lefx"));
    a.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    t.putReference(charIDToTypeID("null"), a);
    var r = new ActionDescriptor();
    r.putUnitDouble(charIDToTypeID("Scl "), charIDToTypeID("#Prc"), 100);
    var n = new ActionDescriptor();
    n.putBoolean(charIDToTypeID("enab"), true);
    n.putBoolean(stringIDToTypeID("present"), true);
    n.putBoolean(stringIDToTypeID("showInDialog"), true);
    // Vị trí viền: Outer/Center/Inner — bản gốc TypeR luôn cố định "OutF" (Outer), giờ đọc đúng
    // theo e.position để 3 lựa chọn trên giao diện thực sự có tác dụng khác nhau.
    var posEnum = "OutF";
    if (e.position === "center") posEnum = "CtrF";
    else if (e.position === "inner") posEnum = "InsF";
    n.putEnumerated(charIDToTypeID("Styl"), charIDToTypeID("FStl"), charIDToTypeID(posEnum));
    n.putEnumerated(charIDToTypeID("PntT"), charIDToTypeID("FrFl"), charIDToTypeID("SClr"));
    n.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), charIDToTypeID("Nrml"));
    n.putUnitDouble(charIDToTypeID("Sz  "), charIDToTypeID("#Pxl"), e.size || 3);
    n.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), e.opacity || 100);
    var i = new ActionDescriptor();
    i.putDouble(charIDToTypeID("Rd  "), e.color.r);
    i.putDouble(charIDToTypeID("Grn "), e.color.g);
    i.putDouble(charIDToTypeID("Bl  "), e.color.b);
    n.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), i);
    r.putObject(charIDToTypeID("FrFX"), charIDToTypeID("FrFX"), n);
    t.putObject(charIDToTypeID("T   "), charIDToTypeID("Lefx"), r);
    executeAction(charIDToTypeID("setd"), t, DialogModes.NO);
  }

  function _setDiacXOffset(e) {
    var t = new ActionDescriptor();
    var a = new ActionReference();
    a.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("TxtS"));
    a.putEnumerated(charIDToTypeID("TxLr"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    t.putReference(charIDToTypeID("null"), a);
    var r = new ActionDescriptor();
    r.putInteger(stringIDToTypeID("textOverrideFeatureName"), 808466486);
    r.putInteger(stringIDToTypeID("typeStyleOperationType"), 3);
    r.putUnitDouble(stringIDToTypeID("diacXOffset"), charIDToTypeID("#Pxl"), e);
    t.putObject(charIDToTypeID("T   "), charIDToTypeID("TxtS"), r);
    executeAction(charIDToTypeID("setd"), t, DialogModes.NO);
  }

  function _setMarkYOffset(e) {
    var t = new ActionDescriptor();
    var a = new ActionReference();
    a.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("TxtS"));
    a.putEnumerated(charIDToTypeID("TxLr"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    t.putReference(charIDToTypeID("null"), a);
    var r = new ActionDescriptor();
    r.putInteger(stringIDToTypeID("textOverrideFeatureName"), 808466488);
    r.putInteger(stringIDToTypeID("typeStyleOperationType"), 3);
    r.putUnitDouble(stringIDToTypeID("markYDistFromBaseline"), charIDToTypeID("#Pxl"), e);
    t.putObject(charIDToTypeID("T   "), charIDToTypeID("TxtS"), r);
    executeAction(charIDToTypeID("setd"), t, DialogModes.NO);
  }

  function _applyMiddleEast(e) {
    if (!e) return;
    if (e.diacXOffset != null) _setDiacXOffset(e.diacXOffset);
    if (e.markYDistFromBaseline != null) _setMarkYOffset(e.markYDistFromBaseline);
  }

  function _applyTextDirection(e, t) {
    if (!e) return;
    var a = e === "rtl" ? "dirRightToLeft" : "dirLeftToRight";
    try {
      var r = jamText.getLayerText();
      if (!r || !r.layerText || !r.layerText.paragraphStyleRange || !r.layerText.paragraphStyleRange.length) {
        return;
      }
      var n = _clone(r);
      var i = n.layerText.paragraphStyleRange;
      var o = t;
      if (o == null && n.layerText && n.layerText.textKey) {
        o = n.layerText.textKey.length;
      }
      for (var s = 0; s < i.length; s++) {
        var c = i[s] || {};
        var l = c.paragraphStyle || {};
        l.directionType = a;
        l.textComposerEngine = "textOptycaComposer";
        c.paragraphStyle = l;
        if (o != null) {
          c.from = typeof c.from === "number" ? c.from : 0;
          c.to = o;
        }
        i[s] = c;
      }
      n.layerText.paragraphStyleRange = i;
      jamText.setLayerText(n);
    } catch (e) {}
  }

  function _buildRichTextRanges(e, t, a) {
    if (!e || !e.textStyle || !t || !t.length) return null;
    var r = [];
    var n = 0;
    for (var i = 0; i < t.length; i++) {
      var o = t[i] || {};
      var s = o.text || "";
      var c = s.length;
      if (!c) continue;
      var l = _clone(e.textStyle);
      if (o.bold) l.syntheticBold = true;
      if (o.italic) l.syntheticItalic = true;
      r.push({
        "from": n,
        "to": n + c,
        "textStyle": l
      });
      n += c;
    }
    if (n < a) {
      r.push({
        "from": n,
        "to": a,
        "textStyle": _clone(e.textStyle)
      });
    }
    return r.length ? r : null;
  }

  function _applyRichTextRanges(e, t, a) {
    if (!e || !e.layerText || !t || !t.length) return false;
    var r = e.layerText.textStyleRange && e.layerText.textStyleRange[0];
    var n = _buildRichTextRanges(r, t, a);
    if (!n) return false;
    e.layerText.textStyleRange = n;
    return true;
  }

  function _createAndSetLayerText(e, t, a) {
    var r = _ensureStyle(e.style);
    r.textProps.layerText.textKey = e.text.replace(/\n+/g, "\r");
    r.textProps.layerText.textStyleRange[0].to = e.text.length;
    r.textProps.layerText.paragraphStyleRange[0].to = e.text.length;
    _applyRichTextRanges(r.textProps, e.richTextRuns, e.text.length);
    var n = r.textProps.layerText.textStyleRange[0].textStyle.size;
    if (typeof n !== "number") {
      try {
        var i = jamText.getLayerText();
        _hostState.fallbackTextSize = i.layerText.textStyleRange[0].textStyle.size;
      } catch (e) {}
      r.textProps.layerText.textStyleRange[0].textStyle.size = _hostState.fallbackTextSize;
    }
    r.textProps.layerText.textShape = [{
      "textType": "box",
      "orientation": "horizontal",
      "bounds": {
        "top": 0,
        "left": 0,
        "right": _convertPixelToPoint(t),
        "bottom": _convertPixelToPoint(a)
      }
    }];
    jamEngine.jsonPlay("make", {
      "target": ["<reference>", [
        ["textLayer", ["<class>", null]]
      ]],
      "using": jamText.toLayerTextObject(r.textProps)
    });
    _applyMiddleEast(r.textProps.layerText.textStyleRange[0].textStyle);
    if (r.stroke) {
      _setLayerStroke(r.stroke);
    }
    if (e.direction) {
      _applyTextDirection(e.direction, e.text.length);
    }
  }

  function _setTextBoxSize(e, t) {
    var a = [{
      "textType": "box",
      "orientation": "horizontal",
      "bounds": {
        "top": 0,
        "left": 0,
        "right": _convertPixelToPoint(e),
        "bottom": _convertPixelToPoint(t)
      }
    }];
    jamText.setLayerText({
      "layerText": {
        "textShape": a
      }
    });
  }

  function _checkSelection(e) {
    var t = _getCurrentSelectionBounds();
    if (t === undefined) {
      return {
        "error": "noSelection"
      };
    }
    var a = 0;
    var r = null;
    var n = 0;
    if (e && e.adjustAmount !== undefined) {
      a = e.adjustAmount;
    }
    if (e && e.adjustSequence && e.adjustSequence.length) {
      r = e.adjustSequence;
    }
    if (e && e.preExpandAmount !== undefined) {
      n = e.preExpandAmount;
    }
    var i = t;
    if (r) {
      i = _getAdjustedSelectionBoundsSequence(t, r, n);
    } else if (a !== 0) {
      i = _getAdjustedSelectionBounds(t, a);
    }
    if (!i || i.width * i.height < 200) {
      return {
        "error": "smallSelection"
      };
    }
    return i;
  }

  function _forEachSelectedLayer(e) {
    var t = [];
    var a = new ActionReference();
    var r = stringIDToTypeID("targetLayers");
    a.putProperty(charID.Property, r);
    a.putEnumerated(charID.Document, charID.Ordinal, charID.Target);
    var n = executeActionGet(a);
    if (n.hasKey(r)) {
      n = n.getList(r);
      var i = new ActionReference();
      i.putProperty(charID.Property, charID.Background);
      i.putEnumerated(charID.Layer, charID.Ordinal, charID.Back);
      var o = executeActionGet(i).getBoolean(charID.Background) ? 0 : 1;
      for (var s = 0; s < n.count; s++) {
        t.push(n.getReference(s).getIndex() + o);
      }
    }
    if (t.length > 1) {
      for (var c = 0; c < t.length; c++) {
        var l = new ActionDescriptor();
        var u = new ActionReference();
        u.putIndex(charID.Layer, t[c]);
        l.putReference(charID.Null, u);
        executeAction(charID.Select, l, DialogModes.NO);
        e(t[c]);
      }
      var p = new ActionReference();
      for (var f = 0; f < t.length; f++) {
        p.putIndex(charID.Layer, t[f]);
      }
      var y = new ActionDescriptor();
      y.putReference(charID.Null, p);
      executeAction(charID.Select, y, DialogModes.NO);
    } else if (t.length === 1) {
      e(t[0]);
    } else {
      // (Tauri port) Đồng bộ với bản chính ở trên — fallback khi CS6 không trả về
      // targetLayers hợp lệ, coi như thao tác trên layer active hiện tại.
      e();
    }
  }

  function _setActiveLayerText() {
    var e = _hostState.setActiveLayerText;
    var L = e.data;
    e.result = "";
    if (!L) {
      return;
    } else if (!documents.length) {
      e.result = "doc";
      return;
    } else if (!_layerIsTextLayer()) {
      e.result = "layer";
      return;
    }
    var P = L.text;
    var A = L.style;
    var O = L.richTextRuns;
    var F = 0;
    _forEachSelectedLayer(function() {
      var e = _getCurrentTextLayerBounds();
      var t = _textLayerIsPointText();
      if (t) _changeToBoxText();
      var a = jamText.getLayerText();
      var r;
      if (P && A) {
        r = A.textProps;
        if (r.layerText.textStyleRange[0].textStyle.size == null && a.layerText.textStyleRange && a.layerText.textStyleRange[0] && a.layerText.textStyleRange[0].textStyle.size != null) {
          r.layerText.textStyleRange[0].textStyle.size = a.layerText.textStyleRange[0].textStyle.size;
        }
        r.layerText.textKey = P.replace(/\n+/g, "\r");
        r.layerText.textStyleRange[0].to = P.length;
        r.layerText.paragraphStyleRange[0].to = P.length;
        F = P.length;
        _applyRichTextRanges(r, O, F);
      } else if (P) {
        r = {
          "layerText": {
            "textKey": P.replace(/\n+/g, "\r")
          }
        };
        if (a.layerText.textStyleRange && a.layerText.textStyleRange[0]) {
          r.layerText.textStyleRange = [a.layerText.textStyleRange[0]];
          r.layerText.textStyleRange[0].to = P.length;
        }
        if (a.layerText.paragraphStyleRange && a.layerText.paragraphStyleRange[0]) {
          var n = a.layerText.paragraphStyleRange[0].paragraphStyle || {};
          var i = {};
          for (var o = 0; o < _SAFE_PARAGRAPH_PROPS.length; o++) {
            var s = _SAFE_PARAGRAPH_PROPS[o];
            if (n[s] !== undefined) {
              i[s] = n[s];
            }
          }
          r.layerText.paragraphStyleRange = [{
            "from": 0,
            "to": P.length,
            "paragraphStyle": i
          }];
        }
        F = P.length;
        _applyRichTextRanges(r, O, F);
      } else if (A) {
        var c = a.layerText.textKey || "";
        r = A.textProps;
        r.layerText.textStyleRange[0].to = c.length;
        r.layerText.paragraphStyleRange[0].to = c.length;
        F = c.length;
      }
      var l = a.layerText.textShape && a.layerText.textShape[0];
      if (t && l && l.bounds) {
        var u = a.layerText.textStyleRange && a.layerText.textStyleRange[0] && a.layerText.textStyleRange[0].textStyle;
        var p = A && A.textProps && A.textProps.layerText && A.textProps.layerText.textStyleRange && A.textProps.layerText.textStyleRange[0] && A.textProps.layerText.textStyleRange[0].textStyle;
        var f = u && u.size;
        var y = p && p.size != null ? p.size : f;
        var g = f && y ? y / f : 1;
        if (!(g > 0)) g = 1;
        if (g < 1) g = 1;
        var d = l.bounds;
        var m = d.right - d.left;
        var h = d.bottom - d.top;
        var v = typeof e.width === "number" ? _convertPixelToPoint(e.width) : m;
        var b = typeof e.height === "number" ? _convertPixelToPoint(e.height) : h;
        var T = m * g;
        var S = h * g;
        if (T < v * g) T = v * g;
        var I = (y || f || 12) * .5;
        if (T < v + I) T = v + I;
        var x = (y || f || 12) * .75;
        if (S < b * g) S = b * g;
        if (S < b + x) S = b + x;
        d.right = d.left + T;
        d.bottom = d.top + S;
      }
      r.layerText.antiAlias = a.layerText.antiAlias || "antiAliasSmooth";
      if (l) {
        r.layerText.textShape = [l];
      }
      r.typeUnit = a.typeUnit;
      jamText.setLayerText(r);
      var D = L.direction;
      if (D === "") D = null;
      _applyTextDirection(D, F);
      _applyMiddleEast(r.layerText.textStyleRange[0].textStyle);
      if (A && A.stroke) {
        _setLayerStroke(A.stroke);
      }
      var k = _getCurrentTextLayerBounds();
      if (t) {
        _changeToPointText();
      } else {
        var j = 12;
        var E = A && A.textProps.layerText.textStyleRange[0].textStyle.size;
        if (E != null) {
          j = E;
        } else if (a.layerText.textStyleRange && a.layerText.textStyleRange[0] && a.layerText.textStyleRange[0].textStyle.size != null) {
          j = a.layerText.textStyleRange[0].textStyle.size;
        }
        r.layerText.textShape[0].bounds.bottom = _convertPixelToPoint(k.height + j + 2);
        jamText.setLayerText({
          "layerText": {
            "textShape": r.layerText.textShape
          }
        });
      }
      k = _getCurrentTextLayerBounds();
      if (!e.bottom) e = k;
      var C = e.xMid - k.xMid;
      var w = e.yMid - k.yMid;
      _moveLayer(C, w);
    });
    e.result = "";
  }

  function _createTextLayerInSelection() {
    var e = _hostState.createTextLayerInSelection;
    if (!documents.length) {
      e.result = "doc";
      return;
    }
    var t = _hostState.fallbackTextSize || 20;
    var a = _ensureStyle(e.data.style);
    if (a && a.textProps && a.textProps.layerText && a.textProps.layerText.textStyleRange && a.textProps.layerText.textStyleRange[0] && a.textProps.layerText.textStyleRange[0].textStyle && a.textProps.layerText.textStyleRange[0].textStyle.size) {
      t = a.textProps.layerText.textStyleRange[0].textStyle.size;
    }
    var r = _checkSelection({
      "adjustSequence": _DEFAULT_ADJUST_SEQUENCE,
      "preExpandAmount": t
    });
    if (r.error) {
      e.result = r.error;
      return;
    }
    var n = _calculateSelectionDimensions(r, e.padding);
    _createAndSetLayerText(e.data, n.width, n.height);
    var i = _getCurrentTextLayerBounds();
    if (e.point) {
      _changeToPointText();
    } else {
      _resizeTextBoxToContent(n.width, i);
    }
    i = _getCurrentTextLayerBounds();
    _positionLayerWithinSelection(r, i);
    e.result = "";
  }

  // Ghi log debug rỗng (bản gốc TypeR ghi vào 1 buffer để debug, TypoCore không cần hiện ra) —
  // giữ hàm này để không phải sửa lại hàng trăm chỗ gọi _logDebug(...) trong code Auto-Fit gốc.
  // Đo tâm layer chữ bằng cách duplicate + Rasterize rồi đo bounds pixel THẬT (giống bản gốc trước
  // khi có Align/Auto-Fit) — thay cho _getCurrentTextLayerBounds() (đọc "bounds" qua Action Manager
  // trên layer vector chưa rasterize), vì cách đó có thể lệch so với pixel thật sự hiển thị, gây
  // canh giữa bị lệch có hệ thống (thường lệch trái) đã xác nhận qua so sánh với bản cũ.
  function _logDebug(msg) {}

  // Đo tâm layer chữ bằng cách duplicate + Rasterize rồi đo bounds pixel THẬT (giống bản gốc
  // TypoCore trước khi có Align/Auto-Fit) — thay cho _getCurrentTextLayerBounds() (đọc "bounds"
  // qua Action Manager trên layer vector chưa render, có thể dựa theo font metrics/ascent-descent
  // chứ không phải mực thật đã in ra — với tiếng Việt có dấu, dòng có dấu và dòng không dấu sẽ cho
  // kết quả đo không nhất quán, gây lệch tâm theo trục dọc).
  function _getRasterizedTextLayerBounds() {
    var layer = app.activeDocument.activeLayer;
    var dup = layer.duplicate();
    dup.rasterize(RasterizeType.ENTIRELAYER);
    var b = dup.bounds;
    var left = b[0].as("px"), top = b[1].as("px"), right = b[2].as("px"), bottom = b[3].as("px");
    dup.remove();
    app.activeDocument.activeLayer = layer; // duplicate()/remove() có thể đổi layer active -> khôi
                                             // phục đúng lại layer chữ gốc, tránh bước sau (di
                                             // chuyển layer) bị nhắm nhầm sang layer khác.
    return {
      "top": top, "left": left, "right": right, "bottom": bottom,
      "width": right - left, "height": bottom - top,
      "xMid": (left + right) / 2, "yMid": (top + bottom) / 2
    };
  }

  function _isCJK(e) {var t = e.charCodeAt(0);return t >= 19968 && t <= 40959 || t >= 13312 && t <= 19903 || t >= 12352 && t <= 12447 || t >= 12448 && t <= 12543 || t >= 44032 && t <= 55215 || t >= 65280 && t <= 65519;}
  function _estimateCharWidth(e) {var t = e.charCodeAt(0);if (_isCJK(e)) return 2;if (t >= 1536 && t <= 1791) return 1.1;if (t >= 1872 && t <= 1919) return 1.1;if (t >= 64336 && t <= 65023) return 1.1;if (t >= 65136 && t <= 65279) return 1.1;if (t >= 3584 && t <= 3711) return 1.2;if (t >= 2304 && t <= 2431) return 1.2;if (e === "M" || e === "W") return 1.5;if (e >= "A" && e <= "Z") return 1.2;if (e === "m" || e === "w") return 1.4;if (e === "i" || e === "l" || e === "!" || e === "|" || e === "1") return .5;if (e === "j" || e === "f" || e === "t" || e === "r") return .7;if (e === "." || e === "," || e === ":" || e === ";" || e === "'" || e === '"') return .4;if (e === "-" || e === "–" || e === "—") return .7;if (e === "…") return 1.5;return 1;}
  function _estimateWordWidth(e) {var t = 0;for (var r = 0; r < e.length; r++) {var a = e.charCodeAt(r);if (a >= 55296 && a <= 56319 && r + 1 < e.length) {var n = e.charCodeAt(r + 1);if (n >= 56320 && n <= 57343) {t += 2;r++;continue;}}t += _estimateCharWidth(e.charAt(r));}return t;}
  function _splitTextToWords(e) {var t = [];var r = "";for (var a = 0; a < e.length; a++) {var n = e.charAt(a);var o = e.charCodeAt(a);if (o >= 55296 && o <= 56319 && a + 1 < e.length) {var i = e.charCodeAt(a + 1);if (i >= 56320 && i <= 57343) {if (r.length > 0) {t.push(r);r = "";}t.push(e.charAt(a) + e.charAt(a + 1));a++;continue;}}if (n === " ") {if (r.length > 0) {t.push(r);r = "";}} else if (_isCJK(n)) {if (r.length > 0) {t.push(r);r = "";}t.push(n);} else {r += n;}}if (r.length > 0) t.push(r);return t;}
  function _joinWords(e) {if (e.length === 0) return "";var t = e[0];for (var r = 1; r < e.length; r++) {var a = t.charAt(t.length - 1);var n = e[r].charAt(0);if (_isCJK(a) || _isCJK(n)) {t += e[r];} else {t += " " + e[r];}}return t;}
  function _startsWithEllipsis(e) {if (e.charAt(0) === "…") return true;if (e.length >= 3 && e.charAt(0) === "." && e.charAt(1) === "." && e.charAt(2) === ".") return true;return false;}
  function _endsWithEllipsis(e) {var t = e.length;if (t > 0 && e.charAt(t - 1) === "…") return true;if (t >= 3 && e.charAt(t - 1) === "." && e.charAt(t - 2) === "." && e.charAt(t - 3) === ".") return true;return false;}
  function _padLineBreaks(e) {var t = e.replace(/([^ ])\r/g, "$1 \r");var r = t.split("\r");for (var a = 0; a < r.length; a++) {var n = r[a];var o = n.replace(/^\s+/, "").replace(/\s+$/, "");if (o.length > 1 && _startsWithEllipsis(o)) {r[a] = "  " + n;}o = r[a].replace(/^\s+/, "").replace(/\s+$/, "");if (o.length > 1 && _endsWithEllipsis(o)) {r[a] = r[a] + "  ";}}return r.join("\r");}
  function _makeDiamondTargets(e, t) {var r = [], a = 0;if (e <= 2) {r = e === 1 ? [ 1 ] : [ 1.1, .9 ];a = e === 1 ? 1 : 2;} else {var n = e / 2;for (var o = 0; o < e; o++) {var i = o + .5 - n;var s = Math.sqrt(1 - i * i / (n * n));if (s < .35) s = .35;r.push(s);a += s;}}var l = [];for (var o = 0; o < e; o++) l.push(r[o] / a * t);return l;}
  function _optimalSplit(e, t, r, a) {var n = e.length;var o = a;var i = .5;if (o >= n) {var s = [];for (var l = 0; l < n; l++) s.push(e[l]);return s.join("\r");}var c = [ 0 ];for (var l = 0; l < n; l++) {c.push(c[l] + t[l]);}var u = 1e18;var p = [];var g = [];for (var l = 0; l <= n; l++) {p.push([]);g.push([]);for (var h = 0; h <= o; h++) {p[l].push(u);g[l].push(0);}}p[0][0] = 0;for (var h = 1; h <= o; h++) {for (var l = h; l <= n - (o - h); l++) {for (var f = h - 1; f < l; f++) {if (p[f][h - 1] >= u) continue;var d = l - f - 1;var y = c[l] - c[f] + d * i;var v = r[h - 1];var m = y - v;var b = p[f][h - 1] + m * m;if (b < p[l][h]) {p[l][h] = b;g[l][h] = f;}}}}var T = [];var D = n;for (var h = o; h >= 1; h--) {T.push(g[D][h]);D = g[D][h];}T.reverse();T.push(n);var x = [];for (var l = 0; l < o; l++) {var S = [];for (var I = T[l]; I < T[l + 1]; I++) {S.push(e[I]);}x.push(_joinWords(S));}return x.join("\r");}
  function _shapeEqualLines(e, t) {if (t > e.length) t = e.length;if (t <= 1) return _joinWords(e);var r = [];var a = 0;for (var n = 0; n < e.length; n++) {r.push(_estimateWordWidth(e[n]));a += r[n];}var o = a / t;var i = [];for (var n = 0; n < t; n++) {i.push(o);}return _optimalSplit(e, r, i, t);}
  function _shapeWide(e) {var t;if (e.length <= 5) t = 2; else if (e.length <= 12) t = 3; else if (e.length <= 20) t = 4; else t = 5;if (t > e.length) t = e.length;return _shapeEqualLines(e, t);}
  function _shapeTall(e) {var t = Math.min(Math.max(4, Math.ceil(e.length / 2)), 7);return _shapeEqualLines(e, t);}
  function _getLineWidthsFromLines(e) {
    var t = [];
    for (var r = 0; r < e.length; r++) {
      var a = _splitTextToWords(e[r]);
      var n = 0;
      var o = 0;
      for (var i = 0; i < a.length; i++) {
        n += _estimateWordWidth(a[i]);
        if (i > 0) {
          var s = a[i - 1].charAt(a[i - 1].length - 1);
          var l = a[i].charAt(0);
          if (!_isCJK(s) && !_isCJK(l)) { o++; }
        }
      }
      n += o * .5;
      t.push(n);
    }
    return t;
  }
  function _computeResultDiamondScore(e) {
    var t = e.split("\r");
    if (t.length < 3) return 0;
    var r = _getLineWidthsFromLines(t);
    var a = Math.floor(t.length / 2);
    var n = t.length % 2 === 0;
    var o = n ? (r[a - 1] + r[a]) / 2 : r[a];
    var i = (r[0] + r[t.length - 1]) / 2;
    var s = o - i;
    var l = 0;
    for (var c = 0; c < Math.floor(t.length / 2); c++) {
      var u = Math.abs(r[c] - r[t.length - 1 - c]);
      l += u;
    }
    l = l / Math.max(1, Math.floor(t.length / 2));
    var p = 0;
    for (var c = 1; c <= a; c++) {
      if (r[c] < r[c - 1]) p += r[c - 1] - r[c];
    }
    for (var c = a + 1; c < t.length; c++) {
      if (r[c] > r[c - 1]) p += r[c] - r[c - 1];
    }
    return s - l * .3 - p * 2;
  }

  function _shapeCircular(e, t, r) {var a = e.length;if (a <= 2) return _joinWords(e);var n = [];var o = 0;for (var i = 0; i < e.length; i++) {n.push(_estimateWordWidth(e[i]));o += n[i];}var s;if (a <= 5) s = 2; else if (a <= 8) s = 3; else if (a <= 12) s = 4; else if (a <= 14) s = 5; else if (a <= 25) s = 6; else s = 7;var l;if (t && r && t > 0 && r > 0) {var c = Math.sqrt(o * r * .6 / t);l = Math.max(2, Math.min(10, Math.round(c)));var u = Math.max(2, Math.floor(a / 2));l = Math.min(l, u, s + 1);_logDebug("[SHAPE] numLines: table=" + s + "  raw=" + c.toFixed(2) + "  maxByWords=" + u + "  final=" + l);} else {l = s;_logDebug("[SHAPE] numLines: table=" + s + " (no dimensions)");}l = Math.max(2, l);if (l > a) l = a;var p = _makeDiamondTargets(l, o);var g = _optimalSplit(e, n, p, l);var h = g.split("\r");_logDebug("[SHAPE] Split(" + l + 'L): "' + g.replace(/\r/g, " | ") + '"');if (h.length >= 3) {var f = _splitTextToWords(h[0]);var d = _splitTextToWords(h[1]);var y = 0;for (var v = 0; v < f.length; v++) y += _estimateWordWidth(f[v]);var m = 0;for (var v = 0; v < d.length; v++) m += _estimateWordWidth(d[v]);var b = p[0];var T = p[Math.floor(p.length / 2)];var D = h.length >= 3 && b < T * .7;var x = false;if (!D) {x = f.length === 1 || f.length === 2 && y < m * .55;} else if (f.length === 1 && y < b * .35) {x = true;}if (x) {_logDebug("[WARN] Orphan first: " + f.length + " words  wFL=" + Math.round(y) + " wSL=" + Math.round(m) + " ratio=" + (y / m).toFixed(2));}if (x && d.length >= 3) {var S = f.concat([ d[0] ]);var I = d.slice(1);var k = 0;for (var v = 0; v < S.length; v++) k += _estimateWordWidth(S[v]);var _ = 0;for (var v = 0; v < I.length; v++) _ += _estimateWordWidth(I[v]);if (_ >= k * .85) {h[0] = _joinWords(S);h[1] = _joinWords(I);_logDebug('[SHAPE] Orphan first: word-move fixed  "' + h[0] + " | " + h[1] + '"');} else {var E = _shapeEqualLines(e, l);var j = E.split("\r");var L = _splitTextToWords(j[0]);if (L.length >= 2) {h = j;_logDebug("[SHAPE] Orphan first: equal-split fixed");} else {_logDebug("[WARN] Orphan first: could not fix");}}}}if (h.length >= 2) {var C = h.length - 1;var A = _splitTextToWords(h[C]);var w = _splitTextToWords(h[C - 1]);var M = 0;for (var v = 0; v < A.length; v++) M += _estimateWordWidth(A[v]);var R = 0;for (var v = 0; v < w.length; v++) R += _estimateWordWidth(w[v]);var O = p[p.length - 1];var P = p[Math.floor(p.length / 2)];var F = h.length >= 3 && O < P * .7;var N = false;if (!F) {N = A.length === 1 || A.length === 2 && M < R * .55;} else if (A.length === 1 && M < O * .35) {N = true;}if (N) {_logDebug("[WARN] Orphan last: " + A.length + " words  wLast=" + Math.round(M) + " wPrev=" + Math.round(R) + " ratio=" + (M / R).toFixed(2));}if (N && w.length >= 2 && h.length >= 3) {var B = false;if (w.length >= 3) {var W = w.slice(0, w.length - 1);var z = [ w[w.length - 1] ].concat(A);var U = 0;for (var v = 0; v < W.length; v++) U += _estimateWordWidth(W[v]);var G = 0;for (var v = 0; v < z.length; v++) G += _estimateWordWidth(z[v]);if (U >= G * .85) {h[C - 1] = _joinWords(W);h[C] = _joinWords(z);B = true;_logDebug("[SHAPE] Orphan last: word-move fixed  wP=" + Math.round(U) + " wL=" + Math.round(G) + '  "' + h[C - 1] + " | " + h[C] + '"');}}if (!B) {var V = _shapeEqualLines(e, l);var H = V.split("\r");var K = _splitTextToWords(H[H.length - 1]);var J = _splitTextToWords(H[0]);if (K.length >= 2 && J.length >= 2) {var Y = Math.floor((H.length - 1) / 2);var X = 0;var q = _splitTextToWords(H[Y]);for (var v = 0; v < q.length; v++) X += _estimateWordWidth(q[v]);var $ = 0;var Z = _splitTextToWords(H[0]);for (var v = 0; v < Z.length; v++) $ += _estimateWordWidth(Z[v]);var Q = _splitTextToWords(H[H.length - 1]);for (var v = 0; v < Q.length; v++) $ += _estimateWordWidth(Q[v]);var ee = X - $ / 2;var te = Math.floor((h.length - 1) / 2);var re = 0;var ae = _splitTextToWords(h[te]);for (var v = 0; v < ae.length; v++) re += _estimateWordWidth(ae[v]);var ne = 0;var oe = _splitTextToWords(h[0]);for (var v = 0; v < oe.length; v++) ne += _estimateWordWidth(oe[v]);var ie = _splitTextToWords(h[h.length - 1]);for (var v = 0; v < ie.length; v++) ne += _estimateWordWidth(ie[v]);var se = re - ne / 2;_logDebug("[SHAPE] Orphan last: diamond  orig=" + Math.round(se) + "  equal=" + Math.round(ee));if (ee > se) {_logDebug("[SHAPE] Orphan last: equal-split wins");h = H;} else {_logDebug("[SHAPE] Orphan last: kept original (better diamond)");}} else {_logDebug("[WARN] Orphan last: fallback N-1 lines (" + (l - 1) + "L)");var le = _shapeEqualLines(e, l - 1);return le;}}}}var ce = h.join("\r");_logDebug('[SHAPE] Final: "' + ce.replace(/\r/g, " | ") + '"');if (l > 2 && a > 4) {var ue = false;var pe = p[0];var ge = p[Math.floor(p.length / 2)];var he = pe < ge * .7;for (var fe = 0; fe < h.length; fe++) {if (_splitTextToWords(h[fe]).length === 1) {if (he && (fe === 0 || fe === h.length - 1)) continue;ue = true;break;}}if (ue) {var de = l - 1;if (de >= 2) {var ye = _makeDiamondTargets(de, o);var ve = _optimalSplit(e, n, ye, de);var me = ve.split("\r");var be = false;for (var Te = 0; Te < me.length; Te++) {if (_splitTextToWords(me[Te]).length === 1) {be = true;break;}}if (!be) {_logDebug("[SHAPE] SingleWordFix: " + l + "L had single-word line, using " + de + "L");h = me;ce = ve;l = de;} else {_logDebug("[WARN] SingleWordLine: " + l + "L has single-word line, " + de + "L also has one");}}}}if (l > 2 && a >= 6) {var De = _computeResultDiamondScore(ce);var xe = ce;var Se = l;var Ie = Math.max(3, l - 2);for (var ke = l - 1; ke >= Ie; ke--) {var _e = _makeDiamondTargets(ke, o);var Ee = _optimalSplit(e, n, _e, ke);var je = _computeResultDiamondScore(Ee);var Le = Ee.split("\r");var Ce = false;if (Le.length >= 3) {var Ae = _e[0];var we = _e[Math.floor(_e.length / 2)];var Me = Ae < we * .7;if (!Me) {if (_splitTextToWords(Le[0]).length === 1) Ce = true;if (_splitTextToWords(Le[Le.length - 1]).length === 1) Ce = true;}}var Re = _getLineWidthsFromLines(Le);var Oe = 0, Pe = 0;for (var v = 0; v < Re.length; v++) {if (Re[v] > Oe) Oe = Re[v];Pe += Re[v];}var Fe = Pe / Le.length;var Ne = Fe > 0 ? Oe / Fe : 1;_logDebug("[SHAPE] DiamondCheck: " + Se + "L score=" + De.toFixed(1) + "  " + ke + "L score=" + je.toFixed(1) + "  orphan=" + Ce + "  spread=" + Ne.toFixed(2));if (Ne > 1.5) {_logDebug("[SHAPE] DiamondCheck: skip " + ke + "L (spread too high, font would shrink)");continue;}if (!Ce && je > De) {De = je;xe = Ee;Se = ke;}}if (Se !== l) {_logDebug("[SHAPE] DiamondFix: using " + Se + "L (score=" + De.toFixed(1) + ")");ce = xe;h = xe.split("\r");l = Se;}}return ce;}
  function _shapeTextForBubble(e, t, r, a) {e = e.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");var n = _splitTextToWords(e);var o = t.height > 0 ? t.width / t.height : 1;_logDebug("=== SHAPE " + Math.round(t.width) + "x" + Math.round(t.height) + " AR=" + o.toFixed(2) + " ===");_logDebug("[SEL] Bubble: " + Math.round(t.width) + "x" + Math.round(t.height) + "px  AR: " + o.toFixed(2) + "  Center: (" + Math.round(t.xMid) + "," + Math.round(t.yMid) + ")  TextArea: " + Math.round(r) + "x" + Math.round(a));_logDebug("[SHAPE] Text: " + n.length + " words  " + e.length + ' chars  "' + (e.length > 100 ? e.slice(0, 100) + "..." : e) + '"');if (n.length <= 2) {_logDebug("[SHAPE] Skip: <=2 words, no shaping needed");return e;}var i = o > 2;var s = o < .5;if (n.length === 3 && !i) {var l = _estimateWordWidth(n[0]);var c = _estimateWordWidth(n[1]);var u = _estimateWordWidth(n[2]);var p = l + c + u;var g = Math.max(l, c, u);var h = l === g ? 0 : c === g ? 1 : 2;_logDebug("[SHAPE] 3-word: w0=" + l.toFixed(1) + " w1=" + c.toFixed(1) + " w2=" + u.toFixed(1) + " longest=" + h + " AR=" + o.toFixed(2));if (s) {_logDebug("[SHAPE] 3-word tall: 3 lines");return _padLineBreaks(n.join("\r"));}if (h === 1 && g / (p / 3) > 1.15) {_logDebug("[SHAPE] 3-word: middle longest + prominent, 3 lines diamond");return _padLineBreaks(n.join("\r"));}var f = h === 0 ? c + u + .5 : l + c + .5;if (f / g >= .5) {if (h === 0) {_logDebug("[SHAPE] 3-word: first longest, merge 2+3");return _padLineBreaks(n[0] + "\r" + _joinWords([ n[1], n[2] ]));} else {_logDebug("[SHAPE] 3-word: last longest, merge 1+2");return _padLineBreaks(_joinWords([ n[0], n[1] ]) + "\r" + n[2]);}}_logDebug("[SHAPE] 3-word: similar widths, 2 lines");return _padLineBreaks(_joinWords([ n[0], n[1] ]) + "\r" + n[2]);}var d = i ? "WIDE (AR>2.0)" : s ? "TALL (AR<0.5)" : "CIRCULAR";_logDebug("[SHAPE] Mode: " + d);if (i) {var y = _shapeWide(n);_logDebug('[SHAPE] Result: "' + y.replace(/\r/g, " | ") + '"');return _padLineBreaks(y);} else if (s) {var y = _shapeTall(n);_logDebug('[SHAPE] Result: "' + y.replace(/\r/g, " | ") + '"');return _padLineBreaks(y);} else {return _padLineBreaks(_shapeCircular(n, r, a));}}
  function _applyAutoFitToLayer(e, t, r, a, n, o) {var i = t || 13;var s = e.width / e.height;var l = Math.min(s, 1 / s);var c = l > .75;var u, p, g, h;if (c) {var f = e.width / 1.414;var d = e.height / 1.414;var y = i * .15;u = f * (1 - y / 100);p = d * (1 - y / 100);g = (e.width - u) / 2;h = (e.height - p) / 2;} else {var v = i - 4 + 4 * l;g = e.width * (v / 100);h = e.height * (v / 100);var m = .2;if (g > e.width * m) g = e.width * m;if (h > e.height * m) h = e.height * m;u = e.width - g * 2;p = e.height - h * 2;}_logDebug("=== FIT " + Math.round(e.width) + "x" + Math.round(e.height) + " AR=" + s.toFixed(2) + " ===");_logDebug("[SEL] Bubble: " + Math.round(e.width) + "x" + Math.round(e.height) + "px  AR: " + s.toFixed(2) + "  circ=" + l.toFixed(2) + (c ? " ROUND" : " WIDE") + "  Center: (" + Math.round(e.xMid) + "," + Math.round(e.yMid) + ")");_logDebug("[FIT] hPad=" + Math.round(g) + "px vPad=" + Math.round(h) + "px  -> TextArea: " + Math.round(u) + "x" + Math.round(p) + "px");_logDebug("[FIT] Mode: autoShape=" + n + "  autoFit=" + o);if (u <= 0 || p <= 0) return;var b;try {b = jamText.getLayerText();} catch (e) {return;}if (!b || !b.layerText || !b.layerText.textStyleRange) return;if (o) {b.layerText.antiAlias = "antiAliasStrong";}if (n && b.layerText.textKey) {var T = b.layerText.textKey;var D = _shapeTextForBubble(T, e, u, p);if (D !== T) {b.layerText.textKey = D;var x = D.length;if (b.layerText.textStyleRange) {for (var S = 0; S < b.layerText.textStyleRange.length; S++) {b.layerText.textStyleRange[S].from = 0;b.layerText.textStyleRange[S].to = x;}}if (b.layerText.paragraphStyleRange) {var I = b.layerText.paragraphStyleRange[0].paragraphStyle || {};I.hyphenate = false;b.layerText.paragraphStyleRange = [ {"from": 0,"to": x,"paragraphStyle": I} ];}}}if (b.layerText.paragraphStyleRange) {for (var k = 0; k < b.layerText.paragraphStyleRange.length; k++) {if (b.layerText.paragraphStyleRange[k].paragraphStyle) {b.layerText.paragraphStyleRange[k].paragraphStyle.hyphenate = false;}}}var _ = b.layerText.textStyleRange;var E = _[0].textStyle.size || 20;var j = _[0].textStyle.leading || E * 1.2;var L = j / E;_logDebug("[FIT] InitFont: " + E.toFixed(1) + "pt  leading=" + j.toFixed(1) + "pt  ratio=" + L.toFixed(2) + "  chars=" + (b.layerText.textKey || "").replace(/[\r\n]/g, "").length);var C = _convertPixelToPoint(u * 5);var A = _convertPixelToPoint(p * 10);b.layerText.textShape = [ {"textType": "box","orientation": "horizontal","bounds": {"top": 0,"left": 0,"right": C,"bottom": A}} ];var w = b.layerText.textKey || "";if (o) {var M = w.replace(/\r/g, " ").split(/\s+/);var R = "";for (var O = 0; O < M.length; O++) {if (M[O].length > R.length) R = M[O];}var P = 6, F = 120, N = P;while (F - P > .5) {var B = (P + F) / 2;for (var S = 0; S < _.length; S++) {_[S].textStyle.size = B;_[S].textStyle.leading = B * L;_[S].textStyle.horizontalScale = 100;}try {jamText.setLayerText(b);} catch (e) {break;}var W = _getCurrentTextLayerBounds();if (!W || W.width <= 0) {F = B;continue;}if (W.width <= u && W.height <= p) {N = B;P = B;} else {F = B;}}N = Math.max(Math.floor(N * 10) / 10, 6);_logDebug("[FIT] BinarySearch: result=" + N.toFixed(1) + "pt");var z = (w.match(/\r/g) || []).length + 1;if (n && z >= 4 && M.length >= 6) {var U = w.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");var G = _splitTextToWords(U);if (G.length >= 4) {var V = z - 1;var H = [];var K = 0;for (var J = 0; J < G.length; J++) {H.push(_estimateWordWidth(G[J]));K += H[J];}var Y = _makeDiamondTargets(V, K);var X = _optimalSplit(G, H, Y, V);var q = X.split("\r");var $ = false;for (var Z = 0; Z < q.length; Z++) {var Q = _splitTextToWords(q[Z]);if (Q.length === 1 && Q[0].length <= 2 && !_isCJK(Q[0].charAt(0))) {$ = true;break;}}if (!$) {var ee = X;var te = ee.length;b.layerText.textKey = ee;for (var S = 0; S < _.length; S++) {b.layerText.textStyleRange[S].from = 0;b.layerText.textStyleRange[S].to = te;}if (b.layerText.paragraphStyleRange) {for (var S = 0; S < b.layerText.paragraphStyleRange.length; S++) {b.layerText.paragraphStyleRange[S].from = 0;b.layerText.paragraphStyleRange[S].to = te;}}var re = 6, ae = 120, ne = re;while (ae - re > .5) {var oe = (re + ae) / 2;for (var S = 0; S < _.length; S++) {_[S].textStyle.size = oe;_[S].textStyle.leading = oe * L;_[S].textStyle.horizontalScale = 100;}try {jamText.setLayerText(b);} catch (e) {break;}var ie = _getCurrentTextLayerBounds();if (!ie || ie.width <= 0) {ae = oe;continue;}if (ie.width <= u && ie.height <= p) {ne = oe;re = oe;} else {ae = oe;}}ne = Math.max(Math.floor(ne * 10) / 10, 6);var se = (ne - N) / N;_logDebug("[FIT] PostOpt: " + z + "L=" + N.toFixed(1) + "pt  " + V + "L=" + ne.toFixed(1) + "pt  gain=" + (se * 100).toFixed(1) + "%");if (se >= .1) {N = ne;w = ee;_logDebug("[FIT] PostOpt: using " + V + "L (+" + (se * 100).toFixed(1) + "% font)");} else {b.layerText.textKey = w;for (var S = 0; S < _.length; S++) {b.layerText.textStyleRange[S].from = 0;b.layerText.textStyleRange[S].to = w.length;}if (b.layerText.paragraphStyleRange) {for (var S = 0; S < b.layerText.paragraphStyleRange.length; S++) {b.layerText.paragraphStyleRange[S].from = 0;b.layerText.paragraphStyleRange[S].to = w.length;}}}}}}if (R.length > 0) {var le = _clone(b);le.layerText.textKey = R;if (le.layerText.textStyleRange) {for (var S = 0; S < le.layerText.textStyleRange.length; S++) {le.layerText.textStyleRange[S].from = 0;le.layerText.textStyleRange[S].to = R.length;le.layerText.textStyleRange[S].textStyle.size = N;le.layerText.textStyleRange[S].textStyle.leading = N * L;le.layerText.textStyleRange[S].textStyle.horizontalScale = 100;}}if (le.layerText.paragraphStyleRange) {for (var S = 0; S < le.layerText.paragraphStyleRange.length; S++) {le.layerText.paragraphStyleRange[S].from = 0;le.layerText.paragraphStyleRange[S].to = R.length;}}try {jamText.setLayerText(le);var ce = _getCurrentTextLayerBounds();if (ce && ce.width > u) {var ue = u / ce.width;N = Math.max(N * ue * .95, 6);}} catch (e) {_logDebug("error: " + e);}}for (var S = 0; S < _.length; S++) {_[S].textStyle.size = N;_[S].textStyle.leading = N * L;_[S].textStyle.horizontalScale = 100;}b.layerText.textKey = w;if (b.layerText.textStyleRange) {for (var S = 0; S < b.layerText.textStyleRange.length; S++) {b.layerText.textStyleRange[S].to = w.length;}}if (b.layerText.paragraphStyleRange) {for (var S = 0; S < b.layerText.paragraphStyleRange.length; S++) {b.layerText.paragraphStyleRange[S].to = w.length;}}var pe = 100;if (r && a && a < 100) {var ge = b.layerText.textKey || "";if (ge.length > 1) {var he = Math.min(N * 1.2, 120);if (he > N + .5) {var fe = a;var de = 100;var ye = -1;while (de - fe > 1) {var ve = Math.floor((fe + de) / 2);for (var S = 0; S < _.length; S++) {_[S].textStyle.size = he;_[S].textStyle.leading = he * L;_[S].textStyle.horizontalScale = ve;}try {jamText.setLayerText(b);} catch (e) {break;}var me = _getCurrentTextLayerBounds();if (me && me.width <= u && me.height <= p) {ye = ve;fe = ve;} else {de = ve;}}if (ye >= a) {N = he;pe = ye;_logDebug("[FIT] Scaling: " + ye + "% at " + he.toFixed(1) + "pt (min=" + a + "%)  +" + (he - N).toFixed(1) + "pt gain");} else {_logDebug("[WARN] Scaling: no improvement found (scBest=" + ye + "%)");}}}}_logDebug("[FIT] Result: " + N.toFixed(1) + "pt  scale=" + pe + "%  (was " + E.toFixed(1) + "pt  d=" + (N - E).toFixed(1) + "pt)");for (var S = 0; S < _.length; S++) {_[S].textStyle.size = N;_[S].textStyle.leading = N * L;_[S].textStyle.horizontalScale = pe;}b.layerText.textShape[0].bounds.right = C;b.layerText.textShape[0].bounds.bottom = A;try {jamText.setLayerText(b);} catch (e) {_logDebug("error: " + e);}var be = _getCurrentTextLayerBounds();if (be) {var Te = Math.round(be.width / u * 100);var De = Math.round(be.height / p * 100);_logDebug("[FIT] Rendered: " + Math.round(be.width) + "x" + Math.round(be.height) + "px  vs target " + Math.round(u) + "x" + Math.round(p) + "px  (W:" + Te + "% H:" + De + "%)");}var xe = _convertPixelToPoint((be ? be.width : u) + 20);var Se = _convertPixelToPoint(p + 10);b.layerText.textShape[0].bounds.right = xe;b.layerText.textShape[0].bounds.bottom = Se;try {jamText.setLayerText(b);} catch (e) {_logDebug("error: " + e);}} else {for (var S = 0; S < _.length; S++) {_[S].textStyle.size = E;_[S].textStyle.leading = j;_[S].textStyle.horizontalScale = 100;}b.layerText.textKey = w;if (b.layerText.textStyleRange) {for (var S = 0; S < b.layerText.textStyleRange.length; S++) {b.layerText.textStyleRange[S].to = w.length;}}if (b.layerText.paragraphStyleRange) {for (var S = 0; S < b.layerText.paragraphStyleRange.length; S++) {b.layerText.paragraphStyleRange[S].to = w.length;}}b.layerText.textShape[0].bounds.right = C;b.layerText.textShape[0].bounds.bottom = A;try {jamText.setLayerText(b);} catch (e) {_logDebug("error: " + e);}var be = _getCurrentTextLayerBounds();var xe = _convertPixelToPoint((be ? be.width : u) + 20);var Se = _convertPixelToPoint((be ? be.height : p) + 10);b.layerText.textShape[0].bounds.right = xe;b.layerText.textShape[0].bounds.bottom = Se;try {jamText.setLayerText(b);} catch (e) {_logDebug("error: " + e);}}var Ie = _getCurrentTextLayerBounds();if (Ie) {var ke = e.xMid - Ie.xMid;var _e = e.yMid - Ie.yMid;_moveLayer(ke, _e);_logDebug("[FIT] Final: " + Math.round(Ie.width) + "x" + Math.round(Ie.height) + "px in bubble " + Math.round(e.width) + "x" + Math.round(e.height) + "px  offset=(" + Math.round(ke) + "," + Math.round(_e) + ")");}_logDebug("=== END ===");}

  function _alignTextLayerToSelection() {
    var e = _hostState.alignTextLayerToSelection;
    if (!documents.length) {
      e.result = "doc";
      return;
    } else if (!_layerIsTextLayer()) {
      e.result = "layer";
      return;
    }
    var t = _getTextLayerSize();
    var a = _checkSelection({
      "adjustSequence": _DEFAULT_ADJUST_SEQUENCE,
      "preExpandAmount": t
    });
    if (a.error) {
      if (a.error === "noSelection") {
        _createMagicWandSelection(20);
        a = _checkSelection({
          "adjustSequence": _DEFAULT_ADJUST_SEQUENCE,
          "preExpandAmount": t
        });
      }
      if (a.error) {
        e.result = a.error;
        return;
      }
    }
    var r = _textLayerIsPointText();
    var n = _getRasterizedTextLayerBounds();
    if (e.resize && !r) {
      var i = _calculateSelectionDimensions(a, e.padding);
      _setTextBoxSize(i.width, i.height);
      var o = _getCurrentTextLayerBounds();
      _resizeTextBoxToContent(i.width, o);
      n = _getRasterizedTextLayerBounds();
    }
    _deselect();
    _positionLayerWithinSelection(a, n);
    // Auto Shape / Auto Fit (TypeR - darkmax159159357 fork, gốc Arcanos AL3mla8, MIT License) —
    // dùng chung ĐÚNG vùng bóng thoại "a" đã Magic Wand + cắt đuôi ở trên, không dò lại lần nữa.
    var autoFitErrMsg = "";
    if (e.autoShape || e.autoFit) {
      try {
        _applyAutoFitToLayer(a, e.autoFitPadding, false, 85, !!e.autoShape, !!e.autoFit);
      } catch (autoFitErr) {
        autoFitErrMsg = String(autoFitErr.message || autoFitErr);
      }
    }
    if (r) {
      _changeToPointText();
    }
    // Không im lặng nuốt lỗi nữa — nếu Auto Shape/Fit gặp lỗi, gắn vào kết quả để client hiện ra
    // rõ ràng, thay vì trông như "chạy xong không làm gì cả".
    e.result = autoFitErrMsg ? "autoFitError:" + autoFitErrMsg : "";
  }

  function _changeActiveLayerTextSize() {
    var D = _hostState.changeActiveLayerTextSize;
    if (!documents.length) {
      D.result = "doc";
      return;
    } else if (!_layerIsTextLayer()) {
      D.result = "layer";
      return;
    } else if (!D.value) {
      D.result = "";
      return;
    }
    _forEachSelectedLayer(function() {
      try {
        var e = new ActionReference();
        e.putProperty(charID.Property, charID.TextStyle);
        e.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
        var t = executeActionGet(e);
        if (t.hasKey(charID.TextStyle)) {
          var a = t.getObjectValue(charID.TextStyle);
          var r = a.getDouble(charID.Size);
          var n = a.getUnitDoubleType(charID.Size);
          var i = r + D.value;
          var o = new ActionDescriptor();
          var s = new ActionReference();
          s.putProperty(charID.Property, charID.TextStyle);
          s.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
          o.putReference(charID.Null, s);
          var c = new ActionDescriptor();
          c.putUnitDouble(charID.Size, n, i);
          o.putObject(charID.To, charID.TextStyle, c);
          executeAction(charID.Set, o, DialogModes.NO);
        }
      } catch (e) {
        var l = jamText.getLayerText();
        var u = l.layerText.textKey.replace(/\n+/g, "");
        if (!u) {
          D.result = "layer";
          return;
        }
        var p = _getCurrentTextLayerBounds();
        var f = _textLayerIsPointText();
        var y = {
          "typeUnit": l.typeUnit,
          "layerText": {
            "textKey": u,
            "textGridding": l.layerText.textGridding || "none",
            "orientation": l.layerText.orientation || "horizontal",
            "antiAlias": l.layerText.antiAlias || "antiAliasSmooth",
            "textStyleRange": [l.layerText.textStyleRange[0]]
          }
        };
        if (l.layerText.paragraphStyleRange) {
          var g = l.layerText.paragraphStyleRange[0].paragraphStyle;
          y.layerText.paragraphStyleRange = [l.layerText.paragraphStyleRange[0]];
          y.layerText.paragraphStyleRange[0].paragraphStyle.textEveryLineComposer = g.textEveryLineComposer || false;
          y.layerText.paragraphStyleRange[0].paragraphStyle.burasagari = g.burasagari || "burasagariNone";
          y.layerText.paragraphStyleRange[0].to = u.length;
        }
        var d = y.layerText.textStyleRange[0].textStyle.size;
        var m = d + D.value;
        y.layerText.textStyleRange[0].textStyle.size = m;
        var a = y.layerText.textStyleRange[0].textStyle;
        if (a.autoLeading || a.leading === undefined) {
          a.autoLeading = true;
          delete a.leading;
        } else {
          var h = a.leading;
          var v = h + D.value;
          a.leading = v;
          a.autoLeading = false;
        }
        y.layerText.textStyleRange[0].to = u.length;
        if (!f) {
          var b = m / d;
          y.layerText.textShape = [l.layerText.textShape[0]];
          var T = y.layerText.textShape[0].bounds;
          T.top *= b;
          T.left *= b;
          T.bottom *= b;
          T.right *= b;
        }
        jamText.setLayerText(y);
        _applyMiddleEast(y.layerText.textStyleRange[0].textStyle);
        var S = _getCurrentTextLayerBounds();
        var I = p.xMid - S.xMid;
        var x = p.yMid - S.yMid;
        _moveLayer(I, x);
      }
    });
    D.result = "";
  }

  function _changeSize_alt() {
    var y = _hostState.changeActiveLayerTextSize.value > 0;
    _forEachSelectedLayer(function() {
      var e = new ActionReference();
      e.putProperty(charID.Property, charID.Text);
      e.putEnumerated(charID.Layer, charID.Ordinal, charID.Target);
      var t = executeActionGet(e);
      if (t.hasKey(charID.Text)) {
        var a = t.getObjectValue(charID.Text);
        var r = a.getList(charID.TextStyleRange);
        var n = [];
        var i = [];
        var o = true;
        for (var s = 0; s < r.count; s++) {
          var c = r.getObjectValue(s).getObjectValue(charID.TextStyle);
          n[s] = c.getDouble(charID.Size);
          i[s] = c.getUnitDoubleType(charID.Size);
          if (s > 0 && (n[s] !== n[s - 1] || i[s] !== i[s - 1])) {
            o = false;
            break;
          }
        }
        var l = .2;
        if (i[0] === charID.PixelUnit) l = 1;
        else if (i[0] === 592473716) l = .5;
        if (!y) l *= -1;
        if (o) {
          var u = new ActionDescriptor();
          var p = new ActionReference();
          p.putProperty(charID.Property, charID.TextStyle);
          p.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
          u.putReference(charID.Null, p);
          var f = new ActionDescriptor();
          f.putUnitDouble(charID.Size, i[0], n[0] + l);
          u.putObject(charID.To, charID.TextStyle, f);
          executeAction(charID.Set, u, DialogModes.NO);
        }
      }
    });
    _hostState.changeActiveLayerTextSize.result = "";
  }

  function nativeAlert(e) {
    if (!e) return "";
    alert(e.text, e.title, e.isError);
  }

  function nativeConfirm(e) {
    if (!e) return "";
    var t = confirm(e.text, false, e.title);
    return t ? "1" : "";
  }

  function getUserFonts() {
    var e = [];
    for (var t = 0; t < app.fonts.length; t++) {
      var a = app.fonts[t];
      e.push({
        "name": a.name,
        "postScriptName": a.postScriptName,
        "family": a.family,
        "style": a.style
      });
    }
    return jamJSON.stringify({
      "fonts": e
    });
  }

  function getHotkeyPressed() {
    var e = ScriptUI.environment.keyboardState;
    var t = "a";
    if (e.metaKey) {
      t += "WINa";
    }
    if (e.ctrlKey) {
      t += "CTRLa";
    }
    if (e.altKey) {
      t += "ALTa";
    }
    if (e.shiftKey) {
      t += "SHIFTa";
    }
    if (e.keyName) {
      t += e.keyName.toUpperCase() + "a";
    }
    return t;
  }

  function getActiveLayerText() {
    if (!documents.length) {
      return "";
    } else if (activeDocument.activeLayer.kind != LayerKind.TEXT) {
      return "";
    }
    return jamJSON.stringify({
      "textProps": jamText.getLayerText(),
      "stroke": _getLayerStroke()
    });
  }

  function setActiveLayerText(e) {
    var t = _hostState.setActiveLayerText;
    t.data = e;
    t.result = "";
    /* (Tauri port) suspendHistory(name, "fn()") theo kiểu chuỗi tên bị mất dữ liệu
   qua COM (biến module không "xuyên" qua được cách gọi này như bên CEP) -- đổi
   sang gọi hàm trực tiếp. Đánh đổi: mất gộp chung 1 bước Undo ("TyperTools Change"),
   nhưng đổi lại thao tác chạy đúng thay vì báo OK giả mà không làm gì cả. */
    _setActiveLayerText();
    return t.result;
  }

  function createTextLayerInSelection(e, t) {
    var a = _hostState.createTextLayerInSelection;
    a.data = e;
    a.point = t;
    a.padding = e.padding || 0;
    a.result = "";
    // (Tauri port) Gộp các bước tạo layer chữ mới vào vùng chọn thành 1 bước Undo
    // ("TypoCOM Paste") thay vì Photoshop chẻ nhỏ ra.
    app.activeDocument.suspendHistory("TypoCOM Paste", "_createTextLayerInSelection()");
    return a.result;
  }

  function alignTextLayerToSelection(e) {
    var t = _hostState.alignTextLayerToSelection;
    t.resize = !!e.resizeTextBox;
    t.padding = e.padding || 0;
    t.autoShape = !!e.autoShape;
    t.autoFit = !!e.autoFit;
    t.autoFitPadding = (typeof e.autoFitPadding === "number" && !isNaN(e.autoFitPadding)) ? e.autoFitPadding : 10;
    t.result = "";
    // (Tauri port) Gộp lại thành 1 bước Undo duy nhất ("TypoCOM Align") thay vì để Photoshop
    // chẻ nhỏ thành nhiều bước rời (Contract, Expand...) — dữ liệu (t.resize/t.padding/...)
    // đã set ngay phía trên, CÙNG 1 lần thực thi script với suspendHistory nên không bị mất.
    app.activeDocument.suspendHistory("TypoCOM Align", "_alignTextLayerToSelection()");
    return t.result;
  }

  function changeActiveLayerTextSize(e) {
    var t = _hostState.changeActiveLayerTextSize;
    t.value = e;
    t.result = "";
    /* (Tauri port) suspendHistory(name, "fn()") theo kiểu chuỗi tên bị mất dữ liệu
   qua COM (biến module không "xuyên" qua được cách gọi này như bên CEP) -- đổi
   sang gọi hàm trực tiếp. Đánh đổi: mất gộp chung 1 bước Undo ("TyperTools Resize"),
   nhưng đổi lại thao tác chạy đúng thay vì báo OK giả mà không làm gì cả. */
    _changeActiveLayerTextSize();
    return t.result;
  }

  function getCurrentSelection() {
    if (!documents.length) {
      return jamJSON.stringify({
        "error": "doc"
      });
    }
    var e = _checkSelection({
      "adjustAmount": 0
    });
    if (e.error) {
      return jamJSON.stringify({
        "error": e.error
      });
    }
    return jamJSON.stringify(e);
  }

  function startSelectionMonitoring() {
    var a = _hostState.selectionMonitor;
    if (a.callback) {
      app.removeNotifier("Slct", a.callback);
    }
    a.callback = function() {
      var e = _checkSelection({
        "adjustAmount": 0
      });
      if (!e.error) {
        var t = _selectionBoundsKey(e);
        if (t !== a.lastBoundsKey) {
          a.lastBoundsKey = t;
        }
      }
    };
    app.addNotifier("Slct", a.callback);
  }

  function stopSelectionMonitoring() {
    var e = _hostState.selectionMonitor;
    if (e.callback) {
      app.removeNotifier("Slct", e.callback);
      e.callback = null;
    }
    e.lastBoundsKey = null;
  }

  function getSelectionChanged() {
    var e = _hostState.selectionMonitor;
    var t = _checkSelection({
      "adjustAmount": 0
    });
    var a = ScriptUI.environment && ScriptUI.environment.keyboardState;
    var r = !!(a && a.shiftKey);
    if (!t.error) {
      var n = _selectionBoundsKey(t);
      if (n !== e.lastBoundsKey) {
        e.lastBoundsKey = n;
        // (Tauri port) Tự bỏ chọn NGAY TRONG CÙNG 1 lệnh ExtendScript này — gộp chung với
        // lúc bắt vùng chọn, không tách thành lệnh COM riêng nữa. Trước đây tách riêng thì
        // có khoảng hở giữa "bắt" và "tắt chọn", lúc dò lại đúng khoảng hở đó có thể bắt
        // nhầm thêm 1 lần nữa (sai vị trí). Gộp lại thì không còn khoảng hở nào cả.
        try {
          app.activeDocument.selection.deselect();
        } catch (ex) {}
        return jamJSON.stringify({
          "shiftKey": r,
          "top": t.top,
          "left": t.left,
          "right": t.right,
          "bottom": t.bottom,
          "width": t.width,
          "height": t.height,
          "xMid": t.xMid,
          "yMid": t.yMid
        });
      }
    }
    return jamJSON.stringify({
      "noChange": true,
      "shiftKey": r
    });
  }

  function _createTextLayersInStoredSelections() {
    var t = _hostState.createTextLayersInStoredSelections;
    if (!documents.length) {
      t.result = "doc";
      return;
    }
    var e = t.data.texts || [];
    var a = t.data.styles || [];
    if (e.length === 0 || t.selections.length === 0) {
      t.result = "noSelection";
      return;
    }
    var r = Math.min(e.length, t.selections.length);
    for (var n = 0; n < r; n++) {
      try {
        var i = e[n] || e[e.length - 1] || "";
        var o = t.data.richTextRuns ? t.data.richTextRuns[n] || t.data.richTextRuns[t.data.richTextRuns.length - 1] : null;
        var s = a[n] || a[a.length - 1] || null;
        var c = _ensureStyle(s);
        var l = t.selections[n];
        if (!l || typeof l.width !== "number" || typeof l.height !== "number") {
          t.result = "invalidSelection";
          return;
        }
        if (!i) continue;
        var u = _calculateSelectionDimensions(l, t.padding);
        if (!u || isNaN(u.width) || isNaN(u.height) || u.width <= 0 || u.height <= 0) {
          t.result = "invalidSelection";
          return;
        }
        var p = {
          "text": i,
          "style": c,
          "direction": t.data.direction,
          "richTextRuns": o
        };
        _createAndSetLayerText(p, u.width, u.height);
        var f = _getCurrentTextLayerBounds();
        if (t.point) {
          _changeToPointText();
        } else {
          _resizeTextBoxToContent(u.width, f);
        }
        f = _getCurrentTextLayerBounds();
        _positionLayerWithinSelection(l, f);
        if (t.fixPosition) {
          var f2 = _getCurrentTextLayerBounds();
          var dx2 = l.xMid - f2.xMid;
          var dy2 = l.yMid - f2.yMid;
          if (Math.abs(dx2) > 0.5 || Math.abs(dy2) > 0.5) {
            _moveLayer(dx2, dy2);
          }
        }
      } catch (e) {
        t.result = "scriptError: " + (e && e.message ? e.message : e);
        return;
      }
    }
    t.selections = [];
    t.result = "";
  }

  function createTextLayersInStoredSelections(e, t) {
    var a = _hostState.createTextLayersInStoredSelections;
    a.fixPosition = !!(e && e.fixPosition);
    a.data = e;
    a.point = t;
    a.padding = e.padding || 0;
    a.result = "";
    if (e && e.selections) {
      a.selections = e.selections;
    } else {
      a.selections = [];
    }
    // (Tauri port) Gộp toàn bộ việc tạo NHIỀU layer chữ (Multiple Bubble) thành 1 bước
    // Undo duy nhất ("TypoCOM Multiple Bubble") thay vì mỗi layer tính vài bước rời.
    app.activeDocument.suspendHistory("TypoCOM Multiple Bubble", "_createTextLayersInStoredSelections()");
    return a.result;
  }


  // ========== TR_BRIDGE: cầu nối vào engine TypeR đã bọc phía trên ==========
  // Dùng chung cho cả engine TyperTool (TT_pasteToSelection/TT_pasteToLayer) lẫn Multiple Bubble,
  // vì _setLayerStroke chỉ tồn tại trong khối TypeR — expose ra global để gọi được từ nơi khác.
  $.global.TR_setLayerStroke = function(stroke) {
    try {
      if (!stroke || !stroke.enabled) return "OK";
      _setLayerStroke(stroke);
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };
  // 3 bridge nhỏ dùng cho resizeBox() (Quick Layout) — tận dụng lại đúng API Action Manager
  // (jamText/_getCurrentTextLayerBounds/_moveLayer) đã có sẵn trong khối này, thay cho API DOM
  // (layer.bounds/textItem.width...) chậm hơn mà bản resizeBox() cũ đang dùng.
  $.global.TR_getCurrentTextLayerBounds = function() {
    try { return jamJSON.stringify(_getCurrentTextLayerBounds()); }
    catch (e) { return jamJSON.stringify({ error: e.message }); }
  };
  $.global.TR_setTextBoxSizePx = function(widthPx, heightPx) {
    try {
      var b = jamText.getLayerText();
      if (!b || !b.layerText) return "ERROR:no_text";
      var wPt = _convertPixelToPoint(widthPx);
      var hPt = _convertPixelToPoint(heightPx);
      b.layerText.textShape = [{ "textType": "box", "orientation": "horizontal",
        "bounds": { "top": 0, "left": 0, "right": wPt, "bottom": hPt } }];
      jamText.setLayerText(b);
      return "OK";
    } catch (e) { return "ERROR:" + e.message + " @line " + (e.line || "?"); }
  };
  $.global.TR_moveLayerPx = function(dx, dy) {
    try { _moveLayer(dx, dy); return "OK"; }
    catch (e) { return "ERROR:" + e.message + " @line " + (e.line || "?"); }
  };
  $.global.TR_alignTextLayerToSelection = function(autoShape, autoFit, autoFitPadding) {
    try {
      var res = alignTextLayerToSelection({
        resizeTextBox: false,
        padding: 0,
        autoShape: !!autoShape,
        autoFit: !!autoFit,
        autoFitPadding: autoFitPadding
      });
      return res; // "" (OK) | "doc" | "layer" | "noSelection" | "smallSelection"
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TR_startSelectionMonitoring = function() {
    try {
      startSelectionMonitoring();
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TR_stopSelectionMonitoring = function() {
    try {
      stopSelectionMonitoring();
      return "OK";
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

  $.global.TR_getSelectionChanged = function() {
    try {
      return getSelectionChanged();
    } catch (e) {
      return jamJSON.stringify({
        error: "ERROR:" + e.message + " @line " + (e.line || "?")
      });
    }
  };

  // payload: { texts:[...], styles:[{textProps:...}], selections:[{top,left,right,bottom,width,height,xMid,yMid}], padding }
  $.global.TR_createTextLayersInStoredSelections = function(payload) {
    try {
      return createTextLayersInStoredSelections(payload, false);
    } catch (e) {
      return "ERROR:" + e.message + " @line " + (e.line || "?");
    }
  };

})();
// ---- (Tauri port) Xuất tất cả hàm top-level sang $.global để giữ được giữa các
// lần gọi doJavaScript() riêng biệt qua COM -- không có bước này thì mỗi lệnh phải
// gửi lại NGUYÊN host.jsx (chậm), vì hàm khai báo kiểu function name(){} không tự
// "nhớ" được giữa các lần gọi COM khác nhau, chỉ có $.global mới nhớ được.
(function() {
  $.global.__tc__applyFX = _applyFX;
  $.global.__tc__applyFXMerge = _applyFXMerge;
  $.global.__tc__resizeBoxInternal = _resizeBoxInternal;
  $.global.__tc_alignCenter = alignCenter;
  $.global.__tc_alignCenterSimple = alignCenterSimple;
  $.global.__tc_applyCase = applyCase;
  $.global.__tc_applyFXFromJSON = applyFXFromJSON;
  $.global.__tc_applyFXToSelectedLayers = applyFXToSelectedLayers;
  $.global.__tc_applyNow = applyNow;
  $.global.__tc_applyPattern = applyPattern;
  $.global.__tc_applyTempStyle = applyTempStyle;
  $.global.__tc_buildGradientColorObject = buildGradientColorObject;
  $.global.__tc_cleanText = cleanText;
  $.global.__tc_copyFX = copyFX;
  $.global.__tc_createGlowDescriptor = createGlowDescriptor;
  $.global.__tc_createGradientDescriptor = createGradientDescriptor;
  $.global.__tc_createShadowDescriptor = createShadowDescriptor;
  $.global.__tc_createStrokeDescriptor = createStrokeDescriptor;
  $.global.__tc_deleteTempStyle = deleteTempStyle;
  $.global.__tc_getBackgroundColor = getBackgroundColor;
  $.global.__tc_getClosest = getClosest;
  $.global.__tc_getColorFromDesc = getColorFromDesc;
  $.global.__tc_getCurrentLayerEffects = getCurrentLayerEffects;
  $.global.__tc_getFXData = getFXData;
  $.global.__tc_getForegroundColor = getForegroundColor;
  $.global.__tc_getHotkeyCombo = getHotkeyCombo;
  $.global.__tc_getLayer = getLayer;
  $.global.__tc_getSelectedLayersIDs = getSelectedLayersIDs;
  $.global.__tc_getText = getText;
  $.global.__tc_getTextFont = getTextFont;
  $.global.__tc_groupTextLayers = groupTextLayers;
  $.global.__tc_makeTempStyle = makeTempStyle;
  $.global.__tc_pasteFX = pasteFX;
  $.global.__tc_pasteLogoToAllDocs = pasteLogoToAllDocs;
  $.global.__tc_pickLogoPath = pickLogoPath;
  $.global.__tc_placeLogo = placeLogo;
  $.global.__tc_resizeBox = resizeBox;
  $.global.__tc_safeGetUnitDouble = safeGetUnitDouble;
  $.global.__tc_saveTextFile = saveTextFile;
  $.global.__tc_selectForm = selectForm;
  $.global.__tc_selectLayerByID = selectLayerByID;
  $.global.__tc_selectLayersByIDs = selectLayersByIDs;
  $.global.__tc_splitEven = splitEven;
  $.global.__tc_splitWords = splitWords;
  $.global.__tc_toggleCheck = toggleCheck;
  $.global.__tc_ready = true;
})();
