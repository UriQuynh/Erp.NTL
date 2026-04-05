import { NextResponse } from 'next/server';
import { fetchSheet, TMS_SPREADSHEET_ID } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tms/banggia
 * 
 * Reads Data_Banggia sheet with ACTUAL columns (after Vietnamese diacritic normalization):
 *   Ma_BG, NCC_ID, Loai_Xe, Loai_Cuoc, Diem_Nhan, KM_Tu, KM_Den,
 *   Don_Gia_Chuyen, Gia_Vuot_KM, Tinh_Den, Quan_Den, Don_Gia_Chuyen (dup),
 *   Luu_Dem, Ghi_Chu, Kich_Thuoc
 *
 * Returns: nccList, vehiclesByNCC, banggia rows for cascading dropdowns.
 */
export async function GET() {
    try {
        const data = await fetchSheet<Record<string, string>>('Data_Banggia', TMS_SPREADSHEET_ID);

        // DEBUG: Log first row keys to confirm field mapping
        if (data.length > 0) {
            console.log('[banggia] Sheet columns (sanitized):', Object.keys(data[0]));
            console.log('[banggia] First row sample:', JSON.stringify(data[0]).slice(0, 300));
        }

        // Map each row — using ACTUAL sanitized column names
        // Loại_Xe → Loai_Xe, Kích_Thước → Kich_Thuoc, Đơn_Giá_Chuyến → Don_Gia_Chuyen
        const rows = data
            .filter(r => {
                const ncc = (r.NCC_ID || '').trim();
                return !!ncc;
            })
            .map(r => ({
                ncc_id: (r.NCC_ID || '').trim(),
                ten_ncc: (r.NCC_ID || '').trim(),  // NCC_ID doubles as display name in this sheet
                loai_xe: (r.Loai_Xe || '').trim(),
                kich_thuoc: (r.Kich_Thuoc || '').trim(),
                don_gia: parseFloat((r.Don_Gia_Chuyen || '0').toString().replace(/[,.]/g, '')) || 0,
                loai_cuoc: (r.Loai_Cuoc || '').trim(),
                diem_nhan: (r.Diem_Nhan || '').trim(),
                // Display format: "VH5 - 6m2" or just "Loai_Xe" if no kich_thuoc
                display: [
                    (r.Loai_Xe || '').trim(),
                    (r.Kich_Thuoc || '').trim(),
                ].filter(Boolean).join(' - ') || (r.Loai_Cuoc || '').trim() || '—',
            }));

        // Build unique NCC list
        const nccMap = new Map<string, { ncc_id: string; ten_ncc: string; count: number }>();
        rows.forEach(r => {
            if (!nccMap.has(r.ncc_id)) {
                nccMap.set(r.ncc_id, { ncc_id: r.ncc_id, ten_ncc: r.ten_ncc, count: 0 });
            }
            nccMap.get(r.ncc_id)!.count++;
        });
        const nccList = Array.from(nccMap.values()).sort((a, b) => a.ten_ncc.localeCompare(b.ten_ncc));

        // Build vehicles-by-NCC map (only rows with loai_xe or loai_cuoc)
        const vehiclesByNCC: Record<string, Array<{
            loai_xe: string; kich_thuoc: string; don_gia: number; display: string;
        }>> = {};
        rows.forEach(r => {
            if (!r.loai_xe && !r.kich_thuoc) return; // skip rows without vehicle info
            if (!vehiclesByNCC[r.ncc_id]) vehiclesByNCC[r.ncc_id] = [];
            // Deduplicate by display string
            if (!vehiclesByNCC[r.ncc_id].some(v => v.display === r.display)) {
                vehiclesByNCC[r.ncc_id].push({
                    loai_xe: r.loai_xe,
                    kich_thuoc: r.kich_thuoc,
                    don_gia: r.don_gia,
                    display: r.display,
                });
            }
        });

        return NextResponse.json({
            success: true,
            data: { nccList, banggia: rows, vehiclesByNCC },
            counts: { ncc: nccList.length, rows: rows.length, vehicleTypes: Object.values(vehiclesByNCC).flat().length },
            _debug: { sampleKeys: data.length > 0 ? Object.keys(data[0]) : [] },
        });
    } catch (error) {
        console.error('[API/tms/banggia] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch banggia data', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
