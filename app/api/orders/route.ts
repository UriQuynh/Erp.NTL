import { NextRequest, NextResponse } from 'next/server';
import { fetchSheet, fetchSheetRaw, type TaskListRow, SHEET_GIDS } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export interface OrderFromSheet {
    id: string;
    date: string;
    employeeCode: string;
    employeeName: string;
    groupCV: string;
    taskDetail: string;
    subDetail: string;
    address: string;
    timeRequired: string;
    timeIn: string;
    timeOut: string;
    localIn: string;
    localOut: string;
    imageIn: string;
    imageOut: string;
    fee: number;
    feeOther: number;
    confirmTask: string;
    chamCong: string;
    createdBy: string;
    status: 'completed' | 'in_progress' | 'pending' | 'cancelled';
    qrCode: string;
    tinhTrangTT: string;
}

function parseEmployee(raw: string): { code: string; name: string } {
    if (!raw) return { code: '', name: '' };
    // Format: "5004357 - Lê Thị Diễm Hằng" or "5003253-Trương Minh Đức"
    const match = raw.match(/^(\S+)\s*-\s*(.+)$/);
    if (match) return { code: match[1], name: match[2].trim() };
    return { code: '', name: raw.trim() };
}

function mapStatus(raw: string): OrderFromSheet['status'] {
    if (!raw) return 'pending';
    const lower = raw.toLowerCase().trim();
    if (lower.includes('đã thanh toán') || lower.includes('da thanh toan') || lower.includes('hoàn thành') || lower.includes('done') || lower.includes('xong')) return 'completed';
    if (lower.includes('đang') || lower.includes('processing') || lower.includes('xử lý')) return 'in_progress';
    if (lower.includes('hủy') || lower.includes('cancel')) return 'cancelled';
    if (lower.includes('chưa thanh toán') || lower.includes('chưa') || lower.includes('pending')) return 'pending';
    return 'pending';
}

function parseAmount(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

/**
 * GET /api/orders
 * Fetches tasks from the Task_List Google Sheet (gid=1948162682)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    try {
        // Fetch tasks + employee bank data in parallel
        const [rawData, bankRows] = await Promise.all([
            fetchSheet<TaskListRow>(SHEET_GIDS['Task_List']),
            fetchSheetRaw(SHEET_GIDS['Ngan_Hang']),
        ]);

        // Build bank lookup: MSNV-Họ Tên → { nganHang, soTK, chuTK }
        // Ngan_Hang columns: Avatar(0), MaNV(1), HoTen(2), MSNV-HoTen(3), ..., SoTK(25), ChuTK(26), NganHang(27)
        const bankLookup: Record<string, { nganHang: string; soTK: string; chuTK: string }> = {};
        if (bankRows.length > 1) {
            for (let i = 1; i < bankRows.length; i++) {
                const row = bankRows[i];
                const msnvHoTen = (row[3] || '').trim();
                if (msnvHoTen) {
                    bankLookup[msnvHoTen] = {
                        nganHang: (row[27] || '').trim(),
                        soTK: (row[25] || '').trim(),
                        chuTK: (row[26] || '').trim(),
                    };
                }
            }
        }

        const orders: OrderFromSheet[] = rawData
            .filter(row => row.ID_Date_Task && row.ID_Date_Task !== '#N/A' && row.ID_Date_Task !== 'N/A')
            .map(row => {
                const emp = parseEmployee(row.Nhan_Vien || '');
                return {
                    id: row.ID_Date_Task || '',
                    date: row.Ngay_Lam_Viec || '',
                    employeeCode: emp.code,
                    employeeName: emp.name,
                    groupCV: row.Group_CV || '',
                    taskDetail: row.Cong_Viec || '',
                    subDetail: row.Chi_Tiet || '',
                    address: row.Dia_Chi || '',
                    timeRequired: row.Time_YeuCau || '',
                    timeIn: row.Time_in || '',
                    timeOut: row.Time_Out || '',
                    localIn: row.Local_in || '',
                    localOut: row.Local_out || '',
                    imageIn: row.HA_IN || '',
                    imageOut: row.HA_OUT || '',
                    fee: parseAmount(row.Phi || ''),
                    feeOther: parseAmount(row.Phi_Khac || ''),
                    confirmTask: row.Confirm_Task || '',
                    chamCong: row.Cham_Cong || '',
                    createdBy: row.Nguoi_Tao || '',
                    status: mapStatus(row.Tinh_Trang_TT || ''),
                    tinhTrangTT: row.Tinh_Trang_TT || '',
                    qrCode: row.QR_Code || '', // read from sheet column U if present
                };
            });

        // Generate VietQR URLs for each order (only if qrCode is empty — don't overwrite sheet data)
        // Bank name mapping (format: https://img.vietqr.io/image/{BankName}-{Account}-print.png)
        const VIETQR_BANK_NAMES: Record<string, string> = {
            'vietcombank': 'Vietcombank', 'vcb': 'Vietcombank',
            'techcombank': 'Techcombank', 'tcb': 'Techcombank',
            'bidv': 'BIDV',
            'vietinbank': 'VietinBank', 'icb': 'VietinBank',
            'mb bank': 'MBBank', 'mb': 'MBBank', 'mbbank': 'MBBank',
            'acb': 'ACB',
            'sacombank': 'Sacombank', 'stb': 'Sacombank',
            'vpbank': 'VPBank', 'vpb': 'VPBank',
            'tpbank': 'TPBank', 'tpb': 'TPBank',
            'agribank': 'Agribank', 'vba': 'Agribank',
            'shb': 'SHB',
            'hdbank': 'HDBank', 'hdb': 'HDBank',
            'ocb': 'OCB',
            'msb': 'MSB',
            'eximbank': 'Eximbank', 'eib': 'Eximbank',
            'lienvietpostbank': 'LienVietPostBank', 'lpb': 'LienVietPostBank',
            'seabank': 'SeABank', 'seab': 'SeABank',
            'vib': 'VIB',
            'bac a bank': 'BacABank', 'bab': 'BacABank',
            'scb': 'SCB',
            'kienlongbank': 'KienLongBank', 'klb': 'KienLongBank',
            'nam a bank': 'NamABank', 'nab': 'NamABank',
            'saigonbank': 'Saigonbank', 'sgb': 'Saigonbank',
            'pgbank': 'PGBank', 'pgb': 'PGBank',
            'dong a bank': 'DongABank', 'dob': 'DongABank',
            'baovietbank': 'BaoVietBank',
            'pvcombank': 'PVcomBank',
            'abbank': 'ABBank',
            'ncb': 'NCB',
        };

        orders.forEach(order => {
            // Skip if qrCode already set from Google Sheet column U
            if (order.qrCode) return;

            // Lookup bank info by Nhan_Vien (which matches MSNV-Họ Tên format)
            const nhanVienRaw = rawData.find(r => r.ID_Date_Task === order.id)?.Nhan_Vien || '';
            const bankInfo = bankLookup[nhanVienRaw.trim()];

            if (bankInfo && bankInfo.nganHang && bankInfo.soTK) {
                const totalFee = order.fee + order.feeOther;
                // Find VietQR bank name
                let bankName = '';
                const bankNameLower = bankInfo.nganHang.toLowerCase().trim();
                for (const [key, name] of Object.entries(VIETQR_BANK_NAMES)) {
                    if (bankNameLower.includes(key) || key.includes(bankNameLower)) {
                        bankName = name;
                        break;
                    }
                }
                if (!bankName) bankName = bankInfo.nganHang; // fallback to raw name

                const addInfo = encodeURIComponent(`Thanhtoan Task ${order.id.toUpperCase()}`);
                const accountName = encodeURIComponent(bankInfo.chuTK || bankInfo.soTK);
                order.qrCode = `https://img.vietqr.io/image/${bankName}-${bankInfo.soTK}-print.png?amount=${totalFee}&addInfo=${addInfo}&accountName=${accountName}`;
            }
        });

        // Stats
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        const totalFees = orders.reduce((sum, o) => sum + o.fee + o.feeOther, 0);

        // Group stats — tasks per group
        const groupStats: Record<string, number> = {};
        orders.forEach(o => {
            if (o.groupCV) groupStats[o.groupCV] = (groupStats[o.groupCV] || 0) + 1;
        });

        // Employee stats — tasks per employee
        const employeeStats: Record<string, { name: string; code: string; tasks: number }> = {};
        orders.forEach(o => {
            if (o.employeeName) {
                if (!employeeStats[o.employeeName]) {
                    employeeStats[o.employeeName] = { name: o.employeeName, code: o.employeeCode, tasks: 0 };
                }
                employeeStats[o.employeeName].tasks++;
            }
        });

        // Top employees
        const topEmployees = Object.values(employeeStats)
            .sort((a, b) => b.tasks - a.tasks)
            .slice(0, 10);

        // Top groups
        const topGroups = Object.entries(groupStats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Monthly breakdown
        const monthlyData: Record<string, { tasks: number; completed: number }> = {};
        orders.forEach(o => {
            if (o.date) {
                // Date format from Google Sheets: "DD/MM/YYYY" (e.g. "21/04/2025")
                const parts = o.date.split('/');
                if (parts.length >= 3) {
                    const monthKey = `${parts[1]}/${parts[2]}`; // "04/2025" → month/year
                    if (!monthlyData[monthKey]) monthlyData[monthKey] = { tasks: 0, completed: 0 };
                    monthlyData[monthKey].tasks++;
                    if (o.status === 'completed') monthlyData[monthKey].completed++;
                }
            }
        });

        // Apply date filter if requested (progressive loading)
        let filteredOrders = orders;
        const totalCount = orders.length;
        if (daysParam) {
            const days = parseInt(daysParam);
            if (!isNaN(days) && days > 0) {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                cutoff.setHours(0, 0, 0, 0);
                filteredOrders = orders.filter(o => {
                    if (!o.date) return false;
                    // Parse DD/MM/YYYY format from Google Sheets
                    const parts = o.date.split('/');
                    if (parts.length >= 3) {
                        const d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00`);
                        return d >= cutoff;
                    }
                    return false;
                });
            }
        }

        // Recalculate stats for filtered data
        const fTotalOrders = filteredOrders.length;
        const fCompletedOrders = filteredOrders.filter(o => o.status === 'completed').length;
        const fPendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
        const fInProgressOrders = filteredOrders.filter(o => o.status === 'in_progress').length;
        const fCancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
        const fTotalFees = filteredOrders.reduce((sum, o) => sum + o.fee + o.feeOther, 0);

        return NextResponse.json({
            success: true,
            count: fTotalOrders,
            stats: {
                totalOrders: fTotalOrders,
                completedOrders: fCompletedOrders,
                pendingOrders: fPendingOrders,
                inProgressOrders: fInProgressOrders,
                cancelledOrders: fCancelledOrders,
                totalFees: fTotalFees,
                completionRate: fTotalOrders > 0 ? (fCompletedOrders / fTotalOrders * 100).toFixed(1) : '0',
            },
            topEmployees,
            topGroups,
            monthlyData,
            data: filteredOrders,
            _total: totalCount,
            _days: daysParam ? parseInt(daysParam) : null,
            _filtered: !!daysParam,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch data from Google Sheets.',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
