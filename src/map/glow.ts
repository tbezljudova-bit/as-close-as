/**
 * Halo on the ring, the lit cities, and the selected route.
 * Set this to false for solid marks with no halo.
 */
export const MAP_GLOW = true;

export const ACCENT = "#FFC56A";

export const cityHalo = {
  blur: MAP_GLOW ? 0.7 : 0,
  radius: MAP_GLOW ? 8 : 0,
  opacity: MAP_GLOW ? 0.42 : 0,
};

export const lineHalo = {
  blur: MAP_GLOW ? 1.15 : 0,
  width: MAP_GLOW ? 6 : 0,
  opacity: MAP_GLOW ? 0.38 : 0,
};
