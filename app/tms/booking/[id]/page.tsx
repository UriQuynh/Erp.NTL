'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import {
  ArrowLeft, Save, Plus, X, MapPin, Truck, RefreshCw,
  Copy, Trash2, CheckCircle2, AlertCircle, ExternalLink,
  FileSpreadsheet, Upload, Camera, ChevronDown, Search,
} from 'lucide-react';

// ─── Design tokens ───
const C = {
  primary: '#1E3A5F', gold: '#F5A623', yellow: '#F5C518',
  green: '#27AE60', red: '#E74C3C', orange: '#E67E22',
  bg: '#F0F2F5', card: '#FFFFFF', border: '#E8ECF0',
  text: '#1A1A2E', muted: '#9CA3AF', secondary: '#6B7280',
  headerGrad: 'linear-gradient(135deg, #1E3A5F 0%, #2D5FA6 100%)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Chưa Có Xe':   { label: 'Chưa Có Xe',   color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  'Chưa Hòa Tất': { label: 'Chưa Hoàn Tất', color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  'Chờ cập nhật': { label: 'Chờ cập nhật', color: '#E67E22', bg: '#FFF3E0', border: '#FBBF24' },
  'Hoàn Tất':     { label: 'Hoàn Tất',      color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
};
function getStatus(s: string) {
  if (!s) return { label: 'Không rõ', color: C.muted, bg: '#F9FAFB', border: '#E5E7EB' };
  const k = Object.keys(STATUS_CFG).find(k => s.includes(k));
  return k ? STATUS_CFG[k] : { label: s.trim(), color: C.muted, bg: '#F9FAFB', border: '#E5E7EB' };
}
function fmtVND(n: number) { return n.toLocaleString('vi-VN'); }
function getTodayISO() {
  const n = new Date(Date.now() + 7 * 3600_000);
  return n.toISOString().slice(0, 10);
}

// ── Section label ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: C.gold,
      borderBottom: `2px solid ${C.gold}`, paddingBottom: 4, marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

// ── Input field ──
function Field({ label, children, badge }: { label: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: C.secondary, marginBottom: 4 }}>
        {label}{badge}
      </label>
      {children}
    </div>
  );
}
function inputStyle(readonly = false): React.CSSProperties {
  return {
    width: '100%', height: 36, padding: '0 10px', fontSize: 13,
    border: `1px solid ${C.border}`, borderRadius: 8,
    background: readonly ? '#F9FAFB' : C.card,
    color: readonly ? C.secondary : C.text,
    cursor: readonly ? 'not-allowed' : 'text',
    outline: 'none', boxSizing: 'border-box',
  };
}

// ═══════════════════════════════════════
// COMBOBOX COMPONENT — searchable dropdown
// ═══════════════════════════════════════
function ComboBox({ value, onChange, options, placeholder, style }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Normalize Vietnamese diacritics for search
  const normalizeVN = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtered = useMemo(() => {
    if (!search.trim()) return options.slice(0, 50); // show first 50 when no search
    const q = normalizeVN(search);
    return options.filter(o => normalizeVN(o).includes(q)).slice(0, 50);
  }, [search, options]);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={open ? search : value}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setSearch(value); }}
          placeholder={placeholder}
          style={{ ...inputStyle(), paddingRight: 28 }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => { setOpen(!open); if (!open) { setSearch(value); inputRef.current?.focus(); } }}
          style={{
            position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)',
            width: 24, height: 24, border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronDown size={13} color={C.muted} style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          marginTop: 2, maxHeight: 200, overflowY: 'auto',
          background: '#fff', borderRadius: 8, border: `1px solid ${C.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {filtered.map((opt, i) => (
            <div
              key={`${opt}-${i}`}
              onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); setSearch(''); }}
              style={{
                padding: '7px 10px', fontSize: 12, cursor: 'pointer',
                background: opt === value ? '#EFF6FF' : 'transparent',
                color: opt === value ? C.primary : C.text,
                fontWeight: opt === value ? 600 : 400,
                borderBottom: i < filtered.length - 1 ? `1px solid #F3F4F6` : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = opt === value ? '#EFF6FF' : 'transparent')}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Trip {
  ID: string; ID_PXK: string;
  Bien_So: string; Tai_Xe: string; SĐT_Tai_Xe?: string;
  Loai_Xe: string; NCC: string; NCC_Raw: string;
  Dia_Chi_Nhan: string; Dia_Chi_Giao: string;
  Cuoc_Thu_KH: number; Cuoc_Khac_Thu_KH: number;
  Don_Gia_NCC: number; Phi_Khac_NCC: number;
  Tong_Thu: number; Tong_Tra: number; Profit: number;
  Trang_Thai: string;
  Trong_Luong: string;
  PODs: string[]; So_Bill?: string;
  Thoi_Gian_BK?: string;
}

interface Booking {
  ID_CODE: string; Ngay: string;
  Du_An: string; Doi_Tac: string;
  Tinh_Trang: string; NV_Update: string; NV_HoTen: string;
  Note: string; PODs: string[];
  So_Chuyen: number;
  Tong_Thu: number; Tong_Tra_NCC: number; Tong_Phat_Sinh: number; Profit: number;
  NCCs: string[]; trips: Trip[];
  Diem_Nhan?: string;
}

// ─── Suggestions data shape ───
interface Suggestions {
  diemGiao: string[];
  ncc: string[];
  bienSo: string[];
  taiXe: string[];
  phoneMap: Record<string, { taiXe: string; sdt: string }>;
  driverMap: Record<string, string>;
}

// ─── Banggia (vehicle pricing) types ───
interface BanggiaVehicle {
  loai_xe: string;
  kich_thuoc: string;
  don_gia: number;
  display: string; // "VH5 - 6m2"
}
interface BanggiaData {
  nccList: { ncc_id: string; ten_ncc: string; count: number }[];
  vehiclesByNCC: Record<string, BanggiaVehicle[]>;
  banggia: Array<{ ncc_id: string; ten_ncc: string; loai_xe: string; kich_thuoc: string; don_gia: number; display: string }>;
}

// ═══════════════════════════════════════
// ADD TRIP MODAL with Smart Suggestions
// ═══════════════════════════════════════
function AddTripModal({ bangkeId, ngay, diemNhan, duAn, onClose, onSaved }: {
  bangkeId: string; ngay: string; diemNhan: string; duAn: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { user } = useERPAuth();
  const [form, setForm] = useState({
    Ngay: ngay || getTodayISO(),
    Thoi_Gian_BK: new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 16),
    Dia_Chi_Nhan: diemNhan || '',
    Dia_Chi_Giao: '',
    NCC: '',
    Bien_So: '',
    Loai_Xe_YC: '',
    Tai_Xe: '',
    SDT_Tai_Xe: '',
    Trang_Thai: 'Chờ cập nhật',
    So_Bill: '',
    Note: '',
    // ── Financial fields (26-col schema) ──
    Tai_Trong: '',
    Don_Gia_KH: '',
    Phi_Khac_KH: '',
    Don_Gia_NCC: '',
    Phat_Sinh_NCC: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [podFiles, setPodFiles] = useState<string[]>(['', '', '', '']);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Suggestions state ──
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [sugLoading, setSugLoading] = useState(true);

  // ── Banggia (NCC → vehicle pricing) ──
  const [banggia, setBanggia] = useState<BanggiaData | null>(null);
  const [noteDirty, setNoteDirty] = useState(false); // track user manual edits to ghi chú

  // ── Fetch suggestions + banggia on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sugRes, bgRes] = await Promise.all([
          fetch('/api/tms/suggestions'),
          fetch('/api/tms/banggia'),
        ]);
        const sugJson = await sugRes.json();
        const bgJson = await bgRes.json();
        if (!cancelled) {
          if (sugJson.success) setSuggestions(sugJson.data);
          if (bgJson.success) setBanggia(bgJson.data);
        }
      } catch (e) {
        console.error('Failed to load suggestions/banggia:', e);
      } finally {
        if (!cancelled) setSugLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived: NCC options from banggia ──
  const nccOptions = useMemo(() => {
    if (!banggia?.nccList) return suggestions?.ncc || [];
    return banggia.nccList.map(n => n.ten_ncc || n.ncc_id);
  }, [banggia, suggestions]);

  // ── Derived: Loại Xe options filtered by selected NCC ──
  const loaiXeOptions = useMemo(() => {
    if (!banggia?.vehiclesByNCC || !form.NCC) return [];
    // Find NCC_ID matching selected name
    const nccEntry = banggia.nccList?.find(n =>
      n.ten_ncc === form.NCC || n.ncc_id === form.NCC
    );
    const nccId = nccEntry?.ncc_id || form.NCC;
    return (banggia.vehiclesByNCC[nccId] || []).map(v => v.display);
  }, [banggia, form.NCC]);

  // ── Derived: vehicle count for selected NCC (biển số badge) ──
  const bienSoCountForNCC = useMemo(() => {
    if (!banggia?.nccList || !form.NCC) return 0;
    const n = banggia.nccList.find(x => x.ten_ncc === form.NCC || x.ncc_id === form.NCC);
    return n?.count || 0;
  }, [banggia, form.NCC]);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Auto-fill: NCC change → reset Loai_Xe + financial ──
  const handleNCCChange = (v: string) => {
    setForm(p => ({ ...p, NCC: v, Loai_Xe_YC: '', Don_Gia_NCC: '' }));
  };

  // ── Auto-fill: Loại Xe → Ghi Chú Chuyến + Đơn Giá NCC ──
  const handleLoaiXeChange = (v: string) => {
    setForm(p => {
      const updated = { ...p, Loai_Xe_YC: v };
      // Auto-fill ghi chú if not dirty
      if (banggia) {
        const nccEntry = banggia.nccList?.find(n => n.ten_ncc === p.NCC || n.ncc_id === p.NCC);
        const nccId = nccEntry?.ncc_id || p.NCC;
        const vehicles = banggia.vehiclesByNCC[nccId] || [];
        const match = vehicles.find(veh => veh.display === v);
        if (match) {
          // Auto-fill Đơn Giá NCC from banggia
          if (match.don_gia) {
            updated.Don_Gia_NCC = String(match.don_gia);
          }
          // Smart format for Note (only if not manually edited)
          if (!noteDirty) {
            if (match.loai_xe.length < 15 && match.kich_thuoc.length < 15 && match.loai_xe && match.kich_thuoc) {
              updated.Note = `Xe ${match.loai_xe} thùng ${match.kich_thuoc}`;
            } else {
              updated.Note = match.display || v;
            }
          }
        }
      }
      return updated;
    });
  };

  // ── Auto-fill: Biển Số → Tài Xế + SĐT ──
  const handleBienSoChange = (v: string) => {
    setForm(p => {
      const updated: typeof p = { ...p, Bien_So: v };
      if (suggestions?.phoneMap[v]) {
        const match = suggestions.phoneMap[v];
        if (match.taiXe && !p.Tai_Xe) updated.Tai_Xe = match.taiXe;
        if (match.sdt && !p.SDT_Tai_Xe) updated.SDT_Tai_Xe = match.sdt;
      }
      return updated;
    });
  };

  // ── Auto-fill: Tài Xế → SĐT ──
  const handleTaiXeChange = (v: string) => {
    setForm(p => {
      const updated: typeof p = { ...p, Tai_Xe: v };
      if (suggestions?.driverMap[v] && !p.SDT_Tai_Xe) {
        updated.SDT_Tai_Xe = suggestions.driverMap[v];
      }
      return updated;
    });
  };

  // Generate 8-char hex ID for trip
  const generateHex8 = () => Math.random().toString(16).substring(2, 10);

  // Format date from yyyy-mm-dd to dd/mm/yyyy
  const toDateVN = (d: string) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    return (y && m && dd) ? `${dd}/${m}/${y}` : d;
  };

  const handleSave = async () => {
    // ── Validation ──
    if (!form.Dia_Chi_Nhan.trim()) { setErr('Vui lòng nhập điểm nhận hàng'); return; }
    if (!form.Dia_Chi_Giao.trim()) { setErr('Vui lòng nhập điểm giao hàng'); return; }
    if (!form.NCC.trim()) { setErr('Vui lòng chọn NCC'); return; }
    setSaving(true); setErr('');

    try {
      const chuyenId = generateHex8();
      const nvUpdate = user ? `${user.maNV} - ${user.hoTen}` : '';
      // Combine Tai_Xe + SDT for column G
      const taiXeDisplay = [form.Tai_Xe, form.SDT_Tai_Xe].filter(Boolean).join(' ');

      // ── Build 26-field payload matching 1.Data_Xe_BK A→Z ──
      const payload = {
        action          : 'createChuyen',
        ID_CODE         : bangkeId,                              // A
        ID              : chuyenId,                              // B
        Ngay            : toDateVN(form.Ngay),                   // C
        Booking         : form.Note || '',                       // D (mô tả chuyến)
        Bien_So         : form.Bien_So,                          // F
        Tai_Xe          : taiXeDisplay,                          // G
        Tai_Trong       : form.Tai_Trong || '',                  // H
        Equipment_Type  : form.Loai_Xe_YC || '',                 // I
        Diem_Nhan       : form.Dia_Chi_Nhan,                     // J
        Diem_Giao       : form.Dia_Chi_Giao,                     // K
        Don_Gia_Doitac  : parseFloat(form.Don_Gia_KH) || 0,      // L
        Phi_Khac_Doitac : parseFloat(form.Phi_Khac_KH) || 0,     // M
        Don_Gia_NCC     : parseFloat(form.Don_Gia_NCC) || 0,     // N
        Phat_Sinh       : parseFloat(form.Phat_Sinh_NCC) || 0,   // O
        Doi_Tac         : duAn || '',                             // P
        NCC             : form.NCC,                              // Q
        Tinh_Trang      : 'Chờ cập nhật',                        // R
        Note            : form.Note || '',                       // S
        SVD             : form.So_Bill || '',                     // T
        Code_Tuyen      : '',                                    // Y
        NV_Update       : nvUpdate,                              // Z
      };

      console.log('[AddTrip] Payload:', JSON.stringify(payload).slice(0, 300));

      const res = await fetch('/api/tms/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'GAS trả về lỗi');
      }

      console.log('[AddTrip] Success:', result);
      onSaved(); // refresh parent + close modal
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi lưu — vui lòng thử lại';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  const isMapUrl = (s: string) => s.includes('maps.app.goo.gl') || s.includes('google.com/maps');

  // address + circle badge
  const CircleBadge = ({ letter, color }: { letter: string; color: string }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 800,
      background: color, color: '#fff', flexShrink: 0, marginRight: 4,
    }}>{letter}</span>
  );

  // Loading dots for suggestions
  const SugBadge = () => sugLoading ? (
    <span style={{ fontSize: 10, color: C.muted, marginLeft: 4, fontStyle: 'italic' }}>đang tải gợi ý...</span>
  ) : suggestions ? (
    <span style={{
      fontSize: 9, color: '#16A34A', marginLeft: 4, background: '#F0FDF4',
      padding: '1px 6px', borderRadius: 4, fontWeight: 600,
    }}>✓ Có gợi ý</span>
  ) : null;

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 660, maxHeight: '92vh', overflowY: 'auto',
        background: C.card, borderRadius: 16, padding: 0,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        animation: 'slideIn 0.25s ease',
      }}>
        {/* Modal header sticky */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: C.card, borderBottom: `1px solid ${C.border}`,
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
            background: '#F3F4F6', padding: '3px 10px', borderRadius: 6, color: C.secondary,
          }}>{bangkeId}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.secondary }}>
            <span>Ngày:</span>
            <input type="date" value={form.Ngay} onChange={setF('Ngay')}
              style={{ ...inputStyle(), height: 28, width: 130, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.secondary }}>
            <span>⏱ BK:</span>
            <input type="datetime-local" value={form.Thoi_Gian_BK} onChange={setF('Thoi_Gian_BK')}
              style={{ ...inputStyle(), height: 28, width: 160, fontSize: 12 }} />
          </div>
          <button onClick={onClose} style={{
            marginLeft: 'auto', width: 28, height: 28, borderRadius: 7,
            border: `1px solid ${C.border}`, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={14} color={C.secondary} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── ĐỊA CHỈ & KM ── */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.orange, background: '#FFF3E0', padding: '3px 10px', borderRadius: 4,
              marginBottom: 12,
            }}>
              <MapPin size={11} /> ĐỊA CHỈ &amp; KM (BẮT BUỘC)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Điểm Nhận — auto-filled from parent booking, editable */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: C.secondary, marginBottom: 4 }}>
                  <CircleBadge letter="A" color="#16A34A" /> Điểm Nhận *
                  {diemNhan && (
                    <span style={{ fontSize: 9, color: '#16A34A', marginLeft: 4, background: '#F0FDF4', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                      tự động
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <ComboBox
                    value={form.Dia_Chi_Nhan}
                    onChange={v => setForm(p => ({ ...p, Dia_Chi_Nhan: v }))}
                    options={suggestions?.diemGiao || []}
                    placeholder="Địa chỉ / Maps link..."
                  />
                  {isMapUrl(form.Dia_Chi_Nhan) && (
                    <a href={form.Dia_Chi_Nhan} target="_blank" rel="noopener noreferrer"
                      style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                      <ExternalLink size={13} color={C.primary} />
                    </a>
                  )}
                </div>
              </div>
              {/* Điểm Giao — with suggestions dropdown */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: C.secondary, marginBottom: 4 }}>
                  <CircleBadge letter="B" color="#E67E22" /> Điểm Giao *
                  <SugBadge />
                </label>
                <div style={{ position: 'relative' }}>
                  <ComboBox
                    value={form.Dia_Chi_Giao}
                    onChange={v => setForm(p => ({ ...p, Dia_Chi_Giao: v }))}
                    options={suggestions?.diemGiao || []}
                    placeholder="Tìm hoặc nhập địa chỉ giao..."
                  />
                  {isMapUrl(form.Dia_Chi_Giao) && (
                    <a href={form.Dia_Chi_Giao} target="_blank" rel="noopener noreferrer"
                      style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                      <ExternalLink size={13} color={C.primary} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── THÔNG TIN XE (Cascading: NCC → Loại Xe) ── */}
          <div>
            <SectionLabel>🚛 Thông tin xe</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 12 }}>
              <Field label="NCC *">
                <ComboBox
                  value={form.NCC}
                  onChange={handleNCCChange}
                  options={nccOptions}
                  placeholder="Nhà cung cấp..."
                />
              </Field>
              <Field label="Biển Số" badge={
                bienSoCountForNCC > 0 ? (
                  <span style={{ fontSize: 10, color: '#2563EB', background: '#EFF6FF', padding: '1px 7px', borderRadius: 20, fontWeight: 600, marginLeft: 4 }}>
                    {bienSoCountForNCC} xe ghi nhận
                  </span>
                ) : undefined
              }>
                <ComboBox
                  value={form.Bien_So}
                  onChange={handleBienSoChange}
                  options={suggestions?.bienSo || []}
                  placeholder="Chọn hoặc nhập mới..."
                />
              </Field>
              <Field label="Loại Xe YC" badge={
                form.NCC ? (
                  <span style={{ fontSize: 9, color: C.muted, marginLeft: 4, fontStyle: 'italic' }}>↻ Tự động theo NCC</span>
                ) : undefined
              }>
                {loaiXeOptions.length > 0 ? (
                  <ComboBox
                    value={form.Loai_Xe_YC}
                    onChange={handleLoaiXeChange}
                    options={loaiXeOptions}
                    placeholder="Loại xe..."
                  />
                ) : (
                  <input value={form.Loai_Xe_YC} onChange={setF('Loai_Xe_YC')} placeholder={form.NCC ? 'Không có dữ liệu xe cho NCC này' : 'Chọn NCC trước...'} style={inputStyle(!form.NCC)} />
                )}
              </Field>
            </div>
            {/* Auto-fill hint from Biển Số */}
            {form.Bien_So && suggestions?.phoneMap[form.Bien_So] && (
              <div style={{
                marginTop: 6, fontSize: 10, color: '#16A34A', background: '#F0FDF4',
                padding: '4px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <CheckCircle2 size={10} />
                Đã tìm thấy thông tin xe: Tài xế <strong>{suggestions.phoneMap[form.Bien_So].taiXe || '—'}</strong>
                {suggestions.phoneMap[form.Bien_So].sdt && <> | SĐT <strong>{suggestions.phoneMap[form.Bien_So].sdt}</strong></>}
              </div>
            )}
            {/* Auto-fill hint from Loại Xe */}
            {form.Loai_Xe_YC && form.NCC && !noteDirty && (
              <div style={{
                marginTop: 4, fontSize: 10, color: '#2563EB', background: '#EFF6FF',
                padding: '4px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Truck size={10} />
                Ghi chú chuyến tự động: <strong>{form.Note || '—'}</strong>
              </div>
            )}
          </div>

          {/* ── TÀI XẾ ── */}
          <div>
            <SectionLabel>👤 Tài xế</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
              <Field label="Tài Xế">
                <ComboBox
                  value={form.Tai_Xe}
                  onChange={handleTaiXeChange}
                  options={suggestions?.taiXe || []}
                  placeholder="Tên tài xế..."
                />
              </Field>
              <Field label="SĐT Tài Xế">
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel" value={form.SDT_Tai_Xe} onChange={setF('SDT_Tai_Xe')}
                    placeholder="0xxx..."
                    style={inputStyle()}
                  />
                  {form.SDT_Tai_Xe && form.SDT_Tai_Xe !== '' && (
                    <span style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 9, color: '#16A34A', fontWeight: 600,
                    }}>✓</span>
                  )}
                </div>
              </Field>
              <Field label="Trạng Thái (tự động)">
                <div style={{
                  ...inputStyle(true),
                  display: 'flex', alignItems: 'center',
                  fontSize: 12, fontWeight: 700, color: C.orange,
                  border: `1px solid #FBBF24`, background: '#FFF3E0',
                }}>{form.Trang_Thai}</div>
              </Field>
            </div>
          </div>

          {/* ── THÔNG TIN TÀI CHÍNH ── */}
          <div>
            <SectionLabel>💰 Thông tin tài chính</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10 }}>
              <Field label="Tải Trọng (kg)">
                <input type="number" value={form.Tai_Trong} onChange={setF('Tai_Trong')}
                  placeholder="0" style={inputStyle()} />
              </Field>
              <Field label="Đơn Giá KH">
                <input type="number" value={form.Don_Gia_KH} onChange={setF('Don_Gia_KH')}
                  placeholder="VND" style={inputStyle()} />
              </Field>
              <Field label="Phí Khác KH">
                <input type="number" value={form.Phi_Khac_KH} onChange={setF('Phi_Khac_KH')}
                  placeholder="0" style={inputStyle()} />
              </Field>
              <Field label="Đơn Giá NCC" badge={
                form.Loai_Xe_YC ? (
                  <span style={{ fontSize: 9, color: '#16A34A', marginLeft: 4 }}>↻ auto</span>
                ) : undefined
              }>
                <input type="number" value={form.Don_Gia_NCC} onChange={setF('Don_Gia_NCC')}
                  placeholder="VND" style={inputStyle()} />
              </Field>
              <Field label="Phát Sinh NCC">
                <input type="number" value={form.Phat_Sinh_NCC} onChange={setF('Phat_Sinh_NCC')}
                  placeholder="0" style={inputStyle()} />
              </Field>
            </div>
          </div>

          {/* ── NGƯỜI YC ── */}
          <div>
            <SectionLabel>👤 Người yêu cầu</SectionLabel>
            <input
              value={user ? `${user.maNV} - ${user.hoTen}` : ''}
              readOnly style={{ ...inputStyle(true), width: '100%' }}
            />
          </div>

          {/* ── IMPORT VẬN ĐƠN ── */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.orange, background: '#FFF3E0', padding: '3px 10px', borderRadius: 4, marginBottom: 8,
            }}>
              📋 Import danh sách vận đơn
            </div>
            <textarea
              value={form.So_Bill} onChange={setF('So_Bill')}
              placeholder={"Dán danh sách số vận đơn (mỗi dòng 1 mã, hoặc cách bởi dấu phẩy/tab)..."}
              style={{
                width: '100%', minHeight: 90, padding: '8px 10px',
                fontSize: 12, fontFamily: 'monospace',
                border: `1px solid ${C.border}`, borderRadius: 8,
                background: '#FAFAFA', resize: 'vertical', outline: 'none',
                boxSizing: 'border-box', color: C.text,
              }}
            />
          </div>

          {/* ── HÌNH ẢNH ── */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.gold, marginBottom: 8,
            }}>
              🖼️ Hình ảnh chuyến
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {podFiles.map((url, i) => (
                <div key={i} style={{
                  height: 80, borderRadius: 8, border: `2px dashed ${url ? C.primary : '#D1D5DB'}`,
                  background: url ? '#F0F4FF' : 'transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  transition: 'all 0.15s',
                }}>
                  {url ? (
                    <>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setPodFiles(p => { const n = [...p]; n[i] = ''; return n; })}
                        style={{
                          position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%',
                          background: '#DC2626', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <X size={10} color="#fff" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera size={18} color="#D1D5DB" />
                      <span style={{ fontSize: 10, color: '#D1D5DB', marginTop: 4 }}>Ảnh {i + 1}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── GHI CHÚ CHUYẾN ── */}
          <div>
            <SectionLabel>📝 Ghi chú chuyến</SectionLabel>
            {!noteDirty && form.Note && form.Loai_Xe_YC && (
              <div style={{ fontSize: 10, color: '#16A34A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={10} /> Đã tự động điền từ Loại Xe. Bạn có thể chỉnh sửa.
              </div>
            )}
            <textarea
              value={form.Note}
              onChange={e => { setNoteDirty(true); setForm(p => ({ ...p, Note: e.target.value })); }}
              placeholder="Ghi chú (tự động điền khi chọn NCC + Loại Xe)..."
              style={{
                width: '100%', minHeight: 72, padding: '8px 10px',
                fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8,
                background: noteDirty ? C.card : '#F0FDF4', resize: 'vertical', outline: 'none',
                boxSizing: 'border-box', color: C.text,
              }}
            />
          </div>

          {/* Error */}
          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>
              <AlertCircle size={14} /> {err}
            </div>
          )}
        </div>

        {/* Modal footer sticky */}
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 10,
          background: C.card, borderTop: `1px solid ${C.border}`,
          padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            height: 38, minWidth: 100, padding: '0 18px', fontSize: 13, fontWeight: 600,
            borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.secondary, cursor: 'pointer',
          }}>Hủy</button>
          <button onClick={handleSave} disabled={saving} style={{
            height: 38, minWidth: 120, padding: '0 18px', fontSize: 13, fontWeight: 700,
            borderRadius: 8, border: 'none',
            background: saving ? '#94A3B8' : C.primary, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: saving ? 'none' : '0 2px 8px rgba(30,58,95,0.3)',
          }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Đang lưu...' : 'Lưu Chuyến'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════
// DETAIL PAGE
// ═══════════════════════════════════════
export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, user } = useERPAuth();
  const id = decodeURIComponent((params?.id as string) || '');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchBooking = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tms/booking');
      const json = await res.json();
      if (json.success) {
        const found = (json.data as Booking[]).find(b => b.ID_CODE === id);
        if (found) setBooking(found);
        else setError(`Không tìm thấy Booking: ${id}`);
      } else setError(json.error || 'Lỗi tải dữ liệu');
    } catch { setError('Không kết nối được server'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (isAuthenticated && id) fetchBooking(); }, [isAuthenticated, id, fetchBooking]);

  if (!isAuthenticated) return null;

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
      <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
      <p style={{ fontSize: 13 }}>Đang tải...</p>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !booking) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <AlertCircle size={24} color="#DC2626" />
      <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{error || 'Không tìm thấy booking'}</p>
      <button onClick={() => router.push('/tms/booking')} style={{
        marginTop: 16, padding: '8px 20px', fontSize: 13, borderRadius: 8,
        background: C.primary, color: '#fff', border: 'none', cursor: 'pointer',
      }}>← Quay lại danh sách</button>
    </div>
  );

  const bk = booking;
  const st = getStatus(bk.Tinh_Trang);
  const donGiaKH = bk.Tong_Thu;
  const donGiaNCC = bk.Tong_Tra_NCC;
  const trips = bk.trips || [];

  // Derive Diem_Nhan from first trip or booking-level data
  const parentDiemNhan = bk.Diem_Nhan || trips[0]?.Dia_Chi_Nhan || '';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 40px', background: C.bg, minHeight: '100%' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '16px 0 12px', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push('/tms/booking')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 34, padding: '0 12px', fontSize: 12, fontWeight: 600,
              border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.card, color: C.secondary, cursor: 'pointer',
            }}
          >
            <ArrowLeft size={13} /> Quay lại
          </button>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {bk.ID_CODE}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 11,
                border: `1px solid ${st.border}`, background: st.bg, color: st.color,
              }}>{st.label}</span>
            </h2>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
              Nhấn &lsquo;Lưu&rsquo; khi hoàn tất chỉnh sửa
            </p>
          </div>
        </div>
        <button
          onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 700); }}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 18px', fontSize: 13, fontWeight: 700,
            borderRadius: 8, border: 'none',
            background: saved ? '#16A34A' : saving ? '#94A3B8' : C.primary,
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(30,58,95,0.25)',
          }}
        >
          {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
            saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? 'Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>

      {/* ── CARD 1: THÔNG TIN PHIẾU ── */}
      <div style={{ background: C.card, borderRadius: 12, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <SectionLabel>Thông tin phiếu Booking</SectionLabel>

        {/* Row 1: Mã ID | Dự Án | Ngày */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px', gap: 12, marginBottom: 14 }}>
          <Field label="Mã ID">
            <input value={bk.ID_CODE} readOnly style={inputStyle(true)} />
          </Field>
          <Field label="Dự Án *">
            <input value={bk.Doi_Tac || bk.Du_An} readOnly style={inputStyle(true)} />
          </Field>
          <Field label="Ngày *">
            <input type="text" value={bk.Ngay} readOnly style={inputStyle(true)} />
          </Field>
        </div>

        {/* Row 2: Computed summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {/* Đơn Giá KH */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Đơn Giá KH</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtVND(donGiaKH)}</div>
          </div>
          {/* Đơn Giá NCC */}
          <div style={{ background: '#F0FDF4', border: `1px solid #BBF7D0`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Đơn Giá NCC</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtVND(donGiaNCC)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>= Σ Don_Gia ({trips.length} chuyến)</div>
          </div>
          {/* Lợi Nhuận */}
          <div style={{ background: '#F0FDF4', border: `1px solid #BBF7D0`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lợi Nhuận</div>
            <div style={{
              fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: bk.Profit > 0 ? C.green : bk.Profit < 0 ? C.red : C.muted,
            }}>{fmtVND(bk.Profit)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>= KH − NCC</div>
          </div>
          {/* Tải Tổng */}
          <div style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phát sinh NCC</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, fontVariantNumeric: 'tabular-nums' }}>{fmtVND(bk.Tong_Phat_Sinh)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Σ phụ phí NCC</div>
          </div>
        </div>

        {/* Row 3: Điểm Nhận | Trọng Lượng | NV Update */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="Điểm Nhận">
            <input value={parentDiemNhan} readOnly style={inputStyle(true)} />
          </Field>
          <Field label="Trọng Lượng">
            <input value={trips[0]?.Trong_Luong || ''} readOnly style={inputStyle(true)} />
          </Field>
          <Field label="NV Update">
            <input value={bk.NV_HoTen || bk.NV_Update || ''} readOnly style={inputStyle(true)} />
          </Field>
        </div>

        {/* Row 4: Ghi chú */}
        <Field label="Ghi Chú">
          <textarea
            defaultValue={bk.Note}
            placeholder="Ghi chú đặc biệt..."
            style={{
              width: '100%', minHeight: 72, padding: '8px 10px', fontSize: 13,
              border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: C.text,
            }}
          />
        </Field>
      </div>

      {/* ── CARD 2: DANH SÁCH CHUYẾN ── */}
      <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Card header */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            Danh sách chuyến ({trips.length}) — <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.secondary }}>{bk.ID_CODE}</span>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
              fontSize: 12, fontWeight: 600, borderRadius: 7, border: `1px solid ${C.border}`,
              background: C.card, color: C.secondary, cursor: 'pointer',
            }}>
              <FileSpreadsheet size={13} /> Báo Cáo CI/CO
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
                fontSize: 12, fontWeight: 700, borderRadius: 7, border: 'none',
                background: C.yellow, color: C.text, cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(245,197,24,0.4)',
              }}
            >
              <Plus size={13} /> Thêm Chuyến
            </button>
          </div>
        </div>

        {trips.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚚</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
              Chưa có chuyến nào
            </p>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              Nhấn &lsquo;+ Thêm Chuyến&rsquo; để tạo chuyến xe đầu tiên
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 36, padding: '0 18px', fontSize: 13, fontWeight: 700,
                borderRadius: 8, border: 'none', background: C.yellow, color: C.text, cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Thêm Chuyến ngay
            </button>
          </div>
        ) : (
          /* Trips table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#FFF8EC' }}>
                  {['#', 'ID', 'Biển Số', 'Tài Xế', 'Loại Xe', 'Điểm Nhận → Giao', 'Thu KH', 'Trả NCC', 'PS NCC', 'Lãi/Lỗ', 'NCC', 'Trạng Thái', ''].map(h => (
                    <th key={h} style={{
                      padding: '9px 10px', textAlign: h === 'Thu KH' || h === 'Trả NCC' || h === 'PS NCC' || h === 'Lãi/Lỗ' ? 'right' : 'left',
                      fontSize: 10.5, fontWeight: 700, color: '#92400E',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trips.map((trip, i) => {
                  const tst = getStatus(trip.Trang_Thai);
                  return (
                    <tr key={`${trip.ID}_${i}`} style={{ borderBottom: `1px solid #F3F4F6` }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '9px 10px', fontSize: 11, color: C.muted, fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: 11, color: C.secondary }}>{trip.ID}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: C.text, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{trip.Bien_So || '—'}</span>
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: 12, color: C.secondary, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.Tai_Xe || '—'}</td>
                      <td style={{ padding: '9px 10px' }}>
                        {trip.Loai_Xe && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '2px 6px', borderRadius: 4 }}>{trip.Loai_Xe}</span>}
                      </td>
                      <td style={{ padding: '9px 10px', maxWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.secondary }}>
                          <MapPin size={10} color="#16A34A" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }} title={trip.Dia_Chi_Nhan}>{trip.Dia_Chi_Nhan || '—'}</span>
                          <span style={{ color: C.muted, flexShrink: 0 }}>→</span>
                          <MapPin size={10} color="#DC2626" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }} title={trip.Dia_Chi_Giao}>{trip.Dia_Chi_Giao || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.green, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {trip.Cuoc_Thu_KH ? fmtVND(trip.Cuoc_Thu_KH) : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.red, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {trip.Don_Gia_NCC ? fmtVND(trip.Don_Gia_NCC) : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12, color: C.orange, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {trip.Phi_Khac_NCC ? fmtVND(trip.Phi_Khac_NCC) : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: trip.Profit >= 0 ? C.green : C.red }}>
                        {fmtVND(trip.Profit)}
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: 11.5, color: C.secondary, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trip.NCC_Raw}>{trip.NCC || '—'}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          height: 20, padding: '0 7px', borderRadius: 10,
                          fontSize: 10.5, fontWeight: 700,
                          border: `1px solid ${tst.border}`, background: tst.bg, color: tst.color,
                          whiteSpace: 'nowrap',
                        }}>{tst.label}</span>
                      </td>
                      <td style={{ padding: '9px 8px', textAlign: 'right' }}>
                        <button style={{
                          width: 24, height: 24, borderRadius: 5, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.muted,
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = C.muted; }}
                        ><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary footer */}
              <tfoot>
                <tr style={{ background: 'linear-gradient(135deg, #FFF8EC, #FFFBF0)', borderTop: `2px solid #FDE68A` }}>
                  <td colSpan={6} style={{ padding: '10px 10px', fontSize: 12, fontWeight: 700, color: C.secondary }}>
                    Tổng cộng ({trips.length} chuyến)
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {fmtVND(bk.Tong_Thu)}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.red, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {fmtVND(bk.Tong_Tra_NCC)}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.orange, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {fmtVND(bk.Tong_Phat_Sinh)}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: bk.Profit >= 0 ? C.green : C.red }}>
                    {fmtVND(bk.Profit)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Trip Modal — now receives diemNhan from parent booking */}
      {showModal && (
        <AddTripModal
          bangkeId={bk.ID_CODE}
          ngay={bk.Ngay}
          diemNhan={parentDiemNhan}
          duAn={bk.Du_An || bk.Doi_Tac || ''}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchBooking(); }}
        />
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
