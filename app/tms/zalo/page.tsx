'use client';
import { ModulePage } from '@/components/ModulePage';
import { MessageCircle } from 'lucide-react';
export default function ZaloPage() {
  return <ModulePage title="Thông báo Zalo" subtitle="Cấu hình gửi thông báo tự động qua Zalo OA" icon={<MessageCircle size={28} />} color="#0068FF" bgColor="#EFF6FF" tag="NOTIFICATION" features={['Zalo Official Account','Template tin nhắn','Gửi hàng loạt','Lịch sử gửi','Webhook integration']} />;
}
