'use client';
import { ModulePage } from '@/components/ModulePage';
import { Users } from 'lucide-react';
export default function ActiveUsersPage() {
  return <ModulePage title="Người dùng Online" subtitle="Theo dõi người dùng đang hoạt động trên hệ thống" icon={<Users size={28} />} color="#2563EB" bgColor="#EFF6FF" tag="ADMIN" features={['Danh sách online','Thời gian hoạt động','Thiết bị đăng nhập','Lịch sử đăng nhập']} />;
}
