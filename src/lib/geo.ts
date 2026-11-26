import type { LatLon } from "./types";

/** Mean Earth radius, in kilometers. */
export const EARTH_RADIUS_KM = 6371.0088;

export function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeLon(lon: number): number {
  const wrapped = (((lon + 180) % 360) + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * Great-circle distance on a sphere. The same radius is used for the ring,
 * so a point placed with destinationPoint lands back on the radius.
 */
export function haversineKm(a: LatLon, b: LatLon): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point reached by traveling `distanceKm` from `start` along `bearingDeg`. */
export function destinationPoint(
  start: LatLon,
  bearingDeg: number,
  distanceKm: number,
): LatLon {
  if (distanceKm === 0) return { lat: start.lat, lon: start.lon };
  const angular = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(start.lat);
  const lon1 = toRad(start.lon);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angular);
  const cosAngular = Math.cos(angular);
  const sinLat2 = sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearing);
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)));
  const y = Math.sin(bearing) * sinAngular * cosLat1;
  const x = cosAngular - sinLat1 * Math.sin(lat2);
  const lon2 = lon1 + Math.atan2(y, x);
  return { lat: toDeg(lat2), lon: normalizeLon(toDeg(lon2)) };
}

/** Initial compass bearing from `a` to `b`, degrees clockwise from north. */
export function initialBearing(a: LatLon, b: LatLon): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function toVector(point: LatLon): [number, number, number] {
  const lat = toRad(point.lat);
  const lon = toRad(point.lon);
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)];
}

function fromVector(vector: [number, number, number]): LatLon {
  const [x, y, z] = vector;
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lon: toDeg(Math.atan2(y, x)),
  };
}

/** Points along the shorter great-circle arc, including both ends. */
export function greatCircle(
  a: LatLon,
  b: LatLon,
  steps = 64,
): [number, number][] {
  const start = toVector(a);
  const end = toVector(b);
  const dot = Math.min(
    1,
    Math.max(-1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]),
  );
  const omega = Math.acos(dot);
  if (omega < 1e-8) {
    return [
      [normalizeLon(a.lon), a.lat],
      [normalizeLon(b.lon), b.lat],
    ];
  }
  const sinOmega = Math.sin(omega);
  if (Math.abs(sinOmega) < 1e-6) {
    return [
      [normalizeLon(a.lon), a.lat],
      [normalizeLon(b.lon), b.lat],
    ];
  }
  const coords: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const weightStart = Math.sin((1 - t) * omega) / sinOmega;
    const weightEnd = Math.sin(t * omega) / sinOmega;
    const point = fromVector([
      weightStart * start[0] + weightEnd * end[0],
      weightStart * start[1] + weightEnd * end[1],
      weightStart * start[2] + weightEnd * end[2],
    ]);
    coords.push([point.lon, point.lat]);
  }
  return coords;
}

/**
 * Split a line where longitude jumps across the antimeridian so a map does
 * not draw the long way around the world.
 */
export function splitAtAntimeridian(
  coords: [number, number][],
): [number, number][][] {
  const parts: [number, number][][] = [];
  let current: [number, number][] = [];

  const flush = () => {
    if (current.length > 0) parts.push(current);
    current = [];
  };

  for (let index = 0; index < coords.length; index += 1) {
    const point = coords[index];
    if (!point) continue;
    if (index === 0) {
      current.push(point);
      continue;
    }
    const previous = coords[index - 1];
    if (!previous) continue;
    const [lon1, lat1] = previous;
    const [lon2, lat2] = point;
    const delta = lon2 - lon1;
    if (Math.abs(delta) <= 180) {
      current.push(point);
      continue;
    }

    const crossesEast = delta < -180;
    const boundary = crossesEast ? 180 : -180;
    const resume = crossesEast ? -180 : 180;
    const span = crossesEast
      ? 180 - lon1 + (lon2 + 180)
      : lon1 + 180 + (180 - lon2);
    const firstLeg = crossesEast ? 180 - lon1 : lon1 + 180;
    const t = span === 0 ? 0.5 : firstLeg / span;
    const lat = lat1 + (lat2 - lat1) * t;
    current.push([boundary, lat]);
    flush();
    current.push([resume, lat], point);
  }

  flush();
  return parts.filter((part) => part.length >= 2);
}

export function ringLines(
  center: LatLon,
  radiusKm: number,
  steps = 360,
): [number, number][][] {
  if (!(radiusKm > 0) || steps < 8) return [];
  const coords: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const point = destinationPoint(center, (index / steps) * 360, radiusKm);
    coords.push([point.lon, point.lat]);
  }
  return splitAtAntimeridian(coords);
}

export function arcLines(
  a: LatLon,
  b: LatLon,
  steps = 48,
): [number, number][][] {
  return splitAtAntimeridian(greatCircle(a, b, steps));
}

export function arrowPlacement(
  a: LatLon,
  b: LatLon,
): { lon: number; lat: number; bearing: number } {
  const coords = greatCircle(a, b, 48);
  const previous = coords[coords.length - 2] ?? coords[0];
  if (!previous) return { lon: b.lon, lat: b.lat, bearing: initialBearing(a, b) };
  return {
    lon: b.lon,
    lat: b.lat,
    bearing: initialBearing({ lon: previous[0], lat: previous[1] }, b),
  };
}

/** Southwest / northeast corners of the ring, longitude unwrapped around the origin. */
export function boundsForRing(
  center: LatLon,
  radiusKm: number,
): [[number, number], [number, number]] {
  let minLat = center.lat;
  let maxLat = center.lat;
  let minLon = center.lon;
  let maxLon = center.lon;
  for (let bearing = 0; bearing < 360; bearing += 5) {
    const point = destinationPoint(center, bearing, radiusKm);
    let lon = point.lon;
    while (lon - center.lon > 180) lon -= 360;
    while (center.lon - lon > 180) lon += 360;
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
