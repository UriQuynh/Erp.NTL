'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import { Plus, Search, Check, X, Send, Trash2, User, Clock, ChevronRight, ChevronDown, Edit3, Calendar, LayoutList, Columns3, FolderPlus } from 'lucide-react';

const STATUSES = [
    { value: 'todo', label: 'Chờ xử lý', color: '#6B7280', bg: '#F3F4F6', icon: '○' },
    { value: 'in_progress', label: 'Đang thực hiện', color: '#2563EB', bg: '#EFF6FF', icon: '◐' },
    { value: 'review', label: 'Chờ duyệt', color: '#D97706', bg: '#FFFBEB', icon: '◑' },
    { value: 'done', label: 'Hoàn thành', color: '#059669', bg: '#ECFDF5', icon: '●' },
    { value: 'cancelled', label: 'Đã hủy', color: '#DC2626', bg: '#FEF2F2', icon: '✕' },
];
const PRIORITIES = [
    { value: 'urgent', label: 'Khẩn cấp', color: '#DC2626', icon: '🔴' },
    { value: 'high', label: 'Cao', color: '#EA580C', icon: '🟠' },
    { value: 'medium', label: 'Trung bình', color: '#2563EB', icon: '🔵' },
    { value: 'low', label: 'Thấp', color: '#6B7280', icon: '⚪' },
];

const fmtDate = (d: string) => { if (!d) return ''; const dt = new Date(d); if (isNaN(dt.getTime())) return d; const dd = String(dt.getDate()).padStart(2, '0'), mm = String(dt.getMonth() + 1).padStart(2, '0'), hh = String(dt.getHours()).padStart(2, '0'), mi = String(dt.getMinutes()).padStart(2, '0'); return hh !== '00' || mi !== '00' ? `${dd}/${mm}/${dt.getFullYear()} ${hh}:${mi}` : `${dd}/${mm}/${dt.getFullYear()}`; };
const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'vừa xong'; if (m < 60) return `${m} phút trước`; const h = Math.floor(m / 60); return h < 24 ? `${h} giờ trước` : `${Math.floor(h / 24)} ngày trước`; };
const getStatus = (v: string) => STATUSES.find(s => s.value === v) || STATUSES[0];
const splitIds = (s: string) => s ? s.split(',').filter(Boolean) : [];

let empCache: any[] = [];

export default function TasksPage() {
    const { user, isAuthenticated } = useERPAuth();
    const router = useRouter();
    const sp = useSearchParams();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>(sp.get('view') === 'kanban' ? 'kanban' : 'list');
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [taskComments, setTaskComments] = useState<any[]>([]);
    const [taskLogs, setTaskLogs] = useState<any[]>([]);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [detailTab, setDetailTab] = useState<'detail' | 'comments' | 'activity'>('detail');

    useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);

    useEffect(() => {
        if (empCache.length) { setEmployees(empCache); return; }
        fetch('/api/sync?module=employees').then(r => r.json()).then(d => {
            if (d.status === 'success') {
                const list = (d.data || []).map((e: any) => ({ maNV: e.M_NV || e['Mã_NV'] || '', hoTen: e.H_tn || e['Họ_tên'] || '', avatar: e.Avatar || '' })).filter((e: any) => e.maNV);
                empCache = list; setEmployees(list);
            }
        }).catch(() => {
            // Fallback: fetch from HRIS
            fetch('/api/hris?sheet=Ngan_Hang').then(r => r.json()).then(d => {
                if (d.success && d.data) {
                    const list = d.data.filter((e: any) => e.maNV && e.hoTen).map((e: any) => ({ maNV: e.maNV, hoTen: e.hoTen, avatar: '' }));
                    empCache = list; setEmployees(list);
                }
            }).catch(() => {});
        });
    }, []);

    const fetchProjects = useCallback(async () => {
        try { const r = await fetch('/api/projects'); const d = await r.json(); if (d.status === 'success') setProjects(d.data || []); } catch {}
    }, []);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (selectedProject) p.set('project', selectedProject);
            if (filterStatus) p.set('status', filterStatus);
            if (search) p.set('search', search);
            const r = await fetch(`/api/tasks?${p}`);
            const d = await r.json();
            if (d.status === 'success') setTasks(d.data || []);
        } catch {} setLoading(false);
    }, [selectedProject, filterStatus, search]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);
    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const empName = (id: string) => id ? employees.find(e => e.maNV === id)?.hoTen || id : 'Chưa gán';
    const empInitials = (id: string) => empName(id).split(' ').slice(-2).map((w: string) => w[0] || '').join('').toUpperCase();

    const isAdmin = user?.roles?.includes('Host') || user?.roles?.includes('Admin');
    const filtered = useMemo(() => {
        let r = [...tasks];
        if (!isAdmin && user) r = r.filter(t => { const a = splitIds(t.assignee_id); return t.creator_id === user.maNV || a.includes(user.maNV); });
        if (filterPriority) r = r.filter(t => t.priority === filterPriority);
        return r;
    }, [tasks, filterPriority, isAdmin, user]);

    const updateTask = async (id: string, data: any) => {
        if (!user) return;
        try { await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, user_id: user.maNV }) }); fetchTasks(); if (selectedTask?.id === id) openTaskDetail(id); } catch {}
    };

    const openTaskDetail = async (id: string) => {
        try { const r = await fetch(`/api/tasks/${id}`); const d = await r.json(); if (d.status === 'success') { setSelectedTask(d.data); setTaskComments(d.data.comments || []); setTaskLogs(d.data.activity_logs || []); setDetailTab('detail'); } } catch {}
    };

    const addComment = async (content: string) => {
        if (!user || !selectedTask) return;
        try { await fetch(`/api/tasks/${selectedTask.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.maNV, content }) }); openTaskDetail(selectedTask.id); } catch {}
    };

    const createTask = async (data: any) => {
        if (!user) return;
        setShowCreateTask(false);
        const payload = { ...data, creator_id: user.maNV, project_id: data.project_id || selectedProject };
        try {
            const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const d = await r.json();
            if (d.status === 'success' && data.sub_tasks?.length) {
                for (const st of data.sub_tasks) {
                    if (st.title?.trim()) await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: st.title.trim(), creator_id: user.maNV, parent_id: d.data.id, assignee_id: st.assignee_id || '', due_date: st.due_date || '', project_id: payload.project_id }) });
                }
            }
            fetchTasks();
        } catch { fetchTasks(); }
    };

    const deleteTask = async (id: string) => {
        if (!user || !confirm('Bạn có chắc muốn xóa task này?')) return;
        try { await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.maNV }) }); setTasks(t => t.filter(x => x.id !== id)); if (selectedTask?.id === id) setSelectedTask(null); fetchTasks(); } catch {}
    };

    const createProject = async (name: string, color: string, icon: string) => {
        if (!user) return;
        try { await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color, icon, owner_id: user.maNV }) }); setShowCreateProject(false); fetchProjects(); } catch {}
    };

    if (!user) return null;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
            {/* ═══ Project Sidebar ═══ */}
            <div style={{ width: 240, borderRight: '1px solid var(--c-border, #E2E8F0)', background: '#FAFBFC', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy, #0A1D37)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Dự án</span>
                    <button onClick={() => setShowCreateProject(true)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--c-border, #E2E8F0)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} color="var(--c-navy, #0A1D37)" /></button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
                    <button onClick={() => setSelectedProject(null)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: selectedProject ? 400 : 600, background: selectedProject ? 'transparent' : '#EFF6FF', color: selectedProject ? '#374151' : '#2563EB', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>📋 Tất cả nhiệm vụ</button>
                    {projects.map(p => (
                        <button key={p.id} onClick={() => setSelectedProject(p.id)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: selectedProject === p.id ? 600 : 400, background: selectedProject === p.id ? '#EFF6FF' : 'transparent', color: selectedProject === p.id ? '#2563EB' : '#374151', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>{p.icon} {p.name}</button>
                    ))}
                </div>
            </div>

            {/* ═══ Main Content ═══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--c-border, #E2E8F0)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#fff' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhiệm vụ..." style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 13, outline: 'none', background: '#F9FAFB' }} />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 13, outline: 'none', background: '#fff', color: '#374151' }}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                    </select>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 13, outline: 'none', background: '#fff', color: '#374151' }}>
                        <option value="">Tất cả ưu tiên</option>
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
                        <button onClick={() => setViewMode('list')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: viewMode === 'list' ? '#fff' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: viewMode === 'list' ? 600 : 400, color: viewMode === 'list' ? 'var(--c-navy, #0A1D37)' : '#6B7280', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}><LayoutList size={13} /> List</button>
                        <button onClick={() => setViewMode('kanban')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: viewMode === 'kanban' ? '#fff' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: viewMode === 'kanban' ? 600 : 400, color: viewMode === 'kanban' ? 'var(--c-navy, #0A1D37)' : '#6B7280', boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}><Columns3 size={13} /> Kanban</button>
                    </div>
                    <button onClick={() => setShowCreateTask(true)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--c-navy, #0A1D37)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginLeft: 'auto' }}><Plus size={14} /> Tạo nhiệm vụ</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: viewMode === 'kanban' ? '16px 20px' : 0 }}>
                    {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</div> :
                        viewMode === 'list' ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead><tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--c-border, #E2E8F0)' }}>
                                    {['', 'Task Title', 'Owner', 'Start Time', 'Due Date', 'Assigned by', ''].map((h, i) => (
                                        <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: 11, whiteSpace: 'nowrap', width: i === 6 ? 36 : undefined }}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>{search ? 'Không tìm thấy nhiệm vụ' : 'Chưa có nhiệm vụ nào.'}</td></tr> :
                                        filtered.map(task => {
                                            const st = getStatus(task.status);
                                            const assignees = splitIds(task.assignee_id);
                                            const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                                            const subs = (task.sub_tasks || []).length;
                                            const doneSubs = (task.sub_tasks || []).filter((s: any) => s.status === 'done').length;
                                            return (
                                                <tr key={task.id} onClick={() => openTaskDetail(task.id)} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                                    <td style={{ padding: '8px 4px 8px 12px', width: 28 }}>
                                                        <button onClick={e => { e.stopPropagation(); updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); }} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${st.color}`, background: task.status === 'done' ? st.color : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {task.status === 'done' && <Check size={11} color="#fff" strokeWidth={3} />}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', maxWidth: 350 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {subs > 0 && <ChevronRight size={14} color="#9CA3AF" />}
                                                            <span style={{ fontWeight: 500, color: task.status === 'done' ? '#9CA3AF' : '#1E293B', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                                                            {subs > 0 && <span style={{ fontSize: 11, color: doneSubs === subs ? '#059669' : '#6B7280', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>⌊ {doneSubs}/{subs}</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            {assignees.length === 0 && <span style={{ fontSize: 11, color: '#D1D5DB' }}>—</span>}
                                                            {assignees.slice(0, 3).map((a, i) => (
                                                                <div key={a} title={empName(a)} style={{ width: 26, height: 26, borderRadius: '50%', background: ['#1D354D', '#2563EB', '#7C3AED', '#059669'][i % 4], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, border: '2px solid #fff', marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, position: 'relative' }}>{empInitials(a)}</div>
                                                            ))}
                                                            {assignees.length === 1 && <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>{empName(assignees[0])}</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6B7280' }}>{fmtDate(task.start_date) || ''}</td>
                                                    <td style={{ padding: '8px 12px', fontSize: 12, color: overdue ? '#DC2626' : '#6B7280', fontWeight: overdue ? 600 : 400 }}>{overdue && '⚠ '}{fmtDate(task.due_date) || ''}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#E5E7EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{empInitials(task.creator_id)}</div>
                                                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{empName(task.creator_id)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 4px', width: 36 }}>
                                                        {(isAdmin || task.creator_id === user?.maNV) && <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} title="Xóa task" style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}><Trash2 size={13} color="#DC2626" /></button>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        ) : (
                            /* Kanban View */
                            <div style={{ display: 'flex', gap: 16, height: '100%', minWidth: 'fit-content' }}>
                                {STATUSES.filter(s => s.value !== 'cancelled').map(status => {
                                    const col = filtered.filter(t => t.status === status.value);
                                    return (
                                        <div key={status.value} style={{ width: 300, background: '#F8FAFC', borderRadius: 12, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                                            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.color }} />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy, #0A1D37)' }}>{status.label}</span>
                                                    <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, background: '#fff', padding: '1px 6px', borderRadius: 10 }}>{col.length}</span>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
                                                {col.map(task => {
                                                    const pri = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[2];
                                                    const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                                                    return (
                                                        <div key={task.id} onClick={() => openTaskDetail(task.id)} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = ''; }}>
                                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ fontSize: 11 }}>{pri.icon}</span>
                                                                    {task.due_date && <span style={{ fontSize: 11, color: overdue ? '#DC2626' : '#6B7280', display: 'flex', alignItems: 'center', gap: 2 }}><Calendar size={10} />{fmtDate(task.due_date)}</span>}
                                                                </div>
                                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: task.assignee_id ? 'var(--c-navy, #0A1D37)' : '#E5E7EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{empInitials(task.assignee_id)}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </div>
            </div>

            {/* ═══ Task Detail Panel ═══ */}
            {selectedTask && (
                <div style={{ width: 460, borderLeft: '1px solid var(--c-border, #E2E8F0)', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '-4px 0 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
                            {(['detail', 'comments', 'activity'] as const).map(tab => (
                                <button key={tab} onClick={() => setDetailTab(tab)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: detailTab === tab ? 600 : 400, background: detailTab === tab ? '#fff' : 'transparent', color: detailTab === tab ? 'var(--c-navy, #0A1D37)' : '#6B7280', cursor: 'pointer' }}>
                                    {tab === 'detail' ? 'Chi tiết' : tab === 'comments' ? `💬 ${taskComments.length}` : `📝 ${taskLogs.length}`}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setSelectedTask(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border, #E2E8F0)', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#6B7280" /></button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                        {detailTab === 'detail' && <>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-navy, #0A1D37)', margin: '0 0 16px', lineHeight: 1.4 }}>{selectedTask.title}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px 16px', fontSize: 13 }}>
                                <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Trạng thái</span>
                                <select value={selectedTask.status} onChange={e => updateTask(selectedTask.id, { status: e.target.value })} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 13, outline: 'none' }}>{STATUSES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}</select>
                                <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Ưu tiên</span>
                                <select value={selectedTask.priority} onChange={e => updateTask(selectedTask.id, { priority: e.target.value })} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 13, outline: 'none' }}>{PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}</select>
                                <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Người gán</span>
                                <span style={{ color: '#374151' }}>{empName(selectedTask.creator_id)}</span>
                                <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Thực hiện</span>
                                <span style={{ color: '#374151' }}>{empName(selectedTask.assignee_id)}</span>
                                <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Hạn chót</span>
                                <span style={{ color: selectedTask.due_date && new Date(selectedTask.due_date) < new Date() ? '#DC2626' : '#374151' }}>{fmtDate(selectedTask.due_date) || '—'}</span>
                                <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Tạo lúc</span>
                                <span style={{ color: '#6B7280' }}>{timeAgo(selectedTask.created_at)}</span>
                            </div>
                            {selectedTask.description && <div style={{ marginTop: 20, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6', fontSize: 13, lineHeight: 1.6, color: '#374151' }}>{selectedTask.description}</div>}
                            {(selectedTask.sub_tasks || []).length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-navy, #0A1D37)', marginBottom: 8, textTransform: 'uppercase' }}>Sub-tasks ({(selectedTask.sub_tasks || []).filter((s: any) => s.status === 'done').length}/{(selectedTask.sub_tasks || []).length})</h4>
                                    {(selectedTask.sub_tasks || []).map((st: any) => (
                                        <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F9FAFB' }}>
                                            <button onClick={() => updateTask(st.id, { status: st.status === 'done' ? 'todo' : 'done' })} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${getStatus(st.status).color}`, background: st.status === 'done' ? getStatus(st.status).color : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{st.status === 'done' && <Check size={10} color="#fff" strokeWidth={3} />}</button>
                                            <span style={{ fontSize: 13, color: st.status === 'done' ? '#9CA3AF' : '#374151', textDecoration: st.status === 'done' ? 'line-through' : 'none' }}>{st.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>}
                        {detailTab === 'comments' && <>
                            {taskComments.map((c: any) => (
                                <div key={c.id} style={{ marginBottom: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-navy, #0A1D37)' }}>{empName(c.user_id)}</span>
                                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(c.created_at)}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{c.content}</div>
                                </div>
                            ))}
                            {taskComments.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20, fontSize: 13 }}>Chưa có bình luận</div>}
                            <CommentInput onSubmit={addComment} />
                        </>}
                        {detailTab === 'activity' && <>
                            {taskLogs.map((l: any) => (
                                <div key={l.id} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 12 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB', marginTop: 5, flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontWeight: 600, color: 'var(--c-navy, #0A1D37)' }}>{empName(l.user_id)}</span>{' '}
                                        <span style={{ color: '#6B7280' }}>{l.action === 'created' ? 'đã tạo nhiệm vụ' : l.action === 'status_changed' ? `đổi trạng thái → ${getStatus(l.new_value || '').label}` : `cập nhật ${l.field_name}`}</span>
                                        <div style={{ color: '#9CA3AF', marginTop: 2, fontSize: 11 }}>{timeAgo(l.created_at)}</div>
                                    </div>
                                </div>
                            ))}
                            {taskLogs.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20, fontSize: 13 }}>Chưa có hoạt động</div>}
                        </>}
                    </div>
                </div>
            )}

            {/* ═══ Create Task Modal ═══ */}
            {showCreateTask && <CreateTaskModal employees={employees} projects={projects} selectedProject={selectedProject} onClose={() => setShowCreateTask(false)} onSave={createTask} />}
            {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSave={createProject} />}
        </div>
    );
}

function CommentInput({ onSubmit }: { onSubmit: (c: string) => void }) {
    const [val, setVal] = useState('');
    return (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onSubmit(val); setVal(''); } }} placeholder="Viết bình luận..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 13, outline: 'none' }} />
            <button onClick={() => { if (val.trim()) { onSubmit(val); setVal(''); } }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--c-navy, #0A1D37)', color: '#fff', cursor: 'pointer' }}><Send size={14} /></button>
        </div>
    );
}

function CreateTaskModal({ employees, projects, selectedProject, onClose, onSave }: any) {
    const [title, setTitle] = useState('');
    const [assignees, setAssignees] = useState<string[]>([]);
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [projectId, setProjectId] = useState(selectedProject || '');
    const [desc, setDesc] = useState('');
    const [showDesc, setShowDesc] = useState(false);
    const [subTasks, setSubTasks] = useState<any[]>([]);
    const [empSearch, setEmpSearch] = useState('');
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    const [saving, setSaving] = useState(false);

    const filteredEmps = employees.filter((e: any) => !empSearch || e.hoTen.toLowerCase().includes(empSearch.toLowerCase()) || e.maNV.includes(empSearch));
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const submit = () => {
        if (!title.trim() || saving) return;
        setSaving(true);
        onSave({ title: title.trim(), assignee_id: assignees.join(','), priority, due_date: dueDate || undefined, start_date: startDate || undefined, project_id: projectId || undefined, description: desc || undefined, sub_tasks: subTasks.filter((s: any) => s.title.trim()) });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '95%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
                <div style={{ padding: '20px 24px 0', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#9CA3AF" /></button>
                    <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && title.trim()) submit(); }} placeholder="Nhấn Enter để tạo nhiệm vụ" autoFocus style={{ width: '90%', padding: 0, border: 'none', fontSize: 17, fontWeight: 500, outline: 'none', color: '#1E293B', background: 'transparent' }} />
                </div>
                <div style={{ padding: '14px 24px', flex: 1, overflow: 'auto' }}>
                    {/* Assignee selector */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, position: 'relative', flexWrap: 'wrap' }}>
                        <User size={16} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 4 }} />
                        {assignees.map(a => (
                            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', background: '#F3F4F6', borderRadius: 16, fontSize: 12 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1D354D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{employees.find((e: any) => e.maNV === a)?.hoTen?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || a.slice(-2)}</div>
                                <span style={{ fontWeight: 500, color: '#374151' }}>{employees.find((e: any) => e.maNV === a)?.hoTen || a}</span>
                                <button onClick={() => setAssignees(x => x.filter(x => x !== a))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={11} color="#9CA3AF" /></button>
                            </div>
                        ))}
                        <input value={empSearch} onChange={e => { setEmpSearch(e.target.value); setShowEmpDropdown(true); }} onFocus={() => setShowEmpDropdown(true)} onBlur={() => setTimeout(() => setShowEmpDropdown(false), 200)} placeholder={assignees.length ? 'Thêm...' : 'Chọn người thực hiện...'} style={{ border: 'none', outline: 'none', fontSize: 13, color: '#6B7280', background: 'transparent', flex: 1, minWidth: 100, padding: '4px 0' }} />
                        <div style={{ marginLeft: 'auto', borderLeft: '1px solid #E5E7EB', paddingLeft: 8, flexShrink: 0 }}>
                            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer', background: 'transparent' }}>{PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}</select>
                        </div>
                        {showEmpDropdown && <div style={{ position: 'absolute', top: '100%', left: 24, right: 0, zIndex: 10, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, maxHeight: 200, overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4 }}>
                            {filteredEmps.filter((e: any) => !assignees.includes(e.maNV)).slice(0, 15).map((e: any) => (
                                <div key={e.maNV} onMouseDown={() => { if (!assignees.includes(e.maNV)) setAssignees(x => [...x, e.maNV]); setEmpSearch(''); setShowEmpDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={ev => (ev.currentTarget.style.background = '#F9FAFB')} onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1D354D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{e.hoTen.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()}</div>
                                    <span>{e.hoTen}</span>
                                    <span style={{ color: '#9CA3AF', marginLeft: 'auto', fontSize: 11 }}>{e.maNV}</span>
                                </div>
                            ))}
                        </div>}
                    </div>
                    {/* Due date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <Calendar size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
                        <button onClick={() => setDueDate(today + 'T18:00')} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: dueDate.startsWith(today) ? '2px solid #2563EB' : '1px solid #E5E7EB', background: dueDate.startsWith(today) ? '#EFF6FF' : '#fff', color: dueDate.startsWith(today) ? '#2563EB' : '#374151' }}>📅 Hôm nay</button>
                        <button onClick={() => setDueDate(tomorrow + 'T18:00')} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: dueDate.startsWith(tomorrow) ? '2px solid #059669' : '1px solid #E5E7EB', background: dueDate.startsWith(tomorrow) ? '#ECFDF5' : '#fff', color: dueDate.startsWith(tomorrow) ? '#059669' : '#374151' }}>📆 Ngày mai</button>
                        <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 11 }} />
                        {dueDate && <button onClick={() => setDueDate('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}><X size={13} color="#9CA3AF" /></button>}
                    </div>
                    {/* Project */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <FolderPlus size={16} color="#9CA3AF" />
                        <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ flex: 1, border: 'none', borderBottom: '1px solid #E5E7EB', outline: 'none', fontSize: 13, padding: '4px 0', background: 'transparent' }}>
                            <option value="">Không có dự án</option>
                            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                        </select>
                    </div>
                    {/* Description */}
                    {showDesc ? (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Edit3 size={16} color="#9CA3AF" /><span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Mô tả</span></div>
                            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Nhập mô tả..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginLeft: 24 }} />
                        </div>
                    ) : (
                        <div onClick={() => setShowDesc(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', color: '#9CA3AF', fontSize: 13 }}><Edit3 size={16} /> Thêm mô tả</div>
                    )}
                    {/* Sub-tasks */}
                    <div style={{ marginBottom: 14 }}>
                        {subTasks.map((st, i) => (
                            <div key={i} style={{ background: '#F9FAFB', borderRadius: 10, padding: '8px 12px', marginBottom: 6, marginLeft: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input value={st.title} onChange={e => { const n = [...subTasks]; n[i] = { ...n[i], title: e.target.value }; setSubTasks(n); }} placeholder="Tên sub-task..." style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'transparent', fontWeight: 500 }} />
                                    <button onClick={() => setSubTasks(x => x.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, opacity: 0.4 }}><X size={12} /></button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => setSubTasks(x => [...x, { title: '', assignee_id: '', due_date: '' }])} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#2563EB', fontWeight: 500, padding: '4px 0 0 24px', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Thêm Sub-task</button>
                    </div>
                </div>
                <div style={{ padding: '12px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>Hủy</button>
                    <button onClick={submit} disabled={!title.trim() || saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: title.trim() ? 'var(--c-navy, #0A1D37)' : '#E5E7EB', color: title.trim() ? '#fff' : '#9CA3AF', fontSize: 13, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'default' }}>{saving ? 'Đang tạo...' : 'Tạo'}</button>
                </div>
            </div>
        </div>
    );
}

function CreateProjectModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string, color: string, icon: string) => void }) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('📁');
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '95%', maxWidth: 400, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy, #0A1D37)', margin: '0 0 16px' }}>📁 Tạo dự án mới</h3>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' }}>Tên dự án</label>
                <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="VD: NTL Logistics Q2" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--c-border, #E2E8F0)', fontSize: 14, outline: 'none', marginBottom: 14 }} />
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' }}>Icon</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {['📁', '🚀', '💼', '🎯', '📊', '🔧', '🌟', '📦', '🏗️', '💡'].map(ic => (
                        <button key={ic} onClick={() => setIcon(ic)} style={{ width: 36, height: 36, borderRadius: 8, border: icon === ic ? '2px solid var(--c-navy, #0A1D37)' : '1px solid #E5E7EB', background: icon === ic ? '#EFF6FF' : '#fff', fontSize: 16, cursor: 'pointer' }}>{ic}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c-border, #E2E8F0)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Hủy</button>
                    <button onClick={() => { if (name.trim()) onSave(name, '#1D354D', icon); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--c-navy, #0A1D37)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Tạo dự án</button>
                </div>
            </div>
        </div>
    );
}
