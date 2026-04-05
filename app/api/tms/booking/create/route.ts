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

        // ── Validate required fields ──
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

        // ── Structured payload matching 1.Data_Xe_PhieuBK columns A→K ──
        const gasPayload = {
            action: 'createPhieuBK',
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
            // Also include rowData array for GAS compatibility
            sheetName: '1.Data_Xe_PhieuBK',
            rowData: [
                bangkeId,
                ngayFormatted,
                Du_An.trim(),
                Diem_Nhan.trim(),
                0,
                0,
                0,
                0,
                (Note || '').trim(),
                NV_Update.trim(),
                Trong_Luong || '',
            ],
        };

        // ── Try GAS proxy (server-side, no CORS issues) ──
        const GAS_URL = (process.env.TMS_GAS_URL || '').trim();

        if (GAS_URL) {
            console.log(`[CreateBooking] Writing to GAS: ${bangkeId}`);

            const gasRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(gasPayload),
                redirect: 'follow',
            });

            if (!gasRes.ok) {
                const errText = await gasRes.text().catch(() => '');
                throw new Error(`GAS write failed: ${gasRes.status} — ${errText}`);
            }

            let gasData;
            try {
                gasData = await gasRes.json();
            } catch {
                // GAS sometimes returns non-JSON on success
                gasData = { success: true };
            }

            if (gasData.success === false) {
                return NextResponse.json({
                    success: false,
                    error: gasData.error || 'GAS write thất bại',
                }, { status: 422 });
            }

            return NextResponse.json({
                success: true,
                bangkeId,
                displayId: bangkeId.replace('BANGKE_', 'PXK_'),
                message: `Tạo Booking ${bangkeId} thành công`,
                source: 'gas',
                gasResponse: gasData,
            });
        }

        // ── Dev mock (no GAS URL configured) ──
        console.warn('[DEV] No TMS_GAS_URL configured. Simulating write success.');
        await new Promise(r => setTimeout(r, 600));
        return NextResponse.json({
            success: true,
            bangkeId,
            displayId: bangkeId.replace('BANGKE_', 'PXK_'),
            message: `[DEV] Booking ${bangkeId} simulated`,
            source: 'dev_mock',
            payload: gasPayload,
        });

    } catch (error) {
        console.error('Create Booking error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi lưu dữ liệu', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
