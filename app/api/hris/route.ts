import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetRaw } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * HRIS Spreadsheet ID — separate from the main Task/Finance spreadsheet.
 * Contains: Danh_Sach_NV (employee directory with login credentials)
 */
const HRIS_SPREADSHEET_ID = '1rAojcHQuoLNZrH9tkfTHQGvCkg7XrrLi-hNKkRwhlj8';

/**
 * GET /api/hris?sheet=Danh_Sach_NV
 * Fetches employee data from the HRIS spreadsheet.
 * 
 * Column mapping (Danh_Sach_NV):
 *   B = Mã NV (Employee ID / login username)
 *   L = Pass (login password)
 *   + various HR fields
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sheet = searchParams.get('sheet') || 'Danh_Sach_NV';

    try {
        // Use HRIS spreadsheet, not the main Task spreadsheet
        const rows = await fetchSheetRaw(sheet, HRIS_SPREADSHEET_ID);
        if (rows.length < 2) {
            return NextResponse.json({ success: true, data: [], _debug: 'No data rows found' });
        }

        const headers = rows[0];

        // Fuzzy column finder — handles Gviz header variations
        const findColIdx = (...keywords: string[]) => {
            return headers.findIndex(h => {
                if (!h) return false;
                const hl = h.toLowerCase().trim();
                return keywords.some(kw => hl.includes(kw.toLowerCase()));
            });
        };

        // Map column indices flexibly
        const avatarIdx = findColIdx('Avatar', 'Ảnh', 'avatar');
        const maNVIdx = Math.max(findColIdx('Mã NV', 'Ma_NV', 'M_NV', 'MaNV', 'Mã_NV', 'Ma NV'), 1);
        const hoTenIdx = Math.max(findColIdx('Họ Tên', 'Ho_Ten', 'Tên NV', 'Ten_NV', 'H_tn', 'Họ_Tên', 'HoTen', 'Ho Ten'), 2);
        const msnvHoTenIdx = findColIdx('MSNV', 'MSNV-', 'MSNVHo');
        const gioiTinhIdx = findColIdx('Giới', 'gioi', 'tính', 'Gii_tnh', 'Gioi_Tinh');
        const chucDanhIdx = findColIdx('Chức', 'chuc', 'Chc_Danh');
        const duAnIdx = findColIdx('Dự Án', 'Du_An', 'Du An', 'DuAn', 'D_n');
        const boPhanIdx = findColIdx('Bộ phận', 'Bo_Phan', 'Bộ_Phận', 'B_phn', 'bộ phận');
        const phongBanIdx = findColIdx('Phòng', 'Phong', 'phòng ban', 'Phng_ban');
        const chiNhanhIdx = findColIdx('Chi nhánh', 'Chi_Nhanh', 'Chi Nhnh', 'chi_nhanh');
        const buuCucIdx = findColIdx('Bưu cục', 'Buu_Cuc', 'Bu_Cc', 'bưu cục');
        const trangThaiIdx = findColIdx('Trạng thái', 'Trang_Thai', 'Trng_Thi', 'trạng thái');
        const dienThoaiIdx = findColIdx('Điện thoại', 'Dien_Thoai', 'Phone', 'in_Thoi');
        const emailIdx = findColIdx('email', 'Email');
        const phanQuyenIdx = findColIdx('Phân quyền', 'Phan_Quyen', 'Phn_Quyn', 'quyền');
        const passwordIdx = findColIdx('Pass', 'Password', 'Mật khẩu', 'Mat_Khau');

        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const maNV = (row[maNVIdx] || '').trim();
            const hoTen = (row[hoTenIdx] || '').trim();
            if (!maNV && !hoTen) continue;

            data.push({
                avatar: avatarIdx >= 0 ? (row[avatarIdx] || '').trim() : '',
                maNV,
                hoTen,
                msnvHoTen: msnvHoTenIdx >= 0 ? (row[msnvHoTenIdx] || '').trim() : `${maNV}- ${hoTen}`,
                gioiTinh: gioiTinhIdx >= 0 ? (row[gioiTinhIdx] || '').trim() : '',
                chucDanh: chucDanhIdx >= 0 ? (row[chucDanhIdx] || '').trim() : '',
                duAn: duAnIdx >= 0 ? (row[duAnIdx] || '').trim() : '',
                boPhan: boPhanIdx >= 0 ? (row[boPhanIdx] || '').trim() : '',
                phongBan: phongBanIdx >= 0 ? (row[phongBanIdx] || '').trim() : '',
                chiNhanh: chiNhanhIdx >= 0 ? (row[chiNhanhIdx] || '').trim() : '',
                buuCuc: buuCucIdx >= 0 ? (row[buuCucIdx] || '').trim() : '',
                trangThai: trangThaiIdx >= 0 ? (row[trangThaiIdx] || '').trim() : '',
                dienThoai: dienThoaiIdx >= 0 ? (row[dienThoaiIdx] || '').trim() : '',
                email: emailIdx >= 0 ? (row[emailIdx] || '').trim() : '',
                phanQuyen: phanQuyenIdx >= 0 ? (row[phanQuyenIdx] || '').trim() : '',
                password: passwordIdx >= 0 ? (row[passwordIdx] || '').trim() : '',
            });
        }

        return NextResponse.json({
            success: true,
            count: data.length,
            data,
            _headers: headers,
        });
    } catch (error) {
        console.error('HRIS fetch error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch employee data', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
