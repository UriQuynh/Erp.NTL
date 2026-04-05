import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Format dd/mm/yyyy for Google Sheets USER_ENTERED */
function formatDateVN(dateStr: string): string {
    if (!dateStr) return '';
    // Input from date picker: yyyy-mm-dd
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

/** Generate suffix for booking ID */
function generateSuffix(): string {
    const array = new Uint8Array(4);
    // Node.js crypto
    const { randomBytes } = require('crypto');
    const buf = randomBytes(4) as Buffer;
    return buf.toString('hex').toUpperCase();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // ── Validate required fields ──
        const { Du_An, Diem_Nhan, Diem_Giao, Ngay, Note, SDT, NV_Update, ID_CODE } = body;

        if (!Du_An?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu tên khách hàng / dự án' }, { status: 400 });
        }
        if (!Diem_Nhan?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu điểm lấy hàng' }, { status: 400 });
        }
        if (!Diem_Giao?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu điểm giao hàng' }, { status: 400 });
        }
        if (!NV_Update?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin nhân viên' }, { status: 400 });
        }

        const bangkeId = ID_CODE || ('BANGKE_' + generateSuffix());
        const noteWithSDT = SDT ? `${Note || ''} | SDT: ${SDT}`.trim().replace(/^\s*\|\s*/, '') : (Note || '');
        const ngayFormatted = formatDateVN(Ngay || '');

        // ── Compose row A→Z (26 columns) ──
        // Mapping from spec Section VII:
        const row = [
            bangkeId,           // A = ID
            '',                 // B = empty (Trip ID - điền khi tạo chuyến)
            ngayFormatted,      // C = Ngay
            '',                 // D = Booking description (empty)
            '',                 // E = empty
            '',                 // F = Bien_So (empty)
            '',                 // G = Tai_Xe (empty)
            '',                 // H = Tai_Trong (empty)
            '',                 // I = Equipment_Type (empty)
            Diem_Nhan.trim(),   // J = Diem_Nhan
            Diem_Giao.trim(),   // K = Diem_Giao
            '',                 // L = Don_Gia_Doitac (empty)
            '',                 // M = Phi_Khac (empty)
            '',                 // N = Don_Gia_NCC (empty)
            '',                 // O = Phat_Sinh (empty)
            Du_An.trim(),       // P = Doi_Tac / Du_An
            '',                 // Q = NCC (empty)
            'Chưa Có Xe',       // R = Tinh_Trang (default)
            noteWithSDT,        // S = Note (ghi chú + SĐT)
            '',                 // T = SVD (empty)
            '',                 // U = POD1 (empty)
            '',                 // V = POD2 (empty)
            '',                 // W = POD3 (empty)
            '',                 // X = POD4 (empty)
            '',                 // Y = CODE_TUYEN (empty)
            NV_Update.trim(),   // Z = NV_Update
        ];

        // ── Try GAS webhook first ──
        const GAS_URL = (process.env.TMS_GAS_URL || '').trim();

        if (GAS_URL) {
            // GAS write via text/plain POST (no CORS preflight)
            const gasPayload = {
                action: 'addPhieuBK',
                sheetName: '1.Data_Xe_PhieuBK',
                rowData: row,
                bangkeId,
            };

            const gasRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(gasPayload),
                redirect: 'follow',
            });

            if (!gasRes.ok) {
                throw new Error(`GAS write failed: ${gasRes.status}`);
            }

            const gasData = await gasRes.json();
            return NextResponse.json({
                success: true,
                bangkeId,
                displayId: bangkeId.replace('BANGKE_', 'PXK_'),
                message: `Tạo Booking ${bangkeId} thành công`,
                source: 'gas',
                gasResponse: gasData,
            });
        }

        // ── Fall back to Google Sheets API v4 ──
        const SHEETS_KEY = (process.env.GOOGLE_SHEETS_API_KEY || '').trim();
        const TMS_SHEET_ID = '13WVfTdZD4lzhoEeFINM3TsRmg0cz1DFpQ9Jut1MYP1U';

        if (SHEETS_KEY) {
            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${TMS_SHEET_ID}/values/1.Data_Xe_PhieuBK!A:Z:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${SHEETS_KEY}`;

            const sheetsRes = await fetch(appendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [row] }),
            });

            if (!sheetsRes.ok) {
                const errText = await sheetsRes.text();
                throw new Error(`Sheets API error: ${sheetsRes.status} — ${errText}`);
            }

            return NextResponse.json({
                success: true,
                bangkeId,
                displayId: bangkeId.replace('BANGKE_', 'PXK_'),
                message: `Tạo Booking ${bangkeId} thành công`,
                source: 'sheets_api',
            });
        }

        // ── No write endpoint configured: return mock success in dev ──
        if (process.env.NODE_ENV === 'development') {
            console.warn('[DEV] No TMS_GAS_URL or GOOGLE_SHEETS_API_KEY configured. Simulating write success.');
            await new Promise(r => setTimeout(r, 600));
            return NextResponse.json({
                success: true,
                bangkeId,
                displayId: bangkeId.replace('BANGKE_', 'PXK_'),
                message: `[DEV] Booking ${bangkeId} simulated`,
                source: 'dev_mock',
                rowData: row,
            });
        }

        return NextResponse.json(
            { success: false, error: 'Chưa cấu hình TMS_GAS_URL hoặc GOOGLE_SHEETS_API_KEY' },
            { status: 503 }
        );

    } catch (error) {
        console.error('Create Booking error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi lưu dữ liệu', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
