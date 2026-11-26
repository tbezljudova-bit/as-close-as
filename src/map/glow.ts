/**
 * Halo on the ring, the lit cities, and the selected route.
 * Set this to false for solid marks with no halo.
 */
export const MAP_GLOW = true;

export const ACCENT = "#FFC56A";

/** 40% of the way from #FFC56A toward white. The ring only. */
export const RING = "#FFDCA6";

export const ringStroke = {
  opacity: 0.62,
};

export const ringHalo = {
  blur: MAP_GLOW ? 2.2 : 0,
  width: MAP_GLOW ? 6 : 0,
  opacity: MAP_GLOW ? 0.2 : 0,
};

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

/**
 * Flat view at a long radius packs matches into a few pixels.
 * Ease the halo down as the list grows so those dots stay separate.
 * The globe keeps the full halo.
 */
export function flatMarkScale(matchCount: number): number {
  if (matchCount <= 40) return 1;
  const t = Math.min(1, (matchCount - 40) / 240);
  return 1 - t * 0.68;
}
