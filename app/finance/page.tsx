'use client';
import { ModulePage } from '@/components/ModulePage';
import { DollarSign } from 'lucide-react';
export default function FinancePage() {
  return <ModulePage title="Tài chính" subtitle="Khoản chi, bảng lương, thu nhập bình quân — dữ liệu từ Google Sheets" icon={<DollarSign size={28} />} color="#059669" bgColor="#ECFDF5" tag="FINANCE" features={['Tổng quan tài chính','Báo cáo doanh thu','Chi phí phát sinh','Bảng lương tổng hợp','Dự báo tài chính']} />;
}
