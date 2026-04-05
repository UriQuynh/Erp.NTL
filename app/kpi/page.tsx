'use client';
import { ModulePage } from '@/components/ModulePage';
import { Target } from 'lucide-react';
export default function KPIPage() {
  return <ModulePage title="KPI & Năng suất" subtitle="Theo dõi KPI hiệu suất, năng suất nhân viên, đánh giá chất lượng" icon={<Target size={28} />} color="#DC2626" bgColor="#FEF2F2" tag="PERFORMANCE" features={['Dashboard KPI','Đánh giá năng suất','Bảng xếp hạng NV','Mục tiêu cá nhân','Báo cáo hiệu suất']} />;
}
