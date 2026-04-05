import { create } from 'zustand';

// ─── Types ───
export interface TaskUser {
    maNV: string;
    hoTen: string;
    gioiTinh: string;
    chucDanh: string;
    boPhan: string;
    phongBan: string;
    chiNhanh: string;
    buuCuc: string;
    email: string;
    dienThoai: string;
    avatar: string;
    trangThai: string;
    phanQuyen: string;
    roles: string[];
    password?: string;
}

export function parseRoles(phanQuyen?: string): string[] {
    if (!phanQuyen) return ['staft'];
    const roles = phanQuyen.split(',').map(r => r.trim()).filter(Boolean);
    return roles.length > 0 ? roles : ['staft'];
}

export function hasRole(user: TaskUser | null, role: string): boolean {
    if (!user) return false;
    return user.roles.some(r => r.toLowerCase() === role.toLowerCase());
}

// ─── Module Access Control (matches production) ───
const MODULE_ROLE_MAP: Record<string, string[]> = {
    'dashboard': ['Admin', 'host', 'Host', 'admin', 'manager', 'Manager', 'AQ', 'aq'],
    'tms': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS', 'manager', 'Manager', 'AQ', 'aq'],
    'tms-booking': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS', 'AQ', 'aq'],
    'tms-route': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS', 'AQ', 'aq'],
    'tms-billing': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS', 'AQ', 'aq'],
    'tms-pricing': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS'],
    'tms-fleet': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS', 'AQ', 'aq'],
    'tms-bill-do': ['Admin', 'host', 'Host', 'admin', 'tms', 'TMS', 'AQ', 'aq'],
    'tms-zalo': ['Admin', 'host', 'Host', 'admin'],
    'tms-telegram': ['Admin', 'host', 'Host', 'admin'],
    'hrm': ['Admin', 'host', 'Host', 'admin', 'hrm', 'HRM', 'manager', 'Manager'],
    'kpi': ['Admin', 'host', 'Host', 'admin', 'hrm', 'HRM', 'manager', 'Manager'],
    'hrm-training': ['Admin', 'host', 'Host', 'admin', 'hrm', 'HRM'],
    'task': ['Admin', 'host', 'Host', 'admin', 'task', 'Task', 'staft', 'CTV', 'manager', 'Manager', 'AQ', 'aq'],
    'task-projects': ['Admin', 'host', 'Host', 'admin', 'task', 'Task', 'manager', 'Manager', 'AQ', 'aq'],
    'task-payment': ['Admin', 'host', 'Host', 'admin', 'manager', 'Manager', 'AQ', 'aq'],
    'workflow': ['Admin', 'host', 'Host', 'admin', 'manager', 'Manager'],
    'finance': ['Admin', 'host', 'Host', 'admin', 'finance', 'Finance'],
    'documents': ['Admin', 'host', 'Host', 'admin', 'manager', 'Manager'],
    'settings': ['Admin', 'host', 'Host', 'admin'],
    'permissions': ['Admin', 'host', 'Host', 'admin'],
};

export function canAccessModule(user: TaskUser | null, moduleId: string): boolean {
    if (!user) return false;
    // Admin always has access
    if (user.roles.some(r => ['Admin', 'admin', 'host', 'Host'].includes(r))) return true;
    const allowed = MODULE_ROLE_MAP[moduleId];
    if (!allowed) return true; // Unknown module = public
    return user.roles.some(r => allowed.includes(r));
}

const PATH_MODULE_MAP: Record<string, string> = {
    '/': 'dashboard',
    '/tms': 'tms',
    '/tms/booking': 'tms-booking',
    '/tms/route': 'tms-route',
    '/tms/billing': 'tms-billing',
    '/tms/pricing': 'tms-pricing',
    '/tms/fleet': 'tms-fleet',
    '/tms/bill-do': 'tms-bill-do',
    '/tms/print-labels': 'tms',
    '/tms/zalo': 'tms-zalo',
    '/tms/telegram': 'tms-telegram',
    '/hrm': 'hrm',
    '/kpi': 'kpi',
    '/hrm/training': 'hrm-training',
    '/tasks': 'task-projects',
    '/task/orders': 'task',
    '/task/my-tasks': 'task',
    '/task/work-calendar': 'task',
    '/workflow': 'workflow',
    '/payment': 'task-payment',
    '/payroll': 'finance',
    '/documents': 'documents',
    '/finance': 'finance',
    '/permissions': 'permissions',
    '/permissions/active-users': 'permissions',
    '/task/settings': 'settings',
    '/task/settings/email': 'settings',
};

// Skip permission check for these paths (matches production)
const SKIP_PERMISSION_PATHS = ['/login', '/task/settings', '/task/settings/email', '/hrm/training'];

export function canAccessPath(user: TaskUser | null, path: string): boolean {
    if (!user) return false;
    if (SKIP_PERMISSION_PATHS.some(p => path === p || path.startsWith(p + '/'))) return true;
    // Find best matching module  
    let moduleId = PATH_MODULE_MAP[path];
    if (!moduleId) {
        // Try prefix match
        const sorted = Object.keys(PATH_MODULE_MAP).sort((a, b) => b.length - a.length);
        for (const p of sorted) {
            if (path.startsWith(p + '/') || path === p) {
                moduleId = PATH_MODULE_MAP[p];
                break;
            }
        }
    }
    if (!moduleId) return true;
    return canAccessModule(user, moduleId);
}

export function getFirstAccessiblePath(user: TaskUser | null): string {
    if (!user) return '/login';
    // CTV/staft go directly to task/orders
    if (user.roles.some(r => ['CTV', 'staft'].includes(r)) && !user.roles.some(r => ['Admin', 'admin', 'host', 'Host'].includes(r))) {
        return '/task/orders';
    }
    // Try dashboard first
    if (canAccessModule(user, 'dashboard')) return '/';
    // Then task
    if (canAccessModule(user, 'task')) return '/task/orders';
    // Then tms
    if (canAccessModule(user, 'tms')) return '/tms';
    return '/task/orders';
}

// ─── Auth Store (matches production: useERPAuth) ───
interface AuthState {
    user: TaskUser | null;
    isAuthenticated: boolean;
    login: (user: TaskUser) => void;
    logout: () => void;
    canAccess: (moduleId: string) => boolean;
    canAccessPath: (path: string) => boolean;
}

function loadUser(): TaskUser | null {
    if (typeof window === 'undefined') return null;
    try {
        // Production uses erp_auth
        const erp = localStorage.getItem('erp_auth');
        if (erp) {
            const d = JSON.parse(erp);
            if (d.maNV) return d;
        }
        // Backward compat
        const task = localStorage.getItem('task_auth');
        if (task) return JSON.parse(task);
        const crm = localStorage.getItem('crm_auth');
        if (crm) {
            const d = JSON.parse(crm);
            if (d.loggedIn) return {
                maNV: d.maNV || '', hoTen: d.hoTen || d.user || '',
                gioiTinh: d.gioiTinh || '', chucDanh: d.chucDanh || '',
                boPhan: d.boPhan || '', phongBan: d.phongBan || '',
                chiNhanh: d.chiNhanh || '', buuCuc: d.buuCuc || '',
                email: d.email || '', dienThoai: d.dienThoai || '',
                avatar: d.avatar || '', trangThai: '', phanQuyen: d.phanQuyen || '',
                roles: d.roles || parseRoles(d.phanQuyen),
            };
        }
        return null;
    } catch { return null; }
}

// Export as useERPAuth to match production naming
export const useERPAuth = create<AuthState>((set, get) => ({
    user: loadUser(),
    isAuthenticated: (() => {
        if (typeof window === 'undefined') return false;
        return !!(localStorage.getItem('erp_auth') || localStorage.getItem('task_auth') || localStorage.getItem('crm_auth'));
    })(),

    login: (user) => {
        // Production stores as erp_auth
        localStorage.setItem('erp_auth', JSON.stringify(user));
        // Also sync backward compat keys
        localStorage.setItem('task_auth', JSON.stringify(user));
        localStorage.setItem('crm_auth', JSON.stringify({
            loggedIn: true, maNV: user.maNV, user: user.hoTen, hoTen: user.hoTen,
            gioiTinh: user.gioiTinh, chucDanh: user.chucDanh, boPhan: user.boPhan,
            phongBan: user.phongBan, chiNhanh: user.chiNhanh, buuCuc: user.buuCuc,
            phanQuyen: user.phanQuyen, roles: user.roles, avatar: user.avatar,
            email: user.email, dienThoai: user.dienThoai,
        }));
        set({ user, isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem('erp_auth');
        localStorage.removeItem('task_auth');
        localStorage.removeItem('crm_auth');
        set({ user: null, isAuthenticated: false });
    },

    canAccess: (moduleId: string) => {
        return canAccessModule(get().user, moduleId);
    },

    canAccessPath: (path: string) => {
        return canAccessPath(get().user, path);
    },
}));

// Legacy alias for existing code
export const useAuth = useERPAuth;
