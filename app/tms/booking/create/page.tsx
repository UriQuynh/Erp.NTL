'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import {
  Plus, ArrowLeft, Save, Package, Phone, MapPin, Calendar, FileText,
  Search, X, ChevronDown, CheckCircle2, AlertCircle, ExternalLink,
  RefreshCw, Tag, Info
} from 'lucide-react';

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
  // GMT+7
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

export default function CreateBookingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useERPAuth();

  // ─── Booking ID (generated on mount) ───
  const [bookingIds, setBookingIds] = useState<{ display: string; save: string } | null>(null);
  useEffect(() => {
    setBookingIds(generateBangkeId());
  }, []);

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
    Du_An: '',
    Diem_Nhan: '',
    Diem_Giao: '',
    SDT: '',
    Ngay: getTodayVN(),
    Note: '',
  });

  // ─── UI states ───
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string; id?: string } | null>(null);

  // Fetch groups on mount
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/tms/groups');
      const json = await res.json();
      if (json.success) setGroups(json.data || []);
    } catch (e) {
      console.error('Failed to fetch groups:', e);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchGroups();
  }, [isAuthenticated, fetchGroups]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  // ─── Filtered group options ───
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase().trim();
    return groups.filter(g =>
      g.group.toLowerCase().includes(q) ||
      g.dia_chi.toLowerCase().includes(q)
    );
  }, [groups, groupSearch]);

  // ─── Handle group selection ───
  const handleSelectGroup = (g: GroupOption) => {
    setSelectedGroup(g);
    setForm(prev => ({
      ...prev,
      Du_An: g.group,
      Diem_Nhan: g.dia_chi || '', // Auto-fill from GroupCV
    }));
    setTouched(prev => ({ ...prev, Du_An: true, Diem_Nhan: !!g.dia_chi }));
    setDropdownOpen(false);
    setGroupSearch('');
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
    if (!form.SDT.trim()) errs.SDT = 'Số điện thoại là bắt buộc';
    else if (!validatePhone(form.SDT)) errs.SDT = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0';
    if (!form.Diem_Nhan.trim()) errs.Diem_Nhan = 'Điểm lấy hàng là bắt buộc';
    if (!form.Diem_Giao.trim()) errs.Diem_Giao = 'Điểm giao hàng là bắt buộc';
    if (!form.Ngay) errs.Ngay = 'Ngày giao là bắt buộc';
    else {
      const diff = (new Date(form.Ngay).getTime() - Date.now()) / 86400000;
      if (diff < -30) errs.Ngay = 'Ngày không được quá 30 ngày trong quá khứ';
    }
    return errs;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;
  const nvUpdate = user ? `${user.maNV} - ${user.hoTen}` : '';

  // ─── Submit ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Touch all fields
    setTouched({ Du_An: true, SDT: true, Diem_Nhan: true, Diem_Giao: true, Ngay: true });
    if (!isValid || !bookingIds) return;

    setSubmitting(true);
    setSubmitResult(null);

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
        setSubmitResult({ ok: true, msg: `✅ Tạo Booking ${data.bangkeId} thành công!`, id: data.bangkeId });
        // Navigate to booking list after 1.5s
        setTimeout(() => {
          router.push('/tms/booking');
        }, 1500);
      } else {
        setSubmitResult({ ok: false, msg: `❌ ${data.error || 'Lỗi lưu dữ liệu — vui lòng thử lại'}` });
      }
    } catch {
      setSubmitResult({ ok: false, msg: '❌ Lỗi kết nối — vui lòng thử lại' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  // ─── Field class helper ───
  const fieldClass = (field: keyof FieldError, extra = '') =>
    `w-full px-3.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 transition-all outline-none ${
      touched[field] && errors[field]
        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
        : 'border-slate-200 focus:border-amber-400 focus:ring-amber-400/20'
    } ${extra}`;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-20">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/tms/booking')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Plus className="text-amber-500" size={22} /> Tạo Booking Mới
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mã phiếu:{' '}
            <span className="font-bold text-amber-600 font-mono">
              {bookingIds?.display || '—'}
            </span>
            {nvUpdate && <span className="ml-2 text-slate-400">• NV: {nvUpdate}</span>}
          </p>
        </div>
      </div>

      {/* ── Submit Result Toast ── */}
      {submitResult && (
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold border animate-fade-in ${
          submitResult.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {submitResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {submitResult.msg}
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── CARD 1: Thông tin cơ bản ── */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={13} className="text-amber-500" /> Thông tin Booking
            </h2>
          </div>
          <div className="p-5 space-y-5">

            {/* Tên KH / Dự án — Searchable dropdown */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <Package size={13} className="text-amber-400" />
                Khách hàng / Dự án <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(v => !v)}
                  className={`w-full h-11 px-3.5 flex items-center justify-between border rounded-xl text-sm transition-all outline-none ${
                    touched.Du_An && errors.Du_An
                      ? 'border-red-400 bg-red-50'
                      : selectedGroup
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  {selectedGroup ? (
                    <span className="font-semibold text-slate-800 truncate">{selectedGroup.group}</span>
                  ) : (
                    <span className="text-slate-400">Chọn khách hàng / dự án...</span>
                  )}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {groupsLoading && <RefreshCw size={13} className="text-slate-400 animate-spin" />}
                    {selectedGroup && (
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); handleClearGroup(); }}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X size={11} />
                      </span>
                    )}
                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={searchRef}
                          value={groupSearch}
                          onChange={e => setGroupSearch(e.target.value)}
                          placeholder="Tìm kiếm dự án..."
                          className="w-full h-8 pl-7 pr-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-400 text-slate-700 placeholder-slate-400"
                        />
                        {groupSearch && (
                          <button type="button" onClick={() => setGroupSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Options */}
                    <div className="max-h-64 overflow-y-auto">
                      {filteredGroups.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">
                          {groupSearch ? 'Không tìm thấy kết quả' : 'Đang tải danh sách...'}
                        </div>
                      ) : filteredGroups.map((g, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectGroup(g)}
                          className={`w-full px-4 py-2.5 text-left flex items-start gap-2.5 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0 ${
                            selectedGroup?.group === g.group ? 'bg-amber-50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{g.group}</p>
                            {g.dia_chi && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                                <MapPin size={9} className="flex-shrink-0 text-emerald-400" />
                                {isGoogleMapsUrl(g.dia_chi) ? '📍 Xem bản đồ...' : g.dia_chi}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {g.loai && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {g.loai}
                              </span>
                            )}
                            {g.khoan > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {fmtKhoan(g.khoan)}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Selected group info badges */}
              {selectedGroup && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {selectedGroup.loai && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100">
                      <Tag size={10} /> {selectedGroup.loai}
                    </span>
                  )}
                  {selectedGroup.khoan > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100">
                      Khoán: {fmtKhoan(selectedGroup.khoan)}
                    </span>
                  )}
                </div>
              )}
              {touched.Du_An && errors.Du_An && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.Du_An}
                </p>
              )}
            </div>

            {/* Ngày giao + SĐT row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ngày giao */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <Calendar size={13} className="text-slate-400" />
                  Ngày giao (dự kiến) <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  value={form.Ngay}
                  onChange={e => { setForm(p => ({ ...p, Ngay: e.target.value })); setTouched(p => ({ ...p, Ngay: true })); }}
                  onBlur={() => setTouched(p => ({ ...p, Ngay: true }))}
                  className={fieldClass('Ngay', 'h-11 block')}
                />
                {touched.Ngay && errors.Ngay && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle size={12} /> {errors.Ngay}</p>
                )}
              </div>

              {/* SĐT */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <Phone size={13} className="text-slate-400" />
                  Số điện thoại <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="09xx xxx xxx"
                  value={form.SDT}
                  onChange={e => { setForm(p => ({ ...p, SDT: e.target.value })); setTouched(p => ({ ...p, SDT: true })); }}
                  onBlur={() => setTouched(p => ({ ...p, SDT: true }))}
                  className={fieldClass('SDT', 'h-11')}
                />
                {touched.SDT && errors.SDT && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle size={12} /> {errors.SDT}</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── CARD 2: Địa điểm ── */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-500" /> Địa điểm vận chuyển
            </h2>
          </div>
          <div className="p-5 space-y-4">

            {/* Điểm lấy hàng */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <MapPin size={13} className="text-emerald-500" />
                Điểm lấy hàng <span className="text-red-500 ml-0.5">*</span>
                {selectedGroup?.dia_chi && form.Diem_Nhan === selectedGroup.dia_chi && (
                  <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                    Auto-fill
                  </span>
                )}
              </label>
              <textarea
                rows={2}
                placeholder="Địa chỉ nhà kho lấy hàng..."
                value={form.Diem_Nhan}
                onChange={e => { setForm(p => ({ ...p, Diem_Nhan: e.target.value })); setTouched(p => ({ ...p, Diem_Nhan: true })); }}
                onBlur={() => setTouched(p => ({ ...p, Diem_Nhan: true }))}
                className={`${fieldClass('Diem_Nhan')} py-2.5 resize-none`}
              />
              {/* Google Maps link if URL */}
              {form.Diem_Nhan && isGoogleMapsUrl(form.Diem_Nhan) && (
                <a href={form.Diem_Nhan} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium">
                  <ExternalLink size={11} /> 📍 Xem bản đồ
                </a>
              )}
              {touched.Diem_Nhan && !form.Diem_Nhan.trim() && selectedGroup && !selectedGroup.dia_chi && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Chưa có địa chỉ mặc định — vui lòng nhập tay
                </p>
              )}
              {touched.Diem_Nhan && errors.Diem_Nhan && form.Diem_Nhan.trim() === '' && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle size={12} /> {errors.Diem_Nhan}</p>
              )}
            </div>

            {/* Visual connector */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 border-t border-dashed border-slate-200" />
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
              <div className="h-px flex-1 border-t border-dashed border-slate-200" />
            </div>

            {/* Điểm giao hàng */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <MapPin size={13} className="text-rose-500" />
                Điểm giao hàng <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Nhập địa chỉ điểm giao..."
                value={form.Diem_Giao}
                onChange={e => { setForm(p => ({ ...p, Diem_Giao: e.target.value })); setTouched(p => ({ ...p, Diem_Giao: true })); }}
                onBlur={() => setTouched(p => ({ ...p, Diem_Giao: true }))}
                className={`${fieldClass('Diem_Giao')} py-2.5 resize-none`}
              />
              {touched.Diem_Giao && errors.Diem_Giao && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle size={12} /> {errors.Diem_Giao}</p>
              )}
            </div>

          </div>
        </div>

        {/* ── CARD 3: Ghi chú ── */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-slate-400" /> Ghi chú thêm
            </h2>
          </div>
          <div className="p-5">
            <textarea
              rows={3}
              placeholder="Thông tin thêm, yêu cầu xe bửng nâng, cấm tải, giờ giao hàng..."
              value={form.Note}
              onChange={e => setForm(p => ({ ...p, Note: e.target.value }))}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Info size={11} /> SĐT sẽ được tự động đính kèm vào ghi chú khi lưu
            </p>
          </div>
        </div>

        {/* ── Summary preview ── */}
        {isValid && (
          <div className="glass-card rounded-2xl p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-100 animate-fade-in">
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Xem trước trước khi lưu
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Mã phiếu', value: bookingIds?.display },
                { label: 'Đối tác', value: form.Du_An },
                { label: 'Ngày giao', value: form.Ngay ? new Date(form.Ngay).toLocaleDateString('vi-VN') : '—' },
                { label: 'SĐT', value: form.SDT },
                { label: 'Điểm lấy', value: form.Diem_Nhan.substring(0, 50) + (form.Diem_Nhan.length > 50 ? '…' : '') },
                { label: 'Điểm giao', value: form.Diem_Giao.substring(0, 50) + (form.Diem_Giao.length > 50 ? '…' : '') },
                { label: 'NV phụ trách', value: nvUpdate || 'N/A' },
                { label: 'Trạng thái', value: 'Chưa Có Xe (mặc định)' },
              ].map((f, i) => (
                <div key={i} className="bg-white/70 rounded-lg p-2">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{f.label}</p>
                  <p className="text-slate-700 font-semibold mt-0.5 truncate">{f.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push('/tms/booking')}
            className="h-10 px-5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting || !!submitResult?.ok}
            className={`h-10 px-8 text-sm font-bold flex items-center gap-2 rounded-xl transition-all shadow-md active:scale-95 ${
              submitting || !!submitResult?.ok
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : !isValid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'text-white hover:shadow-lg'
            }`}
            style={!submitting && !submitResult?.ok && isValid ? { background: 'linear-gradient(135deg, #D97706, #B45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.25)' } : undefined}
          >
            {submitting ? (
              <><RefreshCw size={15} className="animate-spin" /> Đang lưu...</>
            ) : submitResult?.ok ? (
              <><CheckCircle2 size={15} /> Đã lưu!</>
            ) : (
              <><Save size={15} /> Lưu Booking</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
