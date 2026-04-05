// ============================================================
// TMS — Google Apps Script (GAS) Web App
// Deploy: script.google.com → Deploy → Web App → Anyone
// ============================================================
// HƯỚNG DẪN DEPLOY:
//
// 1. Truy cập https://script.google.com
//    → Click "New project" (Dự án mới)
//    → Đặt tên: "TMS ERP NTL"
//
// 2. XÓA hết code mặc định trong Code.gs
//    → PASTE toàn bộ nội dung file này vào
//
// 3. Click menu: Deploy → New deployment
//    → Type: Web App
//    → Execute as: Me (email của bạn)
//    → Who has access: Anyone (BẮT BUỘC!)
//    → Click Deploy
//
// 4. Copy URL dạng:
//    https://script.google.com/macros/s/AKfycb.../exec
//
// 5. Vào Vercel → Project Settings → Environment Variables:
//    → Name: TMS_GAS_URL
//    → Value: (paste URL ở bước 4)
//    → Click Save → Redeploy
//
// !! SAU MỖI LẦN SỬA CODE NÀY:
//    → Deploy → Manage deployments → Edit (icon bút chì)
//    → Version: New version → Deploy
//    (Nếu chỉ Save mà không Deploy lại → code cũ vẫn chạy!)
// ============================================================

// ============================================================
// CONFIG
// ============================================================
const SPREADSHEET_ID = "13WVfTdZD4lzhoEeFINM3TsRmg0cz1DFpQ9Jut1MYP1U";

const SHEET_NAMES = {
  PHIEU_BK : "1.Data_Xe_PhieuBK",   // Phiếu Booking (header)
  CHUYEN   : "1.Data_Xe_BK",        // Chuyến xe con
  BANGGIA  : "Data_Banggia",        // Bảng giá NCC + loại xe
  NCC      : "NCC",                 // Danh sách NCC
  KH       : "DanhsachKH",          // Danh sách khách hàng
  XE       : "Xe",                  // Danh sách xe / biển số
  NV       : "Nhan_vien",           // Danh sách nhân viên
};

// Cột A→K của sheet 1.Data_Xe_PhieuBK (đúng thứ tự)
const PHIEU_BK_COLS = [
  "ID",          // A
  "Ngay",        // B
  "Du_An",       // C
  "Diem_Nhan",   // D
  "Tai_Tong",    // E
  "Don_Gia_KH",  // F
  "Don_Gia_NCC", // G
  "Loi_Nhuan",   // H
  "Note",        // I
  "NV_Update",   // J
  "Trong_Luong", // K
];

// ============================================================
// RESPONSE HELPERS
// ============================================================
function makeResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// doGet — Xử lý GET requests
// ============================================================
function doGet(e) {
  const action = (e.parameter.action || "").trim();
  let result = { success: false, error: "Unknown action: " + action };

  try {
    switch (action) {
      case "ping":
        result = { success: true, msg: "GAS OK", timestamp: new Date().toISOString() };
        break;
      case "getBanggia":
        result = getBanggia();
        break;
      case "getBienSoByNCC":
        result = getBienSoByNCC(e.parameter.ncc_id || "");
        break;
      case "getPhieuBKList":
        result = getPhieuBKList();
        break;
      case "getPhieuBKById":
        result = getPhieuBKById(e.parameter.id || "");
        break;
      case "getSuggestions":
        result = getSuggestions();
        break;
      default:
        result = { success: false, error: "Unknown GET action: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.message, stack: err.stack };
  }

  return makeResponse(result);
}

// ============================================================
// doPost — Xử lý POST requests
// ============================================================
function doPost(e) {
  let body, action;

  try {
    body   = JSON.parse(e.postData.contents);
    action = (body.action || "").trim();
  } catch (err) {
    return makeResponse({
      success: false,
      error: "Parse body thất bại: " + err.message,
    });
  }

  let result = { success: false, error: "Unknown action: " + action };

  try {
    switch (action) {
      case "createPhieuBK":
        result = createPhieuBK(body);
        break;
      case "updatePhieuBK":
        result = updatePhieuBK(body);
        break;
      case "createChuyen":
        result = createChuyen(body);
        break;
      default:
        result = { success: false, error: "Unknown POST action: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.message, stack: err.stack };
  }

  return makeResponse(result);
}

// ============================================================
// createPhieuBK — TẠO PHIẾU BOOKING (ghi vào 1.Data_Xe_PhieuBK)
// ============================================================
function createPhieuBK(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.PHIEU_BK);

  if (!sheet) {
    return { success: false, error: 'Sheet "' + SHEET_NAMES.PHIEU_BK + '" không tồn tại' };
  }

  // Nếu frontend gửi rowData array → dùng trực tiếp
  if (data.rowData && Array.isArray(data.rowData) && data.rowData.length === 11) {
    // Kiểm tra ID trùng
    var existingID = checkDuplicateID(sheet, data.rowData[0]);
    if (existingID) {
      return { success: false, error: "ID đã tồn tại: " + data.rowData[0] };
    }
    sheet.appendRow(data.rowData);
    return {
      success: true,
      id: data.rowData[0],
      row: sheet.getLastRow(),
      message: "Đã ghi vào dòng " + sheet.getLastRow(),
    };
  }

  // Fallback: build row từ named fields
  var id = (data.ID || "").toString().trim();
  if (!id) {
    return { success: false, error: "Thiếu ID" };
  }

  // Kiểm tra ID trùng
  var duplicateCheck = checkDuplicateID(sheet, id);
  if (duplicateCheck) {
    return { success: false, error: "ID đã tồn tại: " + id };
  }

  // Build row theo đúng thứ tự PHIEU_BK_COLS [A→K]
  var row = [
    id,                                    // A: ID
    data.Ngay          || "",              // B: Ngày
    data.Du_An         || "",              // C: Dự án
    data.Diem_Nhan     || "",              // D: Điểm nhận
    toNumber(data.Tai_Tong),               // E: Tải tổng
    toNumber(data.Don_Gia_KH),             // F: Đơn giá KH
    toNumber(data.Don_Gia_NCC),            // G: Đơn giá NCC
    toNumber(data.Loi_Nhuan),              // H: Lợi nhuận
    data.Note          || "",              // I: Ghi chú
    data.NV_Update     || "",              // J: NV Update
    data.Trong_Luong   || "",              // K: Trọng lượng
  ];

  sheet.appendRow(row);

  return {
    success : true,
    id      : id,
    row     : sheet.getLastRow(),
    message : "Đã ghi vào dòng " + sheet.getLastRow() + ' sheet "' + SHEET_NAMES.PHIEU_BK + '"',
  };
}

// ============================================================
// updatePhieuBK — CẬP NHẬT COMPUTED FIELDS (E, F, G, H)
// ============================================================
function updatePhieuBK(data) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.PHIEU_BK);

  if (!sheet) {
    return { success: false, error: 'Sheet không tồn tại' };
  }

  var id = (data.ID || "").toString().trim();
  if (!id) {
    return { success: false, error: "Thiếu ID" };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, error: "Sheet trống" };
  }

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  var rowIdx = -1;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i].toString().trim() === id) {
      rowIdx = i;
      break;
    }
  }

  if (rowIdx === -1) {
    return { success: false, error: "Không tìm thấy ID: " + id };
  }

  var sheetRow = rowIdx + 2; // +2 vì header ở row 1

  // Update computed columns
  if (data.Tai_Tong    !== undefined) sheet.getRange(sheetRow, 5).setValue(toNumber(data.Tai_Tong));
  if (data.Don_Gia_KH  !== undefined) sheet.getRange(sheetRow, 6).setValue(toNumber(data.Don_Gia_KH));
  if (data.Don_Gia_NCC !== undefined) sheet.getRange(sheetRow, 7).setValue(toNumber(data.Don_Gia_NCC));
  if (data.Loi_Nhuan   !== undefined) sheet.getRange(sheetRow, 8).setValue(toNumber(data.Loi_Nhuan));
  if (data.Note        !== undefined) sheet.getRange(sheetRow, 9).setValue(data.Note);

  return {
    success: true,
    id: id,
    row: sheetRow,
    message: "Đã cập nhật dòng " + sheetRow,
  };
}

// ============================================================
// createChuyen — THÊM CHUYẾN XE (ghi vào 1.Data_Xe_BK)
// ============================================================
function createChuyen(data) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.CHUYEN);

  if (!sheet) {
    return { success: false, error: 'Sheet "' + SHEET_NAMES.CHUYEN + '" không tồn tại' };
  }

  // Nếu frontend gửi rowData array → dùng trực tiếp
  if (data.rowData && Array.isArray(data.rowData)) {
    sheet.appendRow(data.rowData);
    return {
      success: true,
      row: sheet.getLastRow(),
      message: "Đã thêm chuyến vào dòng " + sheet.getLastRow(),
    };
  }

  // Build row từ named fields
  // Header sheet 1.Data_Xe_BK (cần xác nhận với sheet thực tế)
  var row = [
    data.ID_CODE         || "",     // Mã phiếu booking cha
    data.Ngay            || "",     // Ngày
    data.Bien_So         || "",     // Biển số
    data.Tai_Xe          || "",     // Tài xế
    data.SDT_Tai_Xe      || "",     // SĐT tài xế
    data.NCC             || "",     // NCC
    data.Loai_Xe         || "",     // Loại xe
    data.Dia_Chi_Nhan    || "",     // Địa chỉ nhận
    data.Dia_Chi_Giao    || "",     // Địa chỉ giao
    toNumber(data.Don_Gia_KH),      // Đơn giá KH
    toNumber(data.Don_Gia_NCC),     // Đơn giá NCC
    toNumber(data.PS_NCC),          // Phát sinh NCC
    data.So_Bill         || "",     // Số bill/vận đơn
    data.Trang_Thai      || "Chờ cập nhật", // Trạng thái
    data.Ghi_Chu_Chuyen  || "",     // Ghi chú chuyến
    data.NV_Update       || "",     // NV Update
    data.Hinh_Anh        || "",     // Hình ảnh (URLs)
  ];

  sheet.appendRow(row);

  return {
    success: true,
    id_code: data.ID_CODE,
    row: sheet.getLastRow(),
    message: "Đã thêm chuyến vào dòng " + sheet.getLastRow(),
  };
}

// ============================================================
// getBanggia — ĐỌC Data_Banggia
// ============================================================
function getBanggia() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.BANGGIA);

  if (!sheet) {
    return { success: false, error: 'Sheet "' + SHEET_NAMES.BANGGIA + '" không tồn tại' };
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().trim(); });

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0] || r[0].toString().trim() === "") continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = r[j] !== undefined && r[j] !== null ? r[j].toString().trim() : "";
      }
    }
    rows.push(obj);
  }

  return {
    success: true,
    data: rows,
    headers: headers.filter(function(h) { return h !== ""; }),
    count: rows.length,
  };
}

// ============================================================
// getBienSoByNCC — ĐẾM BIỂN SỐ LỊCH SỬ THEO NCC
// ============================================================
function getBienSoByNCC(ncc_id) {
  if (!ncc_id) {
    return { success: false, error: "Thiếu ncc_id" };
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.CHUYEN);

  if (!sheet) {
    return { success: false, error: 'Sheet "' + SHEET_NAMES.CHUYEN + '" không tồn tại' };
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().trim(); });

  var nccCol    = findColIndex(headers, "NCC");
  var bienSoCol = findColIndex(headers, "Bien_So");

  if (nccCol === -1 || bienSoCol === -1) {
    return { success: false, error: "Không tìm thấy cột NCC hoặc Bien_So", headers: headers };
  }

  var bienSoSet = {};
  for (var i = 1; i < data.length; i++) {
    var nccVal  = (data[i][nccCol] || "").toString().trim();
    var bienSo  = (data[i][bienSoCol] || "").toString().trim();

    if (nccVal && nccVal.indexOf(ncc_id) !== -1 && bienSo) {
      bienSoSet[bienSo] = true;
    }
  }

  var list = Object.keys(bienSoSet).sort();

  return {
    success: true,
    ncc_id: ncc_id,
    count: list.length,
    bien_so_list: list,
  };
}

// ============================================================
// getPhieuBKList — DANH SÁCH PHIẾU BOOKING
// ============================================================
function getPhieuBKList() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.PHIEU_BK);

  if (!sheet) {
    return { success: false, error: 'Sheet không tồn tại' };
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().trim(); });

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = data[i][j] !== undefined ? data[i][j].toString() : "";
      }
    }
    if (obj.ID || obj[headers[0]]) {
      rows.push(obj);
    }
  }

  return { success: true, data: rows, count: rows.length };
}

// ============================================================
// getPhieuBKById — CHI TIẾT 1 PHIẾU BOOKING + CÁC CHUYẾN
// ============================================================
function getPhieuBKById(id) {
  if (!id) {
    return { success: false, error: "Thiếu id" };
  }

  // Lấy phiếu booking header
  var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  var bkSheet = ss.getSheetByName(SHEET_NAMES.PHIEU_BK);
  var bkData  = bkSheet.getDataRange().getValues();
  var bkHeaders = bkData[0].map(function(h) { return h.toString().trim(); });

  var phieu = null;
  for (var i = 1; i < bkData.length; i++) {
    if (bkData[i][0].toString().trim() === id) {
      phieu = {};
      for (var j = 0; j < bkHeaders.length; j++) {
        phieu[bkHeaders[j]] = bkData[i][j] !== undefined ? bkData[i][j].toString() : "";
      }
      break;
    }
  }

  if (!phieu) {
    return { success: false, error: "Không tìm thấy phiếu: " + id };
  }

  // Lấy các chuyến thuộc phiếu
  var chSheet  = ss.getSheetByName(SHEET_NAMES.CHUYEN);
  var chData   = chSheet.getDataRange().getValues();
  var chHeaders = chData[0].map(function(h) { return h.toString().trim(); });

  var idCol = findColIndex(chHeaders, "ID_CODE");
  if (idCol === -1) idCol = 0; // fallback cột đầu

  var chuyens = [];
  for (var k = 1; k < chData.length; k++) {
    if (chData[k][idCol].toString().trim() === id) {
      var ch = {};
      for (var m = 0; m < chHeaders.length; m++) {
        ch[chHeaders[m]] = chData[k][m] !== undefined ? chData[k][m].toString() : "";
      }
      chuyens.push(ch);
    }
  }

  return {
    success: true,
    phieu: phieu,
    chuyens: chuyens,
    chuyen_count: chuyens.length,
  };
}

// ============================================================
// getSuggestions — GỢI Ý ĐỊA CHỈ, BIỂN SỐ, TÀI XẾ, NCC
// ============================================================
function getSuggestions() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.CHUYEN);

  if (!sheet) {
    return { success: false, error: 'Sheet chuyến không tồn tại' };
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().trim(); });

  var nhanCol  = findColIndex(headers, "Dia_Chi_Nhan");
  var giaoCol  = findColIndex(headers, "Dia_Chi_Giao");
  var bsCol    = findColIndex(headers, "Bien_So");
  var txCol    = findColIndex(headers, "Tai_Xe");
  var sdtCol   = findColIndex(headers, "SDT_Tai_Xe");
  var nccCol   = findColIndex(headers, "NCC");

  var diemGiaoSet = {};
  var bienSoSet   = {};
  var taiXeSet    = {};
  var nccSet      = {};
  var phoneMap    = {}; // bienSo → { taiXe, sdt }
  var driverMap   = {}; // taiXe → sdt

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (nhanCol !== -1 && r[nhanCol]) diemGiaoSet[r[nhanCol].toString().trim()] = true;
    if (giaoCol !== -1 && r[giaoCol]) diemGiaoSet[r[giaoCol].toString().trim()] = true;
    if (bsCol !== -1 && r[bsCol])     bienSoSet[r[bsCol].toString().trim()] = true;
    if (txCol !== -1 && r[txCol])     taiXeSet[r[txCol].toString().trim()] = true;
    if (nccCol !== -1 && r[nccCol])   nccSet[r[nccCol].toString().trim()] = true;

    // Build phoneMap
    if (bsCol !== -1 && r[bsCol] && r[bsCol].toString().trim()) {
      var bs = r[bsCol].toString().trim();
      phoneMap[bs] = {
        taiXe: txCol !== -1 ? (r[txCol] || "").toString().trim() : "",
        sdt:   sdtCol !== -1 ? (r[sdtCol] || "").toString().trim() : "",
      };
    }

    // Build driverMap
    if (txCol !== -1 && r[txCol] && sdtCol !== -1 && r[sdtCol]) {
      driverMap[r[txCol].toString().trim()] = r[sdtCol].toString().trim();
    }
  }

  return {
    success: true,
    data: {
      diemGiao: Object.keys(diemGiaoSet).sort(),
      ncc:      Object.keys(nccSet).sort(),
      bienSo:   Object.keys(bienSoSet).sort(),
      taiXe:    Object.keys(taiXeSet).sort(),
      phoneMap: phoneMap,
      driverMap: driverMap,
    },
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Convert value to number, return 0 if NaN */
function toNumber(val) {
  if (val === undefined || val === null || val === "") return 0;
  var n = Number(String(val).replace(/[,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Check if ID already exists in column A of sheet */
function checkDuplicateID(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i].toString().trim() === id.toString().trim()) {
      return true;
    }
  }
  return false;
}

/** Find column index by header name (case-insensitive, partial match) */
function findColIndex(headers, name) {
  // Exact match first
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === name) return i;
  }
  // Case-insensitive
  var lower = name.toLowerCase();
  for (var j = 0; j < headers.length; j++) {
    if (headers[j].toLowerCase() === lower) return j;
  }
  // Contains match (for Vietnamese headers with diacritics)
  for (var k = 0; k < headers.length; k++) {
    if (headers[k].toLowerCase().indexOf(lower) !== -1) return k;
  }
  return -1;
}

// ============================================================
// TEST FUNCTION — Chạy trực tiếp trong GAS để kiểm tra
// ============================================================
function testPing() {
  Logger.log("=== TEST PING ===");
  Logger.log(JSON.stringify({ success: true, msg: "GAS OK" }));
}

function testGetBanggia() {
  Logger.log("=== TEST getBanggia ===");
  var result = getBanggia();
  Logger.log("Headers: " + JSON.stringify(result.headers));
  Logger.log("Row count: " + result.count);
  if (result.data && result.data.length > 0) {
    Logger.log("First row: " + JSON.stringify(result.data[0]));
  }
}

function testCreatePhieuBK() {
  Logger.log("=== TEST createPhieuBK ===");
  var result = createPhieuBK({
    ID:          "TEST_DEBUG_" + new Date().getTime(),
    Ngay:        "05/04/2026",
    Du_An:       "TEST Dự Án",
    Diem_Nhan:   "TEST Địa chỉ",
    Tai_Tong:    0,
    Don_Gia_KH:  0,
    Don_Gia_NCC: 0,
    Loi_Nhuan:   0,
    Note:        "Test từ GAS",
    NV_Update:   "5001385 - Nguyễn Sĩ Quỳnh",
    Trong_Luong: "",
  });
  Logger.log(JSON.stringify(result));
  // !! NHỚ XÓA DÒNG TEST TRONG SHEET SAU KHI KIỂM TRA !!
}
