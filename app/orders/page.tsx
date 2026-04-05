'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Order,
    formatCurrency,
    getStatusLabel,
    getStatusColor,
} from '@/lib/mock-data';
import { getAuthUser, filterTasksByRole, canCreateTask, isAdminOrHost, isDieuPhoi, type AuthUser, type TaskRow } from '@/lib/rbac';
import TaskDetail from '@/components/tasks/TaskDetail';
import { useERPAuth } from '@/lib/auth';

// --- Icons ---
const IconPlus = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const IconSearch = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const IconFilter = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
);
const IconEdit = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);
const IconTrash = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
const IconX = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconChevLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const IconChevRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const IconDownload = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const IconEye = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconRefresh = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const IconCloud = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>
);

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const emptyOrder: Omit<Order, 'id'> = {
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    employeeCode: '',
    employeeName: '',
    groupCV: '',
    taskDetail: '',
    address: '',
    timeYeuCau: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'pending',
    amount: 0,
    confirmTask: 'Chờ xác nhận',
    createdBy: 'Admin User',
};

type ModalMode = 'create' | 'edit' | 'view' | null;
type DataSource = 'google_sheets' | 'mock';

// Helper: get today in yyyy-MM-dd
const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper: normalize d/M/yyyy (Google Sheets VN) or M/d/yyyy (US) or yyyy-MM-dd to yyyy-MM-dd for comparison
const normalizeDate = (d: string): string => {
    if (!d) return '';
    // Already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    // Split by / — could be d/M/yyyy (VN) or M/d/yyyy (US)
    const parts = d.split('/');
    if (parts.length >= 3) {
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        const y = parts[2];
        // Detect US format M/d/yyyy: if p0 > 12 → must be day (VN dd/MM/yyyy)
        // if p1 > 12 → must be day (US M/d/yyyy) 
        let day: number, month: number;
        if (p0 > 12) {
            // p0 is day → VN format dd/MM/yyyy
            day = p0; month = p1;
        } else if (p1 > 12) {
            // p1 is day → US format M/d/yyyy
            day = p1; month = p0;
        } else {
            // Ambiguous (both ≤12) — assume VN dd/MM/yyyy for this locale
            day = p0; month = p1;
        }
        return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return d;
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [search, setSearch] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('active');
    const [dateFrom, setDateFrom] = useState(getTodayStr());
    const [dateTo, setDateTo] = useState(getTodayStr());
    const [groupFilter, setGroupFilter] = useState<string>('all');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Data source state
    const [dataSource, setDataSource] = useState<DataSource>('google_sheets');
    const [isLoading, setIsLoading] = useState(false);
    const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
    const [lastFetched, setLastFetched] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    // Progressive loading state
    const [loadStage, setLoadStage] = useState<'init' | '3d' | '7d' | '30d' | 'full'>('init');
    const [fullDataRequested, setFullDataRequested] = useState(false);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [formData, setFormData] = useState<Omit<Order, 'id'>>(emptyOrder);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [authUser, setAuthUser] = useState<{ user: string; maNV: string; phanQuyen?: string; roles?: string[] }>({ user: '', maNV: '' });

    // RBAC state
    const [rbacUser, setRbacUser] = useState<AuthUser | null>(null);
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskRow | null>(null);
    const [rawTaskData, setRawTaskData] = useState<TaskRow[]>([]);
    const [qrCodeMap, setQrCodeMap] = useState<Record<string, { qrCode: string; tinhTrangTT: string }>>({});

    // Bulk complete state
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Pending task notification popup
    const [pendingTaskPopup, setPendingTaskPopup] = useState<TaskRow | null>(null);
    const [confirmingPopupTask, setConfirmingPopupTask] = useState(false);

    // Employee dropdown state
    const [employeeList, setEmployeeList] = useState<{ value: string; label: string; chucDanh: string }[]>([]);
    const [empSearch, setEmpSearch] = useState('');
    const [empDropOpen, setEmpDropOpen] = useState(false);

    // GroupCV search dropdown state
    const [groupCVSearch, setGroupCVSearch] = useState('');
    const [groupDropOpen, setGroupDropOpen] = useState(false);

    // GroupCV lookup data
    const [groupCVData, setGroupCVData] = useState<{ GROUP: string; Dia_Chi: string; Loai_Khai_Thac: string; Khoan: string }[]>([]);

    // TaskDetail (Công việc) dropdown state
    const [taskDetailSearch, setTaskDetailSearch] = useState('');
    const [taskDetailDropOpen, setTaskDetailDropOpen] = useState(false);

    // Address (Địa chỉ) dropdown state
    const [addressSearch, setAddressSearch] = useState('');
    const [addressDropOpen, setAddressDropOpen] = useState(false);

    // Sync ERP auth → crm_auth for backward compat
    const { user: erpUser } = useERPAuth();
    useEffect(() => {
        if (erpUser && typeof window !== 'undefined') {
            try {
                const crmData = { loggedIn: true, maNV: erpUser.maNV, hoTen: erpUser.hoTen, user: erpUser.maNV, phanQuyen: erpUser.phanQuyen || erpUser.roles?.join(', ') || '' };
                localStorage.setItem('crm_auth', JSON.stringify(crmData));
                setAuthUser(crmData);
            } catch { }
        } else {
            try { const d = localStorage.getItem('crm_auth'); if (d) setAuthUser(JSON.parse(d)); } catch { }
        }
        setRbacUser(getAuthUser());
    }, [erpUser]);

    useEffect(() => {        // Fetch employee list for dropdown
        fetch('/api/hris?sheet=Danh_Sach_NV')
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) {
                    const list = json.data
                        .filter((e: { trangThai: string; chucDanh: string; maNV: string; hoTen: string }) => {
                            // Exclude resigned employees
                            const status = (e.trangThai || '').trim().toLowerCase();
                            const isInactive = status.includes('nghỉ') || status.includes('nghi') || status === 'inactive' || status === 'resigned';
                            if (isInactive) return false;
                            // Exclude "Cộng tác viên" (CTV)
                            const title = (e.chucDanh || '').trim().toLowerCase();
                            const isCTV = title.includes('cộng tác viên') || title.includes('cong tac vien') || title === 'ctv';
                            if (isCTV) return false;
                            return e.maNV && e.hoTen;
                        })
                        .map((e: { maNV: string; hoTen: string; msnvHoTen?: string; chucDanh?: string }) => ({
                            value: e.msnvHoTen || `${e.maNV}- ${e.hoTen}`,
                            label: e.msnvHoTen || `${e.maNV}- ${e.hoTen}`,
                            chucDanh: e.chucDanh || '',
                        }));
                    setEmployeeList(list);
                }
            })
            .catch(() => { });

        // Fetch GroupCV data for lookup
        fetch('/api/sheets?sheet=GroupCV')
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) {
                    setGroupCVData(json.data);
                }
            })
            .catch(() => { });
    }, []);

    // Check privileges — initialized false, set on mount to avoid SSR hydration mismatch
    const [hasPrivilege, setHasPrivilege] = useState(false);
    useEffect(() => {
        // Read directly from localStorage on mount (most reliable, avoids zustand timing)
        try {
            const raw = localStorage.getItem('crm_auth');
            if (raw) {
                const parsed = JSON.parse(raw);
                const pq = (parsed.phanQuyen || '').toLowerCase();
                if (pq.includes('admin') || pq.includes('host') || pq.includes('điều phối') || pq.includes('quản lý')) {
                    setHasPrivilege(true);
                    return;
                }
            }
        } catch (err) { console.error('[PRIVILEGE DEBUG] Error:', err); }
        // Fallback: check rbacUser and erpUser
        if (rbacUser && (isAdminOrHost(rbacUser) || isDieuPhoi(rbacUser))) { setHasPrivilege(true); return; }
        if (erpUser) {
            const roleStr = (erpUser.phanQuyen || erpUser.roles?.join(',') || '').toLowerCase();
            if (roleStr.includes('admin') || roleStr.includes('host') || roleStr.includes('điều phối') || roleStr.includes('quản lý')) { setHasPrivilege(true); return; }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch from Google Sheets (silent = background refresh, no loading spinner)
    const fetchFromGoogleSheets = useCallback(async (silent = false, days?: number) => {
        if (!silent) setIsLoading(true);
        else setIsBackgroundRefresh(true);
        setFetchError(null);
        try {
            const url = days ? `/api/orders?days=${days}` : '/api/orders';
            const res = await fetch(url);
            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to fetch data');
            }

            // Transform API data to Order format
            interface ApiOrder {
                id: string;
                date: string;
                employeeCode: string;
                employeeName: string;
                groupCV: string;
                taskDetail: string;
                subDetail: string;
                address: string;
                timeRequired: string;
                timeIn: string;
                timeOut: string;
                localIn: string;
                localOut: string;
                imageIn: string;
                imageOut: string;
                fee: number;
                feeOther: number;
                confirmTask: string;
                chamCong: string;
                createdBy: string;
                status: Order['status'];
                qrCode: string;
                tinhTrangTT: string;
            }

            // Build QR code lookup map
            const qrMap: Record<string, { qrCode: string; tinhTrangTT: string }> = {};
            json.data.forEach((item: ApiOrder) => {
                if (item.id && item.qrCode) {
                    qrMap[item.id] = { qrCode: item.qrCode, tinhTrangTT: item.tinhTrangTT || '' };
                }
            });
            setQrCodeMap(qrMap);

            // Store raw task data for TaskDetail component
            const rawTasks: TaskRow[] = json.data.map((item: ApiOrder) => ({
                ID_Date_Task: item.id || '',
                Ngay_Lam_Viec: item.date || '',
                Nhan_Vien: item.employeeCode && item.employeeName ? `${item.employeeCode}-${item.employeeName}` : item.employeeName || '',
                Group_CV: item.groupCV || '',
                Cong_Viec: item.taskDetail || '',
                Chi_Tiet: item.subDetail || '',
                Dia_Chi: item.address || '',
                Time_YeuCau: item.timeRequired || '',
                Time_in: item.timeIn || '',
                Time_Out: item.timeOut || '',
                Local_in: item.localIn || '',
                Local_out: item.localOut || '',
                HA_IN: item.imageIn || '',
                HA_OUT: item.imageOut || '',
                Phi: String(item.fee || ''),
                Phi_Khac: String(item.feeOther || ''),
                Confirm_Task: item.confirmTask || '',
                Cham_Cong: item.chamCong || '',
                Nguoi_Tao: item.createdBy || '',
                Tinh_Trang_TT: item.tinhTrangTT || '',
            }));
            setRawTaskData(rawTasks);

            // Apply RBAC filtering
            const currentUser = getAuthUser();
            const filteredTasks = currentUser
                ? filterTasksByRole(rawTasks, currentUser)
                : rawTasks;

            const apiOrders: Order[] = filteredTasks.map((task, index) => ({
                id: task.ID_Date_Task || `GS-${String(index + 1).padStart(4, '0')}`,
                date: task.Ngay_Lam_Viec || '',
                customerName: task.Nhan_Vien?.split('-').pop()?.trim() || '',
                employeeCode: task.Nhan_Vien?.split('-')[0]?.trim() || '',
                employeeName: task.Nhan_Vien?.split('-').pop()?.trim() || '',
                groupCV: task.Group_CV || '',
                taskDetail: task.Cong_Viec || '',
                address: task.Dia_Chi || '',
                timeYeuCau: task.Time_YeuCau || '',
                status: task.Group_CV?.toUpperCase() === 'OFF' ? 'completed' as const
                    : task.Time_Out ? 'completed' as const
                        : task.Time_in ? 'in_progress' as const
                            : task.Confirm_Task ? 'in_progress' as const
                                : 'pending' as const,
                amount: (parseFloat(task.Phi) || 0) + (parseFloat(task.Phi_Khac) || 0),
                confirmTask: task.Confirm_Task || 'Chờ xác nhận',
                createdBy: task.Nguoi_Tao || '',
            }));

            setOrders(apiOrders);
            setDataSource('google_sheets');
            setLastFetched(new Date().toLocaleTimeString('vi-VN'));
            // Update load stage
            if (!days) setLoadStage('full');
            else if (days <= 3) setLoadStage('3d');
            else if (days <= 7) setLoadStage('7d');
            else setLoadStage('30d');
            if (!silent) setPage(1);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể kết nối Google Sheets';
            if (!silent) setFetchError(msg);
            console.error('Google Sheets fetch error:', err);
        } finally {
            setIsLoading(false);
            setIsBackgroundRefresh(false);
        }
    }, []);

    // Progressive loading: 3 days → 7 days → 30 days
    useEffect(() => {
        fetchFromGoogleSheets(false, 3);
        const t7 = setTimeout(() => fetchFromGoogleSheets(true, 7), 2500);
        const t30 = setTimeout(() => fetchFromGoogleSheets(true, 30), 6000);
        return () => { clearTimeout(t7); clearTimeout(t30); };
    }, [fetchFromGoogleSheets]);

    // Full data load on user request
    useEffect(() => {
        if (fullDataRequested && loadStage !== 'full') {
            fetchFromGoogleSheets(false);
        }
    }, [fullDataRequested, loadStage, fetchFromGoogleSheets]);

    // ─── Check for pending unconfirmed tasks assigned to current user ────
    useEffect(() => {
        if (!rawTaskData.length || !authUser.maNV) return;
        // Get list of already-dismissed popups from localStorage
        let dismissed: string[] = [];
        try { dismissed = JSON.parse(localStorage.getItem('erp_dismissed_tasks') || '[]'); } catch { /* */ }

        // Find unconfirmed tasks assigned to this user (no Confirm_Task, no Time_in)
        const myPending = rawTaskData.filter(t => {
            if (!t.ID_Date_Task || !t.Nhan_Vien) return false;
            // Check if task is assigned to current user
            const taskMaNV = t.Nhan_Vien.split(/[-–]/)[0]?.trim();
            if (taskMaNV !== authUser.maNV) return false;
            // Unconfirmed: no Confirm_Task set
            if (t.Confirm_Task && t.Confirm_Task !== 'Chờ xác nhận') return false;
            // Not already checked in
            if (t.Time_in) return false;
            // Not dismissed
            if (dismissed.includes(t.ID_Date_Task)) return false;
            return true;
        });

        if (myPending.length > 0 && !pendingTaskPopup) {
            setPendingTaskPopup(myPending[0]);
        }
    }, [rawTaskData, authUser.maNV, pendingTaskPopup]);

    // Auto-refresh every 5s (SILENT — near-real-time sync between users)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLoading && !isBackgroundRefresh && document.visibilityState === 'visible') {
                // Background refresh uses current stage's day filter (not full)
                const bgDays = loadStage === 'full' ? undefined : loadStage === '30d' ? 30 : 7;
                fetchFromGoogleSheets(true, bgDays);
            }
        }, 15000); // 15s instead of 5s to reduce load

        // Also refresh when tab becomes visible (SILENT)
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !isLoading && !isBackgroundRefresh) {
                fetchFromGoogleSheets(true);
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [fetchFromGoogleSheets, isLoading, isBackgroundRefresh]);



    // Unique groups for filter
    const uniqueGroups = useMemo(() => {
        // Merge groups from GroupCV sheet + existing orders data
        const g = new Set([
            ...groupCVData.map(row => row.GROUP).filter(Boolean),
            ...orders.map(o => o.groupCV).filter(Boolean),
        ]);
        return Array.from(g).sort();
    }, [orders, groupCVData]);

    // ─── Suggestions for Công việc (taskDetail) ───
    const taskDetailSuggestions = useMemo(() => {
        const selectedGroup = formData.groupCV;
        const items = new Set<string>();
        // 1. From GroupCV sheet matching selected group
        if (selectedGroup) {
            groupCVData.forEach(row => {
                if (row.GROUP === selectedGroup && row.Loai_Khai_Thac) items.add(row.Loai_Khai_Thac);
            });
        }
        // 2. From historical task data matching selected group (or all if no group)
        orders.forEach(o => {
            if (o.taskDetail && (!selectedGroup || o.groupCV === selectedGroup)) {
                items.add(o.taskDetail);
            }
        });
        // 3. If still empty, show all unique taskDetails from history
        if (items.size === 0) {
            orders.forEach(o => { if (o.taskDetail) items.add(o.taskDetail); });
        }
        return Array.from(items).sort((a, b) => a.localeCompare(b, 'vi'));
    }, [formData.groupCV, groupCVData, orders]);

    // ─── Suggestions for Địa chỉ (address) ───
    const addressSuggestions = useMemo(() => {
        const selectedGroup = formData.groupCV;
        const items = new Set<string>();
        // 1. From GroupCV sheet matching selected group
        if (selectedGroup) {
            groupCVData.forEach(row => {
                if (row.GROUP === selectedGroup && row.Dia_Chi) items.add(row.Dia_Chi);
            });
        }
        // 2. From historical task data matching selected group (or all if no group)
        orders.forEach(o => {
            if (o.address && (!selectedGroup || o.groupCV === selectedGroup)) {
                items.add(o.address);
            }
        });
        // 3. If still empty, show all unique addresses from history
        if (items.size === 0) {
            orders.forEach(o => { if (o.address) items.add(o.address); });
        }
        return Array.from(items).sort((a, b) => a.localeCompare(b, 'vi'));
    }, [formData.groupCV, groupCVData, orders]);

    // ─── Auto-suggest Chi Phí when GroupCV / Address changes (create mode) ───
    useEffect(() => {
        if (modalMode !== 'create') return;
        const group = formData.groupCV;
        if (!group) return;

        let suggestedPhi = 0;

        // 1. Check Khoán rates from KPI > Năng suất Khoán
        try {
            const storedRates = localStorage.getItem('erp_khoan_rates');
            if (storedRates) {
                const rates = JSON.parse(storedRates) as { groupCV: string; diaChi: string; soTien: number }[];
                // Exact match: GroupCV + Address
                const exactMatch = rates.find(r =>
                    r.groupCV === group && r.diaChi && r.diaChi === formData.address
                );
                if (exactMatch) {
                    suggestedPhi = exactMatch.soTien;
                } else {
                    // GroupCV-only match (diaChi = '' means "all addresses")
                    const groupMatch = rates.find(r =>
                        r.groupCV === group && !r.diaChi
                    );
                    if (groupMatch) {
                        suggestedPhi = groupMatch.soTien;
                    }
                }
            }
        } catch { /* ignore */ }

        // 2. Fallback: AppSheet formula
        if (!suggestedPhi) {
            const selectedEmpCode = formData.employeeCode || '';
            const selectedEmp = employeeList.find(e => e.value.startsWith(selectedEmpCode));
            if (selectedEmp?.chucDanh === 'Cộng Tác Viên') {
                suggestedPhi = 350000;
            } else if (group === 'THU HỒI MAISON') {
                suggestedPhi = 40000;
            }
        }

        if (suggestedPhi > 0) {
            setFormData(prev => ({ ...prev, amount: suggestedPhi }));
        }
    }, [formData.groupCV, formData.address, formData.employeeCode, modalMode, employeeList]);

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (statusFilter !== 'all') count++;
        if (dateFrom) count++;
        if (dateTo) count++;
        if (groupFilter !== 'all') count++;
        if (amountMin) count++;
        if (amountMax) count++;
        return count;
    }, [statusFilter, dateFrom, dateTo, groupFilter, amountMin, amountMax]);

    // ─── Unassigned Employees Today ───
    // An employee is "available" when:
    // 1. They have NO tasks today, OR
    // 2. ALL their tasks today are completed (checked-out) or group OFF
    const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);
    const unassignedEmployees = useMemo(() => {
        if (!employeeList.length) return employeeList;
        const todayStr = getTodayStr();
        // Build map: employeeName (lower) → { total: number, completedOrOff: number }
        const taskMap = new Map<string, { total: number; completedOrOff: number }>();
        orders.forEach(o => {
            const orderDate = normalizeDate(o.date);
            if (orderDate !== todayStr || !o.employeeName) return;
            const key = o.employeeName.trim().toLowerCase();
            const entry = taskMap.get(key) || { total: 0, completedOrOff: 0 };
            entry.total++;
            if (o.status === 'completed' || o.groupCV?.toUpperCase() === 'OFF') {
                entry.completedOrOff++;
            }
            taskMap.set(key, entry);
        });
        // Filter employees: available if no tasks OR all tasks completed/OFF
        return employeeList.filter(emp => {
            const parts = emp.value.split(/[-–]/);
            const name = (parts.length > 1 ? parts.slice(1).join('-').trim() : parts[0].trim());
            const key = name.toLowerCase();
            const entry = taskMap.get(key);
            // No tasks today → available
            if (!entry) return true;
            // All tasks completed or OFF → available
            return entry.completedOrOff >= entry.total;
        });
    }, [employeeList, orders]);

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchLower = search.toLowerCase();
            if (search && !(
                order.id.toLowerCase().includes(searchLower) ||
                order.customerName.toLowerCase().includes(searchLower) ||
                order.employeeName.toLowerCase().includes(searchLower) ||
                order.groupCV.toLowerCase().includes(searchLower) ||
                order.taskDetail.toLowerCase().includes(searchLower) ||
                (order.address && order.address.toLowerCase().includes(searchLower))
            )) return false;

            // Status filter: 'active' = pending + in_progress (but OFF group shows completed)
            if (statusFilter === 'active') {
                // Group OFF: default shows completed
                if (order.groupCV?.toUpperCase() === 'OFF') {
                    if (order.status !== 'completed') return false;
                } else {
                    if (order.status !== 'pending' && order.status !== 'in_progress') return false;
                }
            } else if (statusFilter !== 'all' && order.status !== statusFilter) return false;

            // Date comparison: normalize both formats to yyyy-MM-dd
            const orderDateNorm = normalizeDate(order.date);
            if (dateFrom && orderDateNorm && orderDateNorm < dateFrom) return false;
            if (dateTo && orderDateNorm && orderDateNorm > dateTo) return false;

            if (groupFilter !== 'all' && order.groupCV !== groupFilter) return false;
            if (amountMin && order.amount < parseFloat(amountMin)) return false;
            if (amountMax && order.amount > parseFloat(amountMax)) return false;

            return true;
        }).sort((a, b) => {
            // Default sort: date Z→A (newest first)
            const na = normalizeDate(a.date);
            const nb = normalizeDate(b.date);
            return nb.localeCompare(na);
        });
    }, [orders, search, statusFilter, dateFrom, dateTo, groupFilter, amountMin, amountMax]);

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / pageSize);
    const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

    const handleFilterChange = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
        return (value: T) => {
            setter(value);
            setPage(1);
        };
    }, []);

    // CRUD
    const handleCreate = () => {
        setModalMode('create');
        setFormData(emptyOrder);
        setEmpSearch('');
        setGroupCVSearch('');
        setTaskDetailSearch('');
        setAddressSearch('');
    };

    // Quick assign from unassigned tag
    const handleQuickAssign = (emp: { value: string; label: string; chucDanh: string }) => {
        const parts = emp.value.split(/[-–]/);
        const code = parts[0]?.trim() || '';
        const name = parts.length > 1 ? parts.slice(1).join('-').trim() : '';
        setModalMode('create');
        setFormData({
            ...emptyOrder,
            employeeCode: code,
            employeeName: name,
            customerName: name,
        });
        setEmpSearch(emp.value);
        setGroupCVSearch('');
        setTaskDetailSearch('');
        setAddressSearch('');
    };

    const handleEdit = (order: Order) => {
        setModalMode('edit');
        setEditingOrder(order);
        setEmpSearch(order.employeeCode ? `${order.employeeCode}-${order.employeeName}` : order.employeeName);
        setGroupCVSearch(order.groupCV || '');
        setTaskDetailSearch(order.taskDetail || '');
        setAddressSearch(order.address || '');
        setFormData({
            date: order.date,
            customerName: order.customerName,
            employeeCode: order.employeeCode,
            employeeName: order.employeeName,
            groupCV: order.groupCV,
            taskDetail: order.taskDetail,
            address: order.address,
            timeYeuCau: order.timeYeuCau || '',
            status: order.status,
            amount: order.amount,
            confirmTask: order.confirmTask,
            createdBy: order.createdBy,
        });
    };

    const handleView = (order: Order) => {
        // Find matching TaskRow from rawTaskData
        const matchingTask = rawTaskData.find(t => t.ID_Date_Task === order.id);
        if (matchingTask) {
            setSelectedTaskDetail(matchingTask);
        } else {
            // Fallback: create TaskRow from Order
            setSelectedTaskDetail({
                ID_Date_Task: order.id,
                Ngay_Lam_Viec: order.date || '',
                Nhan_Vien: order.employeeCode ? `${order.employeeCode}-${order.employeeName}` : order.employeeName || '',
                Group_CV: order.groupCV || '',
                Cong_Viec: order.taskDetail || '',
                Chi_Tiet: '',
                Dia_Chi: order.address || '',
                Time_YeuCau: '',
                Time_in: '',
                Time_Out: '',
                Local_in: '',
                Local_out: '',
                HA_IN: '',
                HA_OUT: '',
                Phi: String(order.amount || ''),
                Phi_Khac: '',
                Confirm_Task: order.confirmTask || '',
                Cham_Cong: '',
                Nguoi_Tao: order.createdBy || '',
                Tinh_Trang_TT: '',
            });
        }
    };

    const handleSave = async () => {
        setSaveLoading(true);
        setSaveMessage(null);

        if (modalMode === 'create') {
            // Try to write to Google Sheets
            try {
                // Auto-calculate Phí:
                // Priority: 1) Khoán rate (GroupCV+Address) 2) Khoán rate (GroupCV only) 3) AppSheet formula
                const selectedEmpCode = formData.employeeCode || (formData.employeeName ? formData.employeeName.split('-')[0]?.trim() : '');
                const selectedEmp = employeeList.find(e => e.value.startsWith(selectedEmpCode));
                let autoPhi = '';

                // 1. Check Khoán rates from KPI > Năng suất Khoán
                try {
                    const storedRates = localStorage.getItem('erp_khoan_rates');
                    if (storedRates) {
                        const rates = JSON.parse(storedRates) as { groupCV: string; diaChi: string; soTien: number }[];
                        // Exact match: GroupCV + Address
                        const exactMatch = rates.find(r =>
                            r.groupCV === formData.groupCV && r.diaChi && r.diaChi === formData.address
                        );
                        if (exactMatch) {
                            autoPhi = String(exactMatch.soTien);
                        } else {
                            // GroupCV-only match (diaChi = '' means "all addresses")
                            const groupMatch = rates.find(r =>
                                r.groupCV === formData.groupCV && !r.diaChi
                            );
                            if (groupMatch) {
                                autoPhi = String(groupMatch.soTien);
                            }
                        }
                    }
                } catch { /* ignore parse error */ }

                // 2. Fallback: AppSheet formula (CTV → 350k, THU HỒI MAISON → 40k)
                if (!autoPhi) {
                    if (selectedEmp?.chucDanh === 'Cộng Tác Viên') {
                        autoPhi = '350000';
                    } else if (formData.groupCV === 'THU HỒI MAISON') {
                        autoPhi = '40000';
                    }
                }

                const res = await fetch('/api/sheets/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'addTask',
                        ngayLamViec: formData.date ? formData.date.split('-').reverse().join('/') : '',
                        nhanVien: formData.employeeCode ? `${formData.employeeCode}-${formData.employeeName}` : formData.employeeName,
                        groupCV: formData.groupCV,
                        congViec: formData.taskDetail,
                        chiTiet: '',
                        diaChi: formData.address || '',
                        timeYeuCau: formData.timeYeuCau || '',
                        nguoiTao: authUser.user || 'Admin',
                        phi: autoPhi,
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    setSaveMessage({ type: 'success', text: 'Đã thêm công việc vào Google Sheets!' });
                    // Also add to local list
                    const newOrder: Order = {
                        ...formData,
                        id: `NEW-${Date.now().toString(36)}`,
                        createdBy: authUser.user || 'Admin',
                    };
                    setOrders([newOrder, ...orders]);
                    setTimeout(() => { setModalMode(null); setEditingOrder(null); setSaveMessage(null); }, 1500);
                } else {
                    setSaveMessage({ type: 'error', text: json.error || 'Lỗi ghi vào Google Sheets' });
                    // Still add locally
                    const newOrder: Order = {
                        ...formData,
                        id: `LOCAL-${Date.now().toString(36)}`,
                        createdBy: authUser.user || 'Admin',
                    };
                    setOrders([newOrder, ...orders]);
                }
            } catch {
                setSaveMessage({ type: 'error', text: 'Không thể kết nối server. Đã lưu tạm.' });
                const newOrder: Order = {
                    ...formData,
                    id: `LOCAL-${Date.now().toString(36)}`,
                    createdBy: authUser.user || 'Admin',
                };
                setOrders([newOrder, ...orders]);
            }
        } else if (modalMode === 'edit' && editingOrder) {
            // ── Sync edit to Google Sheets ──
            try {
                // Build the updates object mapping sheet column names to new values
                const updates: Record<string, string> = {};
                if (formData.date !== editingOrder.date) {
                    updates.Ngay_Lam_Viec = formData.date ? formData.date.split('-').reverse().join('/') : '';
                }
                const newNhanVien = formData.employeeCode
                    ? `${formData.employeeCode}-${formData.employeeName}`
                    : formData.employeeName;
                const oldNhanVien = editingOrder.employeeCode
                    ? `${editingOrder.employeeCode}-${editingOrder.employeeName}`
                    : editingOrder.employeeName;
                if (newNhanVien !== oldNhanVien) {
                    updates.Nhan_Vien = newNhanVien;
                }
                if (formData.groupCV !== editingOrder.groupCV) {
                    updates.Group_CV = formData.groupCV;
                }
                if (formData.taskDetail !== editingOrder.taskDetail) {
                    updates.Cong_Viec = formData.taskDetail;
                }
                if ((formData.address || '') !== (editingOrder.address || '')) {
                    updates.Dia_Chi = formData.address || '';
                }
                if ((formData.timeYeuCau || '') !== (editingOrder.timeYeuCau || '')) {
                    updates.Time_YeuCau = formData.timeYeuCau || '';
                }

                if (Object.keys(updates).length > 0) {
                    const res = await fetch('/api/sheets/write', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'updateTask',
                            taskId: editingOrder.id,
                            updates,
                        }),
                    });
                    const json = await res.json();
                    if (json.success) {
                        setSaveMessage({ type: 'success', text: '✅ Đã cập nhật công việc trên Google Sheets!' });
                        // Update local state
                        setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, ...formData } : o));
                        setTimeout(() => {
                            setModalMode(null);
                            setEditingOrder(null);
                            setSaveMessage(null);
                            fetchFromGoogleSheets(true); // Refresh from GS
                        }, 1500);
                    } else {
                        setSaveMessage({ type: 'error', text: json.error || 'Lỗi cập nhật Google Sheets' });
                        // Still update locally as fallback
                        setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, ...formData } : o));
                    }
                } else {
                    // No changes detected
                    setSaveMessage({ type: 'success', text: 'Không có thay đổi nào.' });
                    setTimeout(() => { setModalMode(null); setEditingOrder(null); setSaveMessage(null); }, 1000);
                }
            } catch {
                setSaveMessage({ type: 'error', text: 'Không thể kết nối server. Đã lưu tạm local.' });
                setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, ...formData } : o));
            }
        }
        setSaveLoading(false);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch('/api/sheets/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteTask', taskId: id }),
            });
            const json = await res.json();
            if (json.success) {
                setOrders(orders.filter(o => o.id !== id));
                setDeleteConfirm(null);
            } else {
                alert('Lỗi xóa: ' + (json.error || json.message || 'Không xác định'));
                setDeleteConfirm(null);
            }
        } catch (err) {
            alert('Lỗi kết nối server khi xóa task');
            setDeleteConfirm(null);
        }
    };

    const clearFilters = () => {
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
        setGroupFilter('all');
        setAmountMin('');
        setAmountMax('');
        setSearch('');
        setPage(1);
    };

    // ─── Bulk Complete Handler (Admin/Host only) ───
    const canBulkComplete = hasPrivilege;

    const toggleTaskSelect = (id: string) => {
        setSelectedTasks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllPage = () => {
        const incompleteOnPage = paginatedOrders.filter(o => o.status !== 'completed' && o.groupCV?.toUpperCase() !== 'OFF');
        const allSelected = incompleteOnPage.every(o => selectedTasks.has(o.id));
        if (allSelected) {
            setSelectedTasks(prev => {
                const next = new Set(prev);
                incompleteOnPage.forEach(o => next.delete(o.id));
                return next;
            });
        } else {
            setSelectedTasks(prev => {
                const next = new Set(prev);
                incompleteOnPage.forEach(o => next.add(o.id));
                return next;
            });
        }
    };

    const handleBulkComplete = async () => {
        if (selectedTasks.size === 0) return;
        setBulkLoading(true);
        setBulkMessage(null);
        try {
            const now = new Date();
            const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const promises = Array.from(selectedTasks).map(async (taskId) => {
                const taskRow = rawTaskData.find(t => t.ID_Date_Task === taskId);
                if (!taskRow || taskRow.Time_Out) return;

                // Build updates object
                const updates: Record<string, string> = { Time_Out: timeStr };

                if (taskRow.Time_in) {
                    const din = new Date(taskRow.Time_in.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1'));
                    const dout = now;
                    const diffMs = dout.getTime() - din.getTime();
                    if (diffMs > 0) {
                        const totalMin = Math.floor(diffMs / 60000);
                        const h = Math.floor(totalMin / 60);
                        const m = totalMin % 60;
                        const s = Math.floor((diffMs / 1000) % 60);
                        updates.Cham_Cong = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    }
                }

                const res = await fetch('/api/sheets/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updateTask', taskId, updates }),
                });
                const result = await res.json();
                if (!result.success) {
                    console.error(`Bulk complete failed for ${taskId}:`, result);
                }
            });

            await Promise.all(promises);
            setBulkMessage({ type: 'success', text: `Đã hoàn thành ${selectedTasks.size} công việc!` });
            setSelectedTasks(new Set());
            setTimeout(() => fetchFromGoogleSheets(), 1500);
        } catch (err) {
            setBulkMessage({ type: 'error', text: 'Lỗi khi cập nhật, vui lòng thử lại.' });
            console.error(err);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleSingleComplete = async (taskId: string) => {
        setBulkLoading(true);
        setBulkMessage(null);
        try {
            const now = new Date();
            const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const taskRow = rawTaskData.find(t => t.ID_Date_Task === taskId);
            if (!taskRow || taskRow.Time_Out) return;

            const updates: Record<string, string> = { Time_Out: timeStr };
            if (taskRow.Time_in) {
                const din = new Date(taskRow.Time_in.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1'));
                const diffMs = now.getTime() - din.getTime();
                if (diffMs > 0) {
                    const totalMin = Math.floor(diffMs / 60000);
                    const h = Math.floor(totalMin / 60);
                    const m = totalMin % 60;
                    const s = Math.floor((diffMs / 1000) % 60);
                    updates.Cham_Cong = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }
            }
            const res = await fetch('/api/sheets/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateTask', taskId, updates }),
            });
            const result = await res.json();
            if (result.success) {
                setBulkMessage({ type: 'success', text: `Đã hoàn thành công việc!` });
                setTimeout(() => fetchFromGoogleSheets(), 1500);
            } else {
                setBulkMessage({ type: 'error', text: 'Lỗi khi cập nhật.' });
            }
        } catch (err) {
            setBulkMessage({ type: 'error', text: 'Lỗi khi cập nhật, vui lòng thử lại.' });
        } finally {
            setBulkLoading(false);
        }
    };

    // Export to Excel — ALL columns from raw Google Sheets data
    const handleExportExcel = () => {
        // Use rawTaskData for full columns
        const headers = ['ID_Date_Task', 'Ngay_Lam_Viec', 'Nhan_Vien', 'Group_CV', 'Cong_Viec', 'Chi_Tiet', 'Dia_Chi', 'Time_YeuCau', 'Time_in', 'Time_Out', 'Local_in', 'Local_out', 'HA_IN', 'HA_OUT', 'Phi', 'Phi_Khac', 'Confirm_Task', 'Cham_Cong', 'Nguoi_Tao', 'Tinh_Trang_TT'];
        const headerLabels = ['Mã Task', 'Ngày Làm Việc', 'Nhân Viên', 'Nhóm CV', 'Công Việc', 'Chi Tiết', 'Địa Chỉ', 'Thời Gian Yêu Cầu', 'Check-in', 'Check-out', 'Vị Trí In', 'Vị Trí Out', 'Ảnh In', 'Ảnh Out', 'Phí', 'Phí Khác', 'Xác Nhận Task', 'Chấm Công', 'Người Tạo', 'Tình Trạng TT'];

        // Filter rawTaskData to match current filtered view
        const filteredIds = new Set(filteredOrders.map(o => o.id));
        const exportData = rawTaskData.filter(t => filteredIds.has(t.ID_Date_Task));

        // Build CSV with BOM for Excel
        const BOM = '\uFEFF';
        const csvRows = [headerLabels.join(',')];
        exportData.forEach(task => {
            const row = headers.map(key => {
                const val = String((task as unknown as Record<string, string>)[key] || '').replace(/"/g, '""');
                return `"${val}"`;
            });
            csvRows.push(row.join(','));
        });

        const csv = BOM + csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CongViec_${getTodayStr()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto">
            {/* ═══ Pending Task Notification Popup ═══ */}
            {pendingTaskPopup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.3s ease',
                    padding: '16px',
                }}>
                    <div style={{
                        background: 'white', borderRadius: 16, maxWidth: 440, width: '100%',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            padding: '20px 24px', color: 'white',
                        }}>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>📢 Công việc mới!</div>
                            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                                Bạn có task chưa xác nhận
                            </div>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>🆔 Task ID</span>
                                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{pendingTaskPopup.ID_Date_Task}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>📂 Nhóm CV</span>
                                    <span style={{ fontWeight: 600 }}>{pendingTaskPopup.Group_CV}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>💻 Công việc</span>
                                    <span>{pendingTaskPopup.Cong_Viec || pendingTaskPopup.Chi_Tiet}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>📝 Chi tiết</span>
                                    <span>{pendingTaskPopup.Chi_Tiet}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>🗺️ Địa chỉ</span>
                                    <span>{pendingTaskPopup.Dia_Chi}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>⏰ Thời gian</span>
                                    <span>{pendingTaskPopup.Time_YeuCau}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', minWidth: 90 }}>👤 Người tạo</span>
                                    <span>{pendingTaskPopup.Nguoi_Tao}</span>
                                </div>
                            </div>
                        </div>
                        {/* Actions */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
                            <button
                                style={{
                                    flex: 1, padding: '12px', borderRadius: 10,
                                    border: '1px solid #e2e8f0', background: 'white',
                                    color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                }}
                                onClick={() => {
                                    // Dismiss — save to localStorage
                                    try {
                                        const d = JSON.parse(localStorage.getItem('erp_dismissed_tasks') || '[]');
                                        d.push(pendingTaskPopup.ID_Date_Task);
                                        localStorage.setItem('erp_dismissed_tasks', JSON.stringify(d));
                                    } catch { /* */ }
                                    setPendingTaskPopup(null);
                                }}
                            >
                                Để sau
                            </button>
                            <button
                                disabled={confirmingPopupTask}
                                style={{
                                    flex: 2, padding: '12px', borderRadius: 10,
                                    border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                    background: confirmingPopupTask ? '#94a3b8' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                                }}
                                onClick={async () => {
                                    setConfirmingPopupTask(true);
                                    try {
                                        const confirmTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                                        await fetch('/api/sheets/write', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                action: 'updateTask',
                                                taskId: pendingTaskPopup.ID_Date_Task,
                                                updates: { Confirm_Task: confirmTime },
                                            }),
                                        });
                                        // Send Zalo notification for confirmation
                                        try {
                                            await fetch('/api/sheets/write', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    action: 'sendZaloConfirm',
                                                    nhanVien: pendingTaskPopup.Nhan_Vien || '',
                                                    taskId: pendingTaskPopup.ID_Date_Task,
                                                }),
                                            });
                                        } catch { /* non-critical */ }
                                        // Dismiss
                                        try {
                                            const d = JSON.parse(localStorage.getItem('erp_dismissed_tasks') || '[]');
                                            d.push(pendingTaskPopup.ID_Date_Task);
                                            localStorage.setItem('erp_dismissed_tasks', JSON.stringify(d));
                                        } catch { /* */ }
                                        setPendingTaskPopup(null);
                                        fetchFromGoogleSheets(true);
                                    } catch (err) {
                                        console.error('Confirm error:', err);
                                    }
                                    setConfirmingPopupTask(false);
                                }}
                            >
                                {confirmingPopupTask ? '⏳ Đang xác nhận...' : '✅ Xác Nhận'}
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                        @keyframes slideUp { from { opacity:0; transform:translateY(40px) scale(0.95) } to { opacity:1; transform:translateY(0) scale(1) } }
                    `}</style>
                </div>
            )}
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">📋 Quản lý Công việc</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {filteredOrders.length} công việc {activeFilterCount > 0 ? `(đã lọc từ ${orders.length})` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Data Source Indicator */}
                    <div className={`h-9 px-3 flex items-center gap-2 text-xs font-semibold rounded-xl border transition-all ${dataSource === 'google_sheets'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                        <IconCloud />
                        <span className="hidden sm:inline">{dataSource === 'google_sheets' ? 'Google Sheets' : 'Mock Data'}</span>
                        <span className="sm:hidden">{dataSource === 'google_sheets' ? 'GS' : 'Mock'}</span>
                        {lastFetched && dataSource === 'google_sheets' && (
                            <span className="text-emerald-500 hidden md:inline">• {lastFetched}</span>
                        )}
                    </div>

                    {/* Progressive loading indicator */}
                    {loadStage !== 'full' && loadStage !== 'init' && (
                        <div className="h-9 px-3 flex items-center gap-2 text-xs font-semibold rounded-xl border bg-blue-50 border-blue-200 text-blue-700">
                            ⚡ {loadStage === '3d' ? '3 ngày' : loadStage === '7d' ? '7 ngày' : '30 ngày'}
                            <button
                                onClick={() => setFullDataRequested(true)}
                                disabled={isLoading}
                                className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                📥 Toàn bộ
                            </button>
                        </div>
                    )}
                    {loadStage === 'full' && (
                        <div className="h-9 px-3 flex items-center gap-2 text-xs font-semibold rounded-xl border bg-green-50 border-green-200 text-green-700">
                            ✅ Toàn bộ ({orders.length})
                        </div>
                    )}

                    <button
                        onClick={() => fetchFromGoogleSheets()}
                        disabled={isLoading}
                        className={`h-9 px-3 flex items-center gap-1.5 text-sm font-medium border rounded-xl transition-all active:scale-95 ${isLoading
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-sky-300'
                            }`}
                        title="Tải lại từ Google Sheets"
                    >
                        <span className={isLoading ? 'animate-spin' : ''}>
                            <IconRefresh />
                        </span>
                        <span className="hidden sm:inline">{isLoading ? 'Đang tải...' : 'Sync'}</span>
                    </button>



                    <button
                        onClick={handleExportExcel}
                        className="hidden sm:flex h-9 px-4 items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <IconDownload />
                        <span className="hidden md:inline">Xuất Excel</span>
                    </button>

                    {/* Bulk Complete button for Admin/Host */}
                    {canBulkComplete && selectedTasks.size > 0 && (
                        <button
                            onClick={handleBulkComplete}
                            disabled={bulkLoading}
                            className="h-9 px-4 flex items-center gap-2 text-sm font-bold text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                        >
                            {bulkLoading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                            <span>{bulkLoading ? 'Đang xử lý...' : `Hoàn thành ${selectedTasks.size} task`}</span>
                        </button>
                    )}

                    <button
                        onClick={handleCreate}
                        className="h-9 px-4 flex items-center gap-2 text-sm font-semibold text-white rounded-xl transition-all shadow-lg active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #1D354D, #2A4A6B)', boxShadow: '0 4px 16px rgba(29,53,77,0.3)' }}
                    >
                        <IconPlus />
                        <span className="hidden sm:inline">Giao việc mới</span>
                    </button>
                </div>
            </div>

            {/* Bulk Message */}
            {bulkMessage && (
                <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold animate-fade-in ${bulkMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {bulkMessage.type === 'success' ? '✅' : '❌'} {bulkMessage.text}
                    <button onClick={() => setBulkMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600"><IconX /></button>
                </div>
            )}

            {/* Error Banner */}
            {fetchError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Không thể kết nối Google Sheets</p>
                        <p className="text-xs text-amber-600 mt-0.5">{fetchError}</p>
                        <p className="text-xs text-amber-600 mt-1">
                            💡 Hãy vào Google Sheet → <strong>Share</strong> → Đổi thành <strong>&quot;Anyone with the link can view&quot;</strong>, sau đó nhấn <strong>Sync</strong>.
                        </p>
                    </div>
                    <button
                        onClick={() => setFetchError(null)}
                        className="text-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <IconX />
                    </button>
                </div>
            )}

            {/* ═══ Unassigned Employees Today ═══ */}
            {hasPrivilege && employeeList.length > 0 && !isLoading && (
                <div className="animate-fade-in" style={{
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    {/* Header */}
                    <div
                        onClick={() => setUnassignedCollapsed(!unassignedCollapsed)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderBottom: unassignedCollapsed ? 'none' : '1px solid #F1F5F9',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: unassignedEmployees.length > 0 ? '#FEF2F2' : '#F0FDF4',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14,
                            }}>
                                {unassignedEmployees.length > 0 ? '⚠️' : '✅'}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                                Nhân viên chưa có công việc hôm nay
                            </span>
                            <span style={{
                                fontSize: 11, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 20,
                                background: unassignedEmployees.length > 0 ? '#FEE2E2' : '#DCFCE7',
                                color: unassignedEmployees.length > 0 ? '#DC2626' : '#16A34A',
                                minWidth: 20, textAlign: 'center' as const,
                            }}>
                                {unassignedEmployees.length}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>
                                {getTodayStr().split('-').reverse().join('/')}
                            </span>
                            <svg
                                width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{
                                    transition: 'transform 0.2s',
                                    transform: unassignedCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>
                    </div>

                    {/* Tags Container */}
                    {!unassignedCollapsed && (
                        <div style={{ padding: '8px 16px 12px' }}>
                            {unassignedEmployees.length === 0 ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 0', fontSize: 13, color: '#16A34A', fontWeight: 500,
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    Tất cả nhân viên đã được phân công việc hôm nay!
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: 'flex', gap: 6, overflowX: 'auto',
                                        paddingBottom: 4,
                                        scrollbarWidth: 'thin' as any,
                                    }}
                                    className="unassigned-scroll"
                                >
                                    {unassignedEmployees.map((emp, idx) => {
                                        const parts = emp.value.split(/[-–]/);
                                        const code = parts[0]?.trim();
                                        const name = parts.length > 1 ? parts.slice(1).join('-').trim() : parts[0].trim();
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuickAssign(emp)}
                                                title={`Giao việc cho ${name} (${code})`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '5px 10px 5px 6px',
                                                    borderRadius: 20,
                                                    border: '1px solid #E2E8F0',
                                                    background: '#FAFBFC',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap' as const,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    color: '#475569',
                                                    transition: 'all 0.15s',
                                                    flexShrink: 0,
                                                }}
                                                onMouseEnter={e => {
                                                    (e.currentTarget as HTMLElement).style.background = '#EFF6FF';
                                                    (e.currentTarget as HTMLElement).style.borderColor = '#93C5FD';
                                                    (e.currentTarget as HTMLElement).style.color = '#1D4ED8';
                                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(59,130,246,0.15)';
                                                }}
                                                onMouseLeave={e => {
                                                    (e.currentTarget as HTMLElement).style.background = '#FAFBFC';
                                                    (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                                                    (e.currentTarget as HTMLElement).style.color = '#475569';
                                                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                                }}
                                            >
                                                <span style={{
                                                    width: 22, height: 22, borderRadius: '50%',
                                                    background: `hsl(${(code.charCodeAt(code.length - 1) * 37) % 360}, 60%, 92%)`,
                                                    color: `hsl(${(code.charCodeAt(code.length - 1) * 37) % 360}, 60%, 35%)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {name.charAt(name.lastIndexOf(' ') + 1) || name.charAt(0)}
                                                </span>
                                                <span style={{ fontWeight: 600 }}>{name}</span>
                                                <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400 }}>{code}</span>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginLeft: 2 }}>
                                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    <style>{`
                        .unassigned-scroll::-webkit-scrollbar { height: 4px; }
                        .unassigned-scroll::-webkit-scrollbar-track { background: transparent; }
                        .unassigned-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
                        .unassigned-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                    `}</style>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="glass-card rounded-2xl">
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <IconSearch />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Tìm theo nhân viên, công việc..."
                            className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status filter buttons */}
                        {[
                            { key: 'active', label: 'Đang xử lý', color: '#f59e0b' },
                            { key: 'completed', label: 'Hoàn thành', color: '#10b981' },
                            { key: 'all', label: 'Tất cả', color: '#64748b' },
                        ].map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => { setStatusFilter(btn.key); setPage(1); }}
                                className={`h-9 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border transition-all active:scale-95 ${statusFilter === btn.key
                                    ? 'text-white shadow-md'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                style={statusFilter === btn.key ? {
                                    background: btn.color,
                                    borderColor: btn.color,
                                    boxShadow: `0 2px 8px ${btn.color}40`,
                                } : {}}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={`h-10 px-4 flex items-center gap-2 text-sm font-medium border rounded-xl transition-all active:scale-95 ${filterOpen || activeFilterCount > 0
                                ? 'bg-sky-50 border-sky-300 text-sky-700'
                                : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <IconFilter />
                            <span className="hidden sm:inline">Bộ lọc</span>
                            {activeFilterCount > 0 && (
                                <span className="w-5 h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #1D354D, #2A4A6B)' }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="h-10 px-3 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </div>

                {filterOpen && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-slate-100/80 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 sm:pt-4">
                            <div>
                                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Trạng thái</label>
                                <select value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
                                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer">
                                    <option value="all">Tất cả</option>
                                    <option value="active">Đang xử lý + Chờ xử lý</option>
                                    <option value="completed">Hoàn thành</option>
                                    <option value="in_progress">Đang xử lý</option>
                                    <option value="pending">Chờ xử lý</option>
                                    <option value="cancelled">Đã hủy</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Từ ngày</label>
                                <input type="date" value={dateFrom} onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
                                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Đến ngày</label>
                                <input type="date" value={dateTo} onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
                                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Nhóm công việc</label>
                                <select value={groupFilter} onChange={(e) => handleFilterChange(setGroupFilter)(e.target.value)}
                                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer">
                                    <option value="all">Tất cả</option>
                                    {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Giá trị từ</label>
                                <input type="number" value={amountMin} onChange={(e) => handleFilterChange(setAmountMin)(e.target.value)}
                                    placeholder="0" className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Giá trị đến</label>
                                <input type="number" value={amountMax} onChange={(e) => handleFilterChange(setAmountMax)(e.target.value)}
                                    placeholder="∞" className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-600" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="glass-card rounded-2xl p-8 sm:p-12 text-center animate-fade-in">
                    <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 animate-gradient" style={{ background: 'linear-gradient(135deg, #1D354D, #2A4A6B, #a855f7, #1D354D)', backgroundSize: '200% 200%', boxShadow: '0 4px 16px rgba(29,53,77,0.3)' }}>
                        <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Đang tải dữ liệu từ Google Sheets...</p>
                    <p className="text-xs text-slate-400 mt-1">Kết nối tới spreadsheet</p>
                </div>
            )}

            {/* Orders Table */}
            {!isLoading && (
                <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                        <table className="w-full">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
                                <tr className="border-b border-slate-100">
                                    {canBulkComplete && (
                                        <th className="px-2 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedOrders.filter(o => o.status !== 'completed' && o.groupCV?.toUpperCase() !== 'OFF').length > 0 && paginatedOrders.filter(o => o.status !== 'completed' && o.groupCV?.toUpperCase() !== 'OFF').every(o => selectedTasks.has(o.id))}
                                                onChange={toggleSelectAllPage}
                                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                title="Chọn tất cả"
                                            />
                                        </th>
                                    )}
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhóm CV</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Công việc</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Địa chỉ</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={canBulkComplete ? 8 : 7} className="text-center py-16">
                                            <div className="text-slate-400">
                                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-sm font-medium">Không tìm thấy công việc nào</p>
                                                <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedOrders.map((order, idx) => {
                                        const isOff = order.groupCV?.toUpperCase() === 'OFF';
                                        const rowBg = isOff
                                            ? 'bg-red-50/70 border-l-4 border-l-red-400'
                                            : selectedTasks.has(order.id) ? 'bg-emerald-50/40' : '';
                                        return (
                                            <tr key={order.id + '-' + idx} className={`border-b border-slate-50 table-row-hover transition-colors animate-fade-in ${rowBg}`} style={{ animationDelay: `${idx * 30}ms` }}>
                                                {canBulkComplete && (
                                                    <td className="px-2 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTasks.has(order.id)}
                                                            onChange={() => toggleTaskSelect(order.id)}
                                                            disabled={order.status === 'completed' || order.groupCV?.toUpperCase() === 'OFF'}
                                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-slate-600">
                                                        {order.date ? (order.date.includes('/') ? order.date : new Date(order.date).toLocaleDateString('vi-VN')) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <span className="text-sm text-slate-700">{order.employeeName || '—'}</span>
                                                        {order.employeeCode && <p className="text-xs text-slate-400">{order.employeeCode}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-slate-600 line-clamp-1 max-w-[140px]">{order.groupCV || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-slate-600 line-clamp-1 max-w-[180px]">{order.taskDetail || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                        {getStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-slate-600 line-clamp-1 max-w-[160px]">
                                                        {order.address || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {canBulkComplete && order.status !== 'completed' && order.groupCV?.toUpperCase() !== 'OFF' && (
                                                            <button onClick={() => handleSingleComplete(order.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" title="Hoàn thành (Check-out trực tiếp)">
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleView(order)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="Xem chi tiết">
                                                            <IconEye />
                                                        </button>
                                                        <button onClick={() => handleEdit(order)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors" title="Chỉnh sửa">
                                                            <IconEdit />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm(order.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                                                            <IconTrash />
                                                        </button>
                                                    </div>
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
                                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredOrders.length)} / {filteredOrders.length}
                                </p>
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 hover:border-slate-300 focus:ring-2 focus:ring-sky-300 focus:border-sky-500 outline-none transition-all cursor-pointer"
                                >
                                    {PAGE_SIZE_OPTIONS.map(size => (
                                        <option key={size} value={size}>{size}/trang</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1 order-1 sm:order-2">
                                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
                                    <IconChevLeft />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <button key={pageNum} onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 ${page === pageNum ? 'text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                                                }`}
                                            style={page === pageNum ? { background: 'linear-gradient(135deg, #1D354D, #2A4A6B)', boxShadow: '0 2px 8px rgba(29,53,77,0.3)' } : {}}>
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
                                    <IconChevRight />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========== MODAL: Create / Edit ========== */}
            {(modalMode === 'create' || modalMode === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMode(null)} />
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-scale-up">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-800">
                                {modalMode === 'create' ? 'Giao công việc mới' : 'Chỉnh sửa công việc'}
                            </h2>
                            <button onClick={() => setModalMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                <IconX />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Ngày tạo</label>
                                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Giờ yêu cầu</label>
                                    <input type="time" step="1" value={formData.timeYeuCau} onChange={(e) => setFormData({ ...formData, timeYeuCau: e.target.value })}
                                        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700" />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Tên nhân viên</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={empSearch || formData.employeeName}
                                        onChange={(e) => {
                                            setEmpSearch(e.target.value);
                                            setEmpDropOpen(true);
                                            if (!e.target.value) {
                                                setFormData({ ...formData, employeeName: '', employeeCode: '' });
                                            }
                                        }}
                                        onFocus={() => setEmpDropOpen(true)}
                                        placeholder="Tìm kiếm nhân viên (MSNV hoặc tên)..."
                                        className="w-full h-10 px-3 pr-8 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 transition-all"
                                        autoComplete="off"
                                    />
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {empDropOpen && (() => {
                                    const q = (empSearch || '').toLowerCase();
                                    const filteredUnassigned = unassignedEmployees.filter(emp => !q || emp.label.toLowerCase().includes(q));
                                    const filteredAll = employeeList.filter(emp => !q || emp.label.toLowerCase().includes(q));
                                    const unassignedSet = new Set(unassignedEmployees.map(e => e.value));
                                    const filteredAssigned = filteredAll.filter(emp => !unassignedSet.has(emp.value));
                                    const selectEmp = (emp: { value: string; label: string }) => {
                                        const parts = emp.value.split('-');
                                        const code = parts[0]?.trim() || '';
                                        const name = parts.slice(1).join('-').trim() || emp.label;
                                        setFormData({ ...formData, employeeName: name, employeeCode: code });
                                        setEmpSearch(emp.label);
                                        setEmpDropOpen(false);
                                    };
                                    return (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setEmpDropOpen(false)} />
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                                            {/* ── NV chưa có task hôm nay ── */}
                                            {filteredUnassigned.length > 0 && (
                                                <>
                                                    <div className="sticky top-0 z-10 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Chưa có task hôm nay</span>
                                                        <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">{filteredUnassigned.length}</span>
                                                    </div>
                                                    {filteredUnassigned.slice(0, 30).map(emp => (
                                                        <button key={'free-' + emp.value} type="button" onClick={() => selectEmp(emp)}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors border-b border-emerald-50/50 last:border-0 ${
                                                                formData.employeeName && emp.label.includes(formData.employeeName) ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-slate-700'
                                                            }`}>
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                                                <span className="font-semibold text-emerald-700">{emp.value.split('-')[0]?.trim()}</span>
                                                                <span className="text-slate-400">—</span>
                                                                <span>{emp.value.split('-').slice(1).join('-').trim()}</span>
                                                            </span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {/* ── Đã có task ── */}
                                            {filteredAssigned.length > 0 && (
                                                <>
                                                    {filteredUnassigned.length > 0 && (
                                                        <div className="sticky top-0 z-[9] px-3 py-2 bg-slate-50 border-y border-slate-200 flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã có task</span>
                                                            <span className="ml-auto text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{filteredAssigned.length}</span>
                                                        </div>
                                                    )}
                                                    {filteredAssigned.slice(0, 30).map(emp => (
                                                        <button key={emp.value} type="button" onClick={() => selectEmp(emp)}
                                                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 ${
                                                                formData.employeeName && emp.label.includes(formData.employeeName) ? 'bg-sky-50 text-sky-800 font-medium' : 'text-slate-700'
                                                            }`}>
                                                            <span className="font-semibold text-sky-700">{emp.value.split('-')[0]?.trim()}</span>
                                                            <span className="text-slate-400"> — </span>
                                                            <span>{emp.value.split('-').slice(1).join('-').trim()}</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {filteredAll.length === 0 && (
                                                <div className="px-3 py-4 text-sm text-slate-400 text-center">Không tìm thấy nhân viên</div>
                                            )}
                                        </div>
                                    </>
                                    );
                                })()}
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Nhóm công việc</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={groupCVSearch || formData.groupCV}
                                        onChange={(e) => {
                                            setGroupCVSearch(e.target.value);
                                            setGroupDropOpen(true);
                                            if (!e.target.value) {
                                                setFormData({ ...formData, groupCV: '', taskDetail: '', address: '' });
                                            }
                                        }}
                                        onFocus={() => setGroupDropOpen(true)}
                                        placeholder="Tìm kiếm nhóm công việc..."
                                        className="w-full h-10 px-3 pr-8 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 transition-all"
                                        autoComplete="off"
                                    />
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {groupDropOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setGroupDropOpen(false)} />
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                                            {uniqueGroups
                                                .filter(g => {
                                                    const q = (groupCVSearch || '').toLowerCase();
                                                    return !q || g.toLowerCase().includes(q);
                                                })
                                                .slice(0, 50)
                                                .map(g => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => {
                                                            const matched = groupCVData.find(row => row.GROUP === g);
                                                            const newTaskDetail = matched?.Loai_Khai_Thac || formData.taskDetail;
                                                            const newAddress = matched?.Dia_Chi || formData.address;
                                                            setFormData({
                                                                ...formData,
                                                                groupCV: g,
                                                                taskDetail: newTaskDetail,
                                                                address: newAddress,
                                                            });
                                                            setGroupCVSearch(g);
                                                            setTaskDetailSearch(newTaskDetail);
                                                            setAddressSearch(newAddress);
                                                            setGroupDropOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 ${formData.groupCV === g ? 'bg-sky-50 text-sky-800 font-medium' : 'text-slate-700'
                                                            }`}
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                            {uniqueGroups.filter(g => {
                                                const q = (groupCVSearch || '').toLowerCase();
                                                return !q || g.toLowerCase().includes(q);
                                            }).length === 0 && (
                                                    <div className="px-3 py-4 text-sm text-slate-400 text-center">Không tìm thấy nhóm CV</div>
                                                )}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Công việc (Loại khai thác) — Autocomplete */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Công việc (Loại khai thác)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={taskDetailSearch || formData.taskDetail}
                                        onChange={(e) => {
                                            setTaskDetailSearch(e.target.value);
                                            setTaskDetailDropOpen(true);
                                            setFormData({ ...formData, taskDetail: e.target.value });
                                        }}
                                        onFocus={() => setTaskDetailDropOpen(true)}
                                        placeholder={formData.groupCV ? `Gợi ý theo ${formData.groupCV}...` : 'Nhập hoặc chọn công việc...'}
                                        className="w-full h-10 px-3 pr-8 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 transition-all"
                                        autoComplete="off"
                                    />
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {taskDetailDropOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setTaskDetailDropOpen(false)} />
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {taskDetailSuggestions
                                                .filter(s => {
                                                    const q = (taskDetailSearch || '').toLowerCase();
                                                    return !q || s.toLowerCase().includes(q);
                                                })
                                                .slice(0, 30)
                                                .map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, taskDetail: s });
                                                            setTaskDetailSearch(s);
                                                            setTaskDetailDropOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 ${formData.taskDetail === s ? 'bg-sky-50 text-sky-800 font-medium' : 'text-slate-700'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            {taskDetailSuggestions.filter(s => {
                                                const q = (taskDetailSearch || '').toLowerCase();
                                                return !q || s.toLowerCase().includes(q);
                                            }).length === 0 && (
                                                <div className="px-3 py-3 text-sm text-slate-400 text-center">Không có gợi ý • Nhập tự do</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Địa chỉ — Autocomplete */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Địa chỉ</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={addressSearch || formData.address}
                                        onChange={(e) => {
                                            setAddressSearch(e.target.value);
                                            setAddressDropOpen(true);
                                            setFormData({ ...formData, address: e.target.value });
                                        }}
                                        onFocus={() => setAddressDropOpen(true)}
                                        placeholder={formData.groupCV ? `Gợi ý theo ${formData.groupCV}...` : 'Nhập hoặc chọn địa chỉ...'}
                                        className="w-full h-10 px-3 pr-8 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 transition-all"
                                        autoComplete="off"
                                    />
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {addressDropOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setAddressDropOpen(false)} />
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {addressSuggestions
                                                .filter(s => {
                                                    const q = (addressSearch || '').toLowerCase();
                                                    return !q || s.toLowerCase().includes(q);
                                                })
                                                .slice(0, 30)
                                                .map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, address: s });
                                                            setAddressSearch(s);
                                                            setAddressDropOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 ${formData.address === s ? 'bg-sky-50 text-sky-800 font-medium' : 'text-slate-700'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            {addressSuggestions.filter(s => {
                                                const q = (addressSearch || '').toLowerCase();
                                                return !q || s.toLowerCase().includes(q);
                                            }).length === 0 && (
                                                <div className="px-3 py-3 text-sm text-slate-400 text-center">Không có gợi ý • Nhập tự do</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Chi Phí (Nếu có)
                                    {modalMode === 'create' && formData.amount > 0 && (
                                        <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#D97706', fontWeight: 600, background: '#FFFBEB', padding: '1px 6px', borderRadius: 4, border: '1px solid #FDE68A' }}>
                                            💡 Gợi ý từ khoán
                                        </span>
                                    )}
                                </label>
                                <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    placeholder="0" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700" />
                            </div>
                        </div>
                        {saveMessage && (
                            <div className={`mx-6 mb-2 px-3 py-2 rounded-xl text-sm font-medium animate-fade-in ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {saveMessage.type === 'success' ? '✅ ' : '⚠️ '}{saveMessage.text}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                            <button onClick={() => { setModalMode(null); setSaveMessage(null); }}
                                className="h-10 px-5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                Hủy bỏ
                            </button>
                            <button onClick={handleSave} disabled={saveLoading}
                                className="h-10 px-5 text-sm font-medium text-white bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl hover:from-sky-700 hover:to-sky-800 transition-all shadow-sm shadow-sky-300 disabled:opacity-60">
                                {saveLoading ? 'Đang lưu...' : modalMode === 'create' ? 'Giao việc' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== POPUP: TaskDetail with Check-in/Check-out ========== */}
            {selectedTaskDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedTaskDetail(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-up">
                        {/* Popup Header with ❌ */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-800">📋 Chi tiết công việc</h2>
                            <button
                                onClick={() => setSelectedTaskDetail(null)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                                title="Đóng"
                            >
                                <IconX />
                            </button>
                        </div>
                        <div className="p-6">
                            <TaskDetail
                                                task={selectedTaskDetail}
                                                rawTasks={rawTaskData}
                                                qrCode={qrCodeMap[selectedTaskDetail.ID_Date_Task]?.qrCode}
                                tinhTrangTT={qrCodeMap[selectedTaskDetail.ID_Date_Task]?.tinhTrangTT}
                                onBack={() => setSelectedTaskDetail(null)}
                                onUpdate={(updatedTask) => {
                                    setRawTaskData(prev => prev.map(t => t.ID_Date_Task === updatedTask.ID_Date_Task ? updatedTask : t));
                                    setOrders(prev => prev.map(o => {
                                        if (o.id === updatedTask.ID_Date_Task) {
                                            return {
                                                ...o,
                                                status: updatedTask.Time_Out ? 'completed' as const
                                                    : updatedTask.Time_in ? 'in_progress' as const
                                                        : updatedTask.Confirm_Task ? 'in_progress' as const
                                                            : 'pending' as const,
                                                confirmTask: updatedTask.Confirm_Task || o.confirmTask,
                                            };
                                        }
                                        return o;
                                    }));
                                    setSelectedTaskDetail(updatedTask);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========== DELETE Confirm ========== */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm animate-scale-up">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                <IconTrash />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">Xác nhận xóa</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                Bạn có chắc chắn muốn xóa công việc <span className="font-semibold text-slate-700">{deleteConfirm}</span>?
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="flex-1 h-10 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                Hủy bỏ
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 h-10 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                                Xóa công việc
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
