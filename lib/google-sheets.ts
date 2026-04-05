/**
 * Google Sheets Integration Module
 * ──────────────────────────────────
 * Reads data from Google Sheets using the Gviz (Google Visualization API).
 * This approach works with publicly viewable sheets without needing OAuth.
 *
 *
 * Spreadsheet ID: 1QjelpEElXH-0fxYO4puGA4rwcbhvX4Uc7ucuZqWH9UQ
 */

export const SPREADSHEET_ID = '1QjelpEElXH-0fxYO4puGA4rwcbhvX4Uc7ucuZqWH9UQ';
export const TMS_SPREADSHEET_ID = '13WVfTdZD4lzhoEeFINM3TsRmg0cz1DFpQ9Jut1MYP1U';

/**
 * Normalize Vietnamese diacritics to ASCII-safe keys.
 * Loại_Xe → Loai_Xe, Kích_Thước → Kich_Thuoc, Đơn_Giá → Don_Gia
 */
function safeKeyVN(raw: string): string {
    return raw
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')   // đ is NOT a combining character
        .normalize('NFD')                          // decompose accented chars
        .replace(/[\u0300-\u036f]/g, '')            // strip combining diacritical marks
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
}

// Sheet names mapped to their GIDs (for reference in CSV fallback)
export const SHEET_GIDS: Record<string, number> = {
    'FIle_Luong': 722934013,
    'Fillter_Task': 823153237,
    'Ngan_Hang': 1143977570,
    'Task_List': 1948162682,
    'Khoan': 580487256,
    'GroupCV': 138469474,
    'Home': 1879779896,
    'Home_HR': 1163308007,
    'Home_FN': 886398907,
    'Home_TRUCK': 1486624865,
    'issue': 1322821574,
    'BANGLUONG': 441566009,
    'Khoan_2': 106835407,
    'KPI': 1670239221,
    'Nang_Suat': 1317019271,
    'Khoan_OT': 1902869033,
};

// GID → sheet name reverse lookup
const GID_TO_NAME: Record<number, string> = Object.fromEntries(
    Object.entries(SHEET_GIDS).map(([name, gid]) => [gid, name])
);

/**
 * Fetch sheet data using Google Visualization API (Gviz).
 * Returns parsed rows as array of objects keyed by column headers.
 * 
 * @param query Optional SQL-like query for server-side filtering
 */
async function fetchViaGviz(
    sheetName: string,
    query: string = 'SELECT *',
    customSpreadsheetId?: string
): Promise<Record<string, string>[]> {
    const defaultSpreadsheetId = customSpreadsheetId || SPREADSHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${defaultSpreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
        console.error(`Gviz fetch failed for "${sheetName}": ${response.status}`);
        return [];
    }

    const text = await response.text();

    // Google returns wrapped JSON: google.visualization.Query.setResponse({...})
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx < 0 || endIdx < 0) {
        console.error('Gviz: Could not find JSON object in response');
        return [];
    }

    const jsonStr = text.substring(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);

    if (parsed.status === 'error') {
        const errMsg = parsed.errors?.[0]?.detailed_message || 'Unknown Gviz error';
        console.error(`Gviz Error: ${errMsg}`);
        return [];
    }

    // Extract column labels
    const cols: string[] = parsed.table.cols.map((c: any) => {
        const label = (c.label || '').trim();
        // Normalize: replace spaces/special chars with underscores
        return label;
    });

    // Map rows to objects
    const rows: Record<string, string>[] = parsed.table.rows.map((row: any) => {
        const obj: Record<string, string> = {};
        (row.c || []).forEach((cell: any, i: number) => {
            if (cols[i]) {
                // Prefer formatted value (f) over raw value (v)
                obj[cols[i]] = cell ? (cell.f || String(cell.v ?? '')) : '';
            }
        });
        return obj;
    });

    return rows;
}

/**
 * Parse a CSV string into rows of string arrays.
 * Handles quoted fields, commas inside quotes, and line breaks inside quotes.
 */
function parseCSV(csv: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\r' && nextChar === '\n') {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
                i++;
            } else if (char === '\n') {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }

    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    return rows.filter(row => row.some(cell => cell !== ''));
}

/**
 * Fetch raw CSV rows from a sheet. Returns [headers, ...dataRows].
 * Now tries Gviz first (works with viewable sheets), falls back to CSV export.
 */
export async function fetchSheetRaw(
    sheetNameOrGid: string | number,
    customSpreadsheetId?: string
): Promise<string[][]> {
    // Resolve sheet name
    let sheetName: string;
    if (typeof sheetNameOrGid === 'number') {
        sheetName = GID_TO_NAME[sheetNameOrGid] || '';
    } else {
        sheetName = sheetNameOrGid;
    }

    // Try Gviz first (more reliable for publicly viewable sheets)
    if (sheetName) {
        try {
            const gvizData = await fetchViaGviz(sheetName, 'SELECT *', customSpreadsheetId);
            if (gvizData.length > 0) {
                // Convert object rows to 2D string array (headers + data)
                const headers = Object.keys(gvizData[0]);
                const dataRows = gvizData.map(row => headers.map(h => row[h] || ''));
                return [headers, ...dataRows];
            }
        } catch (err) {
            console.error('Gviz fetch failed, trying CSV fallback:', err);
        }
    }

    // Fallback: CSV export 
    const gid = typeof sheetNameOrGid === 'number'
        ? sheetNameOrGid
        : SHEET_GIDS[sheetNameOrGid] ?? 0;

    const defaultSpreadsheetId = customSpreadsheetId || SPREADSHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${defaultSpreadsheetId}/export?format=csv&gid=${gid}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            console.error(`CSV export failed (gid=${gid}): ${res.status}`);
            return [];
        }
        const csvText = await res.text();
        return parseCSV(csvText);
    } catch (err) {
        console.error('CSV fallback also failed:', err);
        return [];
    }
}

/**
 * Fetch a sheet as array of objects (header keys → cell values).
 * Uses Gviz API for best compatibility.
 */
export async function fetchSheet<T = Record<string, string>>(
    sheetNameOrGid: string | number,
    customSpreadsheetId?: string
): Promise<T[]> {
    // Resolve sheet name
    let sheetName: string;
    if (typeof sheetNameOrGid === 'number') {
        sheetName = GID_TO_NAME[sheetNameOrGid] || '';
    } else {
        sheetName = sheetNameOrGid;
    }

    // Try Gviz first
    if (sheetName) {
        try {
            const gvizData = await fetchViaGviz(sheetName, 'SELECT *', customSpreadsheetId);
            if (gvizData.length > 0) {
                // Convert keys to safe format (replace spaces/special chars with underscores)
                return gvizData.map(row => {
                    const obj: Record<string, string> = {};
                    Object.entries(row).forEach(([key, value]) => {
                        obj[safeKeyVN(key)] = value;
                    });
                    return obj as T;
                });
            }
        } catch (err) {
            console.error('Gviz fetchSheet failed, trying CSV fallback:', err);
        }
    }

    // Fallback: use fetchSheetRaw + transform
    const rows = await fetchSheetRaw(sheetNameOrGid, customSpreadsheetId);
    if (rows.length < 2) return [];

    const headers = rows[0];
    const data: T[] = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj: Record<string, string> = {};
        headers.forEach((header, j) => {
            if (header) {
                obj[safeKeyVN(header)] = row[j] || '';
            }
        });
        data.push(obj as T);
    }

    return data;
}

// ─── Typed interfaces matching the ACTUAL Google Sheet columns ───

/** Task_List sheet (gid=1948162682) — Main task/work log data */
export interface TaskListRow {
    ID_Date_Task: string;
    Ngay_Lam_Viec: string;
    Nhan_Vien: string;
    Group_CV: string;
    Cong_Viec: string;
    Chi_Tiet: string;
    Dia_Chi: string;
    Time_YeuCau: string;
    Time_in: string;
    Time_Out: string;
    Local_in: string;
    Local_out: string;
    HA_IN: string;
    HA_OUT: string;
    Phi: string;
    Phi_Khac: string;
    Confirm_Task: string;
    Cham_Cong: string;
    Nguoi_Tao: string;
    Tinh_Trang_TT: string;
    QR_Code: string;
    QR_IMAGE: string;
}

/** Fillter_Task sheet (gid=823153237) — Summary/filter view */
export interface FilterTaskRow {
    ID: string;
    Tu_Ngay: string;
    Den_Ngay: string;
    Nhan_Vien: string;
    Group_CV: string;
    Cong_Viec: string;
    Nguoi_Tao: string;
    Tinh_Trang_TT: string;
    File: string;
    Tong_Tien: string;
    QR_Code: string;
}

/** Ngan_Hang sheet (gid=1143977570) — Employee list */
export interface NganHangRow {
    Avatar: string;
    M_NV: string;     // Mã NV (special chars stripped)
    H_tn: string;     // Họ tên
    MSNVHo_Tn: string;
    Gii_tnh: string;
    Chc_Danh: string;
    B_phn: string;
    Phng_ban: string;
    Chi_Nhnh: string;
    Bu_Cc: string;
    Trang_Thi: string;
    in_Thoi: string;
    Email: string;
}

/** GroupCV sheet (gid=138469474) — Work group definitions */
export interface GroupCVRow {
    GROUP: string;
    Dia_Chi: string;
    Loai_Khai_Thac: string;
    Khoan: string;
}

/** 1.Data_Xe_PhieuBK -- Phiếu Booking (Header)
 *  Actual Gviz columns: ID, Ngay, Du_An, Diem_Nhan, Tai_Tong, Don_Gia_KH, Don_Gia_NCC, Loi_Nhuan, Note, NV_Update, Trong_Luong
 */
export interface PhieuBKRow {
    ID: string;           // Primary Key — BANGKE_XXXXXXXX or PXK_XXXXXXXX
    Ngay: string;         // Ngày booking (dd/mm/yyyy)
    Du_An: string;        // Đối tác/Dự án (e.g. "Pantos - LG")
    Diem_Nhan: string;    // Điểm nhận (if any)
    Tai_Tong: string;     // Tải trọng tổng
    Don_Gia_KH: string;   // Đơn giá khách hàng (aggregate)
    Don_Gia_NCC: string;  // Đơn giá NCC (aggregate) 
    Loi_Nhuan: string;    // Lợi nhuận (aggregate)
    Note: string;         // Ghi chú
    NV_Update: string;    // Nhân viên (MaNV - HoTen)
    Trong_Luong: string;  // Trọng lượng
    [key: string]: string;
}

/** 1.Data_Xe_BK -- Chi Tiết Chuyến Xe (Detail)
 *  Actual Gviz columns: ID_PXK, ID, Ngay, Du_An/BC→Du_AnBC, Dia_Chi_Nhan, Dia_Chi_Giao,
 *  Nguoi_YC, Thoi_Gian_BK, Thoi_Gian_Den, Thoi_Gian_Xuat, Thoi_Gian_DenKho,
 *  Thoi_Gian_HoanThanh, Loai_Hang, Thong_Tin, So_Bill, Bien So→Bien_So, Loai_Xe,
 *  Loai_xe_YC, Hinh_Anh1..4, Trang_Thai, Tai_Xe, Trong_Luong, Leadtime,
 *  NCC, Don_Gia, Phi_Khac, Cuoc_Thu_KH, Cuoc_Khac_Thu_KH, Code, Tuyen, Map
 */
export interface TripBKRow {
    ID_PXK: string;             // FK → PhieuBKRow.ID
    ID: string;                 // Trip UUID
    Ngay: string;               // Ngày chuyến
    Du_AnBC: string;            // Dự án / BC (sanitized from "Du_An/BC")
    Dia_Chi_Nhan: string;       // Địa chỉ nhận hàng
    Dia_Chi_Giao: string;       // Địa chỉ giao hàng
    Nguoi_YC: string;           // Người yêu cầu
    Thoi_Gian_BK: string;       // Thời gian booking
    Thoi_Gian_Den: string;      // Thời gian đến
    Thoi_Gian_Xuat: string;     // Thời gian xuất
    Thoi_Gian_DenKho: string;   // Thời gian đến kho
    Thoi_Gian_HoanThanh: string;// Thời gian hoàn thành
    Loai_Hang: string;          // Loại hàng
    Thong_Tin: string;          // Thông tin thêm
    So_Bill: string;            // Số bill
    Bien_So: string;            // Biển số xe (sanitized from "Bien So")
    Loai_Xe: string;            // Loại xe (VH5, VH8...) = Equipment_Type
    Loai_xe_YC: string;         // Loại xe yêu cầu
    Hinh_Anh1: string;          // Ảnh POD 1
    Hinh_Anh2: string;          // Ảnh POD 2
    Hinh_Anh3: string;          // Ảnh POD 3
    Hinh_Anh4: string;          // Ảnh POD 4
    Trang_Thai: string;         // Trạng thái chuyến
    Tai_Xe: string;             // Tài xế
    Trong_Luong: string;        // Trọng lượng
    Leadtime: string;           // Leadtime
    NCC: string;                // Nhà cung cấp (NCC_<tên>)
    Don_Gia: string;            // Đơn giá NCC (VND)
    Phi_Khac: string;           // Phí phát sinh NCC
    Cuoc_Thu_KH: string;        // Cước thu khách hàng
    Cuoc_Khac_Thu_KH: string;   // Cước khác thu KH (phí PS)
    Code: string;               // Code tuyến
    Tuyen: string;              // Tuyến đường
    Map: string;                // Map link
    [key: string]: string;
}
