'use client';
import { ModulePage } from '@/components/ModulePage';
import { ScanText } from 'lucide-react';
export default function PrintLabelsPage() {
  return <ModulePage title="In Tem Kiện" subtitle="Tạo và in tem nhãn kiện hàng từ CSV/Excel import" icon={<ScanText size={28} />} color="#EA580C" bgColor="#FFF7ED" tag="TMS LABELS" features={['Import CSV/Excel','Tạo tem Barcode/QR','In hàng loạt','Mẫu tem tùy chỉnh']} />;
}
