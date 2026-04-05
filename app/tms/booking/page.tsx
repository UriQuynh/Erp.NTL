'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import {
  Plus, Search, Truck, Eye, X, ChevronDown, ChevronRight, MapPin,
  Calendar, Hash, Download, RefreshCw, Package, ArrowRight, Clock,
  FileText, TrendingUp, AlertCircle, Image, User, ExternalLink
} from 'lucide-react';

// ─── Status config matching actual sheet values ───
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Chưa Có Xe':    { label: 'Chưa Có Xe',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'Chưa Hòa Tất':  { label: 'Chưa Hoàn Tất', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'Hoàn Tất':      { label: 'Hoàn Tất',      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
};
const DEFAULT_STATUS = { label: 'Không rõ', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };

function getStatus(s: string) {
  if (!s) return DEFAULT_STATUS;
  const key = Object.keys(STATUS_MAP).find(k => s.trim().toLowerCase().includes(k.toLowerCase()));
  return key ? STATUS_MAP[key] : DEFAULT_STATUS;
}

function fmtVND(n: number): string {
  if (!n) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}

function fmtFullVND(n: number): string {
  return n.toLocaleString('vi-VN') + '₫';
}

// ─── Types ───
interface Trip {
  ID: string;
  ID_PXK: string;
  Bien_So: string;
  Tai_Xe: string;
  Trong_Luong: string;
  Loai_Xe: string;
  Dia_Chi_Nhan: string;
  Dia_Chi_Giao: string;
  Loai_Hang: string;
  So_Bill: string;
  Cuoc_Thu_KH: number;
  Cuoc_Khac_Thu_KH: number;
  Don_Gia_NCC: number;
  Phi_Khac_NCC: number;
  NCC_Raw: string;
  NCC: string;
  Trang_Thai: string;
  Nguoi_YC: string;
  Code: string;
  Tuyen: string;
  Thoi_Gian_BK: string;
  Thoi_Gian_Den: string;
  Thoi_Gian_DenKho: string;
  PODs: string[];
  Tong_Thu: number;
  Tong_Tra: number;
  Profit: number;
}

interface BookingData {
  ID_CODE: string;
  Ngay: string;
  Du_An: string;
  Doi_Tac: string;
  Tinh_Trang: string;
  NV_Update: string;
  NV_MaNV: string;
  NV_HoTen: string;
  Note: string;
  PODs: string[];
  So_Chuyen: number;
  Tong_Thu: number;
  Tong_Tra_NCC: number;
  Tong_Phat_Sinh: number;
  Profit: number;
  NCCs: string[];
  trips: Trip[];
}

export default function BookingPage() {
  const { isAuthenticated } = useERPAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tms/booking');
      const json = await res.json();
      if (json.success) {
        setBookings(json.data || []);
      } else {
        setError(json.error || 'Lỗi tải dữ liệu');
      }
    } catch {
      setError('Không kết nối được server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchBookings();
  }, [isAuthenticated, fetchBookings]);

  // ─── Filter ───
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter && !b.Tinh_Trang.toLowerCase().includes(statusFilter.toLowerCase())) return false;
      if (search) {
        const s = search.toLowerCase();
        const inH = b.ID_CODE.toLowerCase().includes(s) ||
          b.Doi_Tac.toLowerCase().includes(s) ||
          b.Note.toLowerCase().includes(s) ||
          (b.NV_HoTen || '').toLowerCase().includes(s);
        const inT = b.trips.some(t =>
          t.Bien_So.toLowerCase().includes(s) ||
          t.Tai_Xe.toLowerCase().includes(s) ||
          t.NCC.toLowerCase().includes(s) ||
          t.Dia_Chi_Nhan.toLowerCase().includes(s) ||
          t.Dia_Chi_Giao.toLowerCase().includes(s) ||
          (t.Code || '').toLowerCase().includes(s) ||
          (t.Tuyen || '').toLowerCase().includes(s)
        );
        if (!inH && !inT) return false;
      }
      return true;
    });
  }, [bookings, search, statusFilter]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = bookings.length;
    const totalTrips = bookings.reduce((s, b) => s + b.So_Chuyen, 0);
    const chuaCoXe = bookings.filter(b => b.Tinh_Trang.includes('Chưa Có Xe')).length;
    const chuaHoanTat = bookings.filter(b => b.Tinh_Trang.includes('Chưa Hòa Tất')).length;
    const hoanTat = bookings.filter(b => b.Tinh_Trang.includes('Hoàn Tất')).length;
    const tongThu = bookings.reduce((s, b) => s + b.Tong_Thu, 0);
    const tongProfit = bookings.reduce((s, b) => s + b.Profit, 0);
    return { total, totalTrips, chuaCoXe, chuaHoanTat, hoanTat, tongThu, tongProfit };
  }, [bookings]);

  const toggleExpand = (id: string) => setExpandedBooking(prev => prev === id ? null : id);

  if (!isAuthenticated) return null;

  // ═══════ DETAIL VIEW ═══════
  if (selectedBooking) {
    const bk = selectedBooking;
    const st = getStatus(bk.Tinh_Trang);
    return (
      <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSelectedBooking(null)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all active:scale-95">
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-800 font-mono">{bk.ID_CODE}</h1>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border" style={{ color: st.color, background: st.bg, borderColor: st.border }}>{st.label}</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{bk.Doi_Tac} • {bk.Ngay} • {bk.So_Chuyen} chuyến</p>
          </div>
          <button onClick={() => setSelectedBooking(null)} className="h-9 px-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all">Đóng</button>
        </div>

        {/* Info Grid */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thông tin phiếu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Đối tác/Dự án', value: bk.Doi_Tac || '—', icon: <Package size={14} /> },
              { label: 'Ngày BK', value: bk.Ngay || '—', icon: <Calendar size={14} /> },
              { label: 'NV Phụ trách', value: bk.NV_HoTen || bk.NV_Update || '—', icon: <User size={14} /> },
              { label: 'NCC', value: bk.NCCs.join(', ') || '—', icon: <Truck size={14} /> },
            ].map((f, i) => (
              <div key={i} className="p-3 bg-slate-50/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">{f.icon}<span className="text-[11px] font-semibold uppercase tracking-wider">{f.label}</span></div>
                <p className="text-sm font-semibold text-slate-700 truncate">{f.value}</p>
              </div>
            ))}
          </div>
          {bk.Note && (
            <div className="mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Ghi chú</span>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{bk.Note}</p>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tài chính phiếu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Tổng thu KH', value: fmtFullVND(bk.Tong_Thu), color: '#059669', bg: '#ECFDF5' },
              { label: 'Tổng trả NCC', value: fmtFullVND(bk.Tong_Tra_NCC), color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Phát sinh NCC', value: fmtFullVND(bk.Tong_Phat_Sinh), color: '#D97706', bg: '#FFFBEB' },
              { label: 'Lãi/Lỗ', value: fmtFullVND(bk.Profit), color: bk.Profit >= 0 ? '#059669' : '#DC2626', bg: bk.Profit >= 0 ? '#ECFDF5' : '#FEF2F2' },
            ].map((f, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: f.bg }}>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{f.label}</p>
                <p className="text-base font-extrabold mt-0.5" style={{ color: f.color }}>{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* POD Section */}
        {bk.PODs.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Image size={14} /> Bằng chứng giao hàng (POD)</h3>
            <div className="flex gap-3 flex-wrap">
              {bk.PODs.map((pod, i) => (
                <a key={i} href={pod} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs font-medium text-sky-700 hover:bg-sky-100 transition-all">
                  <Image size={14} /> POD {i + 1} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Trips Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Truck size={16} className="text-amber-500" /> Danh sách chuyến xe ({bk.trips.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  {['#', 'ID', 'Biển số', 'Tài xế', 'Loại xe', 'Điểm nhận', 'Điểm giao', 'Thu KH', 'PS KH', 'Trả NCC', 'PS NCC', 'Lãi/Lỗ', 'NCC', 'Trạng thái'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bk.trips.map((trip, i) => {
                  const tst = getStatus(trip.Trang_Thai);
                  return (
                    <tr key={`${trip.ID}_${i}`} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{trip.ID}</td>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{trip.Bien_So}</span></td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate">{trip.Tai_Xe}</td>
                      <td className="px-3 py-2.5"><span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{trip.Loai_Xe || '—'}</span></td>
                      <td className="px-3 py-2.5 max-w-[180px]"><div className="flex items-center gap-1"><MapPin size={11} className="text-emerald-500 flex-shrink-0" /><span className="text-xs text-slate-600 truncate">{trip.Dia_Chi_Nhan || '—'}</span></div></td>
                      <td className="px-3 py-2.5 max-w-[180px]"><div className="flex items-center gap-1"><MapPin size={11} className="text-red-500 flex-shrink-0" /><span className="text-xs text-slate-600 truncate">{trip.Dia_Chi_Giao || '—'}</span></div></td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-emerald-600 whitespace-nowrap">{trip.Cuoc_Thu_KH ? fmtFullVND(trip.Cuoc_Thu_KH) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-amber-600 whitespace-nowrap">{trip.Cuoc_Khac_Thu_KH ? fmtFullVND(trip.Cuoc_Khac_Thu_KH) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-red-600 whitespace-nowrap">{trip.Don_Gia_NCC ? fmtFullVND(trip.Don_Gia_NCC) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-orange-600 whitespace-nowrap">{trip.Phi_Khac_NCC ? fmtFullVND(trip.Phi_Khac_NCC) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-bold whitespace-nowrap" style={{ color: trip.Profit >= 0 ? '#059669' : '#DC2626' }}>{fmtFullVND(trip.Profit)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={trip.NCC_Raw}>{trip.NCC || '—'}</td>
                      <td className="px-3 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ color: tst.color, background: tst.bg, borderColor: tst.border }}>{tst.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-t-2 border-amber-200">
                  <td colSpan={7} className="px-3 py-3 text-xs font-bold text-slate-600 uppercase">Tổng cộng ({bk.trips.length} chuyến)</td>
                  <td className="px-3 py-3 text-xs font-extrabold text-emerald-700 whitespace-nowrap">{fmtFullVND(bk.Tong_Thu)}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-xs font-extrabold text-red-700 whitespace-nowrap">{fmtFullVND(bk.trips.reduce((s, t) => s + t.Don_Gia_NCC, 0))}</td>
                  <td className="px-3 py-3 text-xs font-extrabold text-orange-700 whitespace-nowrap">{fmtFullVND(bk.Tong_Phat_Sinh)}</td>
                  <td className="px-3 py-3 text-xs font-extrabold whitespace-nowrap" style={{ color: bk.Profit >= 0 ? '#059669' : '#DC2626' }}>{fmtFullVND(bk.Profit)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ═══════ LIST VIEW ═══════
  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="text-amber-500" size={24} /> Điều phối Booking
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.total} phiếu • {stats.totalTrips} chuyến • Thu: {fmtVND(stats.tongThu)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchBookings} disabled={loading} className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'Đang tải...' : 'Sync'}</span>
          </button>
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
            <Download size={14} /> <span className="hidden sm:inline">Xuất Excel</span>
          </button>
          <button onClick={() => router.push('/tms/booking/create')} className="h-9 px-4 flex items-center gap-2 text-sm font-semibold text-white rounded-xl transition-all shadow-lg active:scale-95" style={{ background: 'linear-gradient(135deg, #D97706, #B45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
            <Plus size={14} /> <span className="hidden sm:inline">Tạo Booking mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Tổng phiếu', value: stats.total, icon: <FileText size={18} />, color: '#1D354D', bg: '#F0F4F8' },
          { label: 'Chưa Có Xe', value: stats.chuaCoXe, icon: <AlertCircle size={18} />, color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Chưa Hoàn Tất', value: stats.chuaHoanTat, icon: <Clock size={18} />, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Hoàn Tất', value: stats.hoanTat, icon: <Package size={18} />, color: '#059669', bg: '#ECFDF5' },
          { label: 'Lãi/Lỗ', value: fmtVND(stats.tongProfit), icon: <TrendingUp size={18} />, color: stats.tongProfit >= 0 ? '#059669' : '#DC2626', bg: stats.tongProfit >= 0 ? '#ECFDF5' : '#FEF2F2' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
              <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm ID, đối tác, biển số, tài xế, NCC, tuyến..."
              className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white focus:border-sky-300 transition-all outline-none" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: '', label: 'Tất cả' },
              { key: 'Chưa Có Xe', label: 'Chưa Có Xe' },
              { key: 'Chưa Hòa Tất', label: 'Chưa Hoàn Tất' },
              { key: 'Hoàn Tất', label: 'Hoàn Tất' },
            ].map(f => {
              const active = statusFilter === f.key;
              const fst = f.key ? getStatus(f.key) : null;
              return (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`h-9 px-3 text-xs font-semibold rounded-xl border transition-all active:scale-95 ${active ? 'text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  style={active ? { background: fst ? fst.color : '#1D354D', borderColor: fst ? fst.color : '#1D354D' } : {}}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking List */}
      <div className="space-y-3">
        {loading && bookings.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <RefreshCw size={32} className="mx-auto mb-3 text-amber-400 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu từ Google Sheets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
            <Truck size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Không tìm thấy booking phù hợp</p>
          </div>
        ) : filtered.map((booking, idx) => {
          const isExpanded = expandedBooking === booking.ID_CODE;
          const st = getStatus(booking.Tinh_Trang);

          return (
            <div key={`${booking.ID_CODE}_${idx}`} className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}>
              {/* Header Row */}
              <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50 transition-all" onClick={() => toggleExpand(booking.ID_CODE)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FFD100, #D97706)' }}>
                  <Truck size={18} color="#fff" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 font-mono">{booking.ID_CODE}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border" style={{ color: st.color, background: st.bg, borderColor: st.border }}>{st.label}</span>
                    {booking.PODs.length > 0 && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200"><Image size={10} /> {booking.PODs.length}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="font-semibold text-slate-700">{booking.Doi_Tac || '—'}</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {booking.Ngay}</span>
                    {booking.NCCs.length > 0 && <><span className="text-slate-300">|</span><span className="truncate max-w-[180px]">NCC: {booking.NCCs.join(', ')}</span></>}
                  </div>
                </div>
                {/* Stats columns */}
                <div className="hidden md:flex items-center gap-5 text-xs text-slate-500">
                  <div className="text-center"><p className="font-bold text-slate-700">{booking.So_Chuyen}</p><p>Chuyến</p></div>
                  <div className="text-center"><p className="font-bold text-emerald-600">{fmtVND(booking.Tong_Thu)}</p><p>Thu KH</p></div>
                  <div className="text-center"><p className="font-bold text-red-500">{fmtVND(booking.Tong_Tra_NCC)}</p><p>Trả NCC</p></div>
                  <div className="text-center"><p className="font-bold" style={{ color: booking.Profit >= 0 ? '#059669' : '#DC2626' }}>{fmtVND(booking.Profit)}</p><p>Lãi/Lỗ</p></div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="Xem chi tiết"><Eye size={15} /></button>
                  {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded trips */}
              {isExpanded && (
                <div className="border-t border-slate-100 animate-fade-in">
                  <div className="px-4 py-2 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{booking.So_Chuyen} chuyến xe</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }} className="text-xs font-bold text-sky-600 flex items-center gap-1 hover:text-sky-700"><Eye size={12} /> Xem đầy đủ</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/30">
                          {['#', 'ID', 'Biển số', 'Tài xế', 'Loại xe', 'Điểm nhận → Giao', 'Thu KH', 'Trả NCC', 'PS NCC', 'Lãi/Lỗ', 'NCC', 'Trạng thái'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {booking.trips.map((trip, i) => {
                          const tst = getStatus(trip.Trang_Thai);
                          return (
                            <tr key={`${trip.ID}_${i}`} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors">
                              <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">{i + 1}</td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{trip.ID}</td>
                              <td className="px-3 py-2.5"><span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{trip.Bien_So}</span></td>
                              <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[100px] truncate">{trip.Tai_Xe}</td>
                              <td className="px-3 py-2.5"><span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{trip.Loai_Xe || '—'}</span></td>
                              <td className="px-3 py-2.5 max-w-[250px]">
                                <div className="flex items-center gap-1 text-xs text-slate-600">
                                  <MapPin size={10} className="text-emerald-500 flex-shrink-0" />
                                  <span className="truncate max-w-[100px]">{trip.Dia_Chi_Nhan || '—'}</span>
                                  <ArrowRight size={10} className="text-slate-300 flex-shrink-0" />
                                  <MapPin size={10} className="text-red-500 flex-shrink-0" />
                                  <span className="truncate max-w-[100px]">{trip.Dia_Chi_Giao || '—'}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-xs font-semibold text-emerald-600 whitespace-nowrap">{trip.Cuoc_Thu_KH ? fmtFullVND(trip.Cuoc_Thu_KH) : '—'}</td>
                              <td className="px-3 py-2.5 text-xs font-semibold text-red-600 whitespace-nowrap">{trip.Don_Gia_NCC ? fmtFullVND(trip.Don_Gia_NCC) : '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-orange-600 whitespace-nowrap">{trip.Phi_Khac_NCC ? fmtFullVND(trip.Phi_Khac_NCC) : '—'}</td>
                              <td className="px-3 py-2.5 text-xs font-bold whitespace-nowrap" style={{ color: trip.Profit >= 0 ? '#059669' : '#DC2626' }}>{fmtFullVND(trip.Profit)}</td>
                              <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[100px] truncate" title={trip.NCC_Raw}>{trip.NCC || '—'}</td>
                              <td className="px-3 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color: tst.color, background: tst.bg }}>{tst.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                    <span className="text-slate-600">Thu KH: <strong className="text-emerald-700">{fmtFullVND(booking.Tong_Thu)}</strong></span>
                    <span className="text-slate-600">Trả NCC: <strong className="text-red-600">{fmtFullVND(booking.Tong_Tra_NCC)}</strong></span>
                    <span className="text-slate-600">PS NCC: <strong className="text-orange-600">{fmtFullVND(booking.Tong_Phat_Sinh)}</strong></span>
                    <span className="text-slate-600">Lãi/Lỗ: <strong style={{ color: booking.Profit >= 0 ? '#059669' : '#DC2626' }}>{fmtFullVND(booking.Profit)}</strong></span>
                    <span className="ml-auto text-slate-400">NV: {booking.NV_HoTen || booking.NV_Update || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {bookings.length > 0 && (
        <div className="text-center text-[11px] text-slate-400 py-2">
          Hiển thị {filtered.length}/{bookings.length} phiếu • {stats.totalTrips} chuyến xe
        </div>
      )}
    </div>
  );
}
