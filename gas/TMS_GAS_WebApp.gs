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
      case "updateChuyen":
        result = updateChuyen(body);
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
// Schema THỰC TẾ: 34 cột A → AH
// ============================================================
// COL MAP:
//  0(A)=ID_PXK  1(B)=ID  2(C)=Ngay  3(D)=Du_An/BC  4(E)=Dia_Chi_Nhan
//  5(F)=Dia_Chi_Giao  6(G)=Nguoi_YC  7(H)=Thoi_Gian_BK  8(I)=Thoi_Gian_Den
//  9(J)=Thoi_Gian_Xuat  10(K)=Thoi_Gian_DenKho  11(L)=Thoi_Gian_HoanThanh
// 12(M)=Loai_Hang  13(N)=Thong_Tin  14(O)=So_Bill  15(P)=Bien_So
// 16(Q)=Loai_Xe  17(R)=Loai_xe_YC  18(S)=Hinh_Anh1  19(T)=Hinh_Anh2
// 20(U)=Hinh_Anh3  21(V)=Hinh_Anh4  22(W)=Trang_Thai  23(X)=Tai_Xe
// 24(Y)=Trong_Luong  25(Z)=Leadtime  26(AA)=NCC  27(AB)=Don_Gia
// 28(AC)=Phi_Khac  29(AD)=Cuoc_Thu_KH  30(AE)=Cuoc_Khac_Thu_KH
// 31(AF)=Code  32(AG)=Tuyen  33(AH)=Map
// ============================================================
function createChuyen(data) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.CHUYEN);

  if (!sheet) {
    return { success: false, error: 'Sheet "' + SHEET_NAMES.CHUYEN + '" không tồn tại' };
  }

  // Validate required fields
  var chuyenId = (data.ID || "").toString().trim();
  var bangkeId = (data.ID_PXK || data.ID_CODE || "").toString().trim();
  if (!bangkeId) {
    return { success: false, error: "Thiếu ID_PXK (mã phiếu booking cha)" };
  }
  if (!chuyenId) {
    return { success: false, error: "Thiếu ID (mã chuyến xe)" };
  }

  // Check duplicate trip ID (column B = index 1)
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var existingIDs = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    for (var i = 0; i < existingIDs.length; i++) {
      if (existingIDs[i].toString().trim() === chuyenId) {
        return { success: false, error: "ID chuyến đã tồn tại: " + chuyenId };
      }
    }
  }

  // Build row đúng thứ tự 34 cột A → AH
  var row = [
    bangkeId,                                    //  0 A: ID_PXK (FK phiếu BK)
    chuyenId,                                    //  1 B: ID chuyến (hex 8)
    data.Ngay                 || "",             //  2 C: Ngày (dd/mm/yyyy)
    data.Du_An                || "",             //  3 D: Du_An/BC (dự án)
    data.Dia_Chi_Nhan         || "",             //  4 E: Địa chỉ nhận
    data.Dia_Chi_Giao         || "",             //  5 F: Địa chỉ giao
    data.Nguoi_YC             || "",             //  6 G: Người yêu cầu (MaNV - HoTen)
    data.Thoi_Gian_BK         || "",             //  7 H: Thời gian booking
    "",                                          //  8 I: Thoi_Gian_Den (trống khi tạo)
    "",                                          //  9 J: Thoi_Gian_Xuat (trống)
    "",                                          // 10 K: Thoi_Gian_DenKho (trống)
    "",                                          // 11 L: Thoi_Gian_HoanThanh (trống)
    data.Loai_Hang            || "",             // 12 M: Loại hàng
    data.Thong_Tin            || "",             // 13 N: Thông tin
    data.So_Bill              || "",             // 14 O: Số bill/vận đơn
    data.Bien_So              || "",             // 15 P: Biển số xe
    data.Loai_Xe              || "",             // 16 Q: Loại xe (thực tế)
    data.Loai_xe_YC           || "",             // 17 R: Loại xe YC / mô tả
    "",                                          // 18 S: Hinh_Anh1 (trống khi tạo)
    "",                                          // 19 T: Hinh_Anh2
    "",                                          // 20 U: Hinh_Anh3
    "",                                          // 21 V: Hinh_Anh4
    data.Trang_Thai           || "Chờ cập nhật",// 22 W: Trạng thái
    data.Tai_Xe               || "",             // 23 X: Tài xế
    toNumber(data.Trong_Luong),                  // 24 Y: Trọng lượng (kg)
    "",                                          // 25 Z: Leadtime (trống khi tạo)
    data.NCC                  || "",             // 26 AA: NCC
    toNumber(data.Don_Gia),                      // 27 AB: Đơn giá NCC
    toNumber(data.Phi_Khac),                     // 28 AC: Phí khác NCC
    toNumber(data.Cuoc_Thu_KH),                  // 29 AD: Cước thu KH
    toNumber(data.Cuoc_Khac_Thu_KH),             // 30 AE: Cước khác thu KH
    data.Code                 || "",             // 31 AF: Code
    data.Tuyen                || "",             // 32 AG: Tuyến
    data.Map                  || ""              // 33 AH: Map
  ];

  sheet.appendRow(row);
  var newRow = sheet.getLastRow();

  // Sau khi ghi chuyến → recalculate tổng cho phiếu BK cha
  var recalcResult = recalcPhieuBK(bangkeId);

  return {
    success    : true,
    chuyen_id  : chuyenId,
    phieu_id   : bangkeId,
    row        : newRow,
    recalc     : recalcResult,
    message    : "Đã ghi chuyến " + chuyenId + " vào dòng " + newRow
  };
}

// ============================================================
// updateChuyen — CẬP NHẬT CHUYẾN XE (ghi đè dòng cũ theo ID cột B)
// ============================================================
function updateChuyen(data) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.CHUYEN);
  if (!sheet) {
    return { success: false, error: 'Sheet "' + SHEET_NAMES.CHUYEN + '" không tồn tại' };
  }

  var chuyenId = (data.ID || "").toString().trim();
  var bangkeId = (data.ID_PXK || data.ID_CODE || "").toString().trim();
  if (!chuyenId) {
    return { success: false, error: "Thiếu ID (mã chuyến để cập nhật)" };
  }

  // Tìm dòng theo ID (column B = col 2)
  var lastRow = sheet.getLastRow();
  var targetRow = -1;
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i].toString().trim() === chuyenId) {
        targetRow = i + 2; // +2: 1-indexed + skip header
        break;
      }
    }
  }

  if (targetRow === -1) {
    return { success: false, error: "Không tìm thấy chuyến ID: " + chuyenId };
  }

  // Build row 34 cột A→AH (giống createChuyen)
  var row = [
    bangkeId,                                    //  0 A
    chuyenId,                                    //  1 B
    data.Ngay                 || "",             //  2 C
    data.Du_An                || "",             //  3 D
    data.Dia_Chi_Nhan         || "",             //  4 E
    data.Dia_Chi_Giao         || "",             //  5 F
    data.Nguoi_YC             || "",             //  6 G
    data.Thoi_Gian_BK         || "",             //  7 H
    data.Thoi_Gian_Den        || "",             //  8 I
    data.Thoi_Gian_Xuat       || "",             //  9 J
    data.Thoi_Gian_DenKho     || "",             // 10 K
    data.Thoi_Gian_HoanThanh  || "",             // 11 L
    data.Loai_Hang            || "",             // 12 M
    data.Thong_Tin            || "",             // 13 N
    data.So_Bill              || "",             // 14 O
    data.Bien_So              || "",             // 15 P
    data.Loai_Xe              || "",             // 16 Q
    data.Loai_xe_YC           || "",             // 17 R
    data.Hinh_Anh1            || "",             // 18 S
    data.Hinh_Anh2            || "",             // 19 T
    data.Hinh_Anh3            || "",             // 20 U
    data.Hinh_Anh4            || "",             // 21 V
    data.Trang_Thai           || "Chờ cập nhật",// 22 W
    data.Tai_Xe               || "",             // 23 X
    toNumber(data.Trong_Luong),                  // 24 Y
    data.Leadtime             || "",             // 25 Z
    data.NCC                  || "",             // 26 AA
    toNumber(data.Don_Gia),                      // 27 AB
    toNumber(data.Phi_Khac),                     // 28 AC
    toNumber(data.Cuoc_Thu_KH),                  // 29 AD
    toNumber(data.Cuoc_Khac_Thu_KH),             // 30 AE
    data.Code                 || "",             // 31 AF
    data.Tuyen                || "",             // 32 AG
    data.Map                  || ""              // 33 AH
  ];

  // Ghi đè 34 cột trên dòng đã tìm thấy
  sheet.getRange(targetRow, 1, 1, 34).setValues([row]);

  // Recalculate parent
  var recalcResult = recalcPhieuBK(bangkeId);

  return {
    success    : true,
    chuyen_id  : chuyenId,
    phieu_id   : bangkeId,
    row        : targetRow,
    recalc     : recalcResult,
    message    : "Đã cập nhật chuyến " + chuyenId + " tại dòng " + targetRow
  };
}

// ============================================================
// recalcPhieuBK — Tự động cập nhật tổng phiếu BK sau khi thêm/sửa chuyến
// Đọc 1.Data_Xe_BK (34 cột) → tính tổng → ghi vào 1.Data_Xe_PhieuBK
// ============================================================
function recalcPhieuBK(bangkeId) {
  var ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetBK    = ss.getSheetByName(SHEET_NAMES.CHUYEN);
  var sheetPhieu = ss.getSheetByName(SHEET_NAMES.PHIEU_BK);

  if (!sheetBK || !sheetPhieu) {
    return { success: false, error: "Sheet không tồn tại" };
  }

  var dataBK = sheetBK.getDataRange().getValues();
  // Column indices trong 1.Data_Xe_BK (34 cột):
  //  0 = ID_PXK, 24(Y) = Trong_Luong
  // 27(AB) = Don_Gia, 28(AC) = Phi_Khac
  // 29(AD) = Cuoc_Thu_KH, 30(AE) = Cuoc_Khac_Thu_KH

  var sumDonGia       = 0;  // NCC price
  var sumPhiKhac      = 0;  // NCC other fees
  var sumCuocThuKH    = 0;  // Customer charge
  var sumCuocKhacKH   = 0;  // Customer other charge
  var sumTrongLuong   = 0;  // Weight
  var tripCount       = 0;

  for (var i = 1; i < dataBK.length; i++) {
    if (dataBK[i][0].toString().trim() === bangkeId.toString().trim()) {
      tripCount++;
      sumDonGia      += parseFloat(dataBK[i][27]) || 0;  // AB: Don_Gia
      sumPhiKhac     += parseFloat(dataBK[i][28]) || 0;  // AC: Phi_Khac
      sumCuocThuKH   += parseFloat(dataBK[i][29]) || 0;  // AD: Cuoc_Thu_KH
      sumCuocKhacKH  += parseFloat(dataBK[i][30]) || 0;  // AE: Cuoc_Khac_Thu_KH
      sumTrongLuong  += parseFloat(dataBK[i][24]) || 0;  // Y:  Trong_Luong
    }
  }

  var totalNCC = sumDonGia + sumPhiKhac;
  var totalKH  = sumCuocThuKH + sumCuocKhacKH;
  var loiNhuan = totalKH - totalNCC;

  // Tìm dòng của phiếu BK trong sheet 1.Data_Xe_PhieuBK
  var dataPhieu = sheetPhieu.getDataRange().getValues();
  var phieuRowIdx = -1;
  for (var j = 1; j < dataPhieu.length; j++) {
    if (dataPhieu[j][0].toString().trim() === bangkeId.toString().trim()) {
      phieuRowIdx = j;
      break;
    }
  }

  if (phieuRowIdx === -1) {
    return { success: false, error: "Không tìm thấy phiếu BK: " + bangkeId };
  }

  var sheetRow = phieuRowIdx + 1; // array 0-indexed → sheet 1-indexed

  // Cập nhật 1.Data_Xe_PhieuBK computed fields:
  // E(5)=Tai_Tong, F(6)=Don_Gia_KH, G(7)=Don_Gia_NCC, H(8)=Loi_Nhuan
  sheetPhieu.getRange(sheetRow, 5).setValue(sumTrongLuong); // E: Tải tổng
  sheetPhieu.getRange(sheetRow, 6).setValue(totalKH);       // F: Tổng KH
  sheetPhieu.getRange(sheetRow, 7).setValue(totalNCC);      // G: Tổng NCC
  sheetPhieu.getRange(sheetRow, 8).setValue(loiNhuan);      // H: Lợi nhuận

  return {
    success       : true,
    bangke_id     : bangkeId,
    trip_count    : tripCount,
    trong_luong   : sumTrongLuong,
    total_kh      : totalKH,
    total_ncc     : totalNCC,
    loi_nhuan     : loiNhuan
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
