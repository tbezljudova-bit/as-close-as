import { haversineKm, initialBearing } from "./geo";
import type { City, LatLon, Match, SortKey } from "./types";

export function isWithinTolerance(
  distanceKm: number,
  radiusKm: number,
  tolerance: number,
): boolean {
  if (!(radiusKm > 0) || tolerance < 0) return false;
  return Math.abs(distanceKm - radiusKm) / radiusKm <= tolerance;
}

/** Rings shorter than this also match towns of 5,000 people or more. */
export const SHORT_RING_KM = 500;

export function citiesForRadius(radiusKm: number, major: City[], towns: City[]): City[] {
  if (!(radiusKm > 0) || radiusKm >= SHORT_RING_KM || towns.length === 0) return major;
  return major.concat(towns);
}

export function matchCities(args: {
  cities: City[];
  origin: City;
  radiusKm: number;
  tolerance: number;
  excludeIds?: number[];
}): Match[] {
  const { cities, origin, radiusKm, tolerance } = args;
  if (!(radiusKm > 0)) return [];
  const excluded = new Set<number>([origin.id, ...(args.excludeIds ?? [])]);
  const matches: Match[] = [];
  for (const city of cities) {
    if (excluded.has(city.id)) continue;
    const distanceKm = haversineKm(origin, city);
    if (!isWithinTolerance(distanceKm, radiusKm, tolerance)) continue;
    const deltaKm = distanceKm - radiusKm;
    matches.push({
      city,
      distanceKm,
      deltaKm,
      deltaRatio: deltaKm / radiusKm,
    });
  }
  return matches;
}

/** The destination, measured like a match so it can be selected from its pin. */
export function targetAsMatch(origin: LatLon, target: City, radiusKm: number): Match {
  const distanceKm = haversineKm(origin, target);
  const deltaKm = distanceKm - radiusKm;
  return {
    city: target,
    distanceKm,
    deltaKm,
    deltaRatio: radiusKm > 0 ? deltaKm / radiusKm : 0,
    target: true,
  };
}

/**
 * The selected city is a list row when it is one, and the destination pin
 * when that city was chosen instead. A destination that is also listed
 * stays the same city, marked as the target.
 */
export function resolveSelection(
  matches: Match[],
  target: Match | null,
  selectedId: number | null,
): Match | null {
  if (selectedId == null) return null;
  const fromList = matches.find((match) => match.city.id === selectedId);
  if (fromList) {
    return fromList.city.id === target?.city.id ? { ...fromList, target: true } : fromList;
  }
  return target?.city.id === selectedId ? target : null;
}

export function sortMatches(matches: Match[], sortKey: SortKey): Match[] {
  const sorted = matches.slice();
  if (sortKey === "population") {
    sorted.sort(
      (a, b) =>
        b.city.population - a.city.population ||
        Math.abs(a.deltaRatio) - Math.abs(b.deltaRatio) ||
        a.city.name.localeCompare(b.city.name),
    );
    return sorted;
  }
  sorted.sort(
    (a, b) =>
      Math.abs(a.deltaRatio) - Math.abs(b.deltaRatio) ||
      b.city.population - a.city.population ||
      a.city.name.localeCompare(b.city.name),
  );
  return sorted;
}

/** Lines stay readable when a wide band lights up hundreds of cities. */
export const LINE_CAP = 80;

/**
 * Eighty lines, or every match when there are fewer.
 * The eighty are spread by bearing so each part of the ring gets a line
 * before any direction gets a second one. A selected city keeps a line.
 */
export function matchesForLines(
  matches: Match[],
  origin: LatLon,
  selectedId: number | null,
): Match[] {
  if (matches.length <= LINE_CAP) return matches;

  const sectorSize = 360 / LINE_CAP;
  const bins: Match[][] = Array.from({ length: LINE_CAP }, () => []);
  const bearingOf = new Map<number, number>();
  for (const match of matches) {
    const bearing = initialBearing(origin, match.city);
    bearingOf.set(match.city.id, bearing);
    const sector = Math.min(LINE_CAP - 1, Math.floor(bearing / sectorSize));
    bins[sector]?.push(match);
  }
  for (const bin of bins) {
    bin.sort(
      (a, b) =>
        Math.abs(a.deltaRatio) - Math.abs(b.deltaRatio) ||
        b.city.population - a.city.population ||
        a.city.id - b.city.id,
    );
  }

  const picked: Match[] = [];
  const seen = new Set<number>();
  let round = 0;
  while (picked.length < LINE_CAP) {
    let added = false;
    for (let sector = 0; sector < LINE_CAP && picked.length < LINE_CAP; sector += 1) {
      const match = bins[sector]?.[round];
      if (!match || seen.has(match.city.id)) continue;
      seen.add(match.city.id);
      picked.push(match);
      added = true;
    }
    if (!added) break;
    round += 1;
  }

  if (selectedId == null || seen.has(selectedId)) return picked;
  const selected = matches.find((match) => match.city.id === selectedId);
  const selectedBearing = bearingOf.get(selectedId);
  if (!selected || selectedBearing == null || picked.length === 0) return picked;
  let nearest = 0;
  let best = Infinity;
  for (let index = 0; index < picked.length; index += 1) {
    const bearing = bearingOf.get(picked[index]?.city.id ?? -1) ?? 0;
    const delta = Math.abs(bearing - selectedBearing) % 360;
    const gap = Math.min(delta, 360 - delta);
    if (gap < best) {
      best = gap;
      nearest = index;
    }
  }
  picked[nearest] = selected;
  return picked;
}
