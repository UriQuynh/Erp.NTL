// Mock data simulating data read from Excel (Data_Task.xlsx)
// In production, this would be read/written via the xlsx (SheetJS) library

export interface Order {
  id: string;
  date: string;
  customerName: string;
  employeeCode: string;
  employeeName: string;
  groupCV: string;
  taskDetail: string;
  address: string;
  timeYeuCau: string;
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled';
  amount: number;
  confirmTask: string;
  createdBy: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  previousPeriod: {
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    pendingOrders: number;
    averageOrderValue: number;
  };
}

export interface MonthlyData {
  month: string;
  currentYear: number;
  previousYear: number;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

const groups = ['Bưu cục Quận 1', 'Bưu cục Quận 3', 'Bưu cục Quận 7', 'Kho Tân Bình', 'Kho Bình Thạnh', 'Bưu cục Thủ Đức'];
const employees = [
  { code: 'NV001', name: 'Nguyễn Văn An' },
  { code: 'NV002', name: 'Trần Thị Bình' },
  { code: 'NV003', name: 'Lê Hoàng Cường' },
  { code: 'NV004', name: 'Phạm Minh Đức' },
  { code: 'NV005', name: 'Hoàng Thị Hoa' },
  { code: 'NV006', name: 'Vũ Quốc Hùng' },
  { code: 'NV007', name: 'Đặng Thanh Lan' },
  { code: 'NV008', name: 'Bùi Văn Mạnh' },
  { code: 'NV009', name: 'Ngô Thị Nga' },
  { code: 'NV010', name: 'Lý Văn Phú' },
];
const tasks = [
  'Giao hàng nhanh nội thành',
  'Lấy hàng tại kho',
  'Chuyển phát đặc biệt',
  'Giao hàng COD',
  'Vận chuyển hàng cồng kềnh',
  'Giao hàng liên tỉnh',
  'Thu hộ tiền hàng',
  'Hoàn trả đơn hàng',
  'Chuyển kho nội bộ',
  'Giao hàng hỏa tốc',
];
const addresses = [
  '123 Nguyễn Huệ, Q1, TP.HCM',
  '456 Lê Lợi, Q3, TP.HCM',
  '789 Nguyễn Văn Linh, Q7, TP.HCM',
  '101 Phan Xích Long, Phú Nhuận, TP.HCM',
  '202 Võ Văn Ngân, Thủ Đức, TP.HCM',
  '303 Cộng Hòa, Tân Bình, TP.HCM',
  '404 Lý Thường Kiệt, Q10, TP.HCM',
  '505 Điện Biên Phủ, Bình Thạnh, TP.HCM',
];
const statuses: Order['status'][] = ['completed', 'in_progress', 'pending', 'cancelled'];

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate 80 mock orders
export const mockOrders: Order[] = Array.from({ length: 80 }, (_, i) => {
  const emp = randomItem(employees);
  return {
    id: `DH-${String(2024001 + i).padStart(7, '0')}`,
    date: randomDate(new Date(2025, 0, 1), new Date(2026, 1, 20)),
    customerName: `Khách hàng ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
    employeeCode: emp.code,
    employeeName: emp.name,
    groupCV: randomItem(groups),
    taskDetail: randomItem(tasks),
    address: randomItem(addresses),
    timeYeuCau: `${String(8 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${Math.random() > 0.5 ? '00' : '30'}:00`,
    status: randomItem(statuses),
    amount: Math.floor(50000 + Math.random() * 950000),
    confirmTask: Math.random() > 0.3 ? 'Đã xác nhận' : 'Chờ xác nhận',
    createdBy: randomItem(employees).name,
  };
});

export const dashboardStats: DashboardStats = {
  totalOrders: 1247,
  totalRevenue: 487500000,
  completedOrders: 1089,
  pendingOrders: 158,
  averageOrderValue: 390900,
  previousPeriod: {
    totalOrders: 1102,
    totalRevenue: 425000000,
    completedOrders: 978,
    pendingOrders: 124,
    averageOrderValue: 385700,
  },
};

export const monthlyRevenueData: MonthlyData[] = [
  { month: 'T1', currentYear: 35000000, previousYear: 30000000 },
  { month: 'T2', currentYear: 42000000, previousYear: 38000000 },
  { month: 'T3', currentYear: 38000000, previousYear: 35000000 },
  { month: 'T4', currentYear: 45000000, previousYear: 40000000 },
  { month: 'T5', currentYear: 50000000, previousYear: 42000000 },
  { month: 'T6', currentYear: 48000000, previousYear: 44000000 },
  { month: 'T7', currentYear: 52000000, previousYear: 46000000 },
  { month: 'T8', currentYear: 47000000, previousYear: 43000000 },
  { month: 'T9', currentYear: 55000000, previousYear: 48000000 },
  { month: 'T10', currentYear: 58000000, previousYear: 50000000 },
  { month: 'T11', currentYear: 53000000, previousYear: 47000000 },
  { month: 'T12', currentYear: 60000000, previousYear: 52000000 },
];

export const monthlyOrderData: MonthlyData[] = [
  { month: 'T1', currentYear: 85, previousYear: 72 },
  { month: 'T2', currentYear: 98, previousYear: 85 },
  { month: 'T3', currentYear: 92, previousYear: 80 },
  { month: 'T4', currentYear: 105, previousYear: 90 },
  { month: 'T5', currentYear: 110, previousYear: 95 },
  { month: 'T6', currentYear: 108, previousYear: 92 },
  { month: 'T7', currentYear: 115, previousYear: 98 },
  { month: 'T8', currentYear: 102, previousYear: 88 },
  { month: 'T9', currentYear: 120, previousYear: 100 },
  { month: 'T10', currentYear: 125, previousYear: 105 },
  { month: 'T11', currentYear: 118, previousYear: 102 },
  { month: 'T12', currentYear: 130, previousYear: 110 },
];

export const orderStatusData: StatusData[] = [
  { name: 'Hoàn thành', value: 1089, color: '#10b981' },
  { name: 'Đang xử lý', value: 98, color: '#1D354D' },
  { name: 'Chờ xử lý', value: 158, color: '#f59e0b' },
  { name: 'Đã hủy', value: 42, color: '#ef4444' },
];

export const topEmployeesData = [
  { name: 'Nguyễn Văn An', orders: 156, revenue: 62800000 },
  { name: 'Trần Thị Bình', orders: 142, revenue: 58500000 },
  { name: 'Lê Hoàng Cường', orders: 135, revenue: 55200000 },
  { name: 'Phạm Minh Đức', orders: 128, revenue: 52100000 },
  { name: 'Hoàng Thị Hoa', orders: 120, revenue: 48900000 },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function getStatusLabel(status: Order['status']): string {
  const map: Record<Order['status'], string> = {
    completed: 'Hoàn thành',
    in_progress: 'Đang xử lý',
    pending: 'Chờ xử lý',
    cancelled: 'Đã hủy',
  };
  return map[status];
}

export function getStatusColor(status: Order['status']): string {
  const map: Record<Order['status'], string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[status];
}
