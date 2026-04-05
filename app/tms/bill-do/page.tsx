'use client';
import { ModulePage } from '@/components/ModulePage';
import { FileText } from 'lucide-react';
export default function BillDOPage() {
  return <ModulePage title="Tạo Bill DO" subtitle="Tạo phiếu giao hàng (Delivery Order) và in bill" icon={<FileText size={28} />} color="#0891B2" bgColor="#ECFEFF" tag="TMS BILL" features={['Tạo Bill DO','In phiếu giao hàng','Quản lý mẫu in','Lịch sử phiếu']} />;
}
