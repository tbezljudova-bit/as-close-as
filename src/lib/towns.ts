import type { City } from "./types";
import { parseCityRows } from "./cities";

let pending: Promise<City[]> | null = null;

/** Loaded only for rings under 500 km, so long rings do not download this file. */
export function loadTowns(): Promise<City[]> {
  pending ??= import("../data/towns.json?raw").then((mod) => parseCityRows(mod.default));
  return pending;
}
