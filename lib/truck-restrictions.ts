// ============================================================
// TRUCK RESTRICTIONS — Dữ liệu cấm tải / cấm giờ tại HCM
// Mock data phổ biến cho demo (có thể thay bằng API sau)
// ============================================================

export interface TruckRestriction {
  id: string;
  streetName: string;
  /** Danh sách khung giờ cấm, format "HH:mm-HH:mm" */
  restrictedTimes: string[];
  /** Tải trọng tối đa cho phép (kg). Xe > maxWeight bị cấm */
  maxWeight: number;
  /** Mô tả chi tiết */
  description: string;
  /** Polyline coordinates [lat, lng][] để vẽ trên bản đồ */
  path: [number, number][];
}

export const HCM_TRUCK_RESTRICTIONS: TruckRestriction[] = [
  {
    id: 'R01',
    streetName: 'Cộng Hòa',
    restrictedTimes: ['06:00-09:00', '16:00-20:00'],
    maxWeight: 1500,
    description: 'Cấm xe tải > 1.5T giờ cao điểm (Cộng Hòa, Tân Bình)',
    path: [
      [10.8020, 106.6520], [10.8070, 106.6515], [10.8120, 106.6500],
      [10.8175, 106.6480], [10.8230, 106.6465],
    ],
  },
  {
    id: 'R02',
    streetName: 'Võ Văn Kiệt',
    restrictedTimes: ['06:00-09:00', '16:00-20:00'],
    maxWeight: 2500,
    description: 'Cấm xe tải > 2.5T giờ cao điểm (Võ Văn Kiệt, Q.1-Q.5-Q.6)',
    path: [
      [10.7580, 106.6920], [10.7560, 106.6830], [10.7535, 106.6720],
      [10.7510, 106.6620], [10.7490, 106.6530], [10.7470, 106.6440],
    ],
  },
  {
    id: 'R03',
    streetName: 'Phạm Văn Đồng',
    restrictedTimes: ['06:00-09:00', '16:00-20:00'],
    maxWeight: 1500,
    description: 'Cấm xe tải > 1.5T giờ cao điểm (Phạm Văn Đồng, Thủ Đức)',
    path: [
      [10.8320, 106.6780], [10.8380, 106.6760], [10.8440, 106.6740],
      [10.8500, 106.6700], [10.8560, 106.6680],
    ],
  },
  {
    id: 'R04',
    streetName: 'Điện Biên Phủ',
    restrictedTimes: ['06:00-09:00', '16:00-20:00'],
    maxWeight: 2500,
    description: 'Cấm xe tải > 2.5T giờ cao điểm (Điện Biên Phủ, Q.1-Q.3-Bình Thạnh)',
    path: [
      [10.7920, 106.6920], [10.7935, 106.6985], [10.7950, 106.7050],
      [10.7970, 106.7120], [10.7985, 106.7180],
    ],
  },
  {
    id: 'R05',
    streetName: 'Nguyễn Văn Linh',
    restrictedTimes: ['06:00-08:30', '16:30-19:30'],
    maxWeight: 5000,
    description: 'Cấm xe tải > 5T giờ cao điểm (Nguyễn Văn Linh, Q.7-Bình Chánh)',
    path: [
      [10.7350, 106.6960], [10.7340, 106.6870], [10.7325, 106.6780],
      [10.7310, 106.6690], [10.7290, 106.6600],
    ],
  },
  {
    id: 'R06',
    streetName: 'Trường Chinh',
    restrictedTimes: ['06:00-09:00', '16:00-20:00'],
    maxWeight: 1500,
    description: 'Cấm xe tải > 1.5T giờ cao điểm (Trường Chinh, Q.12-Tân Bình)',
    path: [
      [10.8380, 106.6320], [10.8340, 106.6360], [10.8300, 106.6400],
      [10.8260, 106.6440], [10.8220, 106.6480],
    ],
  },
  {
    id: 'R07',
    streetName: 'Quốc Lộ 13',
    restrictedTimes: ['06:00-08:00', '17:00-20:00'],
    maxWeight: 2500,
    description: 'Cấm xe tải > 2.5T giờ cao điểm (QL13, Thủ Đức)',
    path: [
      [10.8650, 106.7150], [10.8700, 106.7130], [10.8750, 106.7110],
      [10.8810, 106.7080], [10.8870, 106.7060],
    ],
  },
  {
    id: 'R08',
    streetName: 'Xô Viết Nghệ Tĩnh',
    restrictedTimes: ['06:00-09:00', '16:00-20:00'],
    maxWeight: 1500,
    description: 'Cấm xe tải > 1.5T giờ cao điểm (XVNT, Bình Thạnh)',
    path: [
      [10.8000, 106.6900], [10.7970, 106.6920], [10.7940, 106.6940],
      [10.7910, 106.6960], [10.7880, 106.6980],
    ],
  },
  {
    id: 'R09',
    streetName: 'Lê Văn Sỹ',
    restrictedTimes: ['06:30-08:30', '16:30-19:30'],
    maxWeight: 1500,
    description: 'Cấm xe tải > 1.5T giờ cao điểm (Lê Văn Sỹ, Q.3-Tân Bình)',
    path: [
      [10.7920, 106.6670], [10.7960, 106.6660], [10.8000, 106.6650],
      [10.8040, 106.6640], [10.8080, 106.6630],
    ],
  },
  {
    id: 'R10',
    streetName: 'Khu trung tâm Q.1',
    restrictedTimes: ['06:00-22:00'],
    maxWeight: 1500,
    description: 'Cấm xe tải > 1.5T cả ngày (khu vực trung tâm Q.1)',
    path: [
      [10.7760, 106.6990], [10.7730, 106.6990], [10.7730, 106.7030],
      [10.7760, 106.7030], [10.7760, 106.6990],
    ],
  },
];

// ─── Vehicle weight mapping (kg) ───
export const VEHICLE_WEIGHTS: Record<string, number> = {
  'VH5 - 6m2': 1200,
  'VH8 - 12m2': 1800,
  'VH10 - 18m2': 2500,
  'VH15 - 24m2': 3500,
  'VH20 - 30m2': 5000,
  'Xe tải 1.5T': 1500,
  'Xe tải 2T': 2000,
  'Xe tải 5T': 5000,
  'Xe tải 10T': 10000,
  'Xe tải 15T': 15000,
  'Xe cont 20ft': 20000,
  'Xe cont 40ft': 30000,
};

/**
 * Parse time string "HH:mm" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Check if a given time falls within a restricted time range
 */
function isTimeInRange(timeMinutes: number, range: string): boolean {
  const [start, end] = range.split('-');
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  return timeMinutes >= startMin && timeMinutes <= endMin;
}

export interface RestrictionWarning {
  restrictionId: string;
  streetName: string;
  description: string;
  restrictedTimes: string[];
  maxWeight: number;
  vehicleWeight: number;
  departureTime: string;
}

/**
 * Check if a route segment passes near a restricted zone
 * Uses simple distance-based proximity check
 */
function isNearRestriction(
  pointA: { lat: number; lng: number },
  pointB: { lat: number; lng: number },
  restriction: TruckRestriction,
  threshold: number = 0.008, // ~800m
): boolean {
  // Check if any point on the restriction path is close to the line segment A→B
  for (const [rlat, rlng] of restriction.path) {
    // Simple bounding box proximity check
    const minLat = Math.min(pointA.lat, pointB.lat) - threshold;
    const maxLat = Math.max(pointA.lat, pointB.lat) + threshold;
    const minLng = Math.min(pointA.lng, pointB.lng) - threshold;
    const maxLng = Math.max(pointA.lng, pointB.lng) + threshold;

    if (rlat >= minLat && rlat <= maxLat && rlng >= minLng && rlng <= maxLng) {
      return true;
    }
  }
  return false;
}

/**
 * Check all route segments against truck restrictions
 */
export function checkRouteRestrictions(
  origin: { lat: number; lng: number },
  stops: { lat: number; lng: number }[],
  vehicleType: string,
  departureTime: string, // "HH:mm"
): RestrictionWarning[] {
  const vehicleWeight = VEHICLE_WEIGHTS[vehicleType] || 1500;
  const timeMinutes = parseTimeToMinutes(departureTime);
  const warnings: RestrictionWarning[] = [];
  const seenIds = new Set<string>();

  // Build segment list: origin → stop1 → stop2 → ...
  const allPoints = [origin, ...stops];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const from = allPoints[i];
    const to = allPoints[i + 1];

    for (const restriction of HCM_TRUCK_RESTRICTIONS) {
      if (seenIds.has(restriction.id)) continue;

      // Check weight
      if (vehicleWeight <= restriction.maxWeight) continue;

      // Check time
      const isTimeRestricted = restriction.restrictedTimes.some(r => isTimeInRange(timeMinutes, r));
      if (!isTimeRestricted) continue;

      // Check proximity
      if (isNearRestriction(from, to, restriction)) {
        seenIds.add(restriction.id);
        warnings.push({
          restrictionId: restriction.id,
          streetName: restriction.streetName,
          description: restriction.description,
          restrictedTimes: restriction.restrictedTimes,
          maxWeight: restriction.maxWeight,
          vehicleWeight,
          departureTime,
        });
      }
    }
  }

  return warnings;
}
