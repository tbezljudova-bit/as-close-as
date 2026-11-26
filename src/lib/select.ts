/** Same breakpoint as the stacked layout in index.css. */
export const STACKED_LAYOUT_QUERY = "(max-width: 860px)";

export type SelectSource = "list" | "map";

/**
 * Where the page should move after a city is chosen.
 * On a phone, a list row brings the map up. A map dot stays where it is.
 * On a wide layout the list can scroll its own row; the map is already in view.
 */
export function selectionFollow(
  source: SelectSource,
  stacked: boolean,
): "map" | "list" | "none" {
  if (!stacked) return "list";
  return source === "map" ? "none" : "map";
}

/** A list row on a phone frames that city. Map taps and desktop keep the gentler nudge. */
export function selectionFramesCity(source: SelectSource, stacked: boolean): boolean {
  return stacked && source === "list";
}

/**
 * A focused row pulls the page back to the list on a phone.
 * Drop that focus once the choice is made so the map can stay in view.
 */
export function releaseStackedFocus(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) return;
  if (!window.matchMedia(STACKED_LAYOUT_QUERY).matches) return;
  target.blur();
}
