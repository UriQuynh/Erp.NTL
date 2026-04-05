'use client';
import { ModulePage } from '@/components/ModulePage';
import { ScanText } from 'lucide-react';
export default function DocumentsPage() {
  return <ModulePage title="Quản lý Chứng từ" subtitle="Lưu trữ và quản lý hóa đơn, chứng từ, hợp đồng" icon={<ScanText size={28} />} color="#0284C7" bgColor="#F0F9FF" tag="DOCUMENTS" features={['Upload chứng từ','Phân loại tự động','Tìm kiếm OCR','Lịch sử chỉnh sửa','Chia sẻ nội bộ']} />;
}
