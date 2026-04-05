'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth, parseRoles, getFirstAccessiblePath } from '@/lib/auth';

const MODULES = [
  { name: 'TMS', color: '#22c55e' },
  { name: 'Task', color: '#3b82f6' },
  { name: 'HRM', color: '#a855f7' },
  { name: 'Finance', color: '#f59e0b' },
];

export default function LoginPage() {
  const [maNV, setMaNV] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, login } = useERPAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ─── Admin backdoor (matches production) ───
      if (maNV.toLowerCase() === 'admin' && password === 'admin@123') {
        const adminUser = {
          maNV: 'ADMIN', hoTen: 'System Admin',
          gioiTinh: 'Nam', chucDanh: 'Quản trị viên Hệ thống',
          boPhan: 'IT', phongBan: 'IT', chiNhanh: 'HCM', buuCuc: 'Trụ sở',
          email: 'admin@ntl.com.vn', dienThoai: '', avatar: '',
          trangThai: 'Hoạt động', phanQuyen: 'Admin', roles: ['Admin'] as string[],
        };
        login(adminUser);
        router.push(getFirstAccessiblePath(adminUser));
        return;
      }

      // ─── Employee auth — fetch from server-side proxy ───
      const res = await fetch('/api/auth/employees');
      const json = await res.json();

      if ((!json.success && json.status !== 'success') || !json.data || json.data.length === 0) {
        setError('Không thể kết nối hệ thống HRIS');
        setLoading(false);
        return;
      }

      const employees = json.data;

      // Fuzzy key finder for Vietnamese-encoded keys
      const findKey = (obj: any, ...patterns: string[]) => {
        for (const key of Object.keys(obj)) {
          const kl = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const p of patterns) {
            if (kl.includes(p.toLowerCase().replace(/[^a-z0-9]/g, ''))) return key;
          }
        }
        return null;
      };

      // Find employee by Mã NV (column B)
      const match = employees.find((emp: any) => {
        const maNVKey = findKey(emp, 'MaNV', 'Ma_NV', 'M_NV', 'Mã_NV', 'maNV');
        if (!maNVKey) return false;
        return String(emp[maNVKey] || '').trim().toLowerCase() === maNV.trim().toLowerCase();
      });

      if (!match) {
        setError('⚠️ Mã NV không tồn tại trong hệ thống');
        setLoading(false);
        return;
      }

      // ─── Check employee status (not resigned) ───
      const trangThaiKey = findKey(match, 'trangThai', 'Trang_Thai', 'TrngThi');
      const status = trangThaiKey ? (match[trangThaiKey] || '').toLowerCase() : '';
      if (status.includes('nghỉ') || status.includes('nghi') || status === 'resigned') {
        setError('⚠️ Tài khoản đã nghỉ việc. Liên hệ Admin.');
        setLoading(false);
        return;
      }

      // ─── Password validation (column L "Pass") ───
      const passKey = findKey(match, 'Pass', 'Password', 'Mat_Khau');
      const maNVKey = findKey(match, 'MaNV', 'Ma_NV', 'M_NV', 'Mã_NV', 'maNV') || 'maNV';
      const storedPass = passKey ? (match[passKey] || '').trim() : (String(match[maNVKey] || '') + '@');
      if (password && password !== storedPass) {
        setError('⚠️ Sai mật khẩu');
        setLoading(false);
        return;
      }

      // ─── Build user object & login ───
      const getVal = (obj: any, ...patterns: string[]) => {
        const k = findKey(obj, ...patterns);
        return k ? String(obj[k] || '').trim() : '';
      };

      const phanQuyen = getVal(match, 'PhanQuyen', 'Phan_Quyen', 'quyền') || 'staft';
      const user = {
        maNV: getVal(match, 'MaNV', 'Ma_NV', 'M_NV', 'Mã_NV'),
        hoTen: getVal(match, 'HoTen', 'Ho_Ten', 'Ten_NV', 'Họ_Tên', 'Tên NV'),
        gioiTinh: getVal(match, 'GioiTinh', 'Gioi_Tinh', 'Giới'),
        chucDanh: getVal(match, 'ChucDanh', 'Chuc_Danh', 'Chức'),
        boPhan: getVal(match, 'BoPhan', 'Bo_Phan', 'Bộ phận'),
        phongBan: getVal(match, 'PhongBan', 'Phong_Ban', 'Phòng'),
        chiNhanh: getVal(match, 'ChiNhanh', 'Chi_Nhanh'),
        buuCuc: getVal(match, 'BuuCuc', 'Buu_Cuc', 'Bưu cục'),
        email: getVal(match, 'email', 'Email'),
        dienThoai: getVal(match, 'DienThoai', 'Dien_Thoai', 'Phone'),
        avatar: getVal(match, 'avatar', 'Avatar'),
        trangThai: getVal(match, 'TrangThai', 'Trang_Thai'),
        phanQuyen,
        roles: parseRoles(phanQuyen),
      };
      login(user);
      router.push(getFirstAccessiblePath(user));
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối. Vui lòng thử lại.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 40%, #132a4a 100%)' }}>

      {/* ─── LEFT PANEL: Branding ─── */}
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1b2e 0%, #142641 50%, #0d1b2e 100%)' }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: '#FFD100', filter: 'blur(120px)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: '#1D354D', filter: 'blur(100px)' }} />
        <div className="absolute bottom-20 right-10 w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: '#FFD100', filter: 'blur(80px)' }} />

        {/* Logo Icon */}
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: '#FFD100', boxShadow: '0 12px 40px rgba(255, 209, 0, 0.3)' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="3" fill="#0d1b2e" />
              <path d="M7 10h4v8H7z" fill="#FFD100" />
              <path d="M13 6h4v12h-4z" fill="#FFD100" />
              <rect x="6" y="4" width="6" height="4" rx="1" fill="#FFD100" opacity="0.6" />
            </svg>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            ERP<span style={{ color: '#FFD100' }}>.</span>NTL
          </h1>
          <p className="text-slate-400 text-base mb-1">Hệ thống Quản trị Tổng hợp</p>
          <p className="text-slate-500 text-sm">Team Dự Án HCM - Nhất Tín Logistics</p>

          {/* Module Pills */}
          <div className="flex gap-3 mt-8">
            {MODULES.map((m, i) => (
              <span key={m.name}
                className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border animate-fade-in"
                style={{
                  color: m.color,
                  borderColor: m.color + '60',
                  background: m.color + '15',
                  animationDelay: `${0.1 + i * 0.08}s`,
                }}
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Login Form ─── */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(circle at 30% 20%, rgba(29, 53, 77, 0.4), transparent 60%)' }} />

        <div className="w-full max-w-md relative z-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {/* Mobile branding (hidden on desktop) */}
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{ background: '#FFD100', boxShadow: '0 8px 32px rgba(255, 209, 0, 0.3)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="3" fill="#0d1b2e" />
                <path d="M7 10h4v8H7z" fill="#FFD100" />
                <path d="M13 6h4v12h-4z" fill="#FFD100" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white">
              ERP<span style={{ color: '#FFD100' }}>.</span>NTL
            </h1>
            <p className="text-slate-400 text-sm mt-1">Hệ thống Quản trị Tổng hợp</p>
            <div className="flex gap-2 justify-center mt-4">
              {MODULES.map(m => (
                <span key={m.name} className="px-3 py-1 rounded-full text-[10px] font-bold border"
                  style={{ color: m.color, borderColor: m.color + '50', background: m.color + '10' }}
                >
                  {m.name}
                </span>
              ))}
            </div>
          </div>

          {/* Form Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255, 209, 0, 0.15)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Đăng nhập</h2>
          </div>
          <p className="text-slate-400 text-sm mb-8 ml-11">
            Nhập Mã Nhân Viên và Mật khẩu để truy cập hệ thống
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* MSNV Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                Mã Nhân Viên (MSNV)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="msnv-input"
                  type="text"
                  value={maNV}
                  onChange={e => setMaNV(e.target.value)}
                  placeholder="VD: 500TNE4"
                  className="w-full h-13 pl-12 pr-4 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                  }}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full h-13 pl-12 pr-12 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl animate-fade-in"
                style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-button"
              type="submit"
              disabled={loading || !maNV}
              className="w-full h-13 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#FFD100',
                color: '#0d1b2e',
                boxShadow: '0 4px 20px rgba(255, 209, 0, 0.3)',
              }}
              onMouseEnter={e => {
                if (!loading && maNV) {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(255, 209, 0, 0.4)';
                }
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(255, 209, 0, 0.3)';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xác thực...
                </span>
              ) : 'Đăng nhập vào ERP'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-8">
            ERP Make By <span className="text-slate-400">Uri Logistics</span>
          </p>
        </div>
      </div>
    </div>
  );
}
