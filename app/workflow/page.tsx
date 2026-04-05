'use client';
import { ModulePage } from '@/components/ModulePage';
import { Zap } from 'lucide-react';
export default function WorkflowPage() {
  return <ModulePage title="Workflow" subtitle="Tự động hóa quy trình nghiệp vụ, phê duyệt và thông báo" icon={<Zap size={28} />} color="#EA580C" bgColor="#FFF7ED" tag="AUTOMATION" features={['Quy trình phê duyệt','Thông báo tự động','Lịch sử workflow','Template quy trình']} />;
}
