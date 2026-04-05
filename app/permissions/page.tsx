'use client';
import { ModulePage } from '@/components/ModulePage';
import { ShieldCheck } from 'lucide-react';
export default function PermissionsPage() {
  return <ModulePage title="Phân quyền" subtitle="Quản lý vai trò, quyền truy cập module cho từng nhân viên" icon={<ShieldCheck size={28} />} color="#DC2626" bgColor="#FEF2F2" tag="ADMIN" features={['Quản lý vai trò','Cấp quyền module','Lịch sử thay đổi quyền','Ma trận phân quyền']} />;
}
