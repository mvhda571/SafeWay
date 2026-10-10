export type LatLng = [number, number];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance in metres from point p to segment ab (equirectangular projection, fine for < few km). */
export function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const kx = Math.cos(rad(p[0])) * 111320;
  const ky = 110540;
  const ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky;
  const bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
}

export function distanceToPolyline(p: LatLng, line: LatLng[]): number {
  if (line.length === 1) return haversine(p, line[0]);
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    min = Math.min(min, distanceToSegment(p, line[i], line[i + 1]));
  }
  return min;
}

/** Offset a point by metres north/east. */
export function offset(p: LatLng, north: number, east: number): LatLng {
  return [p[0] + north / 110540, p[1] + east / (111320 * Math.cos(rad(p[0])))];
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Tashkent city centre — default map view. */
export const DEFAULT_CENTER: LatLng = [41.3111, 69.2797];
