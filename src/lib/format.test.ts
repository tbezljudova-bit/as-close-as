import { describe, expect, it } from "vitest";
import {
  formatBand,
  formatDelta,
  formatDistance,
  formatPercent,
  formatPopulation,
  fromKm,
  toKm,
} from "./format";

describe("distance formatting", () => {
  it("converts miles with the international mile", () => {
    expect(fromKm(1.609344, "mi")).toBeCloseTo(1, 8);
    expect(toKm(1, "mi")).toBeCloseTo(1.609344, 8);
    expect(toKm(10, "km")).toBe(10);
  });

  it("groups kilometers and keeps a short distance to one decimal", () => {
    expect(formatDistance(2548.4, "km")).toBe("2,548 km");
    expect(formatDistance(12.44, "km")).toBe("12.4 km");
    expect(formatDistance(1.609344, "mi")).toBe("1 mi");
  });

  it("writes a signed delta with a true minus", () => {
    expect(formatDelta(20.4, 0.02, "km")).toBe("+20 km · +2.0%");
    expect(formatDelta(-12.2, -0.012, "km")).toBe("−12 km · −1.2%");
    expect(formatDelta(0.2, 0, "km")).toBe("0 km · 0.0%");
    expect(formatDelta(-12.2, -0.012, "km")).not.toMatch(/[\u2014\u2013]/);
  });

  it("describes the tolerance band from the radius", () => {
    expect(formatPercent(0.03)).toBe("3");
    expect(formatPercent(0.025)).toBe("2.5");
    expect(formatBand(2500, 0.03, "km")).toBe("±3% · ±75 km");
    expect(formatPopulation(1_144_700)).toBe("1.1m");
    expect(formatPopulation(394_024)).toBe("394k");
  });
});
