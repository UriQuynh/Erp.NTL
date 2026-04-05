'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getAuthUser, canCheckinTask, canConfirmTask, type AuthUser, type TaskRow } from '@/lib/rbac';

// ─── Icons ────────────────────────────────────────────────────
const IconCheck = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IconMapPin = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const IconCamera = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const IconClock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const IconX = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconArrowLeft = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
const IconNavigation = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
);

// ─── Helpers ──────────────────────────────────────────────────

function formatDateTime(date: Date): string {
    return date.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function parseVietnameseDateTime(str: string): Date | null {
    if (!str) return null;
    // Format: "dd/mm/yyyy hh:mm:ss" or "dd/mm/yyyy, hh:mm:ss"
    const cleaned = str.replace(',', '').trim();
    const match = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    if (match) {
        const [, day, month, year, hour, min, sec] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
    }
    // Fallback: try native Date parsing
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function calcWorkDuration(timeIn: string, timeOut: string): string {
    const din = parseVietnameseDateTime(timeIn);
    const dout = parseVietnameseDateTime(timeOut);
    if (!din || !dout) return '000:00:00';

    const diffMs = dout.getTime() - din.getTime();
    if (diffMs <= 0) return '000:00:00';

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(3, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getStatusConfig(task: TaskRow) {
    if (task.Time_Out) return { label: 'Hoàn thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    if (task.Time_in) return { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    if (task.Confirm_Task) return { label: 'Đã xác nhận', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' };
    return { label: 'Chờ xử lý', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
}

/**
 * Resolve an image value to a displayable URL.
 * Handles multiple image source formats:
 * 1. Full HTTP/HTTPS URLs → return as-is (or convert Google Drive links to thumbnails)
 * 2. Base64 data URIs → return as-is
 * 3. AppSheet paths like "Task_List_Images/xxx.jpg" → proxy via /api/appsheet-image
 * 4. Google Drive file IDs → convert to thumbnail URL
 */
function resolveImageUrl(image?: string): string | null {
    if (!image) return null;
    const trimmed = image.trim();
    if (!trimmed) return null;

    // Base64 data URI — return as-is
    if (trimmed.startsWith('data:image')) return trimmed;

    // Full URL
    if (trimmed.startsWith('http')) {
        // ─── Google Drive URL transformations ───
        const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveFileMatch) {
            return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w800`;
        }
        const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
        if (driveOpenMatch) {
            return `https://drive.google.com/thumbnail?id=${driveOpenMatch[1]}&sz=w800`;
        }
        const driveUcMatch = trimmed.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
        if (driveUcMatch) {
            return `https://drive.google.com/thumbnail?id=${driveUcMatch[1]}&sz=w800`;
        }
        const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
        if (lh3Match) {
            return `https://drive.google.com/thumbnail?id=${lh3Match[1]}&sz=w800`;
        }
        if (trimmed.includes('drive.google.com/thumbnail')) return trimmed;
        return trimmed;
    }

    // AppSheet path format: "Task_List_Images/xxx.jpg" or "folder/filename.ext"
    if (trimmed.includes('/') && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(trimmed)) {
        return `/api/appsheet-image?path=${encodeURIComponent(trimmed)}`;
    }
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(trimmed)) {
        return `/api/appsheet-image?path=${encodeURIComponent(trimmed)}`;
    }
    if (trimmed.length > 3) {
        return `/api/appsheet-image?path=${encodeURIComponent(trimmed)}`;
    }
    return null;
}

// ─── GPS & Camera Utilities ──────────────────────────────────

async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Thiết bị không hỗ trợ GPS'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => {
                switch (err.code) {
                    case 1: reject(new Error('Vui lòng cho phép truy cập vị trí')); break;
                    case 2: reject(new Error('Không thể xác định vị trí')); break;
                    case 3: reject(new Error('Hết thời gian xác định vị trí')); break;
                    default: reject(new Error('Lỗi GPS'));
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

// ─── Types ────────────────────────────────────────────────────

interface TaskDetailProps {
    task: TaskRow;
    rawTasks?: TaskRow[];
    qrCode?: string;
    tinhTrangTT?: string;
    onBack: () => void;
    onUpdate: (updatedTask: TaskRow) => void;
}

// ─── Main Component ──────────────────────────────────────────

export default function TaskDetail({ task, rawTasks, qrCode, tinhTrangTT, onBack, onUpdate }: TaskDetailProps) {
    const [currentTask, setCurrentTask] = useState<TaskRow>(task);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState<'confirm' | 'checkin' | 'checkout' | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('');
    const [showPayQR, setShowPayQR] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [popupImage, setPopupImage] = useState<string | null>(null);
    const [checkinBlockPopup, setCheckinBlockPopup] = useState<TaskRow[] | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const pendingAction = useRef<'checkin' | 'checkout' | null>(null);

    useEffect(() => {
        setUser(getAuthUser());
    }, []);

    const status = getStatusConfig(currentTask);

    // ─── Helpers ──────────────────────────────────────────────

    const clearMessage = () => setTimeout(() => setMessage(null), 4000);

    const saveToSheet = useCallback(async (updates: Record<string, string>, taskContext?: Record<string, string>) => {
        try {
            const res = await fetch('/api/sheets/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateTask',
                    taskId: currentTask.ID_Date_Task,
                    updates,
                    // Pass task context for Zalo notifications on check-in/check-out
                    ...(taskContext ? { taskContext } : {}),
                }),
            });
            const json = await res.json();
            return json.success;
        } catch {
            return false;
        }
    }, [currentTask.ID_Date_Task]);

    // ─── Action: Confirm Task ─────────────────────────────────

    const handleConfirm = useCallback(async () => {
        if (currentTask.Confirm_Task) return;
        setLoading('confirm');
        setMessage(null);

        const now = formatDateTime(new Date());
        const updated = { ...currentTask, Confirm_Task: now };

        const success = await saveToSheet({ Confirm_Task: now });
        if (success) {
            setCurrentTask(updated);
            onUpdate(updated);
            setMessage({ type: 'success', text: 'Đã xác nhận task thành công' });
        } else {
            setCurrentTask(updated);
            onUpdate(updated);
            setMessage({ type: 'success', text: 'Đã xác nhận task' });
        }

        // Send Zalo notification for confirmation (non-blocking)
        try {
            await fetch('/api/sheets/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendZaloConfirm',
                    nhanVien: currentTask.Nhan_Vien || '',
                    taskId: currentTask.ID_Date_Task || '',
                }),
            });
        } catch { /* non-critical */ }

        setLoading(null);
        clearMessage();
    }, [currentTask, saveToSheet, onUpdate]);

    // ─── Action: Camera Capture ───────────────────────────────

    const openCamera = useCallback((action: 'checkin' | 'checkout') => {
        if (action === 'checkin' && rawTasks) {
            const userMaNV = currentTask.Nhan_Vien?.split(/[-–]/)[0]?.trim();
            if (userMaNV) {
                const inProgressTasks = rawTasks.filter(t => {
                    const tMaNV = t.Nhan_Vien?.split(/[-–]/)[0]?.trim();
                    return tMaNV === userMaNV && t.ID_Date_Task !== currentTask.ID_Date_Task && t.Time_in && !t.Time_Out;
                });
                if (inProgressTasks.length > 0) {
                    setCheckinBlockPopup(inProgressTasks);
                    return;
                }
            }
        }
        pendingAction.current = action;
        setCapturedImage(null);
        cameraInputRef.current?.click();
    }, [currentTask.Nhan_Vien, currentTask.ID_Date_Task, rawTasks]);

    const handleImageCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pendingAction.current) return;

        const action = pendingAction.current;
        setLoading(action);
        setMessage(null);

        // Get GPS early so we can embed in watermark
        setGpsStatus('Đang xác định vị trí...');
        let coords = { lat: 0, lng: 0 };
        try {
            coords = await getCurrentPosition();
            setGpsStatus(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        } catch {
            setGpsStatus('Không lấy được GPS');
        }

        // Reverse geocode: lat,lng → address
        let addressStr = '';
        if (coords.lat !== 0 || coords.lng !== 0) {
            try {
                setGpsStatus('Đang xác định địa chỉ...');
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1&accept-language=vi`,
                    { headers: { 'User-Agent': 'ERP-NTL/1.0' } }
                );
                const geoJson = await geoRes.json();
                if (geoJson.display_name) {
                    // Shorten: remove country, postcode for compact display
                    addressStr = geoJson.display_name
                        .replace(/, Việt Nam$/i, '')
                        .replace(/, Vietnam$/i, '')
                        .replace(/,\s*\d{5,6}/g, ''); // remove postcode
                    // Limit length for watermark
                    if (addressStr.length > 80) addressStr = addressStr.substring(0, 77) + '...';
                }
                setGpsStatus(addressStr || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
            } catch {
                // Geocoding failed, keep raw coords
                setGpsStatus(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
            }
        }

        const captureTime = new Date();
        const timeStr = formatDateTime(captureTime);
        const coordStr = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
        const locationDisplay = addressStr || coordStr;
        const userName = user?.hoTen || user?.maNV || 'NV';

        // Convert image to compressed base64 with watermark (max ~200KB for Zalo)
        let base64Url = '';
        try {
            base64Url = await new Promise<string>((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 800;
                    let w = img.width, h = img.height;
                    if (w > MAX_SIZE || h > MAX_SIZE) {
                        if (w > h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
                        else { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(''); return; }

                    // Draw original image
                    ctx.drawImage(img, 0, 0, w, h);

                    // ═══ WATERMARK ═══
                    const barH = Math.max(85, h * 0.15);
                    const fontSize = Math.max(11, Math.round(w * 0.025));
                    const smallFont = Math.max(9, fontSize - 2);
                    const padding = Math.max(8, Math.round(w * 0.02));

                    // Semi-transparent gradient background at bottom
                    const grad = ctx.createLinearGradient(0, h - barH - 10, 0, h);
                    grad.addColorStop(0, 'rgba(0,0,0,0)');
                    grad.addColorStop(0.25, 'rgba(0,0,0,0.5)');
                    grad.addColorStop(1, 'rgba(0,0,0,0.78)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, h - barH - 10, w, barH + 10);

                    // Text styling
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.shadowBlur = 3;
                    ctx.textBaseline = 'bottom';

                    // Line 1: User name + action
                    ctx.font = `bold ${fontSize + 2}px "Segoe UI", Arial, sans-serif`;
                    const actionLabel = action === 'checkin' ? '📌 CHECK-IN' : '📌 CHECK-OUT';
                    ctx.fillText(`${actionLabel}  •  ${userName}`, padding, h - barH + fontSize + 6);

                    // Line 2: Time
                    ctx.font = `${fontSize}px "Segoe UI", Arial, sans-serif`;
                    ctx.fillText(`🕐 ${timeStr}`, padding, h - barH + fontSize * 2 + 14);

                    // Line 3: Address / Location
                    // Wrap long address to fit canvas width
                    const maxTextW = w - padding * 2 - 20;
                    let addrLine1 = locationDisplay;
                    let addrLine2 = '';
                    ctx.font = `${fontSize}px "Segoe UI", Arial, sans-serif`;
                    if (ctx.measureText(`📍 ${addrLine1}`).width > maxTextW && addrLine1.includes(',')) {
                        // Split at a comma near the middle
                        const mid = Math.floor(addrLine1.length / 2);
                        const commaIdx = addrLine1.indexOf(',', mid - 10);
                        if (commaIdx > 0) {
                            addrLine1 = addrLine1.substring(0, commaIdx + 1).trim();
                            addrLine2 = locationDisplay.substring(commaIdx + 1).trim();
                        }
                    }
                    ctx.fillText(`📍 ${addrLine1}`, padding, h - barH + fontSize * 3 + 20);
                    if (addrLine2) {
                        ctx.fillText(`    ${addrLine2}`, padding, h - barH + fontSize * 4 + 24);
                    }

                    // Line 4: Raw coords (small, subtle)
                    if (addressStr) {
                        ctx.font = `${smallFont}px Arial, sans-serif`;
                        ctx.fillStyle = 'rgba(255,255,255,0.6)';
                        const coordY = addrLine2 ? h - barH + fontSize * 5 + 28 : h - barH + fontSize * 4 + 24;
                        ctx.fillText(`GPS: ${coordStr}`, padding, coordY);
                    }

                    // ERP watermark text (top-right, subtle)
                    ctx.shadowBlur = 0;
                    ctx.font = `bold ${smallFont}px Arial, sans-serif`;
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.textBaseline = 'top';
                    ctx.textAlign = 'right';
                    ctx.fillText('ERP NTL', w - padding, padding);
                    ctx.textAlign = 'left';

                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.onerror = () => resolve('');
                img.src = URL.createObjectURL(file);
            });
        } catch {
            base64Url = '';
        }

        // Show preview immediately
        setCapturedImage(base64Url || URL.createObjectURL(file));

        // Upload image to cloud to get public URL
        let imageUrl = '';
        if (base64Url) {
            try {
                setGpsStatus('Đang tải ảnh lên...');
                const uploadRes = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Url }),
                });
                const uploadJson = await uploadRes.json();
                if (uploadJson.success && uploadJson.url) {
                    imageUrl = uploadJson.url;
                }
            } catch {
                console.error('Image upload failed');
            }
        }
        if (!imageUrl) imageUrl = `captured_${action}_${Date.now()}`;

        const now = timeStr;

        if (action === 'checkin') {
            const updated = {
                ...currentTask,
                Time_in: now,
                Local_in: coordStr,
                HA_IN: imageUrl,
            };
            await saveToSheet(
                { Time_in: now, Local_in: coordStr, HA_IN: imageUrl },
                {
                    type: 'checkin',
                    ID_Date_Task: currentTask.ID_Date_Task,
                    Nhan_Vien: currentTask.Nhan_Vien,
                    Group_CV: currentTask.Group_CV,
                    Cong_Viec: currentTask.Chi_Tiet || currentTask.Cong_Viec || '',
                    Dia_Chi: currentTask.Dia_Chi || '',
                    HA_IN: imageUrl,
                    Local_in: coordStr,
                }
            );
            setCurrentTask(updated);
            onUpdate(updated);
            setMessage({ type: 'success', text: `Check-in thành công lúc ${now}` });
        } else {
            const chamCong = currentTask.Time_in
                ? calcWorkDuration(currentTask.Time_in, now)
                : '000:00:00';
            const updated = {
                ...currentTask,
                Time_Out: now,
                Local_out: coordStr,
                HA_OUT: imageUrl,
                Cham_Cong: chamCong,
            };
            await saveToSheet(
                { Time_Out: now, Local_out: coordStr, HA_OUT: imageUrl, Cham_Cong: chamCong },
                {
                    type: 'checkout',
                    ID_Date_Task: currentTask.ID_Date_Task,
                    Nhan_Vien: currentTask.Nhan_Vien,
                    Group_CV: currentTask.Group_CV,
                    Cong_Viec: currentTask.Chi_Tiet || currentTask.Cong_Viec || '',
                    Cham_Cong: chamCong,
                    HA_OUT: imageUrl,
                    Local_out: coordStr,
                }
            );
            setCurrentTask(updated);
            onUpdate(updated);
            setMessage({ type: 'success', text: `Check-out thành công. Thời gian: ${chamCong}` });
        }

        setLoading(null);
        pendingAction.current = null;
        clearMessage();

        // Reset input
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    }, [currentTask, saveToSheet, onUpdate]);

    // ─── Permission checks ────────────────────────────────────

    const canConfirm = user ? canConfirmTask(user, currentTask) : false;
    const canCheckin = user ? canCheckinTask(user, currentTask) : false;
    const isAdminHost = user ? (user.roles || []).some(r => ['Admin', 'Host'].includes(r)) : false;
    const canViewQR = user ? (user.roles || []).some(r => ['Admin', 'Host', 'Điều Phối'].includes(r)) : false;

    const isConfirmed = !!currentTask.Confirm_Task;
    const isCheckedIn = !!currentTask.Time_in;
    const isCheckedOut = !!currentTask.Time_Out;

    // ─── Render ───────────────────────────────────────────────

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            {/* ═══ Mandatory Block Popup ═══ */}
            {checkinBlockPopup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    <div style={{
                        background: 'white', borderRadius: 16, maxWidth: 400, width: '100%',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                        <div style={{ background: '#ef4444', padding: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>Không thể Check-in</div>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ fontSize: 14, color: '#334155', marginBottom: 12 }}>
                                Bạn chưa Check-out các công việc trước đó. Vui lòng hoàn thành trước khi Check-in công việc mới!
                            </p>
                            <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {checkinBlockPopup.map((t, idx) => (
                                    <div key={idx} style={{ background: 'white', padding: '10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>Mã Task: {t.ID_Date_Task}</div>
                                        <div style={{ color: '#64748b', marginTop: 4 }}>Check-in lúc: <span style={{ color: '#2563eb', fontWeight: 500 }}>{t.Time_in}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setCheckinBlockPopup(null)}
                                style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600, padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden camera input */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageCapture}
            />

            {/* Header */}
            <div className="flex items-center gap-3 animate-fade-in">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
                >
                    <IconArrowLeft />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                        Chi tiết công việc
                    </h1>
                    <p className="text-xs text-slate-400 font-medium">{currentTask.ID_Date_Task}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${status.color}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    {status.label}
                </span>
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border animate-fade-in ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {message.type === 'success' ? '✓' : '!'}
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
                        <IconX />
                    </button>
                </div>
            )}

            {/* Task Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: '50ms' }}>
                <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-800">{currentTask.Cong_Viec || 'Công việc'}</h2>
                    {currentTask.Group_CV && (
                        <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[11px] font-semibold">
                            {currentTask.Group_CV}
                        </span>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* Chi tiết */}
                    {currentTask.Chi_Tiet && (
                        <div>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Chi tiết</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{currentTask.Chi_Tiet}</p>
                        </div>
                    )}

                    {/* Địa chỉ */}
                    {currentTask.Dia_Chi && (
                        <div className="flex items-start gap-2">
                            <span className="mt-0.5 text-slate-400"><IconMapPin /></span>
                            <div>
                                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Địa chỉ</p>
                                <p className="text-sm text-slate-700">{currentTask.Dia_Chi}</p>
                            </div>
                        </div>
                    )}

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <InfoCell label="Nhân viên" value={currentTask.Nhan_Vien || '—'} />
                        <InfoCell label="Ngày làm việc" value={currentTask.Ngay_Lam_Viec || '—'} />
                        <InfoCell label="Thời gian yêu cầu" value={currentTask.Time_YeuCau || '—'} />
                        <InfoCell label="Người tạo" value={currentTask.Nguoi_Tao || '—'} />
                        {currentTask.Phi && <InfoCell label="Phí" value={`${Number(currentTask.Phi).toLocaleString('vi-VN')}₫`} />}
                        {currentTask.Phi_Khac && <InfoCell label="Phí khác" value={`${Number(currentTask.Phi_Khac).toLocaleString('vi-VN')}₫`} />}
                    </div>
                </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <IconClock /> Timeline
                    </h3>
                </div>
                <div className="p-5">
                    <div className="space-y-4">
                        <TimelineItem
                            label="Xác nhận"
                            time={currentTask.Confirm_Task}
                            done={isConfirmed}
                            color="violet"
                            showDetails={false}
                        />
                        <TimelineItem
                            label="Check-in"
                            time={currentTask.Time_in}
                            location={currentTask.Local_in}
                            image={currentTask.HA_IN}
                            done={isCheckedIn}
                            color="blue"
                            showDetails={isAdminHost}
                            onImageClick={setPopupImage}
                        />
                        <TimelineItem
                            label="Check-out"
                            time={currentTask.Time_Out}
                            location={currentTask.Local_out}
                            image={currentTask.HA_OUT}
                            done={isCheckedOut}
                            color="emerald"
                            showDetails={isAdminHost}
                            onImageClick={setPopupImage}
                        />
                        {(currentTask.Cham_Cong || (isCheckedIn && isCheckedOut)) && (
                            <div className="flex items-center gap-3 pl-3">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                    <IconClock />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">Thời gian làm việc</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {currentTask.Cham_Cong || calcWorkDuration(currentTask.Time_in, currentTask.Time_Out)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Captured image preview */}
            {capturedImage && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 animate-fade-in">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Ảnh vừa chụp</p>
                    <img src={capturedImage} alt="Captured" className="w-full max-h-64 object-cover rounded-xl" />
                    {gpsStatus && (
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <IconNavigation /> {gpsStatus}
                        </p>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Thao tác</h3>

                {/* 1. Confirm Button */}
                <button
                    onClick={handleConfirm}
                    disabled={isConfirmed || !canConfirm || loading === 'confirm'}
                    className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: isConfirmed ? '#f1f5f9' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: isConfirmed ? '#94a3b8' : 'white',
                        boxShadow: isConfirmed ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.25)',
                    }}
                >
                    {loading === 'confirm' ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <IconCheck />
                    )}
                    {isConfirmed ? `Đã xác nhận — ${currentTask.Confirm_Task}` : 'Xác nhận Task'}
                </button>

                {/* 2. Check-in Button */}
                <button
                    onClick={() => openCamera('checkin')}
                    disabled={!isConfirmed || isCheckedIn || !canCheckin || loading === 'checkin'}
                    className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: isCheckedIn ? '#f1f5f9' : !isConfirmed ? '#f8fafc' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: isCheckedIn ? '#94a3b8' : !isConfirmed ? '#cbd5e1' : 'white',
                        boxShadow: isCheckedIn || !isConfirmed ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.25)',
                    }}
                >
                    {loading === 'checkin' ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <IconCamera />
                    )}
                    {isCheckedIn ? `Đã Check-in — ${currentTask.Time_in}` : 'Check-in (Chụp ảnh + GPS)'}
                </button>

                {/* 3. Check-out Button */}
                <button
                    onClick={() => openCamera('checkout')}
                    disabled={!isCheckedIn || isCheckedOut || !canCheckin || loading === 'checkout'}
                    className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: isCheckedOut ? '#f1f5f9' : !isCheckedIn ? '#f8fafc' : 'linear-gradient(135deg, #059669, #047857)',
                        color: isCheckedOut ? '#94a3b8' : !isCheckedIn ? '#cbd5e1' : 'white',
                        boxShadow: isCheckedOut || !isCheckedIn ? 'none' : '0 4px 14px rgba(5, 150, 105, 0.25)',
                    }}
                >
                    {loading === 'checkout' ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <IconCamera />
                    )}
                    {isCheckedOut ? `Đã Check-out — ${currentTask.Time_Out}` : 'Check-out (Chụp ảnh + GPS)'}
                </button>

                {/* 4. Payment Button */}
                {canViewQR && (
                    <button
                        onClick={async () => {
                            if (showPayQR) {
                                setShowPayQR(false);
                                return;
                            }
                            // If not paid yet, mark as paid
                            if (!tinhTrangTT?.includes('Đã thanh toán')) {
                                setPayLoading(true);
                                const now = new Date();
                                const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                await saveToSheet({ Tinh_Trang_TT: `Đã thanh toán - ${ts}` });
                                setPayLoading(false);
                            }
                            setShowPayQR(true);
                        }}
                        disabled={payLoading}
                        className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            background: showPayQR
                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                : tinhTrangTT?.includes('Đã thanh toán')
                                    ? '#f0fdf4'
                                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: showPayQR ? 'white' : tinhTrangTT?.includes('Đã thanh toán') ? '#15803d' : 'white',
                            boxShadow: showPayQR
                                ? '0 4px 14px rgba(239,68,68,0.25)'
                                : tinhTrangTT?.includes('Đã thanh toán')
                                    ? 'none'
                                    : '0 4px 14px rgba(245,158,11,0.25)',
                        }}
                    >
                        {payLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                        )}
                        {showPayQR ? 'Ẩn QR Thanh toán' : tinhTrangTT?.includes('Đã thanh toán') ? `✓ ${tinhTrangTT}` : 'Thanh toán VietQR'}
                    </button>
                )}

                {/* Flow guidance */}
                {!isConfirmed && (
                    <p className="text-xs text-slate-400 text-center pt-1">
                        Bước 1: Xác nhận task → Bước 2: Check-in → Bước 3: Check-out
                    </p>
                )}
            </div>

            {/* QR Payment - shown when toggle is ON */}
            {showPayQR && qrCode && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/50">
                        <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                            QR Thanh toán VietQR
                        </h3>
                    </div>
                    <div className="p-5">
                        <div className="flex flex-col items-center gap-4">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${tinhTrangTT?.includes('Đã thanh toán')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${tinhTrangTT?.includes('Đã thanh toán') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {tinhTrangTT || 'Chưa thanh toán'}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <img src={qrCode} alt={`QR thanh toán task ${currentTask.ID_Date_Task}`} className="w-56 h-auto rounded-lg" loading="lazy" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Mã Task</p>
                                <p className="text-sm font-bold text-sky-700">{currentTask.ID_Date_Task}</p>
                                {(currentTask.Phi || currentTask.Phi_Khac) && (
                                    <p className="text-lg font-extrabold text-slate-800">
                                        {((Number(currentTask.Phi) || 0) + (Number(currentTask.Phi_Khac) || 0)).toLocaleString('vi-VN')}₫
                                    </p>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 text-center">Quét mã QR bằng app ngân hàng để thanh toán</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Popup/Lightbox */}
            {popupImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setPopupImage(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPopupImage(null)}
                            className="absolute -top-3 -right-3 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors z-10"
                        >
                            <IconX />
                        </button>
                        <img
                            src={popupImage}
                            alt="Preview"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-Components ──────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">{label}</p>
            <p className="text-sm text-slate-700 font-medium mt-0.5 truncate">{value}</p>
        </div>
    );
}

function TimelineItem({ label, time, location, image, done, color, showDetails = false, onImageClick }: {
    label: string; time?: string; location?: string; image?: string; done: boolean; color: string; showDetails?: boolean; onImageClick?: (url: string) => void;
}) {
    const colors: Record<string, { bg: string; ring: string; dot: string }> = {
        violet: { bg: 'bg-violet-50', ring: 'ring-violet-200', dot: 'bg-violet-500' },
        blue: { bg: 'bg-blue-50', ring: 'ring-blue-200', dot: 'bg-blue-500' },
        emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
    };
    const c = colors[color] || colors.violet;

    // Build Google Maps URL from location coordinates
    const mapsUrl = location && location.includes(',')
        ? `https://www.google.com/maps?q=${location.trim()}`
        : null;

    return (
        <div className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ring-2 mt-0.5 ${done ? `${c.bg} ${c.ring}` : 'bg-slate-50 ring-slate-200'}`}>
                {done ? (
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold ${done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</p>
                {time ? (
                    <p className="text-xs text-slate-500 mt-0.5">{time}</p>
                ) : (
                    <p className="text-xs text-slate-300 mt-0.5">Chưa thực hiện</p>
                )}
                {/* Show location with Google Maps link for Admin/Host */}
                {showDetails && location && (
                    <div className="mt-1">
                        {mapsUrl ? (
                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                            >
                                <IconNavigation /> {location}
                                <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold">Maps ↗</span>
                            </a>
                        ) : (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <IconNavigation /> {location}
                            </p>
                        )}
                    </div>
                )}
                {/* Show non-admin location without Maps link */}
                {!showDetails && location && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <IconNavigation /> {location}
                    </p>
                )}
                {/* Show images: check-in/out photo + Google Maps static image */}
                {showDetails && (() => {
                    const resolvedUrl = resolveImageUrl(image);
                    const cleanLoc = location?.replace(/\s/g, '') || '';
                    const hasCoords = cleanLoc.includes(',');
                    const mapThumbUrl = hasCoords
                        ? `https://maps.googleapis.com/maps/api/staticmap?center=${cleanLoc}&zoom=15&size=200x150&markers=color:red|${cleanLoc}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`
                        : null;
                    // Fallback: OpenStreetMap static if no Google API key works
                    const osmMapUrl = hasCoords
                        ? `https://staticmap.openstreetmap.de/staticmap.php?center=${cleanLoc}&zoom=15&size=200x150&markers=${cleanLoc},red-pushpin`
                        : null;
                    const finalMapUrl = mapThumbUrl || osmMapUrl;

                    if (!resolvedUrl && !finalMapUrl) return null;
                    return (
                        <div className="mt-2 flex gap-2 flex-wrap">
                            {resolvedUrl && (
                                <img
                                    src={resolvedUrl}
                                    alt={`${label} photo`}
                                    className="w-28 h-20 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all"
                                    onClick={() => onImageClick?.(resolvedUrl)}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            )}
                            {finalMapUrl && (
                                <img
                                    src={finalMapUrl}
                                    alt={`${label} location map`}
                                    className="w-28 h-20 object-cover rounded-lg border border-blue-200 shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all"
                                    onClick={() => onImageClick?.(finalMapUrl)}
                                    onError={(e) => {
                                        // If Google Maps fails, try OSM
                                        const img = e.target as HTMLImageElement;
                                        if (osmMapUrl && img.src !== osmMapUrl) {
                                            img.src = osmMapUrl;
                                        } else {
                                            img.style.display = 'none';
                                        }
                                    }}
                                />
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
