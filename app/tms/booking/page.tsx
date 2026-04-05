'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import { Plus, Search, Truck, Eye, Edit3, Trash2, X, ChevronDown, ChevronRight, MapPin, Calendar, Hash, Filter, Download, RefreshCw, Package, ArrowRight, Clock, FileText } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'Chưa thực hiện': { label: 'Chưa thực hiện', color: '#D97706', bg: '#FFFBEB' },
  'Đang vận chuyển': { label: 'Đang vận chuyển', color: '#2563EB', bg: '#EFF6FF' },
  'Hoàn thành': { label: 'Hoàn thành', color: '#059669', bg: '#ECFDF5' },
  'Đã hủy': { label: 'Đã hủy', color: '#DC2626', bg: '#FEF2F2' },
};

// Sample booking data matching NTL TMS production structure
const SAMPLE_BOOKINGS = [
  { ID_PXK: 'PXK_240401', Du_An: 'Samsung CE', NCC: 'NCC Phú Thành', Loai_Xe: '10 tấn — 9.45m x 2.35m x 2.4m', Ngay_Tao: '01/04/2026', Trang_Thai: 'Đang vận chuyển', So_Chuyen: 3, Ghi_Chu: 'Giao hàng khu vực HCM', Nguoi_Tao: 'Admin',
    trips: [
      { ID: 'TRP001', Diem_Di: 'Kho Samsung CE - KCN VSIP, Bình Dương', Diem_Den: 'Shopee Express Hub - Quận 7, HCM', Bien_So: '51H-331.05', Tai_Xe: 'Nguyễn Văn A', KM: '45', Don_Gia: '2500000', Trang_Thai: 'Hoàn thành', Time_In: '01/04/2026 08:30', Time_Out: '01/04/2026 11:45' },
      { ID: 'TRP002', Diem_Di: 'Kho Samsung CE - KCN VSIP, Bình Dương', Diem_Den: 'Lazada Hub - Quận 9, HCM', Bien_So: '51H-331.05', Tai_Xe: 'Nguyễn Văn A', KM: '52', Don_Gia: '2800000', Trang_Thai: 'Đang vận chuyển', Time_In: '01/04/2026 13:00', Time_Out: '' },
      { ID: 'TRP003', Diem_Di: 'Kho Samsung CE - KCN VSIP, Bình Dương', Diem_Den: 'Tiki Warehouse - Quận 12, HCM', Bien_So: '60H-987.12', Tai_Xe: 'Trần Văn B', KM: '38', Don_Gia: '2200000', Trang_Thai: 'Chưa thực hiện', Time_In: '', Time_Out: '' },
    ]
  },
  { ID_PXK: 'PXK_240402', Du_An: 'Loreal Vietnam', NCC: 'NCC Việt Nhật', Loai_Xe: '5 tấn — 6m x 2.1m x 2m', Ngay_Tao: '01/04/2026', Trang_Thai: 'Chưa thực hiện', So_Chuyen: 2, Ghi_Chu: '', Nguoi_Tao: 'Admin',
    trips: [
      { ID: 'TRP004', Diem_Di: 'Kho Loreal - Long An', Diem_Den: 'Đại lý Loreal - Quận 1, HCM', Bien_So: '62H-123.45', Tai_Xe: 'Lê Văn C', KM: '60', Don_Gia: '1800000', Trang_Thai: 'Chưa thực hiện', Time_In: '', Time_Out: '' },
      { ID: 'TRP005', Diem_Di: 'Kho Loreal - Long An', Diem_Den: 'Đại lý Loreal - Quận 3, HCM', Bien_So: '62H-123.45', Tai_Xe: 'Lê Văn C', KM: '55', Don_Gia: '1650000', Trang_Thai: 'Chưa thực hiện', Time_In: '', Time_Out: '' },
    ]
  },
  { ID_PXK: 'PXK_240403', Du_An: 'FTG Express', NCC: 'NCC Hải Phong Logistics', Loai_Xe: '15 tấn — 9.6m x 2.4m x 2.5m', Ngay_Tao: '31/03/2026', Trang_Thai: 'Hoàn thành', So_Chuyen: 1, Ghi_Chu: 'Giao hàng liên tỉnh', Nguoi_Tao: 'Điều phối A',
    trips: [
      { ID: 'TRP006', Diem_Di: 'Cảng Cát Lái, HCM', Diem_Den: 'KCN Đồng Nai, Biên Hòa', Bien_So: '60H-456.78', Tai_Xe: 'Phạm Văn D', KM: '35', Don_Gia: '3200000', Trang_Thai: 'Hoàn thành', Time_In: '31/03/2026 07:00', Time_Out: '31/03/2026 10:30' },
    ]
  },
  { ID_PXK: 'PXK_240404', Du_An: 'PEGA Express', NCC: 'NCC Đông Á', Loai_Xe: '3.5 tấn — 4.3m x 1.8m x 1.8m', Ngay_Tao: '01/04/2026', Trang_Thai: 'Đang vận chuyển', So_Chuyen: 4, Ghi_Chu: 'Last mile delivery nội thành', Nguoi_Tao: 'Admin',
    trips: [
      { ID: 'TRP007', Diem_Di: 'Hub PEGA - Tân Bình', Diem_Den: 'Quận 1 - 123 Nguyễn Huệ', Bien_So: '51C-222.33', Tai_Xe: 'Hoàng Văn E', KM: '8', Don_Gia: '450000', Trang_Thai: 'Hoàn thành', Time_In: '01/04/2026 08:00', Time_Out: '01/04/2026 08:45' },
      { ID: 'TRP008', Diem_Di: 'Hub PEGA - Tân Bình', Diem_Den: 'Quận 3 - 45 Võ Văn Tần', Bien_So: '51C-222.33', Tai_Xe: 'Hoàng Văn E', KM: '6', Don_Gia: '400000', Trang_Thai: 'Hoàn thành', Time_In: '01/04/2026 09:00', Time_Out: '01/04/2026 09:35' },
      { ID: 'TRP009', Diem_Di: 'Hub PEGA - Tân Bình', Diem_Den: 'Quận 7 - Phú Mỹ Hưng', Bien_So: '51C-222.33', Tai_Xe: 'Hoàng Văn E', KM: '15', Don_Gia: '550000', Trang_Thai: 'Đang vận chuyển', Time_In: '01/04/2026 10:15', Time_Out: '' },
      { ID: 'TRP010', Diem_Di: 'Hub PEGA - Tân Bình', Diem_Den: 'Gò Vấp - 789 Phan Văn Trị', Bien_So: '51C-222.33', Tai_Xe: 'Hoàng Văn E', KM: '10', Don_Gia: '480000', Trang_Thai: 'Chưa thực hiện', Time_In: '', Time_Out: '' },
    ]
  },
];

export default function BookingPage() {
  const { user, isAuthenticated } = useERPAuth();
  const [bookings, setBookings] = useState<any[]>([]); // Initialize empty, will load from API
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (search) {
        const s = search.toLowerCase();
        if (!b.ID_PXK.toLowerCase().includes(s) && !b.Du_An.toLowerCase().includes(s) && !b.NCC.toLowerCase().includes(s) && 
            !b.trips.some((t: any) => t.Bien_So.toLowerCase().includes(s) || t.Tai_Xe.toLowerCase().includes(s) || t.Diem_Di.toLowerCase().includes(s) || t.Diem_Den.toLowerCase().includes(s)))
          return false;
      }
      if (statusFilter && b.Trang_Thai !== statusFilter) return false;
      return true;
    });
  }, [bookings, search, statusFilter]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tms/booking');
      const json = await res.json();
      if (json.success) {
        setBookings(json.data);
      } else {
        console.error('Failed to load bookings:', json.error);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, fetchBookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const totalTrips = bookings.reduce((s: number, b: any) => s + b.trips.length, 0);
    const active = bookings.filter((b: any) => b.Trang_Thai === 'Đang vận chuyển').length;
    const completed = bookings.filter((b: any) => b.Trang_Thai === 'Hoàn thành').length;
    const totalRevenue = bookings.reduce((s: number, b: any) => s + b.trips.reduce((ts: number, t: any) => ts + Number(t.Don_Gia || 0), 0), 0);
    return { total, totalTrips, active, completed, totalRevenue };
  }, [bookings]);

  const toggleExpand = (id: string) => setExpandedBooking(prev => prev === id ? null : id);

  const openDetail = (booking: any) => { setSelectedBooking(booking); setViewMode('detail'); };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="text-amber-500" size={24} /> Điều phối Booking
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.total} phiếu booking • {stats.totalTrips} chuyến xe</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng Booking', value: stats.total, icon: <FileText size={18} />, color: '#1D354D', bg: '#F0F4F8' },
          { label: 'Đang vận chuyển', value: stats.active, icon: <Truck size={18} />, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Hoàn thành', value: stats.completed, icon: <Package size={18} />, color: '#059669', bg: '#ECFDF5' },
          { label: 'Doanh thu', value: `${(stats.totalRevenue / 1000000).toFixed(1)}M`, icon: <Hash size={18} />, color: '#D97706', bg: '#FFFBEB' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm booking, NCC, biển số xe..." className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['', 'Chưa thực hiện', 'Đang vận chuyển', 'Hoàn thành'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`h-9 px-3 text-xs font-semibold rounded-xl border transition-all active:scale-95 ${statusFilter === s ? 'text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                style={statusFilter === s ? { background: s ? (STATUS_MAP[s]?.color || '#1D354D') : '#1D354D', borderColor: s ? (STATUS_MAP[s]?.color || '#1D354D') : '#1D354D' } : {}}>
                {s || 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Booking List */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
              <Truck size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Không tìm thấy booking phù hợp</p>
            </div>
          ) : filtered.map((booking, idx) => {
            const isExpanded = expandedBooking === booking.ID_PXK;
            const st = STATUS_MAP[booking.Trang_Thai] || STATUS_MAP['Chưa thực hiện'];
            const totalAmt = booking.trips.reduce((s: number, t: any) => s + Number(t.Don_Gia || 0), 0);
            const doneTrips = booking.trips.filter((t: any) => t.Trang_Thai === 'Hoàn thành' || t.Trang_Thai === 'Đã hoàn thành').length;

            return (
              <div key={`${booking.ID_PXK}_${idx}`} className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                {/* Booking Header */}
                <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50 transition-all" onClick={() => toggleExpand(booking.ID_PXK)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FFD100, #D97706)' }}>
                    <Truck size={18} color="#fff" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-800">{booking.ID_PXK}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border" style={{ color: st.color, background: st.bg, borderColor: st.color + '30' }}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{booking.Du_An}</span>
                      <span>•</span>
                      <span>{booking.NCC}</span>
                      <span>•</span>
                      <span>{booking.Loai_Xe.split('—')[0].trim()}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                    <div className="text-center">
                      <p className="font-semibold text-slate-700">{doneTrips}/{booking.trips.length}</p>
                      <p>Chuyến</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-amber-600">{(totalAmt / 1000000).toFixed(1)}M</p>
                      <p>Cước phí</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-600">{booking.Ngay_Tao}</p>
                      <p>Ngày tạo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openDetail(booking); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="Xem chi tiết"><Eye size={15} /></button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors" title="Chỉnh sửa"><Edit3 size={15} /></button>
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Trips */}
                {isExpanded && (
                  <div className="border-t border-slate-100 animate-fade-in">
                    <div className="px-4 py-2 bg-slate-50/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Danh sách chuyến ({booking.trips.length})</span>
                      <button className="text-xs font-semibold text-amber-600 flex items-center gap-1 hover:text-amber-700"><Plus size={12} /> Thêm chuyến</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/30">
                            {['ID', 'Điểm đi', 'Điểm đến', 'Biển số', 'Tài xế', 'KM', 'Đơn giá', 'Trạng thái', 'Check-in', 'Check-out'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {booking.trips.map((trip: any) => {
                            const tst = STATUS_MAP[trip.Trang_Thai] || STATUS_MAP['Chưa thực hiện'];
                            return (
                              <tr key={trip.ID} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors">
                                <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{trip.ID}</td>
                                <td className="px-3 py-2.5 max-w-[200px]">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-emerald-500 flex-shrink-0" />
                                    <span className="text-xs text-slate-700 truncate">{trip.Diem_Di}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 max-w-[200px]">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-red-500 flex-shrink-0" />
                                    <span className="text-xs text-slate-700 truncate">{trip.Diem_Den}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5"><span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{trip.Bien_So}</span></td>
                                <td className="px-3 py-2.5 text-xs text-slate-600">{trip.Tai_Xe}</td>
                                <td className="px-3 py-2.5 text-xs text-slate-600 text-center">{trip.KM}</td>
                                <td className="px-3 py-2.5 text-xs font-semibold text-amber-600">{Number(trip.Don_Gia).toLocaleString('vi-VN')}₫</td>
                                <td className="px-3 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: tst.color, background: tst.bg }}>{tst.label}</span></td>
                                <td className="px-3 py-2.5 text-[11px] text-slate-500">{trip.Time_In || '—'}</td>
                                <td className="px-3 py-2.5 text-[11px] text-slate-500">{trip.Time_Out || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Trip Summary */}
                    <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-600">Tổng KM: <strong className="text-slate-800">{booking.trips.reduce((s: number, t: any) => s + Number(t.KM || 0), 0)} km</strong></span>
                        <span className="text-slate-600">Tổng cước: <strong className="text-amber-700">{totalAmt.toLocaleString('vi-VN')}₫</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Người tạo: <strong>{booking.Nguoi_Tao}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail View */}
      {viewMode === 'detail' && selectedBooking && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-transparent">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 transition-all"><ChevronRight size={16} className="rotate-180" /></button>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selectedBooking.ID_PXK}</h2>
                <p className="text-xs text-slate-500">{selectedBooking.Du_An} • {selectedBooking.NCC}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-9 px-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Chỉnh sửa</button>
              <button className="h-9 px-4 text-sm font-medium text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #D97706, #B45309)' }}>Thêm chuyến</button>
            </div>
          </div>
          {/* Booking Info Grid */}
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Dự Án / BC', value: selectedBooking.Du_An, icon: <Package size={14} /> },
                { label: 'Nhà cung cấp', value: selectedBooking.NCC, icon: <Truck size={14} /> },
                { label: 'Loại xe', value: selectedBooking.Loai_Xe.split('—')[0].trim(), icon: <Truck size={14} /> },
                { label: 'Ngày tạo', value: selectedBooking.Ngay_Tao, icon: <Calendar size={14} /> },
              ].map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">{f.icon}<span className="text-[11px] font-semibold uppercase tracking-wider">{f.label}</span></div>
                  <p className="text-sm font-semibold text-slate-700">{f.value}</p>
                </div>
              ))}
            </div>
            {/* Trips */}
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><ArrowRight size={14} /> Danh sách chuyến ({selectedBooking.trips.length})</h3>
            <div className="space-y-2">
              {selectedBooking.trips.map((trip: any, i: number) => {
                const tst = STATUS_MAP[trip.Trang_Thai] || STATUS_MAP['Chưa thực hiện'];
                return (
                  <div key={trip.ID} className="border border-slate-100 rounded-xl p-3 hover:border-sky-200 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">{i+1}</span>
                        <span className="font-mono text-xs text-slate-500">{trip.ID}</span>
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{trip.Bien_So}</span>
                        <span className="text-xs text-slate-500">{trip.Tai_Xe}</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: tst.color, background: tst.bg }}>{tst.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mb-1.5">
                      <MapPin size={12} className="text-emerald-500" /><span className="text-slate-600">{trip.Diem_Di}</span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <MapPin size={12} className="text-red-500" /><span className="text-slate-600">{trip.Diem_Den}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📏 {trip.KM} km</span>
                      <span className="font-semibold text-amber-600">💰 {Number(trip.Don_Gia).toLocaleString('vi-VN')}₫</span>
                      {trip.Time_In && <span>🕐 In: {trip.Time_In}</span>}
                      {trip.Time_Out && <span>🕐 Out: {trip.Time_Out}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
