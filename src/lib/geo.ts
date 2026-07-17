import type { LatLng } from "./types";

const R = 6371; // km

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = deg2rad(b[0] - a[0]);
  const dLon = deg2rad(b[1] - a[1]);
  const lat1 = deg2rad(a[0]);
  const lat2 = deg2rad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

// Cumulative length of a polyline
export function polylineLength(pts: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  return d;
}

// Interpolate a point at fraction t (0..1) along a polyline; returns coord + heading.
export function pointAlong(pts: LatLng[], t: number): { coord: LatLng; heading: number } {
  if (pts.length === 1) return { coord: pts[0], heading: 0 };
  t = Math.max(0, Math.min(1, t));
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = haversine(pts[i - 1], pts[i]);
    segLengths.push(l);
    total += l;
  }
  let target = t * total;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const f = segLengths[i] === 0 ? 0 : target / segLengths[i];
      const a = pts[i];
      const b = pts[i + 1];
      const coord: LatLng = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const heading = bearing(a, b);
      return { coord, heading };
    }
    target -= segLengths[i];
  }
  return { coord: pts[pts.length - 1], heading: 0 };
}

export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(deg2rad(b[1] - a[1])) * Math.cos(deg2rad(b[0]));
  const x =
    Math.cos(deg2rad(a[0])) * Math.sin(deg2rad(b[0])) -
    Math.sin(deg2rad(a[0])) * Math.cos(deg2rad(b[0])) * Math.cos(deg2rad(b[1] - a[1]));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Small lateral offset to simulate a route deviation
export function offsetCoord(c: LatLng, km: number, bearingDeg: number): LatLng {
  const dLat = (km / 111) * Math.cos(deg2rad(bearingDeg));
  const dLon = (km / (111 * Math.cos(deg2rad(c[0])))) * Math.sin(deg2rad(bearingDeg));
  return [c[0] + dLat, c[1] + dLon];
}
