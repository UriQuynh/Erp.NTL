'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, ClipboardList, CheckSquare, Calendar,
  LogOut, Menu, X, ChevronLeft, ChevronRight,
  Truck, Package, Users, FolderKanban, UserCircle,
  DollarSign, Target, Zap, Wallet, Calculator,
  ScanText, Settings, ShieldCheck, Send, Mail,
  FileText, Building2, MapIcon,
} from 'lucide-react';
import { useERPAuth, canAccessModule } from '@/lib/auth';

function normalizeDriveUrl(url: string): string {
  if (!url || !url.startsWith('http')) return url;
  if (url.includes('/thumbnail?')) return url;
  const ucMatch = url.match(/drive\.google\.com\/uc\?[^"]*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w200`;
  return url;
}

// ─── Car icon (not in lucide default) ───
function CarFront(props: { size?: number }) {
  return (
    <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" />
      <path d="M7 14h.01" /><path d="M17 14h.01" />
      <rect width="18" height="8" x="3" y="10" rx="2" />
      <path d="M5 18v2" /><path d="M19 18v2" />
    </svg>
  );
}

// ─── MessageCircle (for Zalo) ───
function MessageCircle(props: { size?: number }) {
  return (
    <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </svg>
  );
}

// ─── GraduationCap (for Training) ───
function GraduationCap(props: { size?: number }) {
  return (
    <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

// ─── Receipt icon ───
function Receipt(props: { size?: number }) {
  return (
    <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17V7" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
      <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
    </svg>
  );
}

interface NavChild { name: string; path: string; icon: React.ReactNode; moduleId: string; }
interface NavSection { label: string; icon: React.ReactNode; path?: string; moduleId: string; children?: NavChild[]; }

// ─── Sidebar Navigation (matching production exactly) ───
const SIDEBAR_NAV: NavSection[] = [
  { label: 'Bảng điều khiển', icon: <LayoutDashboard size={20} />, path: '/', moduleId: 'dashboard' },

  { label: 'TMS', icon: <Truck size={20} />, moduleId: 'tms', children: [
    { name: 'Điều phối & CI/CO', path: '/tms/booking', icon: <Truck size={18} />, moduleId: 'tms-booking' },
    { name: 'Tuyến đường', path: '/tms/route', icon: <MapIcon size={18} />, moduleId: 'tms-route' },
  ]},

  { label: 'Vận hành', icon: <Package size={20} />, moduleId: 'tms', children: [
    { name: 'Trung tâm Đơn hàng', path: '/tms', icon: <Package size={18} />, moduleId: 'tms' },
    { name: 'Cước phí', path: '/tms/billing', icon: <Receipt size={18} />, moduleId: 'tms-billing' },
    { name: 'Bảng giá', path: '/tms/pricing', icon: <Calculator size={18} />, moduleId: 'tms-pricing' },
    { name: 'Danh sách xe', path: '/tms/fleet', icon: <CarFront size={18} />, moduleId: 'tms-fleet' },
    { name: 'Tạo Bill DO', path: '/tms/bill-do', icon: <FileText size={18} />, moduleId: 'tms-bill-do' },
    { name: 'In Tem Kiện', path: '/tms/print-labels', icon: <Receipt size={18} />, moduleId: 'tms' },
  ]},

  { label: 'Nhân sự (HRM)', icon: <Users size={20} />, moduleId: 'hrm', children: [
    { name: 'Quản Lý Nhân Sự', path: '/hrm', icon: <UserCircle size={18} />, moduleId: 'hrm' },
    { name: 'KPI & Năng suất', path: '/kpi', icon: <Target size={18} />, moduleId: 'kpi' },
    { name: 'Đào tạo', path: '/hrm/training', icon: <GraduationCap size={18} />, moduleId: 'hrm-training' },
  ]},

  { label: 'Quản lý dự án', icon: <FolderKanban size={20} />, moduleId: 'task', children: [
    { name: '📋 Task Manager', path: '/tasks', icon: <ClipboardList size={18} />, moduleId: 'task-projects' },
    { name: 'Giao việc', path: '/task/orders', icon: <ClipboardList size={18} />, moduleId: 'task' },
    { name: 'Nhiệm vụ của tôi', path: '/task/my-tasks', icon: <CheckSquare size={18} />, moduleId: 'task' },
    { name: 'Lịch Công tác', path: '/task/work-calendar', icon: <Calendar size={18} />, moduleId: 'task' },
  ]},

  { label: 'Workflow', icon: <Zap size={20} />, path: '/workflow', moduleId: 'workflow' },
  { label: 'Thanh Toán Chi Phí', icon: <Wallet size={20} />, path: '/payment', moduleId: 'task-payment' },
  { label: 'Lương Năng Suất', icon: <Calculator size={20} />, path: '/payroll', moduleId: 'finance' },
  { label: 'Quản lý Chứng từ', icon: <ScanText size={20} />, path: '/documents', moduleId: 'documents' },
  { label: 'Tài chính', icon: <DollarSign size={20} />, path: '/finance', moduleId: 'finance' },

  { label: 'Cấu hình', icon: <Settings size={20} />, moduleId: 'settings', children: [
    { name: 'Phân quyền', path: '/permissions', icon: <ShieldCheck size={18} />, moduleId: 'permissions' },
    { name: 'Người dùng Online', path: '/permissions/active-users', icon: <Users size={18} />, moduleId: 'permissions' },
    { name: 'Thông báo Zalo', path: '/tms/zalo', icon: <MessageCircle size={18} />, moduleId: 'tms-zalo' },
    { name: 'Thông báo Telegram', path: '/tms/telegram', icon: <Send size={18} />, moduleId: 'tms-telegram' },
    { name: 'Email', path: '/task/settings/email', icon: <Mail size={18} />, moduleId: 'settings' },
    { name: 'Cài đặt', path: '/task/settings', icon: <Settings size={18} />, moduleId: 'settings' },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, canAccess } = useERPAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const hoverTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Auto-open section containing active child
  useEffect(() => {
    const auto: Record<string, boolean> = {};
    SIDEBAR_NAV.forEach(section => {
      if (section.children?.some(c => pathname === c.path || pathname?.startsWith(c.path + '/'))) {
        auto[section.label] = true;
      }
    });
    setOpenSections(prev => ({ ...prev, ...auto }));
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-current-width', collapsed ? '72px' : '260px');
  }, [collapsed]);

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      if (next) setOpenSections({});
      return next;
    });
  }, []);

  const isActive = useCallback((path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname?.startsWith(path + '/');
  }, [pathname]);

  const handleLogout = () => { logout(); router.push('/login'); };

  // Filter nav by permissions
  const filteredNav = SIDEBAR_NAV.filter(section => {
    if (!section.moduleId || canAccess(section.moduleId)) {
      if (section.children) {
        const visibleChildren = section.children.filter(c => canAccess(c.moduleId));
        return visibleChildren.length > 0;
      }
      return true;
    }
    return false;
  });

  const userName = user?.hoTen || 'Người dùng';
  const userInitials = userName.split(' ').slice(-2).map((w: string) => w[0] || '').join('').toUpperCase();
  const userRole = user?.chucDanh || 'Nhân viên';

  const toggleSection = (label: string) => {
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => setOpenSections(prev => ({ ...prev, [label]: true })), 100);
      return;
    }
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-md border border-slate-200 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
      >
        <Menu size={20} className="text-slate-600" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
        style={{
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Close (mobile) */}
        <button
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        >
          <X size={18} />
        </button>

        {/* Logo + Toggle */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFD100', boxShadow: '0 4px 12px rgba(255, 209, 0, 0.25)' }}>
            <Building2 size={18} strokeWidth={2.5} color="#0A1D37" />
          </div>
          {!collapsed && (
            <span className="text-base font-extrabold tracking-tight whitespace-nowrap" style={{ color: '#0A1D37' }}>
              ERP<span style={{ color: '#FFD100' }}>.</span>NTL
            </span>
          )}
          <button
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors hidden md:flex"
            onClick={toggleCollapse}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {filteredNav.map(section => {
            const isLeaf = !section.children;
            const sectionOpen = !!openSections[section.label] && !collapsed;
            const hasActiveChild = section.children?.some(c => isActive(c.path));
            const leafActive = isLeaf && section.path && isActive(section.path);
            const visibleChildren = section.children?.filter(c => canAccess(c.moduleId)) || [];

            return (
              <div
                key={section.label}
                className="mb-0.5"
                onMouseEnter={() => {
                  if (hoverTimers.current[section.label]) {
                    clearTimeout(hoverTimers.current[section.label]);
                    delete hoverTimers.current[section.label];
                  }
                }}
                onMouseLeave={() => {
                  if (!section.children?.some(c => isActive(c.path))) {
                    hoverTimers.current[section.label] = setTimeout(() => {
                      setOpenSections(prev => ({ ...prev, [section.label]: false }));
                    }, 400);
                  }
                }}
              >
                {/* Section header */}
                {isLeaf ? (
                  <Link
                    href={section.path!}
                    className={`flex items-center gap-3 h-10 rounded-lg transition-all duration-200 group
                      ${collapsed ? 'justify-center px-0' : 'px-3'}
                      ${leafActive
                        ? 'bg-[#0A1D37] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                    title={collapsed ? section.label : undefined}
                  >
                    <span className={`flex-shrink-0 ${collapsed ? '' : ''}`}>{section.icon}</span>
                    {!collapsed && <span className="text-sm font-medium truncate">{section.label}</span>}
                  </Link>
                ) : (
                  <button
                    className={`w-full flex items-center gap-3 h-10 rounded-lg transition-all duration-200
                      ${collapsed ? 'justify-center px-0' : 'px-3'}
                      ${hasActiveChild
                        ? 'text-[#0A1D37] font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                    onClick={() => toggleSection(section.label)}
                    type="button"
                    title={collapsed ? section.label : undefined}
                  >
                    <span className="flex-shrink-0">{section.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium truncate flex-1 text-left">{section.label}</span>
                        <ChevronRight
                          size={14}
                          className={`transition-transform duration-200 text-slate-400 ${sectionOpen ? 'rotate-90' : ''}`}
                        />
                      </>
                    )}
                  </button>
                )}

                {/* Children */}
                {!isLeaf && (
                  <div
                    className="overflow-hidden transition-all duration-200"
                    style={{ maxHeight: sectionOpen ? `${visibleChildren.length * 40}px` : '0' }}
                  >
                    {visibleChildren.map(child => (
                      <Link
                        key={child.path}
                        href={child.path}
                        className={`flex items-center gap-2.5 h-9 rounded-lg transition-all duration-150 text-sm
                          ${collapsed ? 'justify-center px-0' : 'pl-9 pr-3'}
                          ${isActive(child.path)
                            ? 'bg-[#0A1D37]/8 text-[#0A1D37] font-semibold'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }
                        `}
                        title={child.name}
                      >
                        <span className="flex-shrink-0 opacity-70">{child.icon}</span>
                        {!collapsed && <span className="truncate">{child.name}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User + Logout */}
        <div className="border-t border-slate-200 p-3 flex-shrink-0">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              title="Click để đổi avatar"
            >
              {user?.avatar && user.avatar.startsWith('http') ? (
                <img src={normalizeDriveUrl(user.avatar)} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
              ) : userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-[11px] text-slate-400 truncate">{userRole}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 w-full h-9 rounded-lg flex items-center gap-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-sm font-medium
              ${collapsed ? 'justify-center' : 'px-3'}
            `}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
