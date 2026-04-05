'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import {
  Plus, ArrowLeft, Save, Package, Phone, MapPin, Calendar, FileText,
  Search, X, ChevronDown, CheckCircle2, AlertCircle, ExternalLink,
  RefreshCw, Tag, Info, Truck, FileSpreadsheet, Camera, Upload,
} from 'lucide-react';

// ── Design tokens (matching [id]/page.tsx exactly) ──
const C = {
  primary: '#1E3A5F', gold: '#F5A623', yellow: '#F5C518',
  green: '#27AE60', red: '#E74C3C', orange: '#E67E22',
  bg: '#F0F2F5', card: '#FFFFFF', border: '#E8ECF0',
  text: '#1A1A2E', muted: '#9CA3AF', secondary: '#6B7280',
};

// ─── Types ───
interface GroupOption {
  group: string;
  dia_chi: string;
  loai: string;
  khoan: number;
}

interface FormState {
  Du_An: string;
  Diem_Nhan: string;
  Diem_Giao: string;
  SDT: string;
  Ngay: string;
  Note: string;
}

interface FieldError {
  Du_An?: string;
  Diem_Nhan?: string;
  Diem_Giao?: string;
  SDT?: string;
  Ngay?: string;
}

// ─── Helpers ───
function getTodayVN(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}
function generateBangkeId(): { display: string; save: string } {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  const suffix = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return { display: `PXK_${suffix}`, save: `BANGKE_${suffix}` };
}
function validatePhone(sdt: string): boolean {
  return /^0[0-9]{9}$/.test(sdt.replace(/\s/g, ''));
}
function isGoogleMapsUrl(str: string): boolean {
  return str.includes('maps.app.goo.gl') || str.includes('google.com/maps') || str.includes('goo.gl/maps');
}
function fmtKhoan(n: number): string {
  return n.toLocaleString('vi-VN') + '₫';
}
function fmtVND(n: number) { return n.toLocaleString('vi-VN'); }

// ── Section label (same component as detail page) ──
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

// ── Field wrapper ──
function Field({ label, children, badge }: { label: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: C.secondary, marginBottom: 4 }}>
        {label}
        {badge}
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
    outline: 'none', boxSizing: 'border-box' as const,
  };
}

// ═══════════════════════════════════════
// CREATE BOOKING PAGE — Dashboard Layout
// ═══════════════════════════════════════
export default function CreateBookingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useERPAuth();

  // ─── Booking ID (generated on mount) ───
  const [bookingIds, setBookingIds] = useState<{ display: string; save: string } | null>(null);
  useEffect(() => { setBookingIds(generateBangkeId()); }, []);

  // ─── Groups (project/customer list) ───
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Form state ───
  const [form, setForm] = useState<FormState>({
    Du_An: '', Diem_Nhan: '', Diem_Giao: '', SDT: '',
    Ngay: getTodayVN(), Note: '',
  });

  // ─── UI states ───
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string; id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch groups on mount
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/tms/groups');
      const json = await res.json();
      if (json.success) setGroups(json.data || []);
    } catch (e) { console.error('Failed to fetch groups:', e); }
    finally { setGroupsLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchGroups(); }, [isAuthenticated, fetchGroups]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [dropdownOpen]);

  // ─── Filtered group options ───
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return groups.filter(g => {
      const name = g.group.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const addr = g.dia_chi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [groups, groupSearch]);

  // ─── Handle group selection ───
  const handleSelectGroup = (g: GroupOption) => {
    setSelectedGroup(g);
    setForm(prev => ({ ...prev, Du_An: g.group, Diem_Nhan: g.dia_chi || '' }));
    setTouched(prev => ({ ...prev, Du_An: true, Diem_Nhan: !!g.dia_chi }));
    setDropdownOpen(false); setGroupSearch('');
  };

  const handleClearGroup = () => {
    setSelectedGroup(null);
    setForm(prev => ({ ...prev, Du_An: '', Diem_Nhan: '' }));
    setTouched(prev => ({ ...prev, Du_An: false }));
  };

  // ─── Validation ───
  const errors = useMemo<FieldError>(() => {
    const errs: FieldError = {};
    if (!form.Du_An.trim()) errs.Du_An = 'Vui lòng chọn khách hàng / dự án';
    if (!form.Diem_Nhan.trim()) errs.Diem_Nhan = 'Điểm lấy hàng là bắt buộc';
    if (!form.Diem_Giao.trim()) errs.Diem_Giao = 'Điểm giao hàng là bắt buộc';
    if (!form.Ngay) errs.Ngay = 'Ngày giao là bắt buộc';
    return errs;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;
  const nvUpdate = user ? `${user.maNV} - ${user.hoTen}` : '';

  // ─── Submit ───
  const handleSubmit = async () => {
    setTouched({ Du_An: true, SDT: true, Diem_Nhan: true, Diem_Giao: true, Ngay: true });
    if (!isValid || !bookingIds) return;

    setSaving(true); setSubmitResult(null);
    try {
      const res = await fetch('/api/tms/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID_CODE: bookingIds.save,
          Du_An: form.Du_An,
          Diem_Nhan: form.Diem_Nhan,
          Diem_Giao: form.Diem_Giao,
          SDT: form.SDT,
          Ngay: form.Ngay,
          Note: form.Note,
          NV_Update: nvUpdate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setSubmitResult({ ok: true, msg: `Tạo Booking ${data.bangkeId} thành công!`, id: data.bangkeId });
        setTimeout(() => router.push('/tms/booking'), 1500);
      } else {
        setSubmitResult({ ok: false, msg: data.error || 'Lỗi lưu dữ liệu' });
      }
    } catch { setSubmitResult({ ok: false, msg: 'Lỗi kết nối — vui lòng thử lại' }); }
    finally { setSaving(false); }
  };

  if (!isAuthenticated) return null;

  const errBorder = (f: keyof FieldError): React.CSSProperties =>
    touched[f] && errors[f] ? { border: '1px solid #FCA5A5', background: '#FEF2F2' } : {};

  const todayFormatted = form.Ngay ? new Date(form.Ngay + 'T00:00:00').toLocaleDateString('vi-VN') : '—';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 40px', background: C.bg, minHeight: '100%' }}>

      {/* ── PAGE HEADER — matches detail page style ── */}
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
              <Plus size={16} color={C.gold} /> Tạo Mới Phiếu Booking
              <span style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                background: '#FFF3E0', color: '#E67E22', padding: '2px 9px', borderRadius: 6,
                border: '1px solid #FBBF24',
              }}>{bookingIds?.display || '...'}</span>
            </h2>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
              NV: {nvUpdate || 'Đang tải...'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !!submitResult?.ok}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 18px', fontSize: 13, fontWeight: 700,
            borderRadius: 8, border: 'none',
            background: saved ? '#16A34A' : saving ? '#94A3B8' : C.primary,
            color: '#fff', cursor: saving || saved ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(30,58,95,0.25)',
          }}
        >
          {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
            saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? 'Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu Booking'}
        </button>
      </div>

      {/* ── Submit result toast ── */}
      {submitResult && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600,
          background: submitResult.ok ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${submitResult.ok ? '#86EFAC' : '#FCA5A5'}`,
          color: submitResult.ok ? '#16A34A' : '#DC2626',
        }}>
          {submitResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {submitResult.msg}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          CARD 1: THÔNG TIN PHIẾU BOOKING
          ═══════════════════════════════════════════════ */}
      <div style={{ background: C.card, borderRadius: 12, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <SectionLabel>Thông tin phiếu Booking</SectionLabel>

        {/* Row 1: Mã ID | Dự Án (searchable dropdown) | Ngày */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 150px', gap: 12, marginBottom: 14 }}>
          {/* Mã ID */}
          <Field label="Mã ID">
            <input value={bookingIds?.save || '...'} readOnly style={inputStyle(true)} />
          </Field>

          {/* Dự Án — Searchable dropdown */}
          <Field label="Dự Án *">
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  ...inputStyle(),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', paddingRight: 8, textAlign: 'left',
                  ...(touched.Du_An && errors.Du_An ? { border: '1px solid #FCA5A5', background: '#FEF2F2' } :
                    selectedGroup ? { border: '1px solid #FBBF24', background: '#FFFBEB' } : {}),
                }}
              >
                {selectedGroup ? (
                  <span style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{selectedGroup.group}</span>
                ) : (
                  <span style={{ color: '#D1D5DB' }}>Chọn khách hàng / dự án...</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 6 }}>
                  {groupsLoading && <RefreshCw size={12} color={C.muted} style={{ animation: 'spin 1s linear infinite' }} />}
                  {selectedGroup && (
                    <span
                      role="button"
                      onClick={e => { e.stopPropagation(); handleClearGroup(); }}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: '#F1F5F9', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                    ><X size={10} color={C.muted} /></span>
                  )}
                  <ChevronDown size={14} color={C.muted} style={{ transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </div>
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0,
                  marginTop: 4, background: '#fff', borderRadius: 10,
                  border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}>
                  {/* Search bar */}
                  <div style={{ padding: 8, borderBottom: `1px solid #F3F4F6`, background: '#FAFAFA' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                      <input
                        ref={searchRef}
                        value={groupSearch}
                        onChange={e => setGroupSearch(e.target.value)}
                        placeholder="Tìm kiếm dự án..."
                        style={{
                          width: '100%', height: 30, paddingLeft: 26, paddingRight: 26,
                          fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6,
                          outline: 'none', background: '#fff', color: C.text,
                        }}
                      />
                      {groupSearch && (
                        <button type="button" onClick={() => setGroupSearch('')}
                          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X size={11} color={C.muted} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Options */}
                  <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {filteredGroups.length === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: C.muted }}>
                        {groupSearch ? 'Không tìm thấy kết quả' : 'Đang tải danh sách...'}
                      </div>
                    ) : filteredGroups.map((g, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectGroup(g)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          borderBottom: '1px solid #F9FAFB',
                          background: selectedGroup?.group === g.group ? '#FFFBEB' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
                        onMouseLeave={e => (e.currentTarget.style.background = selectedGroup?.group === g.group ? '#FFFBEB' : 'transparent')}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{g.group}</p>
                          {g.dia_chi && (
                            <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              <MapPin size={8} color="#16A34A" />
                              {isGoogleMapsUrl(g.dia_chi) ? '📍 Xem bản đồ...' : g.dia_chi}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                          {g.loai && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '1px 5px', borderRadius: 3 }}>{g.loai}</span>
                          )}
                          {g.khoan > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '1px 5px', borderRadius: 3 }}>{fmtKhoan(g.khoan)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Group info badges */}
            {selectedGroup && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' as const }}>
                {selectedGroup.loai && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '2px 7px', borderRadius: 4, border: '1px solid #C7D2FE' }}>
                    <Tag size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{selectedGroup.loai}
                  </span>
                )}
                {selectedGroup.khoan > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 7px', borderRadius: 4, border: '1px solid #BBF7D0' }}>
                    Khoán: {fmtKhoan(selectedGroup.khoan)}
                  </span>
                )}
              </div>
            )}
            {touched.Du_An && errors.Du_An && (
              <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={11} /> {errors.Du_An}
              </p>
            )}
          </Field>

          {/* Ngày */}
          <Field label="Ngày *">
            <input
              type="date"
              value={form.Ngay}
              onChange={e => { setForm(p => ({ ...p, Ngay: e.target.value })); setTouched(p => ({ ...p, Ngay: true })); }}
              style={{ ...inputStyle(), ...errBorder('Ngay') }}
            />
            {touched.Ngay && errors.Ngay && (
              <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{errors.Ngay}</p>
            )}
          </Field>
        </div>

        {/* Row 2: Financial Tiles (all zeros for new booking) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Đơn Giá KH</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' as const }}>0</div>
          </div>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Đơn Giá NCC</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' as const }}>0</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>= Σ Don_Gia (0 chuyến)</div>
          </div>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Lợi Nhuận</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.muted, fontVariantNumeric: 'tabular-nums' as const }}>0</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>= KH − NCC</div>
          </div>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Phát sinh NCC</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, fontVariantNumeric: 'tabular-nums' as const }}>0</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Σ phụ phí NCC</div>
          </div>
        </div>

        {/* Row 3: Điểm Nhận | SĐT | NV Update */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="Điểm Nhận *" badge={
            selectedGroup?.dia_chi && form.Diem_Nhan === selectedGroup.dia_chi ? (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>tự động</span>
            ) : undefined
          }>
            <div style={{ position: 'relative' }}>
              <input
                value={form.Diem_Nhan}
                onChange={e => { setForm(p => ({ ...p, Diem_Nhan: e.target.value })); setTouched(p => ({ ...p, Diem_Nhan: true })); }}
                placeholder="Tự động từ Dự án hoặc nhập tay..."
                style={{ ...inputStyle(), ...errBorder('Diem_Nhan'), paddingRight: 30 }}
              />
              {form.Diem_Nhan && isGoogleMapsUrl(form.Diem_Nhan) && (
                <a href={form.Diem_Nhan} target="_blank" rel="noopener noreferrer"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                  <ExternalLink size={13} color={C.primary} />
                </a>
              )}
            </div>
            {touched.Diem_Nhan && errors.Diem_Nhan && (
              <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                <AlertCircle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{errors.Diem_Nhan}
              </p>
            )}
          </Field>

          <Field label="SĐT Liên hệ">
            <input
              type="tel"
              value={form.SDT}
              onChange={e => { setForm(p => ({ ...p, SDT: e.target.value })); setTouched(p => ({ ...p, SDT: true })); }}
              placeholder="09xx xxx xxx"
              style={inputStyle()}
            />
          </Field>

          <Field label="NV Update">
            <input value={nvUpdate || 'Đang tải...'} readOnly style={inputStyle(true)} />
          </Field>
        </div>

        {/* Row 4: Điểm Giao (full width) */}
        <div style={{ marginBottom: 14 }}>
          <Field label="Điểm Giao *">
            <div style={{ position: 'relative' }}>
              <input
                value={form.Diem_Giao}
                onChange={e => { setForm(p => ({ ...p, Diem_Giao: e.target.value })); setTouched(p => ({ ...p, Diem_Giao: true })); }}
                placeholder="Nhập địa chỉ giao hàng..."
                style={{ ...inputStyle(), ...errBorder('Diem_Giao'), paddingRight: 30 }}
              />
              {form.Diem_Giao && isGoogleMapsUrl(form.Diem_Giao) && (
                <a href={form.Diem_Giao} target="_blank" rel="noopener noreferrer"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                  <ExternalLink size={13} color={C.primary} />
                </a>
              )}
            </div>
            {touched.Diem_Giao && errors.Diem_Giao && (
              <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                <AlertCircle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{errors.Diem_Giao}
              </p>
            )}
          </Field>
        </div>

        {/* Row 5: Ghi Chú (full width) */}
        <Field label="Ghi Chú">
          <textarea
            value={form.Note}
            onChange={e => setForm(p => ({ ...p, Note: e.target.value }))}
            placeholder="Thông tin thêm, yêu cầu xe bửng nâng, cấm tải, giờ giao hàng..."
            style={{
              width: '100%', minHeight: 72, padding: '8px 10px', fontSize: 13,
              border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
              resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const, color: C.text,
            }}
          />
        </Field>
      </div>

      {/* ═══════════════════════════════════════════════
          CARD 2: DANH SÁCH CHUYẾN (Empty state for new booking)
          ═══════════════════════════════════════════════ */}
      <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Card header */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            Danh sách chuyến (0) — <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.secondary }}>{bookingIds?.save || '...'}</span>
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
              disabled={!isValid}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
                fontSize: 12, fontWeight: 700, borderRadius: 7, border: 'none',
                background: isValid ? C.yellow : '#E5E7EB', color: isValid ? C.text : '#9CA3AF',
                cursor: isValid ? 'pointer' : 'not-allowed',
                boxShadow: isValid ? '0 2px 6px rgba(245,197,24,0.4)' : 'none',
                opacity: isValid ? 1 : 0.7,
              }}
            >
              <Plus size={13} /> Thêm Chuyến
            </button>
          </div>
        </div>

        {/* Trip table header */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#FFF8EC' }}>
                {['#', 'ID', 'Biển Số', 'Tài Xế', 'Loại Xe', 'Điểm Nhận → Giao', 'Thu KH', 'Trả NCC', 'PS NCC', 'Lãi/Lỗ', 'NCC', 'Trạng Thái', ''].map(h => (
                  <th key={h} style={{
                    padding: '9px 10px',
                    textAlign: h === 'Thu KH' || h === 'Trả NCC' || h === 'PS NCC' || h === 'Lãi/Lỗ' ? 'right' as const : 'left' as const,
                    fontSize: 10.5, fontWeight: 700, color: '#92400E',
                    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' as const,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Empty state */}
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚚</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
            Chưa có chuyến nào
          </p>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Lưu Booking trước, sau đó nhấn &lsquo;+ Thêm Chuyến&rsquo; để tạo chuyến xe
          </p>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving || !!submitResult?.ok}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 18px', fontSize: 13, fontWeight: 700,
              borderRadius: 8, border: 'none',
              background: isValid ? C.primary : '#E5E7EB',
              color: isValid ? '#fff' : '#9CA3AF',
              cursor: isValid ? 'pointer' : 'not-allowed',
              boxShadow: isValid ? '0 2px 8px rgba(30,58,95,0.25)' : 'none',
            }}
          >
            <Save size={14} /> Lưu Booking ngay
          </button>
        </div>

        {/* Summary footer (0 totals) */}
        <div style={{
          padding: '10px 20px', background: 'linear-gradient(135deg, #FFF8EC, #FFFBF0)',
          borderTop: '2px solid #FDE68A',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.secondary }}>Tổng cộng (0 chuyến)</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>Thu KH: 0</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.red }}>Trả NCC: 0</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>Lãi: 0</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
