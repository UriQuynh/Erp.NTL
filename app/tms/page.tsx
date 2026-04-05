'use client';
import { useERPAuth } from '@/lib/auth';
import Link from 'next/link';
import { Truck, Package, Map, DollarSign, FileText, Printer, MessageCircle, Car, ArrowRight, TrendingUp } from 'lucide-react';

const modules = [
  { href: '/tms/booking', label: 'Điều phối Booking', desc: 'Quản lý phiếu xuất kho, parent-child booking', icon: <Package size={22} />, color: '#D97706', bg: 'linear-gradient(135deg, #FCD34D, #F59E0B)', stat: '4 booking', statColor: '#92400E' },
  { href: '/tms/fleet', label: 'Đội xe', desc: 'Quản lý xe, tài xế, lịch bảo trì', icon: <Car size={22} />, color: '#DC2626', bg: 'linear-gradient(135deg, #FCA5A5, #EF4444)', stat: '6 xe', statColor: '#991B1B' },
  { href: '/tms/route', label: 'Tuyến đường', desc: 'Quản lý tuyến đường, điểm đi/đến', icon: <Map size={22} />, color: '#7C3AED', bg: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)', stat: '8 tuyến', statColor: '#5B21B6' },
  { href: '/tms/pricing', label: 'Bảng giá', desc: 'Bảng giá vận chuyển theo NCC & loại xe', icon: <DollarSign size={22} />, color: '#7C3AED', bg: 'linear-gradient(135deg, #DDD6FE, #A78BFA)', stat: '8 giá', statColor: '#6D28D9' },
  { href: '/tms/billing', label: 'Cước phí & Đối soát', desc: 'Đối soát chi phí, thanh toán NCC', icon: <FileText size={22} />, color: '#059669', bg: 'linear-gradient(135deg, #6EE7B7, #34D399)', stat: '5 hóa đơn', statColor: '#065F46' },
  { href: '/tms/bill-do', label: 'Bill DO', desc: 'Quản lý phiếu giao hàng', icon: <FileText size={22} />, color: '#0EA5E9', bg: 'linear-gradient(135deg, #7DD3FC, #38BDF8)', stat: '—', statColor: '#0369A1' },
  { href: '/tms/print-labels', label: 'In nhãn', desc: 'In nhãn vận chuyển, barcode', icon: <Printer size={22} />, color: '#6B7280', bg: 'linear-gradient(135deg, #D1D5DB, #9CA3AF)', stat: '—', statColor: '#374151' },
  { href: '/tms/telegram', label: 'Telegram Bot', desc: 'Thông báo tự động qua Telegram', icon: <MessageCircle size={22} />, color: '#0EA5E9', bg: 'linear-gradient(135deg, #67E8F9, #22D3EE)', stat: '—', statColor: '#0E7490' },
  { href: '/tms/zalo', label: 'Zalo Manager', desc: 'Quản lý thông báo Zalo OA', icon: <MessageCircle size={22} />, color: '#059669', bg: 'linear-gradient(135deg, #A7F3D0, #6EE7B7)', stat: '—', statColor: '#047857' },
];

export default function TMSPage() {
  const { isAuthenticated } = useERPAuth();
  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Truck className="text-amber-500" size={28} /> TMS — Quản lý Vận tải
        </h1>
        <p className="text-sm text-slate-500 mt-1">Transport Management System — Nhất Tín Logistics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Booking hôm nay', value: '4', icon: <Package size={18} />, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Xe đang hoạt động', value: '4/6', icon: <Car size={18} />, color: '#059669', bg: '#ECFDF5' },
          { label: 'Chuyến đang chạy', value: '2', icon: <Truck size={18} />, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Doanh thu tháng', value: '28.5M', icon: <TrendingUp size={18} />, color: '#7C3AED', bg: '#F5F3FF' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div><p className="text-xs text-slate-500 font-medium">{s.label}</p><p className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m, i) => (
          <Link key={m.href} href={m.href} className="glass-card rounded-2xl p-5 group cursor-pointer hover:shadow-lg transition-all animate-fade-in" style={{ animationDelay: `${i * 40 + 200}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: m.bg }}>{m.icon}</div>
              {m.stat !== '—' && <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ color: m.statColor, background: m.bg.includes('#FCD34D') ? '#FEF3C7' : m.bg.includes('#FCA5A5') ? '#FEE2E2' : m.bg.includes('#C4B5FD') ? '#EDE9FE' : m.bg.includes('#DDD6FE') ? '#EDE9FE' : m.bg.includes('#6EE7B7') ? '#D1FAE5' : '#F3F4F6' }}>{m.stat}</span>}
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors">{m.label}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.desc}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"><span>Mở module</span><ArrowRight size={12} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
