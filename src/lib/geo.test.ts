import { describe, expect, it } from "vitest";
import {
  EARTH_RADIUS_KM,
  arcLines,
  arrowPlacement,
  boundsForRing,
  destinationPoint,
  greatCircle,
  haversineKm,
  initialBearing,
  normalizeLon,
  ringLines,
  splitAtAntimeridian,
  toRad,
} from "./geo";

const tallinn = { lat: 59.437, lon: 24.7535 };
const yerevan = { lat: 40.1777, lon: 44.5126 };

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(tallinn, { ...tallinn })).toBe(0);
    expect(haversineKm({ lat: 90, lon: 0 }, { lat: 90, lon: 180 })).toBeLessThan(1e-9);
  });

  it("matches one degree of longitude at the equator", () => {
    const expected = EARTH_RADIUS_KM * toRad(1);
    const distance = haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(Math.abs(distance - expected)).toBeLessThan(0.01);
  });

  it("matches a quarter meridian from the pole to the equator", () => {
    const expected = (EARTH_RADIUS_KM * Math.PI) / 2;
    const distance = haversineKm({ lat: 90, lon: 0 }, { lat: 0, lon: 45 });
    expect(Math.abs(distance - expected)).toBeLessThan(0.01);
  });

  it("is symmetric", () => {
    const forward = haversineKm(tallinn, yerevan);
    const backward = haversineKm(yerevan, tallinn);
    expect(forward).toBeGreaterThan(1000);
    expect(Math.abs(forward - backward)).toBeLessThan(1e-6);
  });
});

describe("destinationPoint and the ring", () => {
  it("lands on the requested distance for every compass bearing", () => {
    for (const bearing of [0, 37, 90, 180, 233, 270, 359]) {
      const point = destinationPoint(tallinn, bearing, 2500);
      expect(haversineKm(tallinn, point)).toBeCloseTo(2500, 4);
    }
  });

  it("keeps every ring sample on the radius, including across the antimeridian", () => {
    const origin = { lat: -17.8, lon: 178 };
    const radius = 1800;
    for (let bearing = 0; bearing < 360; bearing += 15) {
      const point = destinationPoint(origin, bearing, radius);
      expect(haversineKm(origin, point)).toBeCloseTo(radius, 3);
    }
    const lines = ringLines(origin, radius, 180);
    expect(lines.length).toBeGreaterThan(1);
    for (const part of lines) {
      for (let index = 1; index < part.length; index += 1) {
        const previous = part[index - 1];
        const current = part[index];
        if (!previous || !current) continue;
        expect(Math.abs(current[0] - previous[0])).toBeLessThanOrEqual(180);
      }
    }
  });

  it("returns to the start when the distance is zero", () => {
    expect(destinationPoint(yerevan, 12, 0)).toEqual({
      lat: yerevan.lat,
      lon: yerevan.lon,
    });
  });
});

describe("antimeridian splits", () => {
  it("breaks a segment that jumps across 180 longitude", () => {
    const parts = splitAtAntimeridian([
      [170, 0],
      [-170, 10],
    ]);
    expect(parts).toHaveLength(2);
    expect(parts[0]?.[0]).toEqual([170, 0]);
    expect(parts[0]?.[1]?.[0]).toBe(180);
    expect(parts[0]?.[1]?.[1]).toBeCloseTo(5, 5);
    expect(parts[1]?.[0]).toEqual([-180, parts[0]?.[1]?.[1]]);
    expect(parts[1]?.[1]).toEqual([-170, 10]);
  });

  it("leaves a short segment intact", () => {
    const parts = splitAtAntimeridian([
      [24, 59],
      [26, 60],
      [28, 58],
    ]);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toHaveLength(3);
  });
});

describe("great circle arcs", () => {
  it("starts and ends on the two cities", () => {
    const line = greatCircle(tallinn, yerevan, 24);
    expect(line[0]?.[1]).toBeCloseTo(tallinn.lat, 5);
    expect(line[0]?.[0]).toBeCloseTo(tallinn.lon, 5);
    expect(line.at(-1)?.[1]).toBeCloseTo(yerevan.lat, 5);
    expect(line.at(-1)?.[0]).toBeCloseTo(yerevan.lon, 5);
    expect(line.length).toBe(25);
  });

  it("keeps both ends of an arc that crosses the antimeridian", () => {
    const beijing = { lat: 39.9075, lon: 116.3972 };
    const whitehorse = { lat: 60.7216, lon: -135.0568 };
    const cairns = { lat: -16.923, lon: 145.7661 };
    const pacific = arcLines(beijing, whitehorse, 48);
    const south = arcLines(beijing, cairns, 48);
    expect(pacific.length).toBeGreaterThan(1);
    expect(south).toHaveLength(1);
    expect(pacific[0]?.[0]?.[0]).toBeCloseTo(beijing.lon, 4);
    expect(pacific.at(-1)?.at(-1)?.[0]).toBeCloseTo(whitehorse.lon, 4);
    expect(south[0]?.at(-1)?.[0]).toBeCloseTo(cairns.lon, 4);
    for (const parts of [pacific, south]) {
      for (const part of parts) {
        expect(part.length).toBeGreaterThanOrEqual(2);
        for (let index = 1; index < part.length; index += 1) {
          const previous = part[index - 1];
          const current = part[index];
          if (!previous || !current) continue;
          expect(Math.abs(current[0] - previous[0])).toBeLessThanOrEqual(180);
        }
      }
    }
  });

  it("places an arrow before the destination, pointing along the arc", () => {
    const arrow = arrowPlacement(tallinn, yerevan);
    const endBearing = initialBearing(
      { lat: arrow.lat, lon: arrow.lon },
      yerevan,
    );
    expect(haversineKm(tallinn, arrow)).toBeGreaterThan(500);
    expect(haversineKm(arrow, yerevan)).toBeGreaterThan(50);
    expect(Math.abs(arrow.bearing - endBearing)).toBeLessThan(25);
    expect(arcLines(tallinn, yerevan).length).toBeGreaterThan(0);
  });
});

describe("normalizeLon and bounds", () => {
  it("wraps longitudes into a single turn", () => {
    expect(normalizeLon(0)).toBe(0);
    expect(normalizeLon(190)).toBeCloseTo(-170, 8);
    expect(normalizeLon(-190)).toBeCloseTo(170, 8);
    expect(normalizeLon(180)).toBe(180);
    expect(normalizeLon(-180)).toBe(180);
    expect(normalizeLon(540)).toBe(180);
  });

  it("contains the origin and stays finite", () => {
    const [[west, south], [east, north]] = boundsForRing(tallinn, 2000);
    expect(south).toBeLessThanOrEqual(tallinn.lat);
    expect(north).toBeGreaterThanOrEqual(tallinn.lat);
    expect(west).toBeLessThanOrEqual(tallinn.lon);
    expect(east).toBeGreaterThanOrEqual(tallinn.lon);
    expect(east - west).toBeLessThan(180);
  });
});
