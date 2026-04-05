'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    LayoutDashboard, TrendingUp, CheckCircle2, Clock, AlertTriangle,
    Users, BarChart3, Activity, CalendarDays, ArrowUpRight, ArrowDownRight,
    RefreshCw, Zap, Target, Award, ChevronRight, MapPin, Briefcase,
} from 'lucide-react';
import { useERPAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TaskSummary {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    offDays: number;
}

interface EmployeeRank {
    name: string;
    code: string;
    tasks: number;
    completed: number;
    rate: number;
}

interface GroupSummary {
    name: string;
    count: number;
    color: string;
}

interface DailyTrend {
    date: string;
    label: string;
    total: number;
    completed: number;
}

// Status logic matching orders page
function deriveStatus(task: any): string {
    if (task.groupCV?.toUpperCase() === 'OFF') return 'off';
    if (task.timeOut) return 'completed';
    if (task.timeIn || task.confirmTask) return 'in_progress';
    return 'pending';
}

function formatVND(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return String(n);
}

// Mini Bar Chart component (CSS-only)
function MiniBarChart({ data, maxVal }: { data: { value: number; label: string }[]; maxVal: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
            {data.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div
                        style={{
                            width: '100%', minWidth: 6, maxWidth: 20,
                            height: Math.max(4, (d.value / (maxVal || 1)) * 40),
                            borderRadius: '3px 3px 0 0',
                            background: `linear-gradient(180deg, #1D354D, #2A4A6B)`,
                            transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                        }}
                    />
                    <span style={{ fontSize: '0.55rem', color: '#94A3B8', marginTop: 2 }}>{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// Donut Chart component (SVG)
function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
    const total = segments.reduce((s, d) => s + d.value, 0);
    const r = (size - 16) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {segments.map((seg, i) => {
                const pct = total > 0 ? seg.value / total : 0;
                const dash = pct * circumference;
                const gap = circumference - dash;
                const el = (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={14}
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
                        transform={`rotate(-90 ${cx} ${cy})`}
                    />
                );
                offset += dash;
                return el;
            })}
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#1E293B" fontSize="18" fontWeight="800">{total}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="500">Tổng CV</text>
        </svg>
    );
}

export default function DashboardPage() {
    const { user, isAuthenticated } = useERPAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rawOrders, setRawOrders] = useState<any[]>([]);
    const [lastRefresh, setLastRefresh] = useState<string>('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { router.push('/login'); return; }
        fetchDashboardData();
    }, [isAuthenticated, router]);

    const fetchDashboardData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch('/api/orders?days=7');
            const json = await res.json();
            if (json.success && json.data) {
                setRawOrders(json.data);
                setLastRefresh(new Date().toLocaleTimeString('vi-VN'));
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    // Compute stats
    const summary: TaskSummary = useMemo(() => {
        const s: TaskSummary = { total: 0, completed: 0, inProgress: 0, pending: 0, offDays: 0 };
        rawOrders.forEach(o => {
            const status = deriveStatus(o);
            s.total++;
            if (status === 'completed') s.completed++;
            else if (status === 'in_progress') s.inProgress++;
            else if (status === 'pending') s.pending++;
            else if (status === 'off') s.offDays++;
        });
        return s;
    }, [rawOrders]);

    // Today's stats
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const todayStats = useMemo(() => {
        const s = { total: 0, completed: 0, inProgress: 0, pending: 0, totalFee: 0 };
        rawOrders.forEach(o => {
            // Normalize date to yyyy-MM-dd
            let dateStr = o.date || '';
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length >= 3) {
                    const [p0, p1, y] = parts;
                    const d = parseInt(p0) > 12 ? p0 : p1;
                    const m = parseInt(p0) > 12 ? p1 : p0;
                    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                }
            }
            if (dateStr === todayStr) {
                const status = deriveStatus(o);
                s.total++;
                if (status === 'completed') s.completed++;
                else if (status === 'in_progress') s.inProgress++;
                else if (status === 'pending') s.pending++;
                s.totalFee += (parseFloat(o.fee) || 0) + (parseFloat(o.feeOther) || 0);
            }
        });
        return s;
    }, [rawOrders, todayStr]);

    // Top employees
    const topEmployees: EmployeeRank[] = useMemo(() => {
        const empMap = new Map<string, { name: string; code: string; total: number; completed: number }>();
        rawOrders.forEach(o => {
            if (!o.employeeName || o.groupCV?.toUpperCase() === 'OFF') return;
            const key = o.employeeCode || o.employeeName;
            const existing = empMap.get(key) || { name: o.employeeName, code: o.employeeCode || '', total: 0, completed: 0 };
            existing.total++;
            if (deriveStatus(o) === 'completed') existing.completed++;
            empMap.set(key, existing);
        });
        return Array.from(empMap.values())
            .map(e => ({ ...e, tasks: e.total, rate: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0 }))
            .sort((a, b) => b.tasks - a.tasks)
            .slice(0, 6);
    }, [rawOrders]);

    // Group CV distribution
    const groupDistribution: GroupSummary[] = useMemo(() => {
        const colors = ['#1D354D', '#2563EB', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
        const gMap = new Map<string, number>();
        rawOrders.forEach(o => {
            if (!o.groupCV || o.groupCV.toUpperCase() === 'OFF') return;
            gMap.set(o.groupCV, (gMap.get(o.groupCV) || 0) + 1);
        });
        return Array.from(gMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count], i) => ({ name, count, color: colors[i % colors.length] }));
    }, [rawOrders]);

    // Daily trend (last 7 days)
    const dailyTrend: DailyTrend[] = useMemo(() => {
        const days: DailyTrend[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            days.push({ date: ds, label, total: 0, completed: 0 });
        }
        rawOrders.forEach(o => {
            let dateStr = o.date || '';
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length >= 3) {
                    const [p0, p1, y] = parts;
                    const d = parseInt(p0) > 12 ? p0 : p1;
                    const m = parseInt(p0) > 12 ? p1 : p0;
                    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                }
            }
            const day = days.find(dd => dd.date === dateStr);
            if (day) {
                day.total++;
                if (deriveStatus(o) === 'completed') day.completed++;
            }
        });
        return days;
    }, [rawOrders]);

    const completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
    const trendMax = Math.max(...dailyTrend.map(d => d.total), 1);

    // Status donut segments
    const donutSegments = useMemo(() => [
        { value: summary.completed, color: '#10b981', label: 'Hoàn thành' },
        { value: summary.inProgress, color: '#2563EB', label: 'Đang xử lý' },
        { value: summary.pending, color: '#f59e0b', label: 'Chờ xử lý' },
    ], [summary]);

    // Greetings
    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Chào buổi sáng';
        if (h < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
                        border: '3px solid #E2E8F0', borderTopColor: '#1D354D',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Đang tải Dashboard...</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg, #1D354D, #2A4A6B)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(29, 53, 77, 0.25)',
                        }}>
                            <LayoutDashboard size={20} color="#FFD100" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
                                {greeting}, <span style={{ color: '#1D354D' }}>{user?.hoTen?.split(' ').pop()}</span> 👋
                            </h1>
                            <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                                Dashboard tổng quan · Dữ liệu 7 ngày gần nhất
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {lastRefresh && (
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                            Cập nhật: {lastRefresh}
                        </span>
                    )}
                    <button
                        onClick={() => fetchDashboardData(true)}
                        disabled={refreshing}
                        style={{
                            padding: '8px 14px', borderRadius: 10, border: '1px solid #E2E8F0',
                            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: 6, fontSize: '0.75rem', fontWeight: 600, color: '#64748B',
                            transition: 'all 0.2s',
                        }}
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Today's Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}
                className="responsive-grid-stats"
            >
                {[
                    {
                        label: 'Hôm nay', value: todayStats.total, icon: <CalendarDays size={20} />,
                        gradient: 'linear-gradient(135deg, #1D354D, #2A4A6B)',
                        sub: `${todayStats.completed} hoàn thành`,
                        change: todayStats.total > 0 ? `${Math.round((todayStats.completed / todayStats.total) * 100)}%` : '0%',
                        up: true,
                    },
                    {
                        label: 'Hoàn thành (7 ngày)', value: summary.completed, icon: <CheckCircle2 size={20} />,
                        gradient: 'linear-gradient(135deg, #10b981, #059669)',
                        sub: `Tỷ lệ ${completionRate}%`,
                        change: `${completionRate}%`,
                        up: completionRate >= 50,
                    },
                    {
                        label: 'Đang xử lý', value: summary.inProgress, icon: <Activity size={20} />,
                        gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                        sub: `Chờ check-out`,
                        change: '',
                        up: true,
                    },
                    {
                        label: 'Chờ xử lý', value: summary.pending, icon: <Clock size={20} />,
                        gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
                        sub: `Cần xác nhận`,
                        change: summary.pending > 10 ? '⚠️' : '✅',
                        up: summary.pending <= 10,
                    },
                ].map((card, i) => (
                    <div
                        key={i}
                        className="glass-card glass-card-hover animate-fade-in"
                        style={{ borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden', animationDelay: `${i * 0.06}s` }}
                    >
                        {/* Decorative gradient orb */}
                        <div style={{
                            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                            borderRadius: '50%', background: card.gradient, opacity: 0.08,
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: card.gradient, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: '#fff',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                            }}>
                                {card.icon}
                            </div>
                            {card.change && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    fontSize: '0.7rem', fontWeight: 700,
                                    color: card.up ? '#10b981' : '#ef4444',
                                    background: card.up ? '#ECFDF5' : '#FEF2F2',
                                    padding: '3px 8px', borderRadius: 6,
                                }}>
                                    {typeof card.change === 'string' && !card.change.includes('⚠') && !card.change.includes('✅') && (
                                        card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />
                                    )}
                                    {card.change}
                                </div>
                            )}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500, marginBottom: 4 }}>{card.label}</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>{card.value}</p>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 6 }}>{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Weekly Trend */}
                <div className="glass-card animate-fade-in" style={{ borderRadius: 16, padding: '20px', animationDelay: '0.25s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BarChart3 size={18} color="#1D354D" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Xu hướng 7 ngày</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.65rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D354D' }} />
                                Tổng
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                                HT
                            </span>
                        </div>
                    </div>
                    {/* Bar chart */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: '0 4px' }}>
                        {dailyTrend.map((d, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#64748B' }}>{d.total}</span>
                                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center' }}>
                                    <div style={{
                                        width: '45%', maxWidth: 24,
                                        height: Math.max(4, (d.total / trendMax) * 100),
                                        borderRadius: '4px 4px 0 0',
                                        background: 'linear-gradient(180deg, #1D354D, #2A4A6B)',
                                        transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                                    }} />
                                    <div style={{
                                        width: '45%', maxWidth: 24,
                                        height: Math.max(4, (d.completed / trendMax) * 100),
                                        borderRadius: '4px 4px 0 0',
                                        background: 'linear-gradient(180deg, #10b981, #059669)',
                                        transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.6rem', color: '#94A3B8', marginTop: 4 }}>{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Donut */}
                <div className="glass-card animate-fade-in" style={{ borderRadius: 16, padding: '20px', animationDelay: '0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Target size={18} color="#1D354D" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Phân bổ trạng thái</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                        <DonutChart segments={donutSegments} size={130} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {donutSegments.map((seg, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.2 }}>{seg.label}</p>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>{seg.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Employees + Group Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Top Employees */}
                <div className="glass-card animate-fade-in" style={{ borderRadius: 16, padding: '20px', animationDelay: '0.35s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Award size={18} color="#f59e0b" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Top nhân viên</span>
                        </div>
                        <Link href="/orders" style={{
                            fontSize: '0.7rem', color: '#1D354D', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none',
                        }}>
                            Xem tất cả <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {topEmployees.length === 0 ? (
                            <p style={{ color: '#94A3B8', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>
                                Chưa có dữ liệu
                            </p>
                        ) : topEmployees.map((emp, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                                borderRadius: 10, transition: 'background 0.15s',
                                background: i === 0 ? 'rgba(255, 209, 0, 0.06)' : 'transparent',
                            }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: i === 0 ? 'linear-gradient(135deg, #FFD100, #f59e0b)'
                                        : i === 1 ? 'linear-gradient(135deg, #CBD5E1, #94A3B8)'
                                            : i === 2 ? 'linear-gradient(135deg, #D97706, #B45309)'
                                                : '#F1F5F9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', fontWeight: 800, color: i < 3 ? '#fff' : '#64748B',
                                    flexShrink: 0,
                                }}>
                                    {i + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {emp.name}
                                    </p>
                                    <p style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{emp.code}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{emp.tasks} CV</p>
                                    <p style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 600 }}>{emp.rate}% HT</p>
                                </div>
                                {/* Progress bar */}
                                <div style={{
                                    width: 60, height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden', flexShrink: 0,
                                }}>
                                    <div style={{
                                        width: `${emp.rate}%`, height: '100%', borderRadius: 3,
                                        background: emp.rate >= 80 ? 'linear-gradient(90deg, #10b981, #059669)'
                                            : emp.rate >= 50 ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                                                : 'linear-gradient(90deg, #ef4444, #dc2626)',
                                        transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Group Distribution */}
                <div className="glass-card animate-fade-in" style={{ borderRadius: 16, padding: '20px', animationDelay: '0.4s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Briefcase size={18} color="#1D354D" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Nhóm công việc</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {groupDistribution.length === 0 ? (
                            <p style={{ color: '#94A3B8', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>
                                Chưa có dữ liệu
                            </p>
                        ) : groupDistribution.map((g, i) => {
                            const maxCount = groupDistribution[0]?.count || 1;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: '50%', background: g.color, flexShrink: 0,
                                    }} />
                                    <p style={{
                                        fontSize: '0.75rem', fontWeight: 500, color: '#475569',
                                        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {g.name}
                                    </p>
                                    <div style={{
                                        width: 120, height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden', flexShrink: 0,
                                    }}>
                                        <div style={{
                                            width: `${(g.count / maxCount) * 100}%`, height: '100%', borderRadius: 4,
                                            background: g.color,
                                            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1E293B', width: 32, textAlign: 'right' }}>
                                        {g.count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card animate-fade-in" style={{ borderRadius: 16, padding: '20px', animationDelay: '0.45s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Zap size={18} color="#f59e0b" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Truy cập nhanh</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    {[
                        { label: 'Giao việc', desc: 'Quản lý công việc', icon: <Briefcase size={20} />, path: '/orders', gradient: 'linear-gradient(135deg, #1D354D, #2A4A6B)' },
                        { label: 'Nhiệm vụ của tôi', desc: 'Công việc được giao', icon: <CheckCircle2 size={20} />, path: '/my-tasks', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                        { label: 'Lịch công tác', desc: 'Lịch trình tuần', icon: <CalendarDays size={20} />, path: '/calendar', gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)' },
                    ].map((action, i) => (
                        <Link
                            key={i}
                            href={action.path}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                                borderRadius: 12, border: '1px solid #E2E8F0', textDecoration: 'none',
                                transition: 'all 0.2s', cursor: 'pointer',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1';
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: action.gradient, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                            }}>
                                {action.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{action.label}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{action.desc}</p>
                            </div>
                            <ChevronRight size={16} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
                        </Link>
                    ))}
                </div>
            </div>

            {/* Responsive styles */}
            <style>{`
                @media (max-width: 768px) {
                    .responsive-grid-stats { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 640px) {
                    .responsive-grid-stats { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
