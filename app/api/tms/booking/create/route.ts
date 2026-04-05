import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Format dd/mm/yyyy for Google Sheets USER_ENTERED */
function formatDateVN(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

/** Generate suffix for booking ID */
function generateSuffix(): string {
    const { randomBytes } = require('crypto');
    const buf = randomBytes(4) as Buffer;
    return buf.toString('hex').toUpperCase();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // ── Validate required fields (updated schema: no SDT, no Diem_Giao) ──
        const { Du_An, Diem_Nhan, Ngay, Note, NV_Update, ID_CODE, Trong_Luong } = body;

        if (!Du_An?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu tên khách hàng / dự án' }, { status: 400 });
        }
        if (!Diem_Nhan?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu điểm lấy hàng' }, { status: 400 });
        }
        if (!NV_Update?.trim()) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin nhân viên' }, { status: 400 });
        }

        const bangkeId = ID_CODE || ('BANGKE_' + generateSuffix());
        const ngayFormatted = formatDateVN(Ngay || '');

        // ── Compose row matching sheet 1.Data_Xe_PhieuBK ──
        // Column order: ID | Ngay | Du_An | Diem_Nhan | Tai_Tong | Don_Gia_KH | Don_Gia_NCC | Loi_Nhuan | Note | NV_Update | Trong_Luong
        const row = [
            bangkeId,                     // Col 1: ID
            ngayFormatted,                // Col 2: Ngay
            Du_An.trim(),                 // Col 3: Du_An
            Diem_Nhan.trim(),             // Col 4: Diem_Nhan
            0,                            // Col 5: Tai_Tong (0, computed later from trips)
            0,                            // Col 6: Don_Gia_KH (computed)
            0,                            // Col 7: Don_Gia_NCC (computed)
            0,                            // Col 8: Loi_Nhuan (computed)
            (Note || '').trim(),          // Col 9: Note
            NV_Update.trim(),             // Col 10: NV_Update
            Trong_Luong || '',            // Col 11: Trong_Luong
        ];

        // ── Try GAS webhook first ──
        const GAS_URL = (process.env.TMS_GAS_URL || '').trim();

        if (GAS_URL) {
            const gasPayload = {
                action: 'createPhieuBK',
                sheetName: '1.Data_Xe_PhieuBK',
                rowData: row,
                bangkeId,
                // Also send structured data for GAS to process
                ID: bangkeId,
                Ngay: ngayFormatted,
                Du_An: Du_An.trim(),
                Diem_Nhan: Diem_Nhan.trim(),
                Tai_Tong: 0,
                Don_Gia_KH: 0,
                Don_Gia_NCC: 0,
                Loi_Nhuan: 0,
                Note: (Note || '').trim(),
                NV_Update: NV_Update.trim(),
                Trong_Luong: Trong_Luong || '',
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
            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${TMS_SHEET_ID}/values/1.Data_Xe_PhieuBK!A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${SHEETS_KEY}`;

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

        // ── Dev mock ──
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
