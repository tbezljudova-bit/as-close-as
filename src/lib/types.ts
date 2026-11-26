export type LatLon = {
  lat: number;
  lon: number;
};

export type Unit = "km" | "mi";

export type SortKey = "population" | "closeness";

export type ProjectionMode = "flat" | "globe";

export type CompareMode = "city" | "distance";

export type City = LatLon & {
  id: number;
  name: string;
  countryCode: string;
  country: string;
  population: number;
  capital: boolean;
  keys: string[];
};

export type Match = {
  city: City;
  distanceKm: number;
  deltaKm: number;
  deltaRatio: number;
  /** The destination the ring was drawn to, when that city is the one selected. */
  target?: boolean;
};
