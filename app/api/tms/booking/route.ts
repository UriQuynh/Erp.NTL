import { NextRequest, NextResponse } from 'next/server';
import { fetchSheet, TMS_SPREADSHEET_ID, PhieuBKRow, TripBKRow } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Fetch both sheets concurrently
        const [phieuData, tripData] = await Promise.all([
            fetchSheet<PhieuBKRow>('1.Data_Xe_PhieuBK', TMS_SPREADSHEET_ID),
            fetchSheet<TripBKRow>('1.Data_Xe_BK', TMS_SPREADSHEET_ID),
        ]);

        // Group trips by Booking ID (ID_PXK)
        const tripsByBooking: Record<string, any[]> = {};
        tripData.forEach(trip => {
            const bookingId = trip.ID_PXK || trip.ID; // Fallback if ID_PXK is missing
            if (!tripsByBooking[bookingId]) {
                tripsByBooking[bookingId] = [];
            }
            tripsByBooking[bookingId].push({
                ID: trip.ID,
                Diem_Di: trip.Dia_Chi_Nhan || '',
                Diem_Den: trip.Dia_Chi_Giao || '',
                Bien_So: trip.Bien_So || 'Chưa xếp xe',
                Tai_Xe: trip.Tai_Xe || 'Chưa xếp tài',
                KM: '0', // Not available in sheet natively unless calculated
                Don_Gia: trip.Don_Gia || trip.Cuoc_Thu_KH || '0',
                Trang_Thai: trip.Trang_Thai || 'Chưa thực hiện',
                Time_In: trip.Thoi_Gian_Den || '',
                Time_Out: trip.Thoi_Gian_DenKho || '',
                // Preserve additional info for UI if needed
                Loai_Hang: trip.Loai_Hang,
                So_Bill: trip.So_Bill,
                Trong_Luong: trip.Trong_Luong,
                Nguoi_YC: trip.Nguoi_YC
            });
        });

        // Map parent bookings — deduplicate by ID to prevent duplicate React keys
        const bookingMap = new Map<string, any>();
        
        phieuData.forEach(phieu => {
            const parentId = phieu.ID;
            if (!parentId || parentId.trim() === '') return; // Skip empty rows
            
            // If we already processed this ID, skip (first occurrence wins for metadata)
            if (bookingMap.has(parentId)) return;
            
            const trips = tripsByBooking[parentId] || [];

            // Aggregate NCC (usually from trips if not in parent, but let's grab from first trip if available)
            const ncc = trips.find(t => t.NCC)?.NCC || 'Chưa xác định';
            
            // Determine combined status
            let trangThai = 'Chưa thực hiện';
            if (trips.length > 0) {
                const completeCount = trips.filter(t => t.Trang_Thai === 'Hoàn thành' || t.Trang_Thai === 'Đã hoàn thành').length;
                if (completeCount === trips.length) {
                    trangThai = 'Hoàn thành';
                } else if (completeCount > 0 || trips.some(t => t.Trang_Thai && t.Trang_Thai !== 'Chưa thực hiện' && t.Trang_Thai !== 'Đã hủy')) {
                    trangThai = 'Đang vận chuyển';
                }
            }

            // Get Vehicle Type from first trip
            const loaiXe = trips.length > 0 ? (trips[0].Loai_Xe || trips[0].Loai_xe_YC || 'Chưa xác định') : 'Chưa xác định';

            bookingMap.set(parentId, {
                ID_PXK: parentId,
                Du_An: phieu.Du_An || 'Không xác định',
                NCC: ncc,
                Loai_Xe: loaiXe,
                Ngay_Tao: phieu.Ngay || '',
                Trang_Thai: trangThai,
                So_Chuyen: trips.length,
                Ghi_Chu: phieu.Note || '',
                Nguoi_Tao: phieu.NV_Update || 'Hệ thống',
                trips: trips
            });
        });

        const validBookings = Array.from(bookingMap.values());

        return NextResponse.json({
            success: true,
            count: validBookings.length,
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
