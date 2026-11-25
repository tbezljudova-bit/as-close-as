import rawRows from "../data/cities.json?raw";
import countryNames from "../data/countries.json";
import type { City } from "./types";

type CityRow = [
  number,
  string,
  string,
  number,
  number,
  number,
  number,
  string?,
];

const countries = countryNames as Record<string, string>;

function loadCities(raw: string): City[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("City data is not a list.");
  return parsed.map((row) => {
    if (!Array.isArray(row) || row.length < 7) {
      throw new Error("A city row is incomplete.");
    }
    const [id, name, countryCode, lat, lon, population, capitalFlag, aliasText] =
      row as CityRow;
    const aliases =
      typeof aliasText === "string" && aliasText.length > 0
        ? aliasText.split("|")
        : [];
    return {
      id,
      name,
      countryCode,
      country: countries[countryCode] ?? countryCode,
      lat,
      lon,
      population,
      capital: capitalFlag === 1,
      keys: [...new Set([name, ...aliases].map((item) => item.toLowerCase()))],
    };
  });
}

export const cities: City[] = loadCities(rawRows);

const byId = new Map<number, City>(cities.map((city) => [city.id, city]));

export function findCityById(id: number): City | null {
  return byId.get(id) ?? null;
}

export function findCity(name: string, countryCode: string): City | null {
  const target = name.toLowerCase();
  const matches = cities.filter(
    (city) =>
      city.countryCode === countryCode &&
      (city.name.toLowerCase() === target || city.keys.includes(target)),
  );
  matches.sort(
    (a, b) => Number(b.capital) - Number(a.capital) || b.population - a.population,
  );
  return matches[0] ?? null;
}

function mustFind(name: string, countryCode: string): City {
  const city = findCity(name, countryCode);
  if (!city) {
    throw new Error(`Missing ${name}, ${countryCode} in the city dataset.`);
  }
  return city;
}

export const defaultOrigin = mustFind("Tallinn", "EE");
export const defaultTarget = mustFind("Yerevan", "AM");
