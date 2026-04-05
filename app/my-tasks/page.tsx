"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import { CheckSquare, Clock, AlertCircle, Filter, RefreshCw, ChevronRight } from 'lucide-react';

interface Task {
    id: string; taskDetail: string; groupCV: string; status: string;
    date: string; address: string; timeRequired: string; confirmTask: string;
}

function getStatusStyle(st: string) {
    if (st === 'completed' || st === 'done') return { bg: '#ECFDF5', color: '#059669', label: 'Hoàn thành' };
    if (st === 'in_progress' || st === 'processing') return { bg: '#EFF6FF', color: '#2563EB', label: 'Đang xử lý' };
    if (st === 'cancelled') return { bg: '#FEF2F2', color: '#DC2626', label: 'Đã hủy' };
    return { bg: '#FFF7ED', color: '#EA580C', label: 'Chờ xử lý' };
}

export default function MyTasksPage() {
    const { user, isAuthenticated } = useERPAuth();
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        if (!isAuthenticated) { router.push('/login'); return; }
        fetchTasks();
    }, [isAuthenticated, router]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/orders');
            const json = await res.json();
            if (json.success && json.orders) {
                const myMaNV = user?.maNV || '';
                const myTasks = json.orders
                    .filter((o: any) => o.employeeCode === myMaNV || o.Ma_NV === myMaNV)
                    .map((o: any) => ({
                        id: o.id || o.STT || '',
                        taskDetail: o.taskDetail || o.Chi_Tiet || '',
                        groupCV: o.groupCV || o.Nhom_CV || '',
                        status: o.status || 'pending',
                        date: o.date || o.Ngay || '',
                        address: o.address || o.Dia_Chi || '',
                        timeRequired: o.timeRequired || o.Thoi_Gian_Yeu_Cau || '',
                        confirmTask: o.confirmTask || o.Xac_Nhan || '',
                    }));
                setTasks(myTasks);
            }
        } catch { }
        setLoading(false);
    };

    const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => ['in_progress', 'processing'].includes(t.status)).length,
        completed: tasks.filter(t => ['completed', 'done'].includes(t.status)).length,
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E293B' }}>✅ Nhiệm vụ của tôi</h1>
                <p style={{ color: '#64748B', fontSize: '0.875rem' }}>Theo dõi công việc được giao — {user?.hoTen || 'NV'}</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Tổng', value: stats.total, icon: <CheckSquare size={20} />, gradient: 'linear-gradient(135deg, #1D354D, #2A4A6B)' },
                    { label: 'Chờ xử lý', value: stats.pending, icon: <Clock size={20} />, gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
                    { label: 'Đang xử lý', value: stats.inProgress, icon: <AlertCircle size={20} />, gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)' },
                    { label: 'Hoàn thành', value: stats.completed, icon: <CheckSquare size={20} />, gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ borderRadius: 16, padding: '1rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -8, right: -8, width: 48, height: 48, borderRadius: '50%', background: s.gradient, opacity: 0.1 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{s.icon}</div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>{s.label}</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B' }}>{s.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter + Refresh */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
                {['all', 'pending', 'in_progress', 'completed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '6px 14px', borderRadius: 8, border: filter === f ? '2px solid #1D354D' : '1px solid #E5E7EB',
                        background: filter === f ? '#1D354D' : '#fff', color: filter === f ? '#fff' : '#64748B',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                        {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ xử lý' : f === 'in_progress' ? 'Đang xử lý' : 'Hoàn thành'}
                    </button>
                ))}
                <button onClick={fetchTasks} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748B' }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Task List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                    <div className="spin" style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#1D354D', borderRadius: '50%', marginBottom: 8 }} />
                    <p>Đang tải...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: 16, color: '#94A3B8' }}>
                    <CheckSquare size={40} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ fontWeight: 600 }}>Không có nhiệm vụ nào</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map((t, i) => {
                        const st = getStatusStyle(t.status);
                        return (
                            <div key={t.id || i} className="glass-card glass-card-hover" style={{ borderRadius: 12, padding: '0.875rem 1.25rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>{t.taskDetail || t.groupCV || 'Công việc'}</span>
                                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.625rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#94A3B8' }}>
                                            {t.groupCV && <span>📋 {t.groupCV}</span>}
                                            {t.date && <span>📅 {t.date}</span>}
                                            {t.address && <span>📍 {t.address}</span>}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} color="#CBD5E1" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 0.8s linear infinite}`}</style>
        </div>
    );
}
