'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import {
  Plus, Search, Truck, RefreshCw, Download, FileSpreadsheet,
  Copy, Trash2, ChevronRight, Calendar, TrendingUp, TrendingDown,
  AlertCircle, Clock, CheckCircle, BarChart2,
} from 'lucide-react';

// ─── Design tokens ───
const CLR = {
  primary: '#1E3A5F',
  gold: '#F5A623',
  yellow: '#F5C518',
  green: '#27AE60',
  red: '#E74C3C',
  orange: '#E67E22',
  bg: '#F0F2F5',
  card: '#FFFFFF',
  border: '#E8ECF0',
  text: '#1A1A2E',
  muted: '#9CA3AF',
  secondary: '#6B7280',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Chưa Có Xe':   { label: 'Chưa Có Xe',   color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  'Chưa Hòa Tất': { label: 'Chưa Hoàn Tất', color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  'Hoàn Tất':     { label: 'Hoàn Tất',      color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
};
function getStatus(s: string) {
  if (!s) return { label: 'Không rõ', color: CLR.muted, bg: '#F9FAFB', border: '#E5E7EB' };
  const k = Object.keys(STATUS_CFG).find(k => s.includes(k));
  return k ? STATUS_CFG[k] : { label: s, color: CLR.muted, bg: '#F9FAFB', border: '#E5E7EB' };
}

function fmtCompact(n: number) {
  if (!n) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}
function fmtFull(n: number) {
  return n.toLocaleString('vi-VN');
}

interface BookingRow {
  ID_CODE: string;
  Ngay: string;
  Du_An: string;
  Doi_Tac: string;
  Tinh_Trang: string;
  NV_Update: string;
  NV_HoTen: string;
  Note: string;
  So_Chuyen: number;
  Tong_Thu: number;
  Tong_Tra_NCC: number;
  Profit: number;
  NCCs: string[];
  trips: { Trong_Luong?: string; Loai_Xe?: string; Dia_Chi_Nhan?: string; Don_Gia_NCC?: number }[];
}

// Day quick filters
const DAY_FILTERS = [
  { key: 'today', label: 'Hôm nay', days: 0 },
  { key: '3d', label: '3 ngày', days: 3 },
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: 'month', label: 'Tháng này', days: -1 },
  { key: 'all', label: 'Tất cả', days: -2 },
];

function parseVNDate(s: string): Date | null {
  if (!s) return null;
  // Support dd/mm/yyyy and yyyy-mm-dd
  const parts = s.includes('/') ? s.split('/') : s.split('-');
  if (parts.length !== 3) return null;
  const [a, b, c] = parts.map(Number);
  if (s.includes('/')) return new Date(c, b - 1, a); // dd/mm/yyyy
  return new Date(a, b - 1, c); // yyyy-mm-dd
}
function formatDateVN(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export default function BookingListPage() {
  const router = useRouter();
  const { isAuthenticated } = useERPAuth();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState('3d');
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // from sidebar
  const [statusFilter, setStatusFilter] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tms/booking');
      const json = await res.json();
      if (json.success) setBookings(json.data || []);
      else setError(json.error || 'Lỗi tải dữ liệu');
    } catch { setError('Không kết nối được server'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated, fetchData]);

  // ─── Date sidebar groups ───
  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const d = parseVNDate(b.Ngay);
      if (d) {
        const k = formatDateVN(d);
        map[k] = (map[k] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => {
      const da = parseVNDate(a[0])!, db = parseVNDate(b[0])!;
      return db.getTime() - da.getTime();
    });
  }, [bookings]);

  // ─── Apply filters ───
  const filtered = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return bookings.filter(b => {
      // Day filter from sidebar
      if (selectedDate) {
        const d = parseVNDate(b.Ngay);
        if (!d || formatDateVN(d) !== selectedDate) return false;
      } else {
        // Quick filter
        const d = parseVNDate(b.Ngay);
        if (dayFilter !== 'all') {
          if (!d) return false;
          if (dayFilter === 'today') {
            if (d.toDateString() !== now.toDateString()) return false;
          } else if (dayFilter === 'month') {
            if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
          } else {
            const days = DAY_FILTERS.find(f => f.key === dayFilter)?.days || 7;
            const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - days);
            if (d < cutoff || d > now) return false;
          }
        }
      }
      // Status filter
      if (statusFilter && !b.Tinh_Trang.includes(statusFilter)) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        const match = b.ID_CODE.toLowerCase().includes(q) ||
          (b.Doi_Tac || b.Du_An || '').toLowerCase().includes(q) ||
          (b.NV_HoTen || b.NV_Update || '').toLowerCase().includes(q) ||
          (b.Note || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [bookings, dayFilter, selectedDate, statusFilter, search]);

  // ─── Stats ───
  const stats = useMemo(() => ({
    total: filtered.length,
    chuyen: filtered.reduce((s, b) => s + b.So_Chuyen, 0),
    thu: filtered.reduce((s, b) => s + b.Tong_Thu, 0),
    profit: filtered.reduce((s, b) => s + b.Profit, 0),
    chuaCoXe: filtered.filter(b => b.Tinh_Trang.includes('Chưa Có Xe')).length,
    hoanTat: filtered.filter(b => b.Tinh_Trang.includes('Hoàn Tất')).length,
  }), [filtered]);

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden', gap: 0, background: CLR.bg }}>

      {/* ── DATE SIDEBAR ── */}
      <aside style={{
        width: 188, flexShrink: 0, background: '#F8F9FB',
        borderRight: `1px solid ${CLR.border}`, overflowY: 'auto', padding: '12px 0'
      }}>
        <div style={{ padding: '0 12px 8px', fontSize: 12, fontWeight: 700, color: CLR.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Ngày
        </div>
        <div style={{ borderBottom: `1px solid ${CLR.border}`, marginBottom: 4 }} />

        {/* "All" row */}
        <button
          onClick={() => { setSelectedDate(null); setDayFilter('all'); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 14px', fontSize: 13, fontWeight: selectedDate === null && dayFilter === 'all' ? 700 : 400,
            color: selectedDate === null && dayFilter === 'all' ? CLR.primary : CLR.text,
            background: selectedDate === null && dayFilter === 'all' ? '#EEF2FF' : 'transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span>Tất cả</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
            background: '#E8ECF0', color: CLR.secondary
          }}>{bookings.length}</span>
        </button>

        {dateCounts.map(([date, count]) => {
          const active = selectedDate === date;
          return (
            <button
              key={date}
              onClick={() => { setSelectedDate(active ? null : date); setDayFilter('all'); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '8px 14px', fontSize: 12.5, fontWeight: active ? 700 : 400,
                color: active ? CLR.primary : CLR.text,
                background: active ? '#EEF2FF' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F0F4FF'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span>{date}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                background: active ? CLR.primary : '#E8ECF0',
                color: active ? '#fff' : CLR.secondary
              }}>{count}</span>
            </button>
          );
        })}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── TOOLBAR ── */}
        <div style={{
          padding: '10px 20px', background: CLR.card, borderBottom: `1px solid ${CLR.border}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap'
        }}>
          {/* Day filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={14} color={CLR.secondary} style={{ marginRight: 2 }} />
            {DAY_FILTERS.map(f => {
              const active = !selectedDate && dayFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { setDayFilter(f.key); setSelectedDate(null); }}
                  style={{
                    height: 30, padding: '0 10px', fontSize: 12, fontWeight: active ? 700 : 500,
                    borderRadius: 6, border: active ? 'none' : `1px solid ${CLR.border}`,
                    background: active ? CLR.primary : CLR.card, color: active ? '#fff' : CLR.secondary,
                    cursor: 'pointer', transition: 'all 0.12s', letterSpacing: '0.01em',
                  }}
                >{f.label}</button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Right: count + actions */}
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 14, background: '#F3F4F6', color: CLR.secondary }}>
            {stats.chuyen} chuyến
          </span>
          <button onClick={fetchData} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
            fontSize: 12, fontWeight: 600, borderRadius: 7, border: `1px solid ${CLR.border}`,
            background: CLR.card, color: CLR.secondary, cursor: 'pointer',
          }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
            fontSize: 12, fontWeight: 600, borderRadius: 7, border: `1px solid ${CLR.border}`,
            background: CLR.card, color: CLR.secondary, cursor: 'pointer',
          }}>
            <Download size={13} />
            Excel
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
            fontSize: 12, fontWeight: 600, borderRadius: 7, border: `1px solid ${CLR.border}`,
            background: CLR.card, color: CLR.secondary, cursor: 'pointer',
          }}>
            <BarChart2 size={13} />
            Bảng Kê
          </button>
          <button
            onClick={() => router.push('/tms/booking/create')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
              fontSize: 12, fontWeight: 700, borderRadius: 7, border: 'none',
              background: CLR.primary, color: '#fff', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30,58,95,0.25)',
            }}
          >
            <Plus size={14} />
            Tạo Booking
          </button>
        </div>

        {/* ── SUMMARY STAT BAR ── */}
        <div style={{
          padding: '6px 20px', background: '#FFFCF0', borderBottom: `1px solid ${CLR.border}`,
          display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap'
        }}>
          {[
            { label: 'Tổng Phiếu', value: stats.total, icon: <FileSpreadsheet size={13} />, color: CLR.primary },
            { label: 'Chưa Có Xe', value: stats.chuaCoXe, icon: <AlertCircle size={13} />, color: '#DC2626' },
            { label: 'Hoàn Tất', value: stats.hoanTat, icon: <CheckCircle size={13} />, color: '#16A34A' },
            { label: 'Tổng Thu', value: fmtCompact(stats.thu), icon: <TrendingUp size={13} />, color: '#16A34A' },
            { label: 'Lợi Nhuận', value: fmtCompact(stats.profit), icon: stats.profit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />, color: stats.profit >= 0 ? '#16A34A' : '#DC2626' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: CLR.secondary, fontWeight: 500 }}>{s.label}:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}

          {/* Status filter pills */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[
              { key: '', label: 'Tất cả' },
              { key: 'Chưa Có Xe', label: 'Chưa Có Xe' },
              { key: 'Chưa Hòa Tất', label: 'Chưa Hoàn Tất' },
              { key: 'Hoàn Tất', label: 'Hoàn Tất' },
            ].map(f => {
              const st = f.key ? getStatus(f.key) : null;
              const active = statusFilter === f.key;
              return (
                <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                  height: 24, padding: '0 9px', fontSize: 11, fontWeight: 600, borderRadius: 12,
                  border: active ? 'none' : `1px solid ${CLR.border}`,
                  background: active ? (st ? st.color : CLR.primary) : CLR.card,
                  color: active ? '#fff' : CLR.secondary, cursor: 'pointer',
                }}>{f.label}</button>
              );
            })}
          </div>
        </div>

        {/* ── SEARCH ── */}
        <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: CLR.muted }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm ID, Dự án, NV..."
              style={{
                width: '100%', height: 34, paddingLeft: 30, paddingRight: 12,
                fontSize: 13, border: `1px solid ${CLR.border}`, borderRadius: 8,
                background: CLR.card, color: CLR.text, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── DATA TABLE ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 20px 20px' }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 8,
              fontSize: 13, color: '#DC2626', marginBottom: 12,
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div style={{ background: CLR.card, borderRadius: 10, border: `1px solid ${CLR.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FFF8EC', borderBottom: `1px solid ${CLR.border}` }}>
                  {[
                    { label: 'Ngày', w: 96 },
                    { label: 'Dự Án', w: 180 },
                    { label: 'Lợi Nhuận', w: 100, right: true },
                    { label: 'Điểm Nhận', w: 200 },
                    { label: 'Chuyến', w: 64, right: true },
                    { label: 'Đơn Giá KH', w: 106, right: true },
                    { label: 'Đơn Giá NCC', w: 106, right: true },
                    { label: 'Trạng Thái', w: 130 },
                    { label: 'Note', w: 160 },
                    { label: 'NV Update', w: 150 },
                    { label: 'Thao Tác', w: 80, right: true },
                  ].map(col => (
                    <th key={col.label} style={{
                      padding: '9px 12px', textAlign: col.right ? 'right' : 'left',
                      fontSize: 11, fontWeight: 700, color: '#92400E',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap', width: col.w, userSelect: 'none',
                    }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && bookings.length === 0 ? (
                  // Skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid #F3F4F6` }}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} style={{ padding: '11px 12px' }}>
                          <div style={{
                            height: 12, borderRadius: 4,
                            background: `linear-gradient(90deg, #F3F4F6 0%, #E5E7EB ${50 + i * 10}%, #F3F4F6 100%)`,
                            animation: 'pulse 1.5s ease infinite',
                            width: j === 0 ? 72 : j === 10 ? 48 : '80%',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Truck size={36} color={CLR.muted} />
                        <span style={{ fontSize: 13, color: CLR.muted, fontWeight: 500 }}>
                          {search || statusFilter || dayFilter !== 'all' ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dữ liệu booking'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((bk, idx) => {
                  const st = getStatus(bk.Tinh_Trang);
                  const profitColor = bk.Profit > 0 ? CLR.green : bk.Profit < 0 ? CLR.red : CLR.muted;
                  const donGiaKH = bk.Tong_Thu;
                  const donGiaNCC = bk.Tong_Tra_NCC;
                  const diemNhan = bk.trips?.[0]?.Dia_Chi_Nhan || '—';
                  return (
                    <tr
                      key={`${bk.ID_CODE}_${idx}`}
                      onClick={() => router.push(`/tms/booking/${encodeURIComponent(bk.ID_CODE)}`)}
                      style={{
                        borderBottom: `1px solid #F3F4F6`,
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      {/* Ngày */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 12.5, color: CLR.secondary }}>{bk.Ngay || '—'}</td>
                      {/* Dự Án */}
                      <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: CLR.primary,
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                          title={bk.Doi_Tac || bk.Du_An}
                        >{bk.Doi_Tac || bk.Du_An || '—'}</span>
                      </td>
                      {/* Lợi Nhuận */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: profitColor, fontVariantNumeric: 'tabular-nums' }}>
                          {bk.Profit !== 0 ? fmtFull(bk.Profit) : '—'}
                        </span>
                      </td>
                      {/* Điểm Nhận */}
                      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                        <span style={{ fontSize: 12, color: CLR.secondary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={diemNhan}
                        >{diemNhan}</span>
                      </td>
                      {/* Chuyến */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: bk.So_Chuyen > 0 ? CLR.primary : CLR.muted }}>
                          {bk.So_Chuyen || 0}
                        </span>
                      </td>
                      {/* Đơn Giá KH */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: CLR.text }}>
                          {donGiaKH > 0 ? fmtFull(donGiaKH) : '—'}
                        </span>
                      </td>
                      {/* Đơn Giá NCC */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: CLR.text }}>
                          {donGiaNCC > 0 ? fmtFull(donGiaNCC) : '—'}
                        </span>
                      </td>
                      {/* Trạng Thái */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          height: 22, padding: '0 9px', borderRadius: 11,
                          fontSize: 11, fontWeight: 700,
                          border: `1px solid ${st.border}`, background: st.bg, color: st.color,
                          whiteSpace: 'nowrap',
                        }}>{st.label}</span>
                      </td>
                      {/* Note */}
                      <td style={{ padding: '10px 12px', maxWidth: 160 }}>
                        <span style={{ fontSize: 12, color: CLR.secondary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={bk.Note}
                        >{bk.Note || '—'}</span>
                      </td>
                      {/* NV Update */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 12, color: CLR.secondary }}>{bk.NV_HoTen || bk.NV_Update || '—'}</span>
                      </td>
                      {/* Thao Tác */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => { e.stopPropagation(); handleCopy(bk.ID_CODE); }}
                            title="Copy ID"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: copied === bk.ID_CODE ? '#D1FAE5' : 'transparent',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: copied === bk.ID_CODE ? '#16A34A' : CLR.muted,
                            }}
                          ><Copy size={13} /></button>
                          <button
                            onClick={e => { e.stopPropagation(); if (confirm(`Xóa ${bk.ID_CODE}?`)) alert('Chức năng xóa sẽ được triển khai'); }}
                            title="Xóa"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: CLR.muted,
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = CLR.muted; }}
                          ><Trash2 size={13} /></button>
                          <ChevronRight size={13} color={CLR.muted} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination footer */}
            {filtered.length > 0 && (
              <div style={{
                padding: '8px 16px', borderTop: `1px solid ${CLR.border}`,
                fontSize: 11, color: CLR.muted, textAlign: 'right', background: '#FAFAFA'
              }}>
                {filtered.length} trong tổng số {bookings.length} phiếu • {stats.chuyen} chuyến xe
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}
