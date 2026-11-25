import { describe, expect, it } from "vitest";
import { searchCities } from "./search";
import type { City } from "./types";

function city(
  id: number,
  name: string,
  population: number,
  country: string,
  aliases: string[] = [],
): City {
  return {
    id,
    name,
    countryCode: country.slice(0, 2).toUpperCase(),
    country,
    lat: 0,
    lon: 0,
    population,
    capital: false,
    keys: [name, ...aliases].map((item) => item.toLowerCase()),
  };
}

const list = [
  city(1, "Paris", 2_100_000, "France"),
  city(2, "Paris", 25_000, "United States"),
  city(3, "Yerevan", 1_100_000, "Armenia", ["Erevan"]),
  city(4, "Tallinn", 394_000, "Estonia"),
];

describe("searchCities", () => {
  it("ranks a full name and a larger city first", () => {
    expect(searchCities(list, "par").map((item) => item.id)).toEqual([1, 2]);
    expect(searchCities(list, "yere")[0]?.name).toBe("Yerevan");
    expect(searchCities(list, "erevan")[0]?.name).toBe("Yerevan");
  });

  it("ignores blank queries and an excluded id", () => {
    expect(searchCities(list, "  ")).toEqual([]);
    expect(searchCities(list, "paris", 8, 1).map((item) => item.id)).toEqual([2]);
  });
});
