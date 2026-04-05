'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin,
    CheckCircle2, AlertCircle, RefreshCw, User, Briefcase, Eye,
} from 'lucide-react';
import { useERPAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface CalendarTask {
    id: string;
    date: string; // yyyy-MM-dd normalized
    rawDate: string;
    employeeCode: string;
    employeeName: string;
    groupCV: string;
    taskDetail: string;
    address: string;
    timeIn: string;
    timeOut: string;
    confirmTask: string;
    status: 'completed' | 'in_progress' | 'pending' | 'off';
    fee: number;
}

function normalizeDate(d: string): string {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parts = d.split('/');
    if (parts.length >= 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const y = parts[2];
        let day: number, month: number;
        if (p0 > 12) { day = p0; month = p1; }
        else if (p1 > 12) { day = p1; month = p0; }
        else { day = p0; month = p1; }
        return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return d;
}

function deriveStatus(o: any): CalendarTask['status'] {
    if (o.groupCV?.toUpperCase() === 'OFF') return 'off';
    if (o.timeOut) return 'completed';
    if (o.timeIn || o.confirmTask) return 'in_progress';
    return 'pending';
}

function getStatusStyle(status: CalendarTask['status']) {
    switch (status) {
        case 'completed': return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: 'Hoàn thành', dot: '#10b981' };
        case 'in_progress': return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Đang xử lý', dot: '#2563EB' };
        case 'off': return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'Nghỉ', dot: '#94A3B8' };
        default: return { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: 'Chờ xử lý', dot: '#f59e0b' };
    }
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAYS_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

export default function CalendarPage() {
    const { user, isAuthenticated } = useERPAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<CalendarTask[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { router.push('/login'); return; }
        fetchCalendarData();
    }, [isAuthenticated, router]);

    const fetchCalendarData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch('/api/orders?days=30');
            const json = await res.json();
            if (json.success && json.data) {
                const calTasks: CalendarTask[] = json.data.map((o: any) => ({
                    id: o.id || '',
                    date: normalizeDate(o.date || ''),
                    rawDate: o.date || '',
                    employeeCode: o.employeeCode || '',
                    employeeName: o.employeeName || '',
                    groupCV: o.groupCV || '',
                    taskDetail: o.taskDetail || '',
                    address: o.address || '',
                    timeIn: o.timeIn || '',
                    timeOut: o.timeOut || '',
                    confirmTask: o.confirmTask || '',
                    status: deriveStatus(o),
                    fee: (parseFloat(o.fee) || 0) + (parseFloat(o.feeOther) || 0),
                }));
                setTasks(calTasks);
            }
        } catch (err) {
            console.error('Calendar fetch error:', err);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const m = month === 0 ? 12 : month;
            const y = month === 0 ? year - 1 : year;
            days.push({
                date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                day: d, isCurrentMonth: false, isToday: false,
            });
        }

        // Current month days
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({
                date: dateStr, day: d, isCurrentMonth: true,
                isToday: dateStr === todayStr,
            });
        }

        // Next month days
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const m = month === 11 ? 1 : month + 2;
            const y = month === 11 ? year + 1 : year;
            days.push({
                date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                day: d, isCurrentMonth: false, isToday: false,
            });
        }

        return days;
    }, [currentDate]);

    // Tasks grouped by date
    const tasksByDate = useMemo(() => {
        const map = new Map<string, CalendarTask[]>();
        tasks.forEach(t => {
            const existing = map.get(t.date) || [];
            existing.push(t);
            map.set(t.date, existing);
        });
        return map;
    }, [tasks]);

    // Selected date tasks
    const selectedTasks = useMemo(() => {
        if (!selectedDate) return [];
        return tasksByDate.get(selectedDate) || [];
    }, [selectedDate, tasksByDate]);

    // Week view dates
    const weekDates = useMemo(() => {
        const start = new Date(currentDate);
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return {
                date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                day: d.getDate(),
                weekday: WEEKDAYS_FULL[d.getDay()],
                isToday: d.toDateString() === new Date().toDateString(),
            };
        });
    }, [currentDate]);

    const navigateMonth = (delta: number) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + delta);
            return d;
        });
    };

    const navigateWeek = (delta: number) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + delta * 7);
            return d;
        });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        const today = new Date();
        setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
                        border: '3px solid #E2E8F0', borderTopColor: '#1D354D',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Đang tải Lịch...</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                        }}>
                            <CalendarDays size={20} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E293B' }}>Lịch Công tác</h1>
                            <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                                Theo dõi lịch trình công việc · {user?.hoTen || 'Nhân viên'}
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* View mode toggle */}
                    <div style={{
                        display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0',
                    }}>
                        <button onClick={() => setViewMode('month')} style={{
                            padding: '6px 12px', fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: viewMode === 'month' ? '#1D354D' : '#fff',
                            color: viewMode === 'month' ? '#fff' : '#64748B',
                            transition: 'all 0.15s',
                        }}>Tháng</button>
                        <button onClick={() => setViewMode('week')} style={{
                            padding: '6px 12px', fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: viewMode === 'week' ? '#1D354D' : '#fff',
                            color: viewMode === 'week' ? '#fff' : '#64748B',
                            transition: 'all 0.15s',
                        }}>Tuần</button>
                    </div>
                    <button onClick={goToToday} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                        background: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: '#1D354D',
                    }}>Hôm nay</button>
                    <button onClick={() => fetchCalendarData(true)} disabled={refreshing} style={{
                        padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0',
                        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.7rem', fontWeight: 600, color: '#64748B',
                    }}>
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '2fr 1fr' : '1fr', gap: 16 }}>
                {/* Calendar Grid */}
                <div className="glass-card" style={{ borderRadius: 16, padding: '20px', overflow: 'hidden' }}>
                    {/* Month Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <button onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)} style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0',
                            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ChevronLeft size={16} color="#64748B" />
                        </button>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>
                            {viewMode === 'month'
                                ? `${MONTHS_VI[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                                : `Tuần ${weekDates[0]?.day}/${currentDate.getMonth() + 1} - ${weekDates[6]?.day}/${currentDate.getMonth() + 1}`
                            }
                        </h2>
                        <button onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)} style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0',
                            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ChevronRight size={16} color="#64748B" />
                        </button>
                    </div>

                    {viewMode === 'month' ? (
                        <>
                            {/* Weekday headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                                {WEEKDAYS.map((wd, i) => (
                                    <div key={wd} style={{
                                        textAlign: 'center', fontSize: '0.65rem', fontWeight: 600,
                                        color: i === 0 ? '#ef4444' : '#94A3B8', padding: '6px 0',
                                    }}>
                                        {wd}
                                    </div>
                                ))}
                            </div>

                            {/* Day cells */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                                {calendarDays.map((day, i) => {
                                    const dayTasks = tasksByDate.get(day.date) || [];
                                    const isSelected = selectedDate === day.date;
                                    const hasCompleted = dayTasks.some(t => t.status === 'completed');
                                    const hasPending = dayTasks.some(t => t.status === 'pending');
                                    const hasInProgress = dayTasks.some(t => t.status === 'in_progress');

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(isSelected ? null : day.date)}
                                            style={{
                                                padding: '6px 4px', borderRadius: 10, border: 'none',
                                                cursor: 'pointer', minHeight: 56,
                                                background: isSelected ? '#1D354D'
                                                    : day.isToday ? 'rgba(29, 53, 77, 0.06)'
                                                        : 'transparent',
                                                transition: 'all 0.15s',
                                                opacity: day.isCurrentMonth ? 1 : 0.3,
                                                position: 'relative',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(29, 53, 77, 0.04)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected && !day.isToday) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                else if (!isSelected && day.isToday) (e.currentTarget as HTMLElement).style.background = 'rgba(29, 53, 77, 0.06)';
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: day.isToday || isSelected ? 700 : 500,
                                                color: isSelected ? '#fff' : day.isToday ? '#1D354D' : '#475569',
                                            }}>
                                                {day.day}
                                            </span>

                                            {/* Task dots */}
                                            {dayTasks.length > 0 && (
                                                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                    {hasCompleted && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? '#6EE7B7' : '#10b981' }} />}
                                                    {hasInProgress && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? '#93C5FD' : '#2563EB' }} />}
                                                    {hasPending && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? '#FCD34D' : '#f59e0b' }} />}
                                                </div>
                                            )}

                                            {dayTasks.length > 0 && (
                                                <span style={{
                                                    fontSize: '0.55rem', fontWeight: 600,
                                                    color: isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                                                }}>
                                                    {dayTasks.length} cv
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* Week View */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                            {weekDates.map((wd, i) => {
                                const dayTasks = tasksByDate.get(wd.date) || [];
                                const isSelected = selectedDate === wd.date;
                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <button
                                            onClick={() => setSelectedDate(isSelected ? null : wd.date)}
                                            style={{
                                                padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                                background: isSelected ? '#1D354D' : wd.isToday ? 'rgba(29,53,77,0.06)' : 'transparent',
                                                textAlign: 'center', transition: 'all 0.15s',
                                            }}
                                        >
                                            <p style={{
                                                fontSize: '0.6rem', fontWeight: 500,
                                                color: isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginBottom: 2,
                                            }}>{wd.weekday}</p>
                                            <p style={{
                                                fontSize: '1rem', fontWeight: 700,
                                                color: isSelected ? '#fff' : '#1E293B',
                                            }}>{wd.day}</p>
                                            {dayTasks.length > 0 && (
                                                <p style={{
                                                    fontSize: '0.6rem', fontWeight: 600, marginTop: 4,
                                                    color: isSelected ? '#FCD34D' : '#1D354D',
                                                }}>{dayTasks.length} cv</p>
                                            )}
                                        </button>
                                        {/* Task cards in week view */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {dayTasks.slice(0, 3).map((t, ti) => {
                                                const st = getStatusStyle(t.status);
                                                return (
                                                    <div key={ti} style={{
                                                        padding: '4px 6px', borderRadius: 6,
                                                        background: st.bg, borderLeft: `3px solid ${st.dot}`,
                                                        fontSize: '0.55rem', color: st.color, fontWeight: 500,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {t.groupCV || t.taskDetail}
                                                    </div>
                                                );
                                            })}
                                            {dayTasks.length > 3 && (
                                                <span style={{ fontSize: '0.55rem', color: '#94A3B8', textAlign: 'center' }}>
                                                    +{dayTasks.length - 3} thêm
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Hoàn thành', color: '#10b981' },
                            { label: 'Đang xử lý', color: '#2563EB' },
                            { label: 'Chờ xử lý', color: '#f59e0b' },
                        ].map(lg => (
                            <span key={lg.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: '#64748B' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: lg.color }} />
                                {lg.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Side Panel — Selected Day Details */}
                {selectedDate && (
                    <div className="glass-card animate-slide-in-right" style={{ borderRadius: 16, padding: '20px', alignSelf: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>Chi tiết ngày</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>
                                    {(() => {
                                        const [y, m, d] = selectedDate.split('-');
                                        const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                        return `${WEEKDAYS_FULL[dt.getDay()]}, ${d}/${m}`;
                                    })()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedDate(null)} style={{
                                width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0',
                                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                ✕
                            </button>
                        </div>

                        {/* Stats bar */}
                        <div style={{
                            display: 'flex', gap: 8, marginBottom: 16, padding: '10px 12px',
                            background: '#F8FAFC', borderRadius: 10,
                        }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>{selectedTasks.length}</p>
                                <p style={{ fontSize: '0.6rem', color: '#94A3B8' }}>Tổng</p>
                            </div>
                            <div style={{ width: 1, background: '#E2E8F0' }} />
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                                    {selectedTasks.filter(t => t.status === 'completed').length}
                                </p>
                                <p style={{ fontSize: '0.6rem', color: '#94A3B8' }}>HT</p>
                            </div>
                            <div style={{ width: 1, background: '#E2E8F0' }} />
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>
                                    {selectedTasks.filter(t => t.status === 'pending').length}
                                </p>
                                <p style={{ fontSize: '0.6rem', color: '#94A3B8' }}>Chờ</p>
                            </div>
                        </div>

                        {/* Task list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
                            {selectedTasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8' }}>
                                    <CalendarDays size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Không có công việc</p>
                                    <p style={{ fontSize: '0.7rem' }}>Ngày này chưa có lịch trình nào</p>
                                </div>
                            ) : selectedTasks.map((t, i) => {
                                const st = getStatusStyle(t.status);
                                return (
                                    <div
                                        key={t.id || i}
                                        className="animate-fade-in"
                                        style={{
                                            padding: '12px 14px', borderRadius: 10,
                                            border: `1px solid ${st.border}`, background: st.bg,
                                            animationDelay: `${i * 0.05}s`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            <span style={{
                                                width: 7, height: 7, borderRadius: '50%',
                                                background: st.dot, flexShrink: 0,
                                            }} />
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, color: st.color,
                                                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {t.groupCV || t.taskDetail || 'Công việc'}
                                            </span>
                                            <span style={{
                                                fontSize: '0.55rem', fontWeight: 600, padding: '2px 6px',
                                                borderRadius: 4, background: 'rgba(255,255,255,0.6)', color: st.color,
                                            }}>
                                                {st.label}
                                            </span>
                                        </div>

                                        {t.taskDetail && t.groupCV && (
                                            <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: 4, paddingLeft: 13 }}>
                                                <Briefcase size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                                {t.taskDetail}
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 13, fontSize: '0.65rem', color: '#64748B' }}>
                                            {t.employeeName && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <User size={10} />{t.employeeName}
                                                </span>
                                            )}
                                            {t.address && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <MapPin size={10} />{t.address}
                                                </span>
                                            )}
                                            {(t.timeIn || t.timeOut) && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <Clock size={10} />
                                                    {t.timeIn && `In: ${t.timeIn}`}
                                                    {t.timeOut && ` → Out: ${t.timeOut}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Responsive */}
            <style>{`
                @media (max-width: 768px) {
                    /* Stack calendar + detail on mobile */
                    div[style*="gridTemplateColumns: 2fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
