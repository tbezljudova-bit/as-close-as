import type { ProjectionMode } from "./types";

/** Missing or unknown `view` values open the globe. `flat` keeps the Mercator map. */
export function projectionFromParam(value: string | null): ProjectionMode {
  return value === "flat" ? "flat" : "globe";
}

/** The globe is the default, so only the flat map is written into the URL. */
export function projectionParam(projection: ProjectionMode): string | null {
  return projection === "flat" ? "flat" : null;
}
