import type { FeatureCollection, Geometry, Position } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-50m.json";

const world = worldAtlas as unknown as Topology<{
  countries: GeometryCollection;
}>;

const countries = feature(
  world,
  world.objects.countries,
) as unknown as FeatureCollection<Geometry>;

for (const [index, item] of countries.features.entries()) {
  const properties = { ...(item.properties ?? {}) } as Record<string, unknown>;
  properties.tone = index % 2;
  item.properties = properties;
  if (item.geometry) item.geometry = cutDateLine(item.geometry);
}

export const countryFeatures = countries;

type Ring = Position[];

/** A segment from 179° to -179° is one step on the earth and a leap across
 * the whole map. Cut those rings so every piece stays inside -180..180. */
function cutDateLine(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    return { type: "MultiPolygon", coordinates: repairPolygon(geometry.coordinates) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.flatMap((polygon) => repairPolygon(polygon)),
    };
  }
  return geometry;
}

function repairPolygon(rings: Ring[]): Ring[][] {
  const useful = rings.filter((ring) => !isPolarSliver(ring));
  if (useful.length === 0) return [];
  const [outer, ...holes] = useful;
  const jumps = countJumps(outer);
  const pieces =
    jumps === 0
      ? [outer]
      : jumps === 1 && outer.every((point) => point[1] < -60)
        ? splitHemisphere(outer)
        : splitRing(outer);
  return pieces.map((piece) => {
    const owned = holes.filter((hole) => countJumps(hole) === 0 && ringContains(piece, hole));
    return [piece, ...owned];
  });
}

function countJumps(ring: Ring): number {
  let jumps = 0;
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) jumps += 1;
  }
  return jumps;
}

function isPolarSliver(ring: Ring): boolean {
  return ring.length > 0 && ring.every((point) => Math.abs(point[1]) >= 89);
}

function onDateLine(lon: number): boolean {
  return Math.abs(Math.abs(lon) - 180) < 1e-4;
}

function splitRing(ring: Ring): Ring[] {
  const parts: Ring[] = [[]];
  for (const point of ring) {
    const part = parts[parts.length - 1];
    if (part.length > 0) {
      const prev = part[part.length - 1];
      if (Math.abs(point[0] - prev[0]) > 180) {
        if (!(onDateLine(prev[0]) && onDateLine(point[0]))) {
          const boundary = crossing(prev, point);
          if (boundary) part.push(boundary);
        }
        parts.push([]);
      }
    }
    parts[parts.length - 1].push([point[0], point[1]]);
  }
  const cleaned = parts.filter((part) => part.length >= 2);
  const pieces = joinSameSide(cleaned);
  return pieces.map(closeRing).filter((part) => part.length >= 4 && countJumps(part) === 0);
}

/** The ring starts mid-shape, so the first and last pieces are one coast.
 * Join them only when that join does not leap the date line. */
function joinSameSide(parts: Ring[]): Ring[] {
  if (parts.length < 2) return parts;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const gap = Math.abs(first[0][0] - last[last.length - 1][0]);
  if (gap > 180) return parts;
  return [last.concat(first), ...parts.slice(1, -1)];
}

function crossing(a: Position, b: Position): Position | null {
  const delta = b[0] - a[0];
  const boundary = delta < 0 ? 180 : -180;
  const lon2 = b[0] + (delta < 0 ? 360 : -360);
  const span = lon2 - a[0];
  if (Math.abs(span) < 1e-9) return null;
  const t = (boundary - a[0]) / span;
  if (!Number.isFinite(t)) return null;
  return [boundary, a[1] + t * (b[1] - a[1])];
}

function closeRing(ring: Ring): Ring {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [first[0], first[1]]];
}

/** Antarctica is one coast that spans every longitude. Two caps, meeting at
 * longitude 0 and closed along latitude -85, stay inside the map. */
function splitHemisphere(ring: Ring): Ring[] {
  const open =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const west: Ring = [];
  const east: Ring = [];
  for (let i = 0; i < open.length; i++) {
    const point = open[i];
    if (i > 0 && Math.abs(point[0] - open[i - 1][0]) > 180) continue;
    if (point[0] <= 0) west.push(point);
    if (point[0] >= 0) east.push(point);
  }
  const south = -85;
  const caps: Ring[] = [];
  if (west.length >= 2) {
    caps.push(
      closeRing([
        ...west,
        [0, west[west.length - 1][1]],
        [0, south],
        [-180, south],
        [-180, west[0][1]],
      ]),
    );
  }
  if (east.length >= 2) {
    caps.push(
      closeRing([
        ...east,
        [180, east[east.length - 1][1]],
        [180, south],
        [0, south],
        [0, east[0][1]],
      ]),
    );
  }
  return caps;
}

function ringContains(outer: Ring, hole: Ring): boolean {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const point of outer) {
    west = Math.min(west, point[0]);
    east = Math.max(east, point[0]);
    south = Math.min(south, point[1]);
    north = Math.max(north, point[1]);
  }
  const probe = hole[0];
  return probe[0] >= west && probe[0] <= east && probe[1] >= south && probe[1] <= north;
}
