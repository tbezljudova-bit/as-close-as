import { haversineKm } from "./geo";
import type { City, Match, SortKey } from "./types";

export function isWithinTolerance(
  distanceKm: number,
  radiusKm: number,
  tolerance: number,
): boolean {
  if (!(radiusKm > 0) || tolerance < 0) return false;
  return Math.abs(distanceKm - radiusKm) / radiusKm <= tolerance;
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

export function matchesForLines(
  matches: Match[],
  selectedId: number | null,
): Match[] {
  if (matches.length <= LINE_CAP) return matches;
  const closest = sortMatches(matches, "closeness").slice(0, LINE_CAP);
  if (selectedId == null || closest.some((match) => match.city.id === selectedId)) {
    return closest;
  }
  const selected = matches.find((match) => match.city.id === selectedId);
  if (!selected) return closest;
  return [...closest.slice(0, LINE_CAP - 1), selected];
}
