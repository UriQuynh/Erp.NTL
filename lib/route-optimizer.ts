// ============================================================
// ROUTE OPTIMIZER — OSRM Trip API + K-Means Clustering
// Uses OpenStreetMap's free OSRM demo server for real road routing
// ============================================================

export interface LatLng {
  lat: number;
  lng: number;
  label: string;
  raw: string;
}

export interface OptimizedRoute {
  vehicleIndex: number;
  vehicleType: string;
  /** Stops in optimized order (re-ordered by OSRM) */
  stops: LatLng[];
  /** Real driving distance in km */
  totalKm: number;
  /** Estimated driving time in seconds */
  durationSec: number;
  /** GeoJSON coordinates for polyline rendering [[lng,lat],...] */
  geometry: [number, number][];
  /** Google Maps directions URL with optimized order */
  googleMapsUrl: string;
}

// ═══════════════════════════════════
// HAVERSINE — used for clustering
// ═══════════════════════════════════
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ═══════════════════════════════════
// K-MEANS CLUSTERING
// Groups destinations into K clusters so each vehicle
// handles nearby points, avoiding cross-overs
// ═══════════════════════════════════
function kMeansCluster(points: LatLng[], k: number): LatLng[][] {
  if (points.length <= k) {
    return points.map(p => [p]);
  }

  // Initialize centroids using K-Means++ strategy
  const centroids: { lat: number; lng: number }[] = [];
  // First centroid: random
  centroids.push({ lat: points[0].lat, lng: points[0].lng });

  for (let c = 1; c < k; c++) {
    // Pick point with max distance from nearest centroid
    let maxDist = -1;
    let bestIdx = 0;
    for (let i = 0; i < points.length; i++) {
      const minDist = Math.min(...centroids.map(cen => haversine(points[i], cen)));
      if (minDist > maxDist) {
        maxDist = minDist;
        bestIdx = i;
      }
    }
    centroids.push({ lat: points[bestIdx].lat, lng: points[bestIdx].lng });
  }

  // Iterate
  let assignments = new Array(points.length).fill(0);
  for (let iter = 0; iter < 20; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = points.map(p => {
      let minDist = Infinity;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        const d = haversine(p, centroids[c]);
        if (d < minDist) { minDist = d; bestC = c; }
      }
      return bestC;
    });

    // Check convergence
    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
    assignments = newAssignments;

    // Recompute centroids
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = {
          lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
          lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
        };
      }
    }
  }

  // Build clusters
  const clusters: LatLng[][] = Array.from({ length: k }, () => []);
  assignments.forEach((c, i) => clusters[c].push(points[i]));

  // Remove empty clusters & rebalance if any cluster exceeds maxStops
  return clusters.filter(c => c.length > 0);
}

// ═══════════════════════════════════
// OSRM TRIP API — Real road routing + TSP
// ═══════════════════════════════════
interface OSRMTripResponse {
  code: string;
  trips: {
    distance: number; // meters
    duration: number; // seconds
    geometry: {
      type: string;
      coordinates: [number, number][]; // [lng, lat]
    };
  }[];
  waypoints: {
    waypoint_index: number;
    trips_index: number;
    location: [number, number]; // [lng, lat]
  }[];
}

async function callOSRMTrip(
  origin: LatLng,
  destinations: LatLng[],
): Promise<{
  orderedStops: LatLng[];
  distanceKm: number;
  durationSec: number;
  geometry: [number, number][];
} | null> {
  // Build coordinate string: origin + all destinations
  // OSRM format: "lng,lat;lng,lat;..."
  const allPoints = [origin, ...destinations];
  const coords = allPoints.map(p => `${p.lng},${p.lat}`).join(';');

  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}`
    + `?roundtrip=false&source=first&geometries=geojson&overview=full&annotations=distance,duration`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data: OSRMTripResponse = await res.json();

    if (data.code !== 'Ok' || !data.trips?.length) {
      console.warn('OSRM Trip API returned non-Ok:', data.code);
      return null;
    }

    const trip = data.trips[0];
    const waypoints = data.waypoints;

    // Reorder destinations based on OSRM's optimized waypoint_index
    // waypoints[0] = origin (index 0), rest are destinations
    // waypoint_index gives the position in the optimized trip
    const destWaypoints = waypoints.slice(1); // skip origin
    const orderedStops = destWaypoints
      .sort((a, b) => a.waypoint_index - b.waypoint_index)
      .map(wp => {
        // Find the original destination that's closest to this waypoint location
        const [wLng, wLat] = wp.location;
        let nearest = destinations[0];
        let nearestDist = Infinity;
        for (const dest of destinations) {
          const d = Math.abs(dest.lat - wLat) + Math.abs(dest.lng - wLng);
          if (d < nearestDist) { nearestDist = d; nearest = dest; }
        }
        return nearest;
      });

    // Deduplicate (in case multiple waypoints match same destination)
    const seen = new Set<string>();
    const uniqueStops = orderedStops.filter(s => {
      const key = `${s.lat},${s.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      orderedStops: uniqueStops,
      distanceKm: Math.round(trip.distance / 100) / 10, // meters → km, 1 decimal
      durationSec: Math.round(trip.duration),
      geometry: trip.geometry.coordinates,
    };
  } catch (err) {
    console.error('OSRM Trip API error:', err);
    return null;
  }
}

// ═══════════════════════════════════
// FALLBACK — Nearest Neighbor (no API)
// ═══════════════════════════════════
function nearestNeighborRoute(origin: LatLng, destinations: LatLng[]): {
  orderedStops: LatLng[];
  distanceKm: number;
} {
  const remaining = [...destinations];
  const ordered: LatLng[] = [];
  let current: { lat: number; lng: number } = origin;
  let totalKm = 0;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    const picked = remaining.splice(nearestIdx, 1)[0];
    totalKm += nearestDist;
    ordered.push(picked);
    current = picked;
  }

  return { orderedStops: ordered, distanceKm: Math.round(totalKm * 10) / 10 };
}

// ═══════════════════════════════════
// MAIN OPTIMIZER — Cluster + OSRM Trip
// ═══════════════════════════════════
function buildGoogleMapsUrl(origin: LatLng, stops: LatLng[]): string {
  if (stops.length === 0) return '';
  const dest = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  let url = `https://www.google.com/maps/dir/?api=1`
    + `&origin=${origin.lat},${origin.lng}`
    + `&destination=${dest.lat},${dest.lng}`;
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.map(w => `${w.lat},${w.lng}`).join('|')}`;
  }
  url += `&travelmode=driving`;
  return url;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}p`;
  return `${m} phút`;
}

export async function optimizeRoutes(
  origin: LatLng,
  destinations: LatLng[],
  maxStopsPerVehicle: number,
  vehicleType: string,
): Promise<OptimizedRoute[]> {
  if (!destinations.length) return [];

  // Step 1: Determine how many vehicles needed
  const numVehicles = Math.ceil(destinations.length / maxStopsPerVehicle);

  // Step 2: K-Means cluster destinations into groups
  let clusters: LatLng[][];
  if (numVehicles <= 1) {
    clusters = [destinations];
  } else {
    clusters = kMeansCluster(destinations, numVehicles);

    // Rebalance: if any cluster is too large, split further
    const balanced: LatLng[][] = [];
    for (const cluster of clusters) {
      if (cluster.length > maxStopsPerVehicle) {
        const subK = Math.ceil(cluster.length / maxStopsPerVehicle);
        const subClusters = kMeansCluster(cluster, subK);
        balanced.push(...subClusters);
      } else {
        balanced.push(cluster);
      }
    }
    clusters = balanced;
  }

  // Step 3: For each cluster, call OSRM Trip API
  const results: OptimizedRoute[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    if (cluster.length === 0) continue;

    // Try OSRM first
    const osrmResult = await callOSRMTrip(origin, cluster);

    if (osrmResult) {
      results.push({
        vehicleIndex: i,
        vehicleType,
        stops: osrmResult.orderedStops,
        totalKm: osrmResult.distanceKm,
        durationSec: osrmResult.durationSec,
        geometry: osrmResult.geometry,
        googleMapsUrl: buildGoogleMapsUrl(origin, osrmResult.orderedStops),
      });
    } else {
      // Fallback to Nearest Neighbor
      const fallback = nearestNeighborRoute(origin, cluster);
      results.push({
        vehicleIndex: i,
        vehicleType,
        stops: fallback.orderedStops,
        totalKm: fallback.distanceKm,
        durationSec: fallback.distanceKm * 3 * 60, // rough estimate: 20km/h avg
        geometry: [], // no road geometry in fallback
        googleMapsUrl: buildGoogleMapsUrl(origin, fallback.orderedStops),
      });
    }
  }

  return results;
}
