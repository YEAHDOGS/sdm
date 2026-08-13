import type { GeoPoint } from "@help/shared";

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function withinRadius(point: GeoPoint, center: GeoPoint, radiusM: number): boolean {
  return haversineMeters(point, center) <= radiusM;
}

/**
 * Cheap bounding box for "missions near me" SQL prefiltering
 * (D1 has no PostGIS; box + haversine is plenty at city scale).
 */
export function bboxAround(center: GeoPoint, radiusM: number) {
  const latDelta = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const lngDelta = latDelta / Math.cos((center.lat * Math.PI) / 180);
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
