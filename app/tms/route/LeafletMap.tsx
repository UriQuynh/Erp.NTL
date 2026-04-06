'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HCM_TRUCK_RESTRICTIONS } from '@/lib/truck-restrictions';
import type { RestrictionWarning } from '@/lib/truck-restrictions';
import type { OptimizedRoute, LatLng } from '@/lib/route-optimizer';

// ─── Route colors ───
const ROUTE_COLORS = [
  '#E74C3C', '#2563EB', '#16A34A', '#D97706', '#7C3AED',
  '#0EA5E9', '#EC4899', '#059669', '#DC2626', '#6366F1',
];

interface Props {
  origin: { lat: number; lng: number; label: string; raw: string } | null;
  destinations: LatLng[];
  routes: (OptimizedRoute & { warnings: RestrictionWarning[] })[];
  showTraffic: boolean;
  showRestrictions: boolean;
}

// ─── Custom marker icons ───
function createIcon(color: string, size: number = 28): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex; align-items:center; justify-content:center;
    "><svg width="${size * 0.45}" height="${size * 0.45}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
  });
}

function createNumberIcon(num: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
    html: `<div style="
      width:26px; height:26px; border-radius:50%;
      background:${color}; border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-size:11px; font-weight:800;
      font-family:monospace;
    ">${num}</div>`,
  });
}

export default function LeafletMap({ origin, destinations, routes, showTraffic, showRestrictions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const polylinesRef = useRef<L.LayerGroup | null>(null);
  const trafficLayerRef = useRef<L.TileLayer | null>(null);
  const restrictionLayerRef = useRef<L.LayerGroup | null>(null);

  const defaultCenter: [number, number] = [10.7626, 106.6601];

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: '' })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    polylinesRef.current = L.layerGroup().addTo(map);
    restrictionLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Toggle Traffic Layer ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = L.tileLayer(
          'https://{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}',
          { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], opacity: 0.7 }
        );
      }
      trafficLayerRef.current.addTo(map);
    } else {
      if (trafficLayerRef.current) map.removeLayer(trafficLayerRef.current);
    }
  }, [showTraffic]);

  // ── Toggle Restriction Zones ──
  useEffect(() => {
    const layer = restrictionLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showRestrictions) return;

    HCM_TRUCK_RESTRICTIONS.forEach(r => {
      const polyline = L.polyline(r.path, {
        color: '#DC2626', weight: 5, opacity: 0.55,
        dashArray: '10 6', lineCap: 'round',
      });
      polyline.bindPopup(`
        <div style="min-width:200px">
          <div style="font-size:13px;font-weight:700;color:#DC2626;margin-bottom:4px">⛔ ${r.streetName}</div>
          <div style="font-size:11px;color:#374151;line-height:1.5">
            ${r.description}<br/>
            <b>Giờ cấm:</b> ${r.restrictedTimes.join(', ')}<br/>
            <b>Tải trọng:</b> > ${(r.maxWeight / 1000).toFixed(1)}T
          </div>
        </div>
      `);
      layer.addLayer(polyline);

      const mid = r.path[Math.floor(r.path.length / 2)];
      const icon = L.divIcon({
        className: '', iconSize: [22, 22], iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:5px;background:#DC2626;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer">⛔</div>`,
      });
      const marker = L.marker(mid, { icon });
      marker.bindPopup(`<div style="min-width:180px"><div style="font-size:12px;font-weight:700;color:#DC2626">⛔ ${r.streetName}</div><div style="font-size:11px;color:#6B7280;margin-top:2px">Cấm ${r.restrictedTimes.join(', ')}<br/>Tải trọng > ${(r.maxWeight / 1000).toFixed(1)}T</div></div>`);
      layer.addLayer(marker);
    });
  }, [showRestrictions]);

  // ── Update markers and polylines ──
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const polylines = polylinesRef.current;
    if (!map || !markers || !polylines) return;

    markers.clearLayers();
    polylines.clearLayers();
    const bounds = L.latLngBounds([]);

    // Origin marker (red)
    if (origin) {
      const marker = L.marker([origin.lat, origin.lng], {
        icon: createIcon('#DC2626', 32),
      }).bindPopup(`<b style="font-size:13px;color:#DC2626">📍 Xuất phát</b><br><span style="font-size:11px">${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}</span>`);
      markers.addLayer(marker);
      bounds.extend([origin.lat, origin.lng]);
    }

    if (routes.length > 0 && origin) {
      routes.forEach((route, ri) => {
        const color = ROUTE_COLORS[ri % ROUTE_COLORS.length];

        // Add numbered stop markers
        route.stops.forEach((stop, si) => {
          const marker = L.marker([stop.lat, stop.lng], {
            icon: createNumberIcon(si + 1, color),
          }).bindPopup(`
            <b style="font-size:12px;color:${color}">Xe ${ri + 1} — ${stop.label}</b>
            <br><span style="font-size:11px">${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</span>
            ${route.warnings.length > 0 ? '<br><span style="font-size:11px;color:#DC2626">⚠️ Có cảnh báo cấm tải</span>' : ''}
          `);
          markers.addLayer(marker);
          bounds.extend([stop.lat, stop.lng]);
        });

        // Draw polyline — use OSRM geometry if available, else straight lines
        if (route.geometry && route.geometry.length > 0) {
          // OSRM returns [lng, lat], Leaflet needs [lat, lng]
          const roadPath: [number, number][] = route.geometry.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          const polyline = L.polyline(roadPath, {
            color,
            weight: 4,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          });
          polylines.addLayer(polyline);

          // Extend bounds with road geometry
          roadPath.forEach(p => bounds.extend(p));
        } else {
          // Fallback: straight lines
          const linePoints: [number, number][] = [
            [origin.lat, origin.lng],
            ...route.stops.map(s => [s.lat, s.lng] as [number, number]),
          ];
          const polyline = L.polyline(linePoints, {
            color, weight: 3, opacity: 0.7,
            dashArray: '6 4',
          });
          polylines.addLayer(polyline);
        }
      });
    } else {
      // No routes yet, show yellow destination markers
      destinations.forEach((dest, i) => {
        const marker = L.marker([dest.lat, dest.lng], {
          icon: createNumberIcon(i + 1, '#F59E0B'),
        }).bindPopup(`<b style="font-size:12px;color:#F59E0B">${dest.label}</b><br><span style="font-size:11px">${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}</span>`);
        markers.addLayer(marker);
        bounds.extend([dest.lat, dest.lng]);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.5 });
    }
  }, [origin, destinations, routes]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#F1F5F9' }} />
  );
}
