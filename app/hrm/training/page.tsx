'use client';
import { ModulePage } from '@/components/ModulePage';
import { GraduationCap } from 'lucide-react';
export default function TrainingPage() {
  return <ModulePage title="Đào tạo" subtitle="Quản lý chương trình đào tạo, tài liệu học tập nội bộ" icon={<GraduationCap size={28} />} color="#0891B2" bgColor="#ECFEFF" tag="HRM TRAINING" features={['Chương trình đào tạo','Tài liệu học tập','Theo dõi tiến độ','Đánh giá sau đào tạo']} />;
}
