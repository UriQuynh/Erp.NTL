'use client';

import { useState, useMemo } from 'react';
import { useERPAuth } from '@/lib/auth';
import { checkRouteRestrictions, VEHICLE_WEIGHTS } from '@/lib/truck-restrictions';
import { optimizeRoutes, formatDuration } from '@/lib/route-optimizer';
import type { RestrictionWarning } from '@/lib/truck-restrictions';
import type { OptimizedRoute, LatLng } from '@/lib/route-optimizer';
import dynamic from 'next/dynamic';
import {
  MapPin, Navigation, Plus, Trash2, RefreshCw,
  ExternalLink, Crosshair, Truck, Map, Route,
  AlertTriangle, Clock, Shield, ShieldAlert,
  CheckCircle2, AlertCircle, ArrowRight, Info, Layers, ChevronDown,
  Settings2, Zap, Timer,
} from 'lucide-react';

// ─── Design tokens ───
const C = {
  primary: '#1E3A5F', gold: '#FFC500', yellow: '#FFC500',
  green: '#27AE60', red: '#E74C3C', orange: '#E67E22',
  bg: '#F0F2F5', card: '#FFFFFF', border: '#E8ECF0',
  text: '#1A1A2E', muted: '#9CA3AF', secondary: '#6B7280',
};

const VEHICLE_TYPES = [
  'VH5 - 6m2', 'VH8 - 12m2', 'VH10 - 18m2', 'VH15 - 24m2',
  'VH20 - 30m2', 'Xe tải 1.5T', 'Xe tải 2T', 'Xe tải 5T',
  'Xe tải 10T', 'Xe tải 15T', 'Xe cont 20ft', 'Xe cont 40ft',
];

const ROUTE_COLORS = [
  '#E74C3C', '#2563EB', '#16A34A', '#D97706', '#7C3AED',
  '#0EA5E9', '#EC4899', '#059669', '#DC2626', '#6366F1',
];

// ─── Extended route with warnings ───
type RouteWithWarnings = OptimizedRoute & { warnings: RestrictionWarning[] };

// ─── Input parsing ───
function parseInput(raw: string): { lat: number; lng: number } | null {
  const s = raw.trim();
  if (!s) return null;
  const coordMatch = s.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }
  const atMatch = s.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const placeMatch = s.match(/place\/(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  const dirMatch = s.match(/dir\/(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (dirMatch) return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) };
  return null;
}

// ─── Get VN time ───
function getNowVN(): string {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// ─── Toggle Switch ───
function ToggleSwitch({ on, onToggle, label, icon }: {
  on: boolean; onToggle: () => void; label: string; icon: React.ReactNode;
}) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
      background: 'transparent', border: 'none', cursor: 'pointer', width: '100%',
    }}>
      <div style={{
        width: 38, height: 20, borderRadius: 10, position: 'relative',
        background: on ? '#16A34A' : '#D1D5DB', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2, left: on ? 20 : 2,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.text, fontWeight: 500 }}>
        {icon} {label}
      </span>
    </button>
  );
}

// ─── Leaflet (dynamic) ───
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <RefreshCw size={20} color={C.muted} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  ),
});

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════
export default function RouteOptimizationPage() {
  const { isAuthenticated } = useERPAuth();

  // Form
  const [originRaw, setOriginRaw] = useState('');
  const [destText, setDestText] = useState('');
  const [destList, setDestList] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'textarea' | 'list'>('textarea');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [maxStops, setMaxStops] = useState(5);
  const [locating, setLocating] = useState(false);

  // Advanced
  const [departureTime, setDepartureTime] = useState(getNowVN());
  const [showTraffic, setShowTraffic] = useState(false);
  const [showRestrictions, setShowRestrictions] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(true);

  // Results
  const [routes, setRoutes] = useState<RouteWithWarnings[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [usedOSRM, setUsedOSRM] = useState(false);

  // Parsed
  const originParsed = useMemo(() => {
    const p = parseInput(originRaw);
    return p ? { ...p, label: 'Xuất phát', raw: originRaw } : null;
  }, [originRaw]);

  const destParsed = useMemo(() => {
    const lines = inputMode === 'textarea'
      ? destText.split('\n').map(l => l.trim()).filter(Boolean)
      : destList.filter(Boolean);
    return lines.map((line, i) => {
      const p = parseInput(line);
      return p ? { ...p, label: `Điểm ${i + 1}`, raw: line } as LatLng : null;
    }).filter(Boolean) as LatLng[];
  }, [destText, destList, inputMode]);

  // Stats
  const totalDests = destParsed.length;
  const totalKm = routes.reduce((s, r) => s + r.totalKm, 0);
  const totalDuration = routes.reduce((s, r) => s + r.durationSec, 0);
  const totalWarnings = routes.reduce((s, r) => s + r.warnings.length, 0);
  const vehicleWeightKg = VEHICLE_WEIGHTS[vehicleType] || 1500;

  const getMyLocation = () => {
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ Geolocation'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setOriginRaw(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        setLocating(false);
        showToastMsg('📍 Đã lấy vị trí hiện tại');
      },
      err => { setError('Không lấy được vị trí: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Optimize with OSRM ──
  const handleOptimize = async () => {
    setError('');
    if (!originParsed) { setError('Vui lòng nhập Điểm Xuất Phát (tọa độ hoặc link Google Maps)'); return; }
    if (destParsed.length === 0) { setError('Vui lòng nhập ít nhất 1 Điểm Đến có tọa độ hợp lệ'); return; }

    setOptimizing(true);

    try {
      const optimized = await optimizeRoutes(originParsed, [...destParsed], maxStops, vehicleType);

      // Check if OSRM geometry was returned
      const hasGeometry = optimized.some(r => r.geometry.length > 0);
      setUsedOSRM(hasGeometry);

      // Add restriction warnings
      const withWarnings: RouteWithWarnings[] = optimized.map(r => ({
        ...r,
        warnings: showRestrictions
          ? checkRouteRestrictions(originParsed, r.stops, vehicleType, departureTime)
          : [],
      }));

      setRoutes(withWarnings);

      const warnCount = withWarnings.reduce((s, r) => s + r.warnings.length, 0);
      if (warnCount > 0) {
        showToastMsg(`⚠️ Phát hiện ${warnCount} cảnh báo cấm tải! Vui lòng kiểm tra.`);
      } else {
        const etaStr = hasGeometry ? ` • ETA: ${formatDuration(optimized.reduce((s, r) => s + r.durationSec, 0))}` : '';
        showToastMsg(`✅ Tối ưu ${optimized.length} tuyến cho ${destParsed.length} điểm giao${etaStr}`);
      }
    } catch (err) {
      setError('Lỗi khi tối ưu tuyến đường. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleReset = () => {
    setOriginRaw(''); setDestText(''); setDestList([]);
    setRoutes([]); setError(''); setUsedOSRM(false);
  };

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const addDest = () => setDestList(p => [...p, '']);
  const removeDest = (i: number) => setDestList(p => p.filter((_, idx) => idx !== i));
  const updateDest = (i: number, v: string) => setDestList(p => p.map((x, idx) => idx === i ? v : x));

  if (!isAuthenticated) return null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 40px', minHeight: '100vh' }}>
      {/* ── PAGE HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0 12px', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #1E3A5F, #2D5FA6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Route size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>
              Tối Ưu Tuyến Đường
            </h1>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
              Route Optimization — OSRM Real-World Routing + Cấm tải
            </p>
          </div>
        </div>

        {routes.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Tuyến', value: routes.length, color: C.primary, bg: '#EFF6FF' },
              { label: 'Điểm giao', value: destParsed.length, color: C.orange, bg: '#FFF7ED' },
              { label: 'Tổng km', value: `${Math.round(totalKm)}`, color: C.green, bg: '#F0FDF4' },
              ...(totalDuration > 0 ? [{
                label: 'ETA', value: formatDuration(totalDuration), color: '#2563EB', bg: '#EFF6FF',
              }] : []),
              ...(totalWarnings > 0 ? [{
                label: 'Cảnh báo', value: `${totalWarnings}`, color: '#DC2626', bg: '#FEF2F2',
              }] : []),
            ].map(s => (
              <div key={s.label} style={{
                padding: '6px 14px', borderRadius: 10, background: s.bg,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SPLIT LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16, alignItems: 'start' }}>
        {/* ═══ LEFT: FORM ═══ */}
        <div style={{
          background: C.card, borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #1E3A5F, #2D5FA6)',
            borderRadius: '16px 16px 0 0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Navigation size={16} color="#FFC500" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Cấu Hình Tuyến Đường</span>
          </div>

          <div style={{ padding: 20 }}>
            {/* ORIGIN */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, color: C.primary,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
              }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={10} color="#fff" />
                </div>
                Điểm Xuất Phát *
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={originRaw} onChange={e => setOriginRaw(e.target.value)}
                  placeholder="Tọa độ, link Google Maps..."
                  style={{
                    flex: 1, height: 40, padding: '0 12px', fontSize: 13,
                    border: `1.5px solid ${originParsed ? '#16A34A' : C.border}`,
                    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                    color: C.text, background: originParsed ? '#F0FDF4' : C.card,
                  }}
                />
                <button onClick={getMyLocation} disabled={locating} title="Vị trí hiện tại" style={{
                  width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {locating ? <RefreshCw size={14} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} /> : <Crosshair size={14} color={C.primary} />}
                </button>
              </div>
              {originParsed && (
                <div style={{ fontSize: 10, color: '#16A34A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={10} /> {originParsed.lat.toFixed(5)}, {originParsed.lng.toFixed(5)}
                </div>
              )}
            </div>

            {/* DESTINATIONS */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={10} color="#fff" />
                  </div>
                  Điểm Đến ({totalDests} hợp lệ) *
                </label>
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  {(['textarea', 'list'] as const).map(m => (
                    <button key={m} onClick={() => setInputMode(m)} style={{
                      padding: '3px 10px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: inputMode === m ? C.primary : C.card,
                      color: inputMode === m ? '#fff' : C.secondary,
                    }}>
                      {m === 'textarea' ? '📋 Paste' : '📝 List'}
                    </button>
                  ))}
                </div>
              </div>

              {inputMode === 'textarea' ? (
                <div>
                  <textarea value={destText} onChange={e => setDestText(e.target.value)}
                    placeholder={"Mỗi dòng = 1 điểm giao\n\nVí dụ:\n10.7626, 106.6601\n10.8231, 106.6297"}
                    style={{
                      width: '100%', minHeight: 130, padding: '10px 12px',
                      fontSize: 12.5, fontFamily: 'monospace', lineHeight: 1.6,
                      border: `1.5px solid ${C.border}`, borderRadius: 10,
                      background: '#FAFBFC', resize: 'vertical', outline: 'none',
                      boxSizing: 'border-box', color: C.text,
                    }}
                  />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Info size={10} /> Tọa độ • Link Google Maps • Copy từ Excel
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {destList.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i + 1}</span>
                      <input value={d} onChange={e => updateDest(i, e.target.value)}
                        placeholder="Tọa độ hoặc link..."
                        style={{
                          flex: 1, height: 36, padding: '0 10px', fontSize: 12,
                          border: `1px solid ${parseInput(d) ? '#16A34A' : C.border}`,
                          borderRadius: 8, outline: 'none', boxSizing: 'border-box',
                          background: parseInput(d) ? '#F0FDF4' : C.card,
                        }}
                      />
                      <button onClick={() => removeDest(i)} style={{
                        width: 28, height: 28, borderRadius: 6, border: 'none',
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Trash2 size={12} color={C.red} />
                      </button>
                    </div>
                  ))}
                  <button onClick={addDest} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    height: 36, border: `1.5px dashed ${C.border}`, borderRadius: 8,
                    background: 'transparent', cursor: 'pointer', fontSize: 12,
                    color: C.primary, fontWeight: 600,
                  }}>
                    <Plus size={12} /> Thêm điểm
                  </button>
                </div>
              )}
            </div>

            {/* VEHICLE CONFIG */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
              }}>
                <Truck size={14} color={C.primary} /> Cấu Hình Vận Tải
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.secondary, fontWeight: 600, marginBottom: 4 }}>Loại xe</div>
                  <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={{
                    width: '100%', height: 38, padding: '0 10px', fontSize: 12,
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    background: C.card, color: C.text, cursor: 'pointer', outline: 'none',
                  }}>
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
                    Tải trọng: <b style={{ color: C.text }}>{(vehicleWeightKg / 1000).toFixed(1)}T</b>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.secondary, fontWeight: 600, marginBottom: 4 }}>Điểm / Xe</div>
                  <input type="number" value={maxStops}
                    onChange={e => setMaxStops(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1} max={20}
                    style={{
                      width: '100%', height: 38, padding: '0 10px', fontSize: 13, fontWeight: 600,
                      border: `1px solid ${C.border}`, borderRadius: 8, textAlign: 'center',
                      background: C.card, color: C.text, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ADVANCED OPTIONS */}
            <div style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <button onClick={() => setAdvancedOpen(o => !o)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#F8FAFC', border: 'none', cursor: 'pointer',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Settings2 size={13} color={C.primary} /> Tùy Chọn Nâng Cao
                </span>
                <ChevronDown size={14} color={C.muted} style={{
                  transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
                }} />
              </button>
              {advancedOpen && (
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: C.secondary, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> Thời gian khởi hành (dự kiến)
                    </div>
                    <input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)}
                      style={{
                        width: '100%', height: 36, padding: '0 10px', fontSize: 13, fontWeight: 600,
                        border: `1px solid ${C.border}`, borderRadius: 8,
                        background: C.card, color: C.text, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
                      Kiểm tra cấm tải giờ cao điểm (06-09h, 16-20h)
                    </div>
                  </div>
                  <ToggleSwitch on={showTraffic} onToggle={() => setShowTraffic(t => !t)}
                    label="Hiển thị giao thông (Traffic Layer)"
                    icon={<Layers size={12} color={showTraffic ? '#16A34A' : C.muted} />}
                  />
                  <ToggleSwitch on={showRestrictions} onToggle={() => setShowRestrictions(t => !t)}
                    label="Cảnh báo đường cấm tải / cấm giờ"
                    icon={<ShieldAlert size={12} color={showRestrictions ? '#DC2626' : C.muted} />}
                  />
                </div>
              )}
            </div>

            {/* ERROR */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#DC2626',
                background: '#FEF2F2', padding: '8px 12px', borderRadius: 8, marginBottom: 14,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* ACTION */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleOptimize} disabled={optimizing} style={{
                flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none',
                background: optimizing ? '#94A3B8' : C.yellow,
                color: optimizing ? '#fff' : C.primary,
                cursor: optimizing ? 'not-allowed' : 'pointer',
                boxShadow: optimizing ? 'none' : '0 2px 10px rgba(255,197,0,0.35)',
                transition: 'all 0.15s',
              }}>
                {optimizing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
                {optimizing ? 'Đang tối ưu OSRM...' : 'Bắt Đầu Tối Ưu'}
              </button>
              <button onClick={handleReset} title="Reset" style={{
                width: 44, height: 44, borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RefreshCw size={14} color={C.secondary} />
              </button>
            </div>

            {/* OSRM badge */}
            {usedOSRM && routes.length > 0 && (
              <div style={{
                marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 10, color: '#16A34A', padding: '6px 10px',
                background: '#F0FDF4', borderRadius: 6, border: '1px solid #BBF7D0',
              }}>
                <CheckCircle2 size={11} />
                <span><b>OSRM API</b> — Đường đi thực tế, tự động sắp xếp thứ tự TSP</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: MAP + RESULTS ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* MAP */}
          <div style={{
            background: C.card, borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: `1px solid ${C.border}`,
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Map size={14} color={C.primary} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Bản đồ tuyến đường</span>
                {usedOSRM && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#16A34A', padding: '2px 6px',
                    background: '#F0FDF4', borderRadius: 4, border: '1px solid #BBF7D0',
                  }}>🛣️ Real Road</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: C.muted }}>
                {showTraffic && <span style={{ color: '#F59E0B', fontWeight: 600 }}>🚦 Traffic</span>}
                {showRestrictions && <span style={{ color: '#DC2626', fontWeight: 600 }}>⛔ Cấm tải</span>}
                {originParsed && <span style={{ color: '#16A34A' }}>• Xuất phát ✓</span>}
                {totalDests > 0 && <span style={{ color: '#F59E0B' }}>• {totalDests} điểm</span>}
              </div>
            </div>
            <div style={{ height: 420 }}>
              <LeafletMap
                origin={originParsed}
                destinations={destParsed}
                routes={routes}
                showTraffic={showTraffic}
                showRestrictions={showRestrictions}
              />
            </div>
          </div>

          {/* RESTRICTION WARNINGS */}
          {totalWarnings > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #FEF2F2, #FECACA)',
              border: '1.5px solid #FECACA', borderRadius: 12, padding: '14px 16px',
              animation: 'pulseWarn 2s ease-in-out 3',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="#fff" />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>⚠️ {totalWarnings} vi phạm cấm tải!</span>
                  <span style={{ fontSize: 11, color: '#DC2626', marginLeft: 8 }}>
                    Khởi hành: {departureTime} • Tải: {(vehicleWeightKg / 1000).toFixed(1)}T
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 36 }}>
                {routes.flatMap(r => r.warnings).map((w, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: '#7F1D1D', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', background: '#fff', borderRadius: 6, border: '1px solid #FECACA',
                  }}>
                    <ShieldAlert size={12} color="#DC2626" />
                    <b>{w.streetName}</b> — {w.description}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#DC2626', fontFamily: 'monospace' }}>
                      {w.restrictedTimes.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULTS */}
          {routes.length > 0 && (
            <div style={{
              background: C.card, borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: `1px solid ${C.border}`,
              animation: 'fadeInUp 0.3s ease',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                background: totalWarnings > 0
                  ? 'linear-gradient(135deg, #FEF2F2, #FECACA)'
                  : 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} color={totalWarnings > 0 ? '#991B1B' : '#92400E'} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: totalWarnings > 0 ? '#991B1B' : '#92400E' }}>
                    Kết Quả — {routes.length} xe • {totalDests} điểm • {Math.round(totalKm)} km
                    {totalDuration > 0 && ` • ${formatDuration(totalDuration)}`}
                    {totalWarnings > 0 && ` • ${totalWarnings} ⚠️`}
                  </span>
                </div>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {routes.map((r, i) => {
                  const routeColor = ROUTE_COLORS[i % ROUTE_COLORS.length];
                  const hasWarnings = r.warnings.length > 0;
                  const hasRealRoute = r.geometry.length > 0;
                  return (
                    <div key={i} style={{
                      border: `1.5px solid ${hasWarnings ? '#FECACA' : `${routeColor}20`}`,
                      borderRadius: 12, padding: 14,
                      background: hasWarnings ? '#FEF2F2' : `${routeColor}08`,
                      animation: 'fadeInUp 0.3s ease',
                      animationDelay: `${i * 80}ms`, animationFillMode: 'both',
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: routeColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Truck size={14} color="#fff" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                              Xe {i + 1} ({r.vehicleType})
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: routeColor,
                              background: `${routeColor}15`, padding: '2px 8px', borderRadius: 4,
                            }}>
                              {r.stops.length} điểm • {r.totalKm} km
                            </span>
                            {r.durationSec > 0 && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: '#2563EB',
                                background: '#EFF6FF', padding: '2px 8px', borderRadius: 4,
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}>
                                <Timer size={9} /> {formatDuration(r.durationSec)}
                              </span>
                            )}
                            {hasWarnings && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: '#DC2626',
                                background: '#FEE2E2', padding: '2px 8px', borderRadius: 4,
                                animation: 'pulseWarn 2s ease-in-out 3',
                              }}>
                                ⚠️ {r.warnings.length} cảnh báo
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {hasWarnings && (
                            <a href={r.googleMapsUrl + '&avoid=tolls'}
                              target="_blank" rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', borderRadius: 7,
                                background: '#FEF3C7', color: '#92400E',
                                fontSize: 10, fontWeight: 600, textDecoration: 'none',
                                border: '1px solid #FDE68A',
                              }}
                              title="Tuyến thay thế tránh cấm tải"
                            >
                              <Shield size={10} /> Tránh cấm tải
                            </a>
                          )}
                          <a href={r.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 12px', borderRadius: 7,
                            background: C.primary, color: '#fff',
                            fontSize: 11, fontWeight: 600, textDecoration: 'none',
                            boxShadow: '0 1px 4px rgba(30,58,95,0.25)',
                          }}>
                            <ExternalLink size={11} /> Google Maps
                          </a>
                        </div>
                      </div>

                      {/* Route chain */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 11.5, color: C.secondary }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#DC262615', color: '#DC2626', fontWeight: 700, fontSize: 10 }}>
                          Xuất phát
                        </span>
                        {r.stops.map((stop, si) => (
                          <span key={si} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ArrowRight size={10} color={C.muted} />
                            <span style={{
                              padding: '2px 8px', borderRadius: 4,
                              background: `${routeColor}15`, color: routeColor,
                              fontWeight: 600, fontSize: 10, fontFamily: 'monospace',
                            }}>
                              {stop.label} ({stop.lat.toFixed(4)}, {stop.lng.toFixed(4)})
                            </span>
                          </span>
                        ))}
                      </div>

                      {/* Warnings */}
                      {hasWarnings && (
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#fff', border: '1px solid #FECACA' }}>
                          {r.warnings.map((w, wi) => (
                            <div key={wi} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11,
                              color: '#7F1D1D', padding: '3px 0',
                              borderBottom: wi < r.warnings.length - 1 ? '1px solid #FEE2E2' : 'none',
                            }}>
                              <AlertTriangle size={12} color="#DC2626" style={{ marginTop: 1, flexShrink: 0 }} />
                              <div>
                                <b>{w.streetName}</b>: {w.description}
                                <span style={{
                                  display: 'inline-block', marginLeft: 6, fontSize: 9, fontFamily: 'monospace',
                                  color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 3,
                                }}>
                                  Cấm {w.restrictedTimes.join(', ')} • {'>'}{(w.maxWeight / 1000).toFixed(1)}T
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 10,
          background: toast.includes('⚠️') ? '#991B1B' : C.primary,
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          animation: 'fadeInUp 0.25s ease',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseWarn {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
