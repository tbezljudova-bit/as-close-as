import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
} from "geojson";
import { cities } from "./cities";
import { arcLines, arrowPlacement, ringLines } from "./geo";
import type { City, LatLon, Match } from "./types";

export const EMPTY_COLLECTION: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function buildGraticule(): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];
  for (let lon = -180; lon < 180; lon += 15) {
    const coordinates: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 4) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    });
  }
  for (let lat = -60; lat <= 75; lat += 15) {
    const coordinates: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 4) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    });
  }
  return { type: "FeatureCollection", features };
}

let cityPointCache: FeatureCollection<Point> | null = null;

export function allCityPoints(): FeatureCollection<Point> {
  if (cityPointCache) return cityPointCache;
  cityPointCache = {
    type: "FeatureCollection",
    features: cities.map((city) => cityPoint(city)),
  };
  return cityPointCache;
}

export function buildMatchPoints(matches: Match[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: matches.map((match) => cityPoint(match.city)),
  };
}

function cityPoint(city: City): Feature<Point> {
  return {
    type: "Feature",
    id: city.id,
    properties: {
      id: city.id,
      name: city.name,
      population: city.population,
    },
    geometry: { type: "Point", coordinates: [city.lon, city.lat] },
  };
}

export function buildRingFeatures(
  origin: LatLon,
  radiusKm: number,
  tolerance: number,
): FeatureCollection<MultiLineString> {
  const features: Feature<MultiLineString>[] = [];
  const add = (kind: string, radius: number, steps: number) => {
    if (!(radius > 1)) return;
    const lines = ringLines(origin, radius, steps);
    if (lines.length === 0) return;
    features.push({
      type: "Feature",
      properties: { kind },
      geometry: { type: "MultiLineString", coordinates: lines },
    });
  };
  add("outer", radiusKm * (1 + tolerance), 180);
  add("inner", radiusKm * (1 - tolerance), 180);
  add("main", radiusKm, 360);
  return { type: "FeatureCollection", features };
}

export function buildArcFeatures(
  origin: LatLon,
  matches: Match[],
  selectedId: number | null,
): {
  lines: FeatureCollection<MultiLineString>;
  arrows: FeatureCollection<Point>;
} {
  const lines: Feature<MultiLineString>[] = [];
  const arrows: Feature<Point>[] = [];
  for (const match of matches) {
    const selected = match.city.id === selectedId ? 1 : 0;
    const parts = arcLines(origin, match.city, 48);
    if (parts.length > 0) {
      lines.push({
        type: "Feature",
        properties: { id: match.city.id, selected },
        geometry: { type: "MultiLineString", coordinates: parts },
      });
    }
    const arrow = arrowPlacement(origin, match.city);
    arrows.push({
      type: "Feature",
      properties: {
        id: match.city.id,
        selected,
        bearing: arrow.bearing,
      },
      geometry: { type: "Point", coordinates: [arrow.lon, arrow.lat] },
    });
  }
  return {
    lines: { type: "FeatureCollection", features: lines },
    arrows: { type: "FeatureCollection", features: arrows },
  };
}
