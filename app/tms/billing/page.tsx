'use client';
import { useState, useMemo } from 'react';
import { useERPAuth } from '@/lib/auth';
import { Search, DollarSign, Download, RefreshCw, ArrowUpRight, ArrowDownRight, Filter, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const BILLING_DATA = [
  { id: 'INV-2026-001', bookingId: 'PXK_240401', ncc: 'NCC Phú Thành', duAn: 'Samsung CE', soChuyen: 3, tongCuoc: 7500000, daThanhToan: 2500000, conLai: 5000000, ngayTao: '01/04/2026', hanTT: '15/04/2026', trangThai: 'partial' },
  { id: 'INV-2026-002', bookingId: 'PXK_240402', ncc: 'NCC Việt Nhật', duAn: 'Loreal Vietnam', soChuyen: 2, tongCuoc: 3450000, daThanhToan: 0, conLai: 3450000, ngayTao: '01/04/2026', hanTT: '15/04/2026', trangThai: 'unpaid' },
  { id: 'INV-2026-003', bookingId: 'PXK_240403', ncc: 'NCC Hải Phong Logistics', duAn: 'FTG Express', soChuyen: 1, tongCuoc: 3200000, daThanhToan: 3200000, conLai: 0, ngayTao: '31/03/2026', hanTT: '14/04/2026', trangThai: 'paid' },
  { id: 'INV-2026-004', bookingId: 'PXK_240404', ncc: 'NCC Đông Á', duAn: 'PEGA Express', soChuyen: 4, tongCuoc: 1880000, daThanhToan: 0, conLai: 1880000, ngayTao: '01/04/2026', hanTT: '15/04/2026', trangThai: 'unpaid' },
  { id: 'INV-2026-005', bookingId: 'PXK_240305', ncc: 'NCC Phú Thành', duAn: 'Samsung CE', soChuyen: 5, tongCuoc: 12500000, daThanhToan: 12500000, conLai: 0, ngayTao: '05/03/2026', hanTT: '20/03/2026', trangThai: 'paid' },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  paid: { label: 'Đã thanh toán', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 size={12} /> },
  partial: { label: 'Thanh toán 1 phần', color: '#D97706', bg: '#FFFBEB', icon: <Clock size={12} /> },
  unpaid: { label: 'Chưa thanh toán', color: '#DC2626', bg: '#FEF2F2', icon: <AlertTriangle size={12} /> },
};

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

export default function BillingPage() {
  const { isAuthenticated } = useERPAuth();
  const [data] = useState(BILLING_DATA);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => data.filter(d => {
    if (search) { const s = search.toLowerCase(); if (!d.id.toLowerCase().includes(s) && !d.ncc.toLowerCase().includes(s) && !d.duAn.toLowerCase().includes(s)) return false; }
    if (statusFilter && d.trangThai !== statusFilter) return false;
    return true;
  }), [data, search, statusFilter]);

  const stats = useMemo(() => ({
    total: data.reduce((s, d) => s + d.tongCuoc, 0),
    paid: data.reduce((s, d) => s + d.daThanhToan, 0),
    unpaid: data.reduce((s, d) => s + d.conLai, 0),
  }), [data]);

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2"><DollarSign className="text-emerald-500" size={24} /> Cước phí & Đối soát</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.length} hóa đơn • Tổng cước: {fmt(stats.total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50"><Download size={14} /> Xuất Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng cước phí', value: fmt(stats.total), icon: <TrendingUp size={18} />, color: '#1D354D', bg: '#F0F4F8' },
          { label: 'Đã thanh toán', value: fmt(stats.paid), icon: <ArrowUpRight size={18} />, color: '#059669', bg: '#ECFDF5' },
          { label: 'Chưa thanh toán', value: fmt(stats.unpaid), icon: <ArrowDownRight size={18} />, color: '#DC2626', bg: '#FEF2F2' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div><p className="text-xs text-slate-500 font-medium">{s.label}</p><p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm hóa đơn, NCC, dự án..." className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all" /></div>
          <div className="flex items-center gap-1.5">
            {['', 'unpaid', 'partial', 'paid'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`h-9 px-3 text-xs font-semibold rounded-xl border transition-all ${statusFilter === s ? 'text-white shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}
                style={statusFilter === s ? { background: s ? (STATUS_MAP[s]?.color || '#1D354D') : '#1D354D', borderColor: s ? (STATUS_MAP[s]?.color || '#1D354D') : '#1D354D' } : {}}>
                {s ? STATUS_MAP[s]?.label : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 bg-slate-50/50">
              {['Mã HĐ', 'Booking', 'NCC', 'Dự án', 'Số chuyến', 'Tổng cước', 'Đã thanh toán', 'Còn lại', 'Hạn TT', 'TT'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((d, i) => {
                const st = STATUS_MAP[d.trangThai] || STATUS_MAP.unpaid;
                const pct = d.tongCuoc > 0 ? Math.round(d.daThanhToan / d.tongCuoc * 100) : 0;
                return (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{d.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-600">{d.bookingId}</td>
                    <td className="px-4 py-3 text-slate-600">{d.ncc}</td>
                    <td className="px-4 py-3 text-slate-600">{d.duAn}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.soChuyen}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{fmt(d.tongCuoc)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-medium">{fmt(d.daThanhToan)}</span>
                        {d.trangThai === 'partial' && <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} /></div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: d.conLai > 0 ? '#DC2626' : '#059669' }}>{fmt(d.conLai)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.hanTT}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.icon}{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
