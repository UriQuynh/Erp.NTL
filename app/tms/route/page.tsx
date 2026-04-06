'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useERPAuth } from '@/lib/auth';
import dynamic from 'next/dynamic';
import {
  MapPin, Navigation, Plus, Trash2, Play, RefreshCw,
  ExternalLink, Crosshair, ChevronDown, Truck, Map,
  Clipboard, CheckCircle2, AlertCircle, Route, X,
  LocateFixed, Copy, ArrowRight, Info, Layers,
} from 'lucide-react';

// ─── Design tokens ───
const C = {
  primary: '#1E3A5F', gold: '#FFC500', yellow: '#FFC500',
  green: '#27AE60', red: '#E74C3C', orange: '#E67E22',
  bg: '#F0F2F5', card: '#FFFFFF', border: '#E8ECF0',
  text: '#1A1A2E', muted: '#9CA3AF', secondary: '#6B7280',
};

// ─── Vehicle types (from Data_Banggia) ───
const VEHICLE_TYPES = [
  'VH5 - 6m2', 'VH8 - 12m2', 'VH10 - 18m2', 'VH15 - 24m2',
  'VH20 - 30m2', 'Xe tải 1.5T', 'Xe tải 2T', 'Xe tải 5T',
  'Xe tải 10T', 'Xe tải 15T', 'Xe cont 20ft', 'Xe cont 40ft',
];

// ─── Route colors (distinct per vehicle) ───
const ROUTE_COLORS = [
  '#E74C3C', '#2563EB', '#16A34A', '#D97706', '#7C3AED',
  '#0EA5E9', '#EC4899', '#059669', '#DC2626', '#6366F1',
];

// ─── Coordinate type ───
interface LatLng { lat: number; lng: number; label: string; raw: string; }

// ═══════════════════════════════════════
// INPUT PARSING — detect coords, maps links, addresses
// ═══════════════════════════════════════
function parseInput(raw: string): { lat: number; lng: number } | null {
  const s = raw.trim();
  if (!s) return null;

  // 1. Direct lat,lng — e.g. "10.7626, 106.6601" or "10.7626 106.6601"
  const coordMatch = s.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }

  // 2. Google Maps link — extract @lat,lng from URL
  const atMatch = s.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // 3. Google Maps /place/ link — "place/lat,lng"
  const placeMatch = s.match(/place\/(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

  // 4. Google Maps /dir/ link — extract first coords
  const dirMatch = s.match(/dir\/(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (dirMatch) return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) };

  // 5. maps.app.goo.gl — can't extract coords from short links without API
  // 6. Plain text address — no coords extractable
  return null;
}

// ─── Haversine distance (km) ───
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ═══════════════════════════════════════
// ROUTE OPTIMIZATION — Nearest Neighbor TSP heuristic
// ═══════════════════════════════════════
interface RouteResult {
  vehicleIndex: number;
  vehicleType: string;
  stops: LatLng[];
  totalKm: number;
  googleMapsUrl: string;
}

function calculateOptimalRoute(
  origin: LatLng,
  destinations: LatLng[],
  maxStops: number,
  vehicleType: string,
): RouteResult[] {
  if (!destinations.length) return [];

  const results: RouteResult[] = [];
  const remaining = [...destinations];
  let vehicleIdx = 0;

  while (remaining.length > 0) {
    const stops: LatLng[] = [];
    let current = origin;

    // Nearest-neighbor: pick closest unvisited point each time
    while (stops.length < maxStops && remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversine(current, remaining[i]);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      const picked = remaining.splice(nearestIdx, 1)[0];
      stops.push(picked);
      current = picked;
    }

    // Calculate total distance (origin → stop1 → stop2 → ...)
    let totalKm = 0;
    let prev = origin;
    for (const stop of stops) {
      totalKm += haversine(prev, stop);
      prev = stop;
    }

    // Build Google Maps directions URL
    const allPoints = [origin, ...stops];
    const gmUrl = 'https://www.google.com/maps/dir/'
      + allPoints.map(p => `${p.lat},${p.lng}`).join('/');

    results.push({
      vehicleIndex: vehicleIdx,
      vehicleType,
      stops,
      totalKm: Math.round(totalKm * 10) / 10,
      googleMapsUrl: gmUrl,
    });
    vehicleIdx++;
  }

  return results;
}

// ═══════════════════════════════════════
// LEAFLET MAP — Dynamic import (no SSR)
// ═══════════════════════════════════════
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F8FAFC', borderRadius: 12,
    }}>
      <RefreshCw size={20} color={C.muted} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  ),
});

// ═══════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════
export default function RouteOptimizationPage() {
  const { isAuthenticated } = useERPAuth();

  // Form state
  const [originRaw, setOriginRaw] = useState('');
  const [destText, setDestText] = useState('');
  const [destList, setDestList] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'textarea' | 'list'>('textarea');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [maxStops, setMaxStops] = useState(5);
  const [locating, setLocating] = useState(false);

  // Results
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Parsed points for map
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

  // ── Geolocation ──
  const getMyLocation = () => {
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ Geolocation'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setOriginRaw(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        setLocating(false);
        showToast('📍 Đã lấy vị trí hiện tại');
      },
      err => { setError('Không lấy được vị trí: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Run optimization ──
  const handleOptimize = () => {
    setError('');
    if (!originParsed) { setError('Vui lòng nhập Điểm Xuất Phát (tọa độ hoặc link Google Maps)'); return; }
    if (destParsed.length === 0) { setError('Vui lòng nhập ít nhất 1 Điểm Đến có tọa độ hợp lệ'); return; }

    setOptimizing(true);
    // Simulate processing time for UX
    setTimeout(() => {
      const result = calculateOptimalRoute(originParsed, [...destParsed], maxStops, vehicleType);
      setRoutes(result);
      setOptimizing(false);
      showToast(`✅ Đã phân ${result.length} tuyến cho ${destParsed.length} điểm giao`);
    }, 800);
  };

  // ── Reset ──
  const handleReset = () => {
    setOriginRaw(''); setDestText(''); setDestList([]);
    setRoutes([]); setError('');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Add/remove destination in list mode ──
  const addDest = () => setDestList(p => [...p, '']);
  const removeDest = (i: number) => setDestList(p => p.filter((_, idx) => idx !== i));
  const updateDest = (i: number, v: string) => setDestList(p => p.map((x, idx) => idx === i ? v : x));

  // Stats
  const totalDests = destParsed.length;
  const totalKm = routes.reduce((s, r) => s + r.totalKm, 0);

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
              Route Optimization Tool — Phân tuyến giao hàng tự động
            </p>
          </div>
        </div>

        {/* Quick stats */}
        {routes.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Tuyến', value: routes.length, color: C.primary, bg: '#EFF6FF' },
              { label: 'Điểm giao', value: destParsed.length, color: C.orange, bg: '#FFF7ED' },
              { label: 'Tổng km', value: `${Math.round(totalKm)}`, color: C.green, bg: '#F0FDF4' },
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
          background: C.card, borderRadius: 16, padding: 0,
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
          border: `1px solid ${C.border}`,
        }}>
          {/* Form header */}
          <div style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #1E3A5F, #2D5FA6)',
            borderRadius: '16px 16px 0 0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Navigation size={16} color="#FFC500" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Cấu Hình Tuyến Đường</span>
          </div>

          <div style={{ padding: '20px 20px' }}>
            {/* ── ĐIỂM XUẤT PHÁT ── */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, color: C.primary,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 8,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: C.red,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MapPin size={10} color="#fff" />
                </div>
                Điểm Xuất Phát *
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={originRaw}
                  onChange={e => setOriginRaw(e.target.value)}
                  placeholder="Nhập tọa độ (10.76, 106.66), link Google Maps hoặc địa chỉ..."
                  style={{
                    flex: 1, height: 40, padding: '0 12px', fontSize: 13,
                    border: `1.5px solid ${originParsed ? '#16A34A' : C.border}`,
                    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                    color: C.text, background: originParsed ? '#F0FDF4' : C.card,
                    transition: 'all 0.15s',
                  }}
                />
                <button
                  onClick={getMyLocation}
                  disabled={locating}
                  title="Lấy vị trí hiện tại"
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.card,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {locating
                    ? <RefreshCw size={14} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Crosshair size={14} color={C.primary} />
                  }
                </button>
              </div>
              {originParsed && (
                <div style={{ fontSize: 10, color: '#16A34A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={10} /> Tọa độ: {originParsed.lat.toFixed(5)}, {originParsed.lng.toFixed(5)}
                </div>
              )}
            </div>

            {/* ── DANH SÁCH ĐIỂM ĐẾN ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, color: C.primary,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#F59E0B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MapPin size={10} color="#fff" />
                  </div>
                  Điểm Đến ({totalDests} điểm hợp lệ) *
                </label>
                {/* Toggle button */}
                <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  {(['textarea', 'list'] as const).map(m => (
                    <button key={m} onClick={() => setInputMode(m)} style={{
                      padding: '3px 10px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: inputMode === m ? C.primary : C.card,
                      color: inputMode === m ? '#fff' : C.secondary,
                      transition: 'all 0.12s',
                    }}>
                      {m === 'textarea' ? '📋 Paste' : '📝 Danh sách'}
                    </button>
                  ))}
                </div>
              </div>

              {inputMode === 'textarea' ? (
                <div>
                  <textarea
                    value={destText}
                    onChange={e => setDestText(e.target.value)}
                    placeholder={"Mỗi dòng = 1 điểm giao hàng\n\nVí dụ:\n10.7626, 106.6601\n10.8231, 106.6297\nhttps://maps.app.goo.gl/..."}
                    style={{
                      width: '100%', minHeight: 160, padding: '10px 12px',
                      fontSize: 12.5, fontFamily: 'monospace', lineHeight: 1.6,
                      border: `1.5px solid ${C.border}`, borderRadius: 10,
                      background: '#FAFBFC', resize: 'vertical', outline: 'none',
                      boxSizing: 'border-box', color: C.text,
                    }}
                  />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Info size={10} /> Hỗ trợ: Tọa độ (lat, lng) • Link Google Maps • Copy nhiều dòng từ Excel
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
                      <input
                        value={d}
                        onChange={e => updateDest(i, e.target.value)}
                        placeholder="Tọa độ hoặc link Google Maps..."
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
                    color: C.primary, fontWeight: 600, transition: 'all 0.12s',
                  }}>
                    <Plus size={12} /> Thêm điểm
                  </button>
                </div>
              )}
            </div>

            {/* ── CẤU HÌNH VẬN TẢI ── */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, color: C.primary,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 8,
              }}>
                <Truck size={14} color={C.primary} />
                Cấu Hình Vận Tải
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.secondary, fontWeight: 600, marginBottom: 4 }}>Loại xe</div>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                    style={{
                      width: '100%', height: 38, padding: '0 10px', fontSize: 12,
                      border: `1px solid ${C.border}`, borderRadius: 8,
                      background: C.card, color: C.text, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.secondary, fontWeight: 600, marginBottom: 4 }}>Điểm / Xe (tối đa)</div>
                  <input
                    type="number"
                    value={maxStops}
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

            {/* ── ERROR ── */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#DC2626', background: '#FEF2F2',
                padding: '8px 12px', borderRadius: 8, marginBottom: 14,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* ── ACTION BUTTONS ── */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                style={{
                  flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none',
                  background: optimizing ? '#94A3B8' : C.yellow,
                  color: optimizing ? '#fff' : C.primary,
                  cursor: optimizing ? 'not-allowed' : 'pointer',
                  boxShadow: optimizing ? 'none' : '0 2px 10px rgba(255,197,0,0.35)',
                  transition: 'all 0.15s',
                }}
              >
                {optimizing
                  ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Play size={16} />
                }
                {optimizing ? 'Đang tối ưu...' : 'Bắt Đầu Tối Ưu'}
              </button>
              <button
                onClick={handleReset}
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.card,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title="Reset"
              >
                <RefreshCw size={14} color={C.secondary} />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: MAP + RESULTS ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── MAP ── */}
          <div style={{
            background: C.card, borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
            border: `1px solid ${C.border}`,
          }}>
            {/* Map header */}
            <div style={{
              padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Map size={14} color={C.primary} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Bản đồ tuyến đường</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.muted }}>
                <Layers size={10} /> OpenStreetMap
                {originParsed && <span style={{ color: '#16A34A' }}>• Xuất phát ✓</span>}
                {totalDests > 0 && <span style={{ color: '#F59E0B' }}>• {totalDests} điểm</span>}
              </div>
            </div>
            <div style={{ height: 420 }}>
              <LeafletMap
                origin={originParsed}
                destinations={destParsed}
                routes={routes}
              />
            </div>
          </div>

          {/* ── RESULTS TABLE ── */}
          {routes.length > 0 && (
            <div style={{
              background: C.card, borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              border: `1px solid ${C.border}`,
              animation: 'fadeInUp 0.3s ease',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} color="#92400E" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                    Kết Quả Phân Tuyến — {routes.length} xe • {totalDests} điểm • {Math.round(totalKm)} km
                  </span>
                </div>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {routes.map((r, i) => {
                  const routeColor = ROUTE_COLORS[i % ROUTE_COLORS.length];
                  return (
                    <div key={i} style={{
                      border: `1.5px solid ${routeColor}20`,
                      borderRadius: 12, padding: 14, background: `${routeColor}08`,
                      animation: 'fadeInUp 0.3s ease',
                      animationDelay: `${i * 80}ms`,
                      animationFillMode: 'both',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: routeColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Truck size={14} color="#fff" />
                          </div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                              Xe {i + 1} ({r.vehicleType})
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: routeColor,
                              marginLeft: 8, background: `${routeColor}15`,
                              padding: '2px 8px', borderRadius: 4,
                            }}>
                              {r.stops.length} điểm • {r.totalKm} km
                            </span>
                          </div>
                        </div>
                        <a
                          href={r.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 12px', borderRadius: 7,
                            background: C.primary, color: '#fff',
                            fontSize: 11, fontWeight: 600, textDecoration: 'none',
                            boxShadow: '0 1px 4px rgba(30,58,95,0.25)',
                          }}
                        >
                          <ExternalLink size={11} /> Mở Google Maps
                        </a>
                      </div>
                      {/* Route chain */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        flexWrap: 'wrap', fontSize: 11.5, color: C.secondary,
                      }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: '#DC262615', color: '#DC2626', fontWeight: 700, fontSize: 10,
                        }}>Xuất phát</span>
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 10,
          background: C.primary, color: '#fff', fontSize: 13, fontWeight: 600,
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
      `}</style>
    </div>
  );
}
