import { NextRequest, NextResponse } from 'next/server';
import { fetchSheet, TMS_SPREADSHEET_ID, PhieuBKRow, TripBKRow } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/** Parse VND amount string → number. Handles comma, dot, text. */
function parseVND(raw: string | undefined): number {
    if (!raw) return 0;
    const cleaned = raw.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
}

/** Strip "NCC_" prefix for display */
function cleanNCC(raw: string): string {
    if (!raw) return '';
    return raw.replace(/^NCC_/i, '').trim();
}

/** Parse NV_Update "MaNV - HoTen" */
function parseNV(raw: string): { maNV: string; hoTen: string } {
    if (!raw) return { maNV: '', hoTen: '' };
    const parts = raw.split(' - ');
    return {
        maNV: (parts[0] || '').trim(),
        hoTen: (parts.slice(1).join(' - ') || '').trim(),
    };
}

export async function GET(request: NextRequest) {
    try {
        // Fetch both sheets concurrently
        const [phieuData, tripData] = await Promise.all([
            fetchSheet<PhieuBKRow>('1.Data_Xe_PhieuBK', TMS_SPREADSHEET_ID),
            fetchSheet<TripBKRow>('1.Data_Xe_BK', TMS_SPREADSHEET_ID),
        ]);

        // ── QUY TẮC 1: Group trips by ID_PXK (FK → PhieuBK.ID) ──
        const tripsByBooking: Record<string, TripBKRow[]> = {};
        tripData.forEach(trip => {
            const fk = (trip.ID_PXK || '').trim();
            if (!fk) return;
            if (!tripsByBooking[fk]) tripsByBooking[fk] = [];
            tripsByBooking[fk].push(trip);
        });

        // ── Build booking entries (deduplicated by ID) ──
        const bookingMap = new Map<string, any>();

        phieuData.forEach(phieu => {
            const idCode = (phieu.ID || '').trim();
            if (!idCode) return;               // Skip empty rows
            if (bookingMap.has(idCode)) return; // Dedupe — first occurrence wins

            const trips = tripsByBooking[idCode] || [];

            // ── QUY TẮC 4: Derive status from trip states ──
            let tinhTrang = 'Chưa Có Xe';
            if (trips.length > 0) {
                const done = trips.filter(t =>
                    (t.Trang_Thai || '').includes('Hoàn Tất') ||
                    (t.Trang_Thai || '').includes('Hoàn thành') ||
                    (t.Trang_Thai || '').includes('Đã hoàn thành')
                ).length;
                const hasVehicle = trips.some(t => t.Bien_So && t.Bien_So.trim() !== '');
                if (done === trips.length) {
                    tinhTrang = 'Hoàn Tất';
                } else if (done > 0 || hasVehicle) {
                    tinhTrang = 'Chưa Hòa Tất';
                } else {
                    tinhTrang = 'Chưa Có Xe';
                }
            }

            // ── QUY TẮC 7: Parse nhân viên ──
            const nv = parseNV(phieu.NV_Update || '');

            // ── Map trips with financial data (PHẦN 3 rules) ──
            // Actual column mapping:
            //   Cuoc_Thu_KH     → Thu khách = Don_Gia_Doitac
            //   Cuoc_Khac_Thu_KH → Phí khác thu KH = Phi_Khac_Doitac
            //   Don_Gia         → Đơn giá NCC
            //   Phi_Khac        → Phát sinh NCC
            const mappedTrips = trips.map(t => {
                const cuocThuKH = parseVND(t.Cuoc_Thu_KH);
                const cuocKhacThuKH = parseVND(t.Cuoc_Khac_Thu_KH);
                const donGiaNCC = parseVND(t.Don_Gia);
                const phiKhac = parseVND(t.Phi_Khac);
                // Lãi/chuyến = CuocThuKH - DonGiaNCC - PhiKhac + CuocKhacThuKH
                const profit = cuocThuKH - donGiaNCC - phiKhac + cuocKhacThuKH;

                // POD images from trip (Hinh_Anh1..4)
                const pods = [t.Hinh_Anh1, t.Hinh_Anh2, t.Hinh_Anh3, t.Hinh_Anh4].filter(p => p && p.trim());

                return {
                    ID: t.ID || '',
                    ID_PXK: idCode,
                    Bien_So: t.Bien_So || 'Chưa xếp xe',
                    Tai_Xe: t.Tai_Xe || 'Chưa xếp tài',
                    Trong_Luong: t.Trong_Luong || '',
                    Loai_Xe: t.Loai_Xe || t.Loai_xe_YC || '',
                    Dia_Chi_Nhan: t.Dia_Chi_Nhan || '',
                    Dia_Chi_Giao: t.Dia_Chi_Giao || '',
                    Loai_Hang: t.Loai_Hang || '',
                    So_Bill: t.So_Bill || '',
                    // Financial — using actual sheet column names
                    Cuoc_Thu_KH: cuocThuKH,        // Thu khách
                    Cuoc_Khac_Thu_KH: cuocKhacThuKH, // PS thu khách
                    Don_Gia_NCC: donGiaNCC,        // Trả NCC
                    Phi_Khac_NCC: phiKhac,         // PS trả NCC
                    NCC_Raw: t.NCC || '',
                    NCC: cleanNCC(t.NCC || ''),
                    Trang_Thai: t.Trang_Thai || '',
                    Nguoi_YC: t.Nguoi_YC || '',
                    Code: t.Code || '',
                    Tuyen: t.Tuyen || '',
                    // Timestamps
                    Thoi_Gian_BK: t.Thoi_Gian_BK || '',
                    Thoi_Gian_Den: t.Thoi_Gian_Den || '',
                    Thoi_Gian_DenKho: t.Thoi_Gian_DenKho || '',
                    // PODs on trip level
                    PODs: pods,
                    // Calculated
                    Tong_Thu: cuocThuKH + cuocKhacThuKH,
                    Tong_Tra: donGiaNCC + phiKhac,
                    Profit: profit,
                };
            });

            // Booking-level aggregates
            const tongThu = mappedTrips.reduce((s, t) => s + t.Tong_Thu, 0);
            const tongTraNCC = mappedTrips.reduce((s, t) => s + t.Tong_Tra, 0);
            const tongPhatSinh = mappedTrips.reduce((s, t) => s + t.Phi_Khac_NCC, 0);
            const tongProfit = mappedTrips.reduce((s, t) => s + t.Profit, 0);

            // Collect unique NCCs
            const uniqueNCCs = [...new Set(mappedTrips.map(t => t.NCC).filter(Boolean))];

            // Collect all PODs from trips
            const allPODs = mappedTrips.flatMap(t => t.PODs);

            bookingMap.set(idCode, {
                ID_CODE: idCode,
                Ngay: phieu.Ngay || '',
                Du_An: phieu.Du_An || '',
                Doi_Tac: phieu.Du_An || '',  // Du_An is the partner/project name
                Diem_Nhan: phieu.Diem_Nhan || '',  // Parent-level pickup address
                Tinh_Trang: tinhTrang,
                NV_Update: phieu.NV_Update || '',
                NV_MaNV: nv.maNV,
                NV_HoTen: nv.hoTen,
                Note: phieu.Note || '',
                PODs: allPODs,
                // Aggregates
                So_Chuyen: mappedTrips.length,
                Tong_Thu: tongThu,
                Tong_Tra_NCC: tongTraNCC,
                Tong_Phat_Sinh: tongPhatSinh,
                Profit: tongProfit,
                NCCs: uniqueNCCs,
                // Children
                trips: mappedTrips,
            });
        });

        const validBookings = Array.from(bookingMap.values());

        return NextResponse.json({
            success: true,
            count: validBookings.length,
            tripCount: tripData.length,
            data: validBookings,
        });
    } catch (error) {
        console.error('TMS Booking fetch error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch TMS Booking data', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
