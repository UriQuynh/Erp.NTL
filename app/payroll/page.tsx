'use client';
import { ModulePage } from '@/components/ModulePage';
import { Calculator } from 'lucide-react';
export default function PayrollPage() {
  return <ModulePage title="Lương Năng Suất" subtitle="Tính lương theo giờ thực tế, năng suất dự án và KPI nhân viên" icon={<Calculator size={28} />} color="#8B5CF6" bgColor="#F5F3FF" tag="PAYROLL" features={['Tính lương theo giờ','Lương theo dự án','Bảng lương chi tiết','So sánh CTV/NV','Xuất báo cáo lương']} />;
}
