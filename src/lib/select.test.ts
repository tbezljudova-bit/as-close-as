import { describe, expect, it } from "vitest";
import { selectionFollow, selectionFramesCity } from "./select";

describe("selection follow", () => {
  it("brings the map up when a phone user picks from the list", () => {
    expect(selectionFollow("list", true)).toBe("map");
    expect(selectionFramesCity("list", true)).toBe(true);
  });

  it("leaves the page where it is when a phone user taps a map dot", () => {
    expect(selectionFollow("map", true)).toBe("none");
    expect(selectionFramesCity("map", true)).toBe(false);
  });

  it("keeps the desktop list in sync without reframing the map", () => {
    expect(selectionFollow("list", false)).toBe("list");
    expect(selectionFollow("map", false)).toBe("list");
    expect(selectionFramesCity("list", false)).toBe(false);
    expect(selectionFramesCity("map", false)).toBe(false);
  });
});
