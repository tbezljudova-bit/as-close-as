import { describe, expect, it } from "vitest";
import { cities, defaultOrigin, defaultTarget } from "./cities";
import { haversineKm } from "./geo";
import { matchCities, sortMatches } from "./match";
import { buildSentence } from "./sentence";
import { searchCities } from "./search";

describe("default Tallinn and Yerevan", () => {
  it("loads both capitals and a ring of other cities at ±3%", () => {
    expect(defaultOrigin.name).toBe("Tallinn");
    expect(defaultOrigin.country).toBe("Estonia");
    expect(defaultOrigin.capital).toBe(true);
    expect(defaultTarget.name).toBe("Yerevan");
    expect(defaultTarget.country).toBe("Armenia");
    expect(defaultTarget.capital).toBe(true);

    const radiusKm = haversineKm(defaultOrigin, defaultTarget);
    expect(radiusKm).toBeGreaterThan(1500);
    expect(radiusKm).toBeLessThan(4500);

    const matches = matchCities({
      cities,
      origin: defaultOrigin,
      radiusKm,
      tolerance: 0.03,
      excludeIds: [defaultTarget.id],
    });
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(Math.abs(match.deltaRatio)).toBeLessThanOrEqual(0.03 + 1e-12);
      expect(match.city.id).not.toBe(defaultOrigin.id);
      expect(match.city.id).not.toBe(defaultTarget.id);
    }

    const sentence = buildSentence({
      originName: defaultOrigin.name,
      targetName: defaultTarget.name,
      radiusKm,
      unit: "km",
      tolerance: 0.03,
      matches,
    });
    expect(sentence.kind).toBe("pair");
    expect(sentence.plain.startsWith("Tallinn is as close to Yerevan")).toBe(true);
    expect(sentence.plain).toContain("as it is to");
    expect(sentence.names.some((name) => name.name === "Yerevan")).toBe(false);
    expect(sentence.names.some((name) => name.name === "Tallinn")).toBe(false);
    expect(sentence.plain).not.toMatch(/[\u2014\u2013]/);

    expect(searchCities(cities, "yerevan")[0]?.id).toBe(defaultTarget.id);
    expect(searchCities(cities, "tallinn")[0]?.id).toBe(defaultOrigin.id);

    expect(Math.round(radiusKm)).toBe(2547);
    expect(matches.length).toBe(106);
    expect(sentence.plain).toBe(
      "Tallinn is as close to Yerevan (≈ 2,547 km) as it is to Adana, Barcelona, Antalya, and Malatya.",
    );
    expect(
      sortMatches(matches, "population")
        .slice(0, 4)
        .map((match) => match.city.name),
    ).toEqual(["Adana", "Barcelona", "Antalya", "Malatya"]);
  });
});
