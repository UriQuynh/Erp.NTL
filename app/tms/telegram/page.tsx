'use client';
import { ModulePage } from '@/components/ModulePage';
import { Send } from 'lucide-react';
export default function TelegramPage() {
  return <ModulePage title="Thông báo Telegram" subtitle="Cấu hình bot Telegram gửi thông báo tự động" icon={<Send size={28} />} color="#229ED9" bgColor="#F0F9FF" tag="NOTIFICATION" features={['Telegram Bot config','Nhóm chat','Cảnh báo tự động','Báo cáo hàng ngày']} />;
}
