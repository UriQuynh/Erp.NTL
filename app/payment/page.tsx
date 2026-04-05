'use client';
import { ModulePage } from '@/components/ModulePage';
import { Wallet } from 'lucide-react';
export default function PaymentPage() {
  return <ModulePage title="Thanh Toán Chi Phí" subtitle="Quản lý chi phí thuê ngoài, nhân sự và đối soát thanh toán" icon={<Wallet size={28} />} color="#059669" bgColor="#ECFDF5" tag="PAYMENT" features={['Chi phí nhân viên','Chi phí thuê ngoài','Đối soát thanh toán','Báo cáo công nợ','Phân loại CTV / NV']} />;
}
