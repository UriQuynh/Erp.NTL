'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useERPAuth, canAccessPath, getFirstAccessiblePath } from '@/lib/auth';
import { ShieldAlert } from 'lucide-react';

const PUBLIC_PATHS = ['/login'];
const SKIP_PERMISSION_PATHS = ['/login', '/task/settings', '/task/settings/email', '/hrm/training'];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useERPAuth();
  const [hydrated, setHydrated] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (PUBLIC_PATHS.includes(pathname)) {
      setForbidden(false);
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check permission
    if (SKIP_PERMISSION_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      setForbidden(false);
      return;
    }

    if (canAccessPath(user, pathname)) {
      setForbidden(false);
    } else {
      // CTV/staft at root → redirect to task/orders
      if (pathname === '/') {
        const roles = user?.roles || [];
        if (roles.some(r => ['CTV', 'staft'].includes(r))) {
          router.replace('/task/orders');
          return;
        }
        // Try first accessible path
        const firstPath = getFirstAccessiblePath(user);
        if (firstPath !== '/') {
          router.replace(firstPath);
          return;
        }
      }
      setForbidden(true);
    }
  }, [hydrated, isAuthenticated, pathname, user, router]);

  if (!hydrated) return null;

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
        <div className="spinner spinner-lg" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1D354D', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  // 403 Forbidden page (matches production)
  if (forbidden) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-current-width, 72px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
            <div style={{ textAlign: 'center', maxWidth: 460 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, margin: '0 auto 1.5rem', background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FECACA' }}>
                <ShieldAlert size={40} color="#DC2626" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                Không có quyền truy cập
              </h2>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Tài khoản <strong>{user?.hoTen}</strong> ({user?.roles?.join(', ') || 'Nhân viên'}) không có quyền truy cập trang này. Vui lòng liên hệ Admin để được cấp quyền.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {pathname !== '/' && (
                  <button onClick={() => router.push('/')} style={{ padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none', background: 'var(--c-navy, #1D354D)', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                    ← Về Dashboard
                  </button>
                )}
                <button onClick={() => { localStorage.removeItem('erp_auth'); localStorage.removeItem('task_auth'); localStorage.removeItem('crm_auth'); window.location.href = '/login'; }} style={{ padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                  🚪 Đăng xuất
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '1.5rem' }}>
                Module: <code style={{ padding: '2px 6px', background: '#F1F5F9', borderRadius: 4, fontSize: '0.6875rem' }}>{pathname}</code>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300 p-4 sm:p-6 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-current-width, 72px)' }}
      >
        {children}
      </main>
    </div>
  );
}
