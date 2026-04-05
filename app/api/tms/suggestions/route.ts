import { NextResponse } from 'next/server';
import { fetchSheet, TMS_SPREADSHEET_ID, TripBKRow } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tms/suggestions
 * Returns unique values from TMS sheets for dropdown auto-suggestions:
 *   - diemGiao: unique addresses from Dia_Chi_Nhan + Dia_Chi_Giao
 *   - ncc: NCC list from NCC sheet
 *   - bienSo: unique license plates
 *   - taiXe: unique driver names
 *   - phoneMap: { bienSo → { taiXe, sdt } } for auto-fill
 *   - driverMap: { taiXe → sdt } for auto-fill
 */
export async function GET() {
    try {
        // Fetch trips and NCC list concurrently
        const [tripData, nccData] = await Promise.all([
            fetchSheet<TripBKRow>('1.Data_Xe_BK', TMS_SPREADSHEET_ID),
            fetchSheet<Record<string, string>>('NCC', TMS_SPREADSHEET_ID).catch(() => []),
        ]);

        // ── Unique addresses (Điểm Giao suggestions) ──
        const addressSet = new Set<string>();
        tripData.forEach(t => {
            const nhan = (t.Dia_Chi_Nhan || '').trim();
            const giao = (t.Dia_Chi_Giao || '').trim();
            if (nhan) addressSet.add(nhan);
            if (giao) addressSet.add(giao);
        });
        const diemGiao = Array.from(addressSet).sort();

        // ── NCC list ──
        // NCC sheet may have columns like: Ten_NCC, NCC, Dia_Chi, SDT, etc.
        // We extract any column that looks like it contains NCC names
        const nccNames: string[] = [];
        nccData.forEach(row => {
            // Try common column name patterns
            const name = row.Ten_NCC || row.NCC || row.ten_ncc || row.Ten || row.Name || '';
            const trimmed = name.trim();
            if (trimmed) nccNames.push(trimmed);
        });
        // Deduplicate
        const ncc = [...new Set(nccNames)].sort();

        // ── Unique Biển Số ──
        const bienSoSet = new Set<string>();
        tripData.forEach(t => {
            const bs = (t.Bien_So || '').trim();
            if (bs && bs !== 'Chưa xếp xe') bienSoSet.add(bs);
        });
        const bienSo = Array.from(bienSoSet).sort();

        // ── Unique Tài Xế ──
        const taiXeSet = new Set<string>();
        tripData.forEach(t => {
            const tx = (t.Tai_Xe || '').trim();
            if (tx && tx !== 'Chưa xếp tài') taiXeSet.add(tx);
        });
        const taiXe = Array.from(taiXeSet).sort();

        // ── Phone Map: Biển Số → { taiXe, sdt } ──
        // Build from most recent trip first (last occurrence wins since data is chronological)
        const phoneMap: Record<string, { taiXe: string; sdt: string }> = {};
        // Iterate in reverse so newer entries overwrite older ones
        for (let i = tripData.length - 1; i >= 0; i--) {
            const t = tripData[i];
            const bs = (t.Bien_So || '').trim();
            if (!bs || bs === 'Chưa xếp xe') continue;
            if (phoneMap[bs]) continue; // already have newer data
            
            // Try various SDT column names the sheet might use
            const sdt = ((t as any).SDT_Tai_Xe || (t as any).SDT || (t as any).sdt || 
                          (t as any).So_Dien_Thoai || '').trim();
            const tx = (t.Tai_Xe || '').trim();
            
            phoneMap[bs] = { taiXe: tx, sdt };
        }

        // ── Driver Map: Tài Xế → SDT ──
        const driverMap: Record<string, string> = {};
        for (let i = tripData.length - 1; i >= 0; i--) {
            const t = tripData[i];
            const tx = (t.Tai_Xe || '').trim();
            if (!tx || tx === 'Chưa xếp tài') continue;
            if (driverMap[tx]) continue;
            const sdt = ((t as any).SDT_Tai_Xe || (t as any).SDT || (t as any).sdt || 
                          (t as any).So_Dien_Thoai || '').trim();
            if (sdt) driverMap[tx] = sdt;
        }

        return NextResponse.json({
            success: true,
            data: {
                diemGiao,
                ncc,
                bienSo,
                taiXe,
                phoneMap,
                driverMap,
            },
            counts: {
                diemGiao: diemGiao.length,
                ncc: ncc.length,
                bienSo: bienSo.length,
                taiXe: taiXe.length,
            },
        });
    } catch (error) {
        console.error('[API/tms/suggestions] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch suggestions', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
