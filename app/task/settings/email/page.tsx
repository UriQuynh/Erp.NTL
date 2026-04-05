'use client';
import { ModulePage } from '@/components/ModulePage';
import { Mail } from 'lucide-react';
export default function EmailPage() {
  return <ModulePage title="Email" subtitle="Cấu hình gửi email thông báo tự động" icon={<Mail size={28} />} color="#7C3AED" bgColor="#F5F3FF" tag="SETTINGS" features={['SMTP config','Template email','Gửi hàng loạt','Lịch sử gửi']} />;
}
