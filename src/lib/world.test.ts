import type { Geometry, Position } from "geojson";
import { describe, expect, it } from "vitest";
import { countryFeatures } from "./world";

function jumpsInRing(ring: Position[]): number {
  let jumps = 0;
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) jumps += 1;
  }
  return jumps;
}

function jumpsInGeometry(geometry: Geometry | null): number {
  if (!geometry) return 0;
  if (geometry.type === "Polygon") {
    return geometry.coordinates.reduce((sum, ring) => sum + jumpsInRing(ring), 0);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (sum, polygon) =>
        sum + polygon.reduce((inner, ring) => inner + jumpsInRing(ring), 0),
      0,
    );
  }
  return 0;
}

function positions(geometry: Geometry | null): Position[] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

describe("country outlines", () => {
  it("does not leap across the date line", () => {
    const jumps = countryFeatures.features.reduce(
      (sum, item) => sum + jumpsInGeometry(item.geometry),
      0,
    );
    expect(countryFeatures.features.length).toBeGreaterThan(200);
    expect(jumps).toBe(0);
  });

  it("keeps every coordinate on the map", () => {
    const points = countryFeatures.features.flatMap((item) => positions(item.geometry));
    expect(points.length).toBeGreaterThan(1000);
    for (const point of points) {
      expect(Number.isFinite(point[0])).toBe(true);
      expect(Number.isFinite(point[1])).toBe(true);
      expect(point[0]).toBeGreaterThanOrEqual(-180);
      expect(point[0]).toBeLessThanOrEqual(180);
      expect(point[1]).toBeGreaterThanOrEqual(-90);
      expect(point[1]).toBeLessThanOrEqual(90);
    }
  });
});
