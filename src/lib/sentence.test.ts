import { describe, expect, it } from "vitest";
import { buildSentence, joinNames } from "./sentence";
import type { City, Match } from "./types";

function match(id: number, name: string, population: number): Match {
  const city: City = {
    id,
    name,
    countryCode: "ZZ",
    country: "Testland",
    lat: 0,
    lon: 0,
    population,
    capital: false,
    keys: [name.toLowerCase()],
  };
  return { city, distanceKm: 1000, deltaKm: 10, deltaRatio: 0.01 };
}

describe("joinNames", () => {
  it("joins one, two, and many names", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Warsaw"])).toBe("Warsaw");
    expect(joinNames(["Warsaw", "Berlin"])).toBe("Warsaw and Berlin");
    expect(joinNames(["Warsaw", "Berlin", "Kyiv"])).toBe(
      "Warsaw, Berlin, and Kyiv",
    );
  });
});

describe("buildSentence", () => {
  const matches = [
    match(1, "Small", 100_000),
    match(2, "Large", 2_000_000),
    match(3, "Middle", 800_000),
  ];

  it("names the largest cities on a city-to-city ring", () => {
    const sentence = buildSentence({
      originName: "Tallinn",
      targetName: "Yerevan",
      radiusKm: 2548,
      unit: "km",
      tolerance: 0.03,
      matches,
    });
    expect(sentence.kind).toBe("pair");
    expect(sentence.plain).toBe(
      "Tallinn is as close to Yerevan (≈ 2,548 km) as it is to Large, Middle, and Small.",
    );
    expect(sentence.names.map((name) => name.name)).toEqual([
      "Large",
      "Middle",
      "Small",
    ]);
    expect(sentence.detail).toBe("3 cities sit within ±3% of that distance.");
    expect(sentence.plain).not.toMatch(/[\u2014\u2013]/);
  });

  it("says when the reference city has the ring to itself", () => {
    const sentence = buildSentence({
      originName: "Tallinn",
      targetName: "Yerevan",
      radiusKm: 2548,
      unit: "km",
      tolerance: 0.03,
      matches: [],
    });
    expect(sentence.kind).toBe("pair-empty");
    expect(sentence.plain).toContain("Tallinn is ≈ 2,548 km from Yerevan.");
    expect(sentence.plain).toContain("No other city");
    expect(sentence.names).toEqual([]);
  });

  it("speaks in a radius without a second city", () => {
    const sentence = buildSentence({
      originName: "Tallinn",
      targetName: null,
      radiusKm: 800,
      unit: "mi",
      tolerance: 0.05,
      matches: [match(2, "Large", 2_000_000)],
    });
    expect(sentence.kind).toBe("radius");
    expect(sentence.plain).toContain("Tallinn is ≈");
    expect(sentence.plain).toContain("from Large.");
    expect(sentence.detail).toBe("1 city sits within ±5% of that distance.");
  });
});
