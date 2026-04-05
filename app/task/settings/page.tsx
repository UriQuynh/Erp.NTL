'use client';
import { ModulePage } from '@/components/ModulePage';
import { Settings } from 'lucide-react';
export default function SettingsPage() {
  return <ModulePage title="Cài đặt" subtitle="Cài đặt hệ thống, cấu hình ứng dụng ERP" icon={<Settings size={28} />} color="#64748B" bgColor="#F8FAFC" tag="SETTINGS" comingSoon={false} features={['Cấu hình chung','Quản lý API keys','Google Sheets ID','Notification settings']} />;
}
