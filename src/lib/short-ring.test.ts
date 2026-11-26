import { describe, expect, it } from "vitest";
import rawTowns from "../data/towns.json?raw";
import { cities, findCity, parseCityRows } from "./cities";
import { haversineKm } from "./geo";
import { citiesForRadius, matchCities } from "./match";

const towns = parseCityRows(rawTowns);

function must(name: string, countryCode: string) {
  const city = findCity(name, countryCode);
  if (!city) throw new Error(`Missing ${name}`);
  return city;
}

describe("Tallinn to Tartu", () => {
  const origin = must("Tallinn", "EE");
  const target = must("Tartu", "EE");
  const radiusKm = haversineKm(origin, target);
  const pool = citiesForRadius(radiusKm, cities, towns);
  const matches = matchCities({
    cities: pool,
    origin,
    radiusKm,
    tolerance: 0.03,
    excludeIds: [target.id],
  });
  const names = matches.map((match) => match.city.name);

  it("is a short ring and loads the 5,000+ towns on top of the main set", () => {
    expect(radiusKm).toBeGreaterThan(150);
    expect(radiusKm).toBeLessThan(180);
    expect(towns.length).toBeGreaterThan(40_000);
    expect(pool).toHaveLength(cities.length + towns.length);
    expect(citiesForRadius(haversineKm(origin, must("Yerevan", "AM")), cities, towns)).toBe(cities);
  });

  it("finds the towns on the ring, and not the nearby cities outside ±3%", () => {
    expect(names).toEqual([
      "Kotka",
      "Forssa",
      "Janakkala",
      "Orimattila",
      "Väståboland",
      "Pargas",
      "Paimio",
      "Piikkiö",
      "Tammela",
      "Elva",
    ]);
    for (const outside of ["Viljandi", "Rakvere", "Lahti", "Porvoo"]) {
      expect(names).not.toContain(outside);
    }
    const majorOnly = matchCities({
      cities,
      origin,
      radiusKm,
      tolerance: 0.03,
      excludeIds: [target.id],
    });
    expect(majorOnly.map((match) => match.city.name)).toEqual(["Kotka"]);
  });
});
