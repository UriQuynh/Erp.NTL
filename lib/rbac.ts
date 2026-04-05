/**
 * RBAC — Role-Based Access Control Module
 * ─────────────────────────────────────────
 * Logic phân quyền dựa trên dữ liệu Phan_Quyen từ bảng Danh_Sach_NV.
 *
 * Roles: Admin | Host | HRM | Điều Phối | Nhân viên (default)
 */

// ─── Types ────────────────────────────────────────────────────

export interface AuthUser {
    maNV: string;
    hoTen: string;
    gioiTinh?: string;
    chucDanh?: string;
    boPhan?: string;
    phongBan?: string;
    chiNhanh?: string;
    buuCuc?: string;
    phanQuyen?: string;       // raw comma-separated roles
    roles?: string[];         // parsed array of roles
    avatar?: string;
    email?: string;
    dienThoai?: string;
}

export interface TaskRow {
    ID_Date_Task: string;
    Ngay_Lam_Viec: string;
    Nhan_Vien: string;        // "MaNV - HoTen"
    Group_CV: string;
    Cong_Viec: string;
    Chi_Tiet: string;
    Dia_Chi: string;
    Time_YeuCau: string;
    Time_in: string;
    Time_Out: string;
    Local_in: string;
    Local_out: string;
    HA_IN: string;
    HA_OUT: string;
    Phi: string;
    Phi_Khac: string;
    Confirm_Task: string;
    Cham_Cong: string;
    Nguoi_Tao: string;
    Tinh_Trang_TT: string;
}

export interface EmployeeRow {
    avatar: string;
    maNV: string;
    hoTen: string;
    gioiTinh: string;
    chucDanh: string;
    boPhan: string;
    phongBan: string;
    chiNhanh: string;
    buuCuc: string;
    ngaySinh: string;
    dienThoai: string;
    email: string;
    phanQuyen: string;
    trangThai: string;
    [key: string]: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Parse Phan_Quyen string into array of role names */
export function parseRoles(phanQuyen?: string): string[] {
    if (!phanQuyen) return [];
    return phanQuyen.split(',').map(r => r.trim()).filter(Boolean);
}

/** Check if user has a specific role */
export function hasRole(user: AuthUser, role: string): boolean {
    const roles = user.roles || parseRoles(user.phanQuyen);
    return roles.some(r => r.toLowerCase() === role.toLowerCase());
}

/** Check if user is Admin or Host (full access) */
export function isAdminOrHost(user: AuthUser): boolean {
    return hasRole(user, 'Admin') || hasRole(user, 'Host');
}

/** Check if user is Điều Phối (dispatcher) */
export function isDieuPhoi(user: AuthUser): boolean {
    return hasRole(user, 'Điều Phối');
}

/** Check if user is HRM */
export function isHRM(user: AuthUser): boolean {
    return hasRole(user, 'HRM');
}

/** Extract MaNV from "MaNV - HoTen" format */
export function extractMaNVFromTask(nhanVien: string): string {
    if (!nhanVien) return '';
    const match = nhanVien.match(/^(\S+)\s*-/);
    return match ? match[1] : '';
}

/** Extract MaNV from Nguoi_Tao field (similar format) */
export function extractMaNVFromCreator(nguoiTao: string): string {
    if (!nguoiTao) return '';
    const match = nguoiTao.match(/^(\S+)\s*-/);
    return match ? match[1] : nguoiTao.trim();
}

// ─── RBAC: Filter Tasks ──────────────────────────────────────

/**
 * Filter tasks based on user's roles.
 *
 * Rules:
 *  - Admin / Host       → See ALL tasks
 *  - Nguoi_Tao          → See tasks they created (Nguoi_Tao contains their MaNV)
 *  - Điều Phối          → See tasks of employees in the same Bưu Cục
 *  - Default (Employee) → See only tasks assigned to themselves
 *
 * A user can have MULTIPLE roles → union of all permitted tasks.
 */
export function filterTasksByRole(
    tasks: TaskRow[],
    user: AuthUser,
    allEmployees?: EmployeeRow[]
): TaskRow[] {
    // Admin / Host: full access
    if (isAdminOrHost(user)) {
        return tasks;
    }

    const userMaNV = user.maNV?.trim().toUpperCase() || '';

    // Collect employee codes sharing the same Bưu Cục (for Điều Phối)
    let sameBuuCucCodes: Set<string> | null = null;
    if (isDieuPhoi(user) && allEmployees && user.buuCuc) {
        sameBuuCucCodes = new Set(
            allEmployees
                .filter(e => e.buuCuc === user.buuCuc && e.trangThai === 'Đang Làm Việc')
                .map(e => e.maNV.trim().toUpperCase())
        );
    }

    return tasks.filter(task => {
        const taskMaNV = extractMaNVFromTask(task.Nhan_Vien).toUpperCase();
        const creatorMaNV = extractMaNVFromCreator(task.Nguoi_Tao).toUpperCase();

        // 1. Assigned to this employee
        if (taskMaNV === userMaNV) return true;

        // 2. Created by this employee (Nguoi_Tao role)
        if (creatorMaNV === userMaNV) return true;

        // 3. Điều Phối: task assigned to someone in same Bưu Cục
        if (sameBuuCucCodes && sameBuuCucCodes.has(taskMaNV)) return true;

        return false;
    });
}

// ─── RBAC: Filter Employees ──────────────────────────────────

/**
 * Filter employee list based on user's roles.
 *
 * Rules:
 *  - Admin / Host       → See ALL employees
 *  - HRM                → See ALL employees (HR management)
 *  - Điều Phối          → See employees in the same Bưu Cục
 *  - Default (Employee) → See only their own profile
 */
export function filterEmployeesByRole(
    employees: EmployeeRow[],
    user: AuthUser
): EmployeeRow[] {
    // Admin / Host / HRM: full access
    if (isAdminOrHost(user) || isHRM(user)) {
        return employees;
    }

    const userMaNV = user.maNV?.trim().toUpperCase() || '';

    // Điều Phối: same Bưu Cục
    if (isDieuPhoi(user) && user.buuCuc) {
        return employees.filter(emp => {
            // Always include self
            if (emp.maNV.trim().toUpperCase() === userMaNV) return true;
            // Same Bưu Cục
            if (emp.buuCuc === user.buuCuc) return true;
            return false;
        });
    }

    // Default: self only
    return employees.filter(emp => emp.maNV.trim().toUpperCase() === userMaNV);
}

// ─── Permission Checkers ─────────────────────────────────────

/** Can user manage employees (add/edit/delete)? */
export function canManageEmployees(user: AuthUser): boolean {
    return isAdminOrHost(user) || isHRM(user);
}

/** Can user assign permissions (phân quyền)? */
export function canAssignPermissions(user: AuthUser): boolean {
    return isAdminOrHost(user);
}

/** Can user create tasks? */
export function canCreateTask(user: AuthUser): boolean {
    // Any logged-in user with at least HRM, Admin, Host, or Điều Phối role
    return isAdminOrHost(user) || isHRM(user) || isDieuPhoi(user);
}

/** Can user perform check-in/check-out on a task? */
export function canCheckinTask(user: AuthUser, task: TaskRow): boolean {
    // Admin/Host/Điều Phối can check-in/out any task
    if (isAdminOrHost(user) || isDieuPhoi(user)) return true;
    // Assigned employee can check in/out their own task
    const taskMaNV = extractMaNVFromTask(task.Nhan_Vien).toUpperCase();
    const userMaNV = user.maNV?.trim().toUpperCase() || '';
    return taskMaNV === userMaNV;
}

/** Can user confirm a task? */
export function canConfirmTask(user: AuthUser, task: TaskRow): boolean {
    // Admin/Host can confirm any task
    if (isAdminOrHost(user)) return true;
    // Assigned employee can confirm their own task
    const taskMaNV = extractMaNVFromTask(task.Nhan_Vien).toUpperCase();
    return taskMaNV === (user.maNV?.trim().toUpperCase() || '');
}

// ─── Auth Helper ─────────────────────────────────────────────

/** Get current auth user from localStorage (client-side only) */
export function getAuthUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('crm_auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed.loggedIn) return null;
        return {
            maNV: parsed.maNV || '',
            hoTen: parsed.user || parsed.hoTen || '',
            gioiTinh: parsed.gioiTinh || '',
            chucDanh: parsed.chucDanh || '',
            boPhan: parsed.boPhan || '',
            phongBan: parsed.phongBan || '',
            chiNhanh: parsed.chiNhanh || '',
            buuCuc: parsed.buuCuc || '',
            phanQuyen: parsed.phanQuyen || '',
            roles: parsed.roles || parseRoles(parsed.phanQuyen),
            avatar: parsed.avatar || '',
            email: parsed.email || '',
            dienThoai: parsed.dienThoai || '',
        };
    } catch {
        return null;
    }
}
