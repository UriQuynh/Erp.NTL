import { NextResponse } from 'next/server';
import { fetchSheet, TMS_SPREADSHEET_ID } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tms/banggia
 * Returns Data_Banggia rows grouped by NCC for cascading dropdowns:
 *   - nccList: unique NCCs with vehicle type counts
 *   - banggia: full rows for client-side filtering
 *   - vehiclesByNCC: { NCC_ID → [ { loai_xe, kich_thuoc, don_gia, display } ] }
 */
export async function GET() {
    try {
        const data = await fetchSheet<Record<string, string>>('Data_Banggia', TMS_SPREADSHEET_ID);

        // Map each row to a normalized structure
        const rows = data
            .filter(r => {
                // Must have at least NCC identifier
                const ncc = (r.NCC_ID || r.NCC || r.ncc_id || r.Ten_NCC || '').trim();
                return !!ncc;
            })
            .map(r => ({
                ncc_id: (r.NCC_ID || r.NCC || r.ncc_id || '').trim(),
                ten_ncc: (r.Ten_NCC || r.ten_ncc || r.NCC_ID || r.NCC || '').trim(),
                loai_xe: (r.Loai_Xe || r.loai_xe || '').trim(),
                kich_thuoc: (r.Kich_Thuoc || r.kich_thuoc || '').trim(),
                don_gia: parseFloat((r.Don_Gia || r.don_gia || '0').replace(/[,.]/g, '')) || 0,
                // Display format: "VH5 - 6m2"
                display: `${(r.Loai_Xe || '').trim()}${(r.Kich_Thuoc || '').trim() ? ' - ' + (r.Kich_Thuoc || '').trim() : ''}`,
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

        // Build vehicles-by-NCC map
        const vehiclesByNCC: Record<string, Array<{
            loai_xe: string; kich_thuoc: string; don_gia: number; display: string;
        }>> = {};
        rows.forEach(r => {
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
            counts: { ncc: nccList.length, rows: rows.length },
        });
    } catch (error) {
        console.error('[API/tms/banggia] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch banggia data', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
