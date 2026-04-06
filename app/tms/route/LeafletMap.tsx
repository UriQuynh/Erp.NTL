'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Route colors (must match parent) ───
const ROUTE_COLORS = [
  '#E74C3C', '#2563EB', '#16A34A', '#D97706', '#7C3AED',
  '#0EA5E9', '#EC4899', '#059669', '#DC2626', '#6366F1',
];

interface LatLng { lat: number; lng: number; label: string; raw: string; }
interface RouteResult {
  vehicleIndex: number;
  vehicleType: string;
  stops: LatLng[];
  totalKm: number;
  googleMapsUrl: string;
}

interface Props {
  origin: { lat: number; lng: number; label: string; raw: string } | null;
  destinations: LatLng[];
  routes: RouteResult[];
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

export default function LeafletMap({ origin, destinations, routes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const polylinesRef = useRef<L.LayerGroup | null>(null);

  // HCM default center
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

    // Add attribution in corner
    L.control.attribution({ position: 'bottomright', prefix: '' })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    polylinesRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and polylines
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const polylines = polylinesRef.current;
    if (!map || !markers || !polylines) return;

    // Clear existing layers
    markers.clearLayers();
    polylines.clearLayers();

    const bounds = L.latLngBounds([]);

    // Add origin marker (red)
    if (origin) {
      const marker = L.marker([origin.lat, origin.lng], {
        icon: createIcon('#DC2626', 32),
      }).bindPopup(`<b style="font-size:13px;color:#DC2626">📍 Xuất phát</b><br><span style="font-size:11px">${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}</span>`);
      markers.addLayer(marker);
      bounds.extend([origin.lat, origin.lng]);
    }

    // If routes exist, draw route-specific markers + polylines
    if (routes.length > 0 && origin) {
      routes.forEach((route, ri) => {
        const color = ROUTE_COLORS[ri % ROUTE_COLORS.length];

        // Polyline: origin → stops
        const linePoints: [number, number][] = [[origin.lat, origin.lng]];

        route.stops.forEach((stop, si) => {
          const marker = L.marker([stop.lat, stop.lng], {
            icon: createNumberIcon(si + 1, color),
          }).bindPopup(`
            <b style="font-size:12px;color:${color}">Xe ${ri + 1} — ${stop.label}</b>
            <br><span style="font-size:11px">${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</span>
          `);
          markers.addLayer(marker);
          bounds.extend([stop.lat, stop.lng]);
          linePoints.push([stop.lat, stop.lng]);
        });

        // Draw polyline
        const polyline = L.polyline(linePoints, {
          color,
          weight: 3,
          opacity: 0.75,
          dashArray: ri > 0 ? '8 4' : undefined,
        });
        polylines.addLayer(polyline);
      });
    } else {
      // No routes yet, just show destination markers (yellow)
      destinations.forEach((dest, i) => {
        const marker = L.marker([dest.lat, dest.lng], {
          icon: createNumberIcon(i + 1, '#F59E0B'),
        }).bindPopup(`<b style="font-size:12px;color:#F59E0B">${dest.label}</b><br><span style="font-size:11px">${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}</span>`);
        markers.addLayer(marker);
        bounds.extend([dest.lat, dest.lng]);
      });
    }

    // Fit bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.5 });
    }
  }, [origin, destinations, routes]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#F1F5F9' }}
    />
  );
}
