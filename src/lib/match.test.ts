import { describe, expect, it } from "vitest";
import { destinationPoint } from "./geo";
import { initialBearing } from "./geo";
import {
  LINE_CAP,
  SHORT_RING_KM,
  citiesForRadius,
  isWithinTolerance,
  matchCities,
  matchesForLines,
  sortMatches,
} from "./match";
import type { City, Match } from "./types";

const origin: City = {
  id: 1,
  name: "Origin",
  countryCode: "EE",
  country: "Estonia",
  lat: 59.437,
  lon: 24.7535,
  population: 400_000,
  capital: true,
  keys: ["origin"],
};

function cityAt(
  id: number,
  bearing: number,
  distanceKm: number,
  population: number,
  name: string,
): City {
  const point = destinationPoint(origin, bearing, distanceKm);
  return {
    id,
    name,
    countryCode: "ZZ",
    country: "Testland",
    lat: point.lat,
    lon: point.lon,
    population,
    capital: false,
    keys: [name.toLowerCase()],
  };
}

describe("isWithinTolerance", () => {
  it("includes the exact radius and the boundary, and drops the next step", () => {
    expect(isWithinTolerance(1000, 1000, 0.03)).toBe(true);
    expect(isWithinTolerance(1030, 1000, 0.03)).toBe(true);
    expect(isWithinTolerance(970, 1000, 0.03)).toBe(true);
    expect(isWithinTolerance(1030.01, 1000, 0.03)).toBe(false);
    expect(isWithinTolerance(969.99, 1000, 0.03)).toBe(false);
  });

  it("rejects a non-positive radius", () => {
    expect(isWithinTolerance(0, 0, 0.03)).toBe(false);
    expect(isWithinTolerance(10, -5, 0.03)).toBe(false);
  });
});

describe("matchCities", () => {
  const radiusKm = 2000;
  const onRing = cityAt(2, 90, radiusKm, 2_000_000, "On Ring");
  const inside = cityAt(3, 10, radiusKm * 1.02, 500_000, "Inside");
  const outside = cityAt(4, 180, radiusKm * 1.05, 9_000_000, "Outside");
  const reference = cityAt(5, 270, radiusKm, 3_000_000, "Reference");
  const tiny = cityAt(6, 40, radiusKm * 0.99, 80_000, "Tiny");

  it("keeps cities in the band and drops the origin, the reference, and the rest", () => {
    const matches = matchCities({
      cities: [origin, onRing, inside, outside, reference, tiny],
      origin,
      radiusKm,
      tolerance: 0.03,
      excludeIds: [reference.id],
    });
    const ids = matches.map((match) => match.city.id).sort((a, b) => a - b);
    expect(ids).toEqual([onRing.id, inside.id, tiny.id]);
    for (const match of matches) {
      expect(Math.abs(match.deltaRatio)).toBeLessThanOrEqual(0.03);
    }
    const exact = matches.find((match) => match.city.id === onRing.id);
    expect(exact?.deltaKm).toBeCloseTo(0, 3);
  });

  it("returns nothing for a zero radius", () => {
    expect(
      matchCities({
        cities: [onRing],
        origin,
        radiusKm: 0,
        tolerance: 0.03,
      }),
    ).toEqual([]);
  });
});

describe("sortMatches", () => {
  const radiusKm = 1000;
  const largeFar = cityAt(10, 0, 1020, 5_000_000, "Large");
  const smallNear = cityAt(11, 90, 1001, 100_000, "Small");
  const matches = matchCities({
    cities: [largeFar, smallNear],
    origin,
    radiusKm,
    tolerance: 0.03,
  });

  it("sorts by population or by closeness without mutating the input", () => {
    const before = matches.map((match) => match.city.id);
    const byPopulation = sortMatches(matches, "population");
    const byCloseness = sortMatches(matches, "closeness");
    expect(matches.map((match) => match.city.id)).toEqual(before);
    expect(byPopulation.map((match) => match.city.name)).toEqual([
      "Large",
      "Small",
    ]);
    expect(byCloseness.map((match) => match.city.name)).toEqual([
      "Small",
      "Large",
    ]);
  });
});

describe("matchesForLines", () => {
  function ringMatch(id: number, bearing: number, population = 10_000): Match {
    const city = cityAt(id, bearing, 1000, population, `City ${id}`);
    return { city, distanceKm: 1000, deltaKm: 0, deltaRatio: id / 100_000 };
  }

  it("draws a line to every match when there are 80 or fewer", () => {
    const matches = Array.from({ length: 10 }, (_, index) => ringMatch(index + 2, index * 36));
    expect(matchesForLines(matches, origin, null)).toHaveLength(10);
    expect(matchesForLines(matches, origin, null).map((match) => match.city.id)).toEqual(
      matches.map((match) => match.city.id),
    );
  });

  it("spreads 80 lines around the ring, including the far side", () => {
    const crowded = Array.from({ length: 190 }, (_, index) =>
      ringMatch(100 + index, (index / 190) * 40, 50_000 - index),
    );
    const far = [180, 200, 220, 250, 280, 310].map((bearing, index) =>
      ringMatch(500 + index, bearing, 20_000),
    );
    const lined = matchesForLines([...crowded, ...far], origin, null);
    expect(lined).toHaveLength(LINE_CAP);
    expect(LINE_CAP).toBe(80);
    for (const match of far) {
      expect(lined.some((item) => item.city.id === match.city.id)).toBe(true);
    }
    const sectors = new Set(
      lined.map((match) => Math.floor(initialBearing(origin, match.city) / (360 / LINE_CAP))),
    );
    expect(sectors.size).toBeGreaterThan(12);
  });

  it("keeps a line for the selected city without adding an eighty-first", () => {
    const matches = Array.from({ length: 100 }, (_, index) => ringMatch(100 + index, index * 3.6));
    const selected = matches[3];
    const lined = matchesForLines(matches, origin, selected?.city.id ?? null);
    expect(lined).toHaveLength(LINE_CAP);
    expect(lined.some((match) => match.city.id === selected?.city.id)).toBe(true);
  });
});

describe("citiesForRadius", () => {
  const major = [origin];
  const towns = [cityAt(2, 10, 100, 8_000, "Town")];

  it("adds towns only under 500 km", () => {
    expect(SHORT_RING_KM).toBe(500);
    expect(citiesForRadius(163, major, towns)).toHaveLength(2);
    expect(citiesForRadius(499.9, major, towns)).toHaveLength(2);
    expect(citiesForRadius(500, major, towns)).toBe(major);
    expect(citiesForRadius(2547, major, towns)).toBe(major);
    expect(citiesForRadius(163, major, [])).toBe(major);
  });
});

