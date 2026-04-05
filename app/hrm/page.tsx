'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useERPAuth } from '@/lib/auth';
import {
  Users, Search, RefreshCw, Download, Eye, X, UserCircle,
  Phone, Mail, Building2, MapPin, Shield, ChevronLeft, ChevronRight,
  Filter, CheckCircle2, XCircle, AlertCircle, Briefcase,
} from 'lucide-react';

interface Employee {
  avatar: string;
  maNV: string;
  hoTen: string;
  msnvHoTen: string;
  gioiTinh: string;
  chucDanh: string;
  duAn: string;
  boPhan: string;
  phongBan: string;
  chiNhanh: string;
  buuCuc: string;
  trangThai: string;
  dienThoai: string;
  email: string;
  phanQuyen: string;
  kyLuong: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'Đang làm việc': { label: 'Đang làm việc', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 size={12} /> },
  'Active': { label: 'Đang làm việc', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 size={12} /> },
  'Nghỉ việc': { label: 'Nghỉ việc', color: '#DC2626', bg: '#FEF2F2', icon: <XCircle size={12} /> },
  'Inactive': { label: 'Nghỉ việc', color: '#DC2626', bg: '#FEF2F2', icon: <XCircle size={12} /> },
  'Thử việc': { label: 'Thử việc', color: '#D97706', bg: '#FFFBEB', icon: <AlertCircle size={12} /> },
  'Trial': { label: 'Thử việc', color: '#D97706', bg: '#FFFBEB', icon: <AlertCircle size={12} /> },
};

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

const COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#7C2D12', '#4338CA', '#0F766E', '#9333EA',
  '#C2410C', '#1D4ED8', '#15803D', '#A16207', '#BE185D',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').slice(-2).map(w => w[0] || '').join('').toUpperCase();
}

function normalizeDriveUrl(url: string): string {
  if (!url || !url.startsWith('http')) return '';
  if (url.includes('/thumbnail?')) return url;
  const ucMatch = url.match(/drive\.google\.com\/uc\?[^"]*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w200`;
  return url;
}

export default function HRMPage() {
  const { user, isAuthenticated } = useERPAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [duAnFilter, setDuAnFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hris?sheet=Ngan_Hang', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setEmployees(json.data);
        setLastSync(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setError(json.error || 'Không thể tải dữ liệu nhân sự');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchEmployees();
  }, [isAuthenticated, fetchEmployees]);

  // Unique values for filters
  const uniqueDuAn = useMemo(() => {
    const set = new Set(employees.map(e => e.duAn).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !emp.hoTen.toLowerCase().includes(q) &&
          !emp.maNV.toLowerCase().includes(q) &&
          !(emp.chucDanh || '').toLowerCase().includes(q) &&
          !(emp.duAn || '').toLowerCase().includes(q) &&
          !(emp.email || '').includes(q) &&
          !(emp.dienThoai || '').includes(q)
        ) return false;
      }
      if (duAnFilter !== 'all' && emp.duAn !== duAnFilter) return false;
      return true;
    });
  }, [employees, search, duAnFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const hasStatus = employees.some(e => e.trangThai);
    const active = hasStatus
      ? employees.filter(e => e.trangThai === 'Đang làm việc' || e.trangThai === 'Active').length
      : total;
    const inactive = employees.filter(e => e.trangThai === 'Nghỉ việc' || e.trangThai === 'Inactive').length;
    const duAnCount = new Set(employees.map(e => e.duAn).filter(Boolean)).size;
    const depts = new Set(employees.map(e => e.boPhan || e.phongBan).filter(Boolean)).size;
    return { total, active, inactive, duAnCount, depts };
  }, [employees]);

  const activeFilterCount = [duAnFilter !== 'all'].filter(Boolean).length;

  const clearFilters = () => {
    setDuAnFilter('all');
    setSearch('');
    setPage(1);
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = filteredEmployees.map(emp => ({
        'Mã NV': emp.maNV,
        'Họ Tên': emp.hoTen,
        'Chức Danh': emp.chucDanh,
        'Dự Án': emp.duAn,
        'Bộ Phận': emp.boPhan,
        'Phòng Ban': emp.phongBan,
        'Chi Nhánh': emp.chiNhanh,
        'Trạng Thái': emp.trangThai,
        'Điện Thoại': emp.dienThoai,
        'Email': emp.email,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Nhân Sự');
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String((row as Record<string, string>)[key] || '').length))
      }));
      ws['!cols'] = colWidths;
      XLSX.writeFile(wb, `NhanSu_NTL_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch { alert('Lỗi khi xuất Excel'); }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-violet-500" size={24} /> Quản Lý Nhân Sự
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} nhân viên
            {lastSync && <> • <span className="text-emerald-600">Google Sheets • {lastSync}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchEmployees} disabled={isLoading}
            className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isLoading ? 'Đang tải...' : 'Sync'}</span>
          </button>
          <button onClick={handleExportExcel} disabled={filteredEmployees.length === 0}
            className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50">
            <Download size={14} />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng nhân viên', value: stats.total, color: '#7C3AED', bg: '#F5F3FF', icon: <Users size={18} /> },
          { label: 'Đang làm việc', value: stats.active, color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 size={18} /> },
          { label: 'Nghỉ việc', value: stats.inactive, color: '#DC2626', bg: '#FEF2F2', icon: <XCircle size={18} /> },
          { label: 'Dự án', value: stats.duAnCount, color: '#2563EB', bg: '#EFF6FF', icon: <Briefcase size={18} /> },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card rounded-2xl p-4 border-l-4 border-l-red-400 bg-red-50/50 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Không thể kết nối Google Sheets</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-auto"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></span>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên, mã NV, chức danh, dự án..."
              className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFilterOpen(!filterOpen)}
              className={`h-10 px-4 flex items-center gap-2 text-sm font-medium border rounded-xl transition-all active:scale-95 ${filterOpen || activeFilterCount > 0
                ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={14} />
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="h-10 px-3 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">Xóa lọc</button>
            )}
          </div>
        </div>

        {filterOpen && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-slate-100/80 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 sm:pt-4">
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Dự án</label>
                <select value={duAnFilter} onChange={e => { setDuAnFilter(e.target.value); setPage(1); }}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer">
                  <option value="all">Tất cả dự án</option>
                  {uniqueDuAn.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Đang tải dữ liệu nhân sự...</p>
          <p className="text-xs text-slate-400 mt-1">Kết nối tới Google Sheets</p>
        </div>
      )}

      {/* Employee Table */}
      {!isLoading && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full">
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã NV</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Chức danh</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dự án</th>
                  {employees.some(e => e.boPhan || e.phongBan) && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bộ phận</th>
                  )}
                  {employees.some(e => e.trangThai) && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  )}
                  {employees.some(e => e.dienThoai || e.email) && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                  )}
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Xem</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="text-slate-400">
                        <UserCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium">Không tìm thấy nhân viên nào</p>
                        <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp, idx) => {
                    const avatarUrl = normalizeDriveUrl(emp.avatar);
                    const color = getColor(emp.hoTen);
                    const statusInfo = STATUS_MAP[emp.trangThai] || (emp.trangThai ? { label: emp.trangThai, color: '#64748B', bg: '#F8FAFC', icon: null } : null);
                    const hasBoPhan = employees.some(e => e.boPhan || e.phongBan);
                    const hasTrangThai = employees.some(e => e.trangThai);
                    const hasContact = employees.some(e => e.dienThoai || e.email);

                    return (
                      <tr key={emp.maNV + '-' + idx}
                        className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${idx * 15}ms` }}
                        onClick={() => setSelectedEmployee(emp)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white overflow-hidden" style={{ background: avatarUrl ? '#e2e8f0' : color }}>
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = getInitials(emp.hoTen); }} />
                              ) : getInitials(emp.hoTen)}
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-800">{emp.hoTen}</span>
                              {emp.gioiTinh && <p className="text-[11px] text-slate-400">{emp.gioiTinh}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{emp.maNV}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 line-clamp-2 max-w-[220px]">{emp.chucDanh || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {emp.duAn ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                              <Briefcase size={11} /> {emp.duAn}
                            </span>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        {hasBoPhan && (
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{emp.boPhan || emp.phongBan || '—'}</span>
                          </td>
                        )}
                        {hasTrangThai && (
                          <td className="px-4 py-3">
                            {statusInfo ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                                style={{ color: statusInfo.color, background: statusInfo.bg, borderColor: statusInfo.color + '25' }}>
                                {statusInfo.icon}{statusInfo.label}
                              </span>
                            ) : <span className="text-slate-400 text-sm">—</span>}
                          </td>
                        )}
                        {hasContact && (
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {emp.dienThoai && <div className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} /> {emp.dienThoai}</div>}
                              {emp.email && <div className="flex items-center gap-1 text-xs text-slate-500 max-w-[160px] truncate"><Mail size={11} className="flex-shrink-0" /> {emp.email}</div>}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors mx-auto" title="Xem chi tiết">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages >= 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-4 py-3 border-t border-slate-100/80">
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <p className="text-xs sm:text-sm text-slate-500">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredEmployees.length)} / {filteredEmployees.length}
                  {filteredEmployees.length < employees.length && <span className="text-violet-500 ml-1">(đã lọc từ {employees.length})</span>}
                </p>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 cursor-pointer">
                  {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}/trang</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 ${page === p ? 'text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                      style={page === p ? { background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' } : {}}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-scale-up">
            {/* Modal Header */}
            <div className="relative p-6 pb-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
              <button onClick={() => setSelectedEmployee(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors">
                <X size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white overflow-hidden shadow-lg" style={{ background: normalizeDriveUrl(selectedEmployee.avatar) ? '#e2e8f0' : getColor(selectedEmployee.hoTen) }}>
                  {normalizeDriveUrl(selectedEmployee.avatar) ? (
                    <img src={normalizeDriveUrl(selectedEmployee.avatar)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : getInitials(selectedEmployee.hoTen)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedEmployee.hoTen}</h2>
                  <p className="text-sm text-slate-500">{selectedEmployee.chucDanh || 'Nhân viên'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded">{selectedEmployee.maNV}</span>
                    {selectedEmployee.duAn && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">
                        <Briefcase size={10} /> {selectedEmployee.duAn}
                      </span>
                    )}
                    {selectedEmployee.trangThai && (() => {
                      const st = STATUS_MAP[selectedEmployee.trangThai] || { label: selectedEmployee.trangThai, color: '#64748B', bg: '#F8FAFC', icon: null };
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.icon}{st.label}</span>;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Giới tính', value: selectedEmployee.gioiTinh, icon: <UserCircle size={14} /> },
                { label: 'Dự án', value: selectedEmployee.duAn, icon: <Briefcase size={14} /> },
                { label: 'Bộ phận', value: selectedEmployee.boPhan, icon: <Building2 size={14} /> },
                { label: 'Phòng ban', value: selectedEmployee.phongBan, icon: <Building2 size={14} /> },
                { label: 'Chi nhánh', value: selectedEmployee.chiNhanh, icon: <MapPin size={14} /> },
                { label: 'Bưu cục', value: selectedEmployee.buuCuc, icon: <MapPin size={14} /> },
                { label: 'Phân quyền', value: selectedEmployee.phanQuyen, icon: <Shield size={14} /> },
                { label: 'Kỳ lương', value: selectedEmployee.kyLuong, icon: <Briefcase size={14} /> },
                { label: 'Điện thoại', value: selectedEmployee.dienThoai, icon: <Phone size={14} /> },
                { label: 'Email', value: selectedEmployee.email, icon: <Mail size={14} /> },
              ].filter(f => f.value).map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    {f.icon}
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{f.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 break-words">{f.value}</p>
                </div>
              ))}
              {/* If no detail fields have values */}
              {![selectedEmployee.gioiTinh, selectedEmployee.duAn, selectedEmployee.boPhan, selectedEmployee.phongBan, selectedEmployee.chiNhanh, selectedEmployee.dienThoai, selectedEmployee.email].some(Boolean) && (
                <div className="col-span-2 text-center py-4 text-slate-400 text-sm">
                  Chưa có thông tin chi tiết. Dữ liệu sẽ được cập nhật từ Google Sheets.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
