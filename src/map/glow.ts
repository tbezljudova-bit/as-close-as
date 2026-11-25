/**
 * Halo on the ring, the lit cities, and the selected route.
 * Leave this false for solid marks. Set it to true to bring the halo back.
 */
export const MAP_GLOW = false;

export const ACCENT = "#FF5A1F";

export const cityHalo = {
  blur: MAP_GLOW ? 0.55 : 0,
  radius: MAP_GLOW ? 6.5 : 0,
  opacity: MAP_GLOW ? 0.3 : 0,
};

export const lineHalo = {
  blur: MAP_GLOW ? 1 : 0,
  width: MAP_GLOW ? 4.5 : 0,
  opacity: MAP_GLOW ? 0.28 : 0,
};
