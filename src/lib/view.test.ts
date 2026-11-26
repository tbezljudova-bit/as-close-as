import { describe, expect, it } from "vitest";
import { projectionFromParam, projectionParam } from "./view";

describe("view param", () => {
  it("opens the globe when view is missing, globe, or unknown", () => {
    expect(projectionFromParam(null)).toBe("globe");
    expect(projectionFromParam("globe")).toBe("globe");
    expect(projectionFromParam("mercator")).toBe("globe");
  });

  it("keeps a shared flat map on view=flat", () => {
    expect(projectionFromParam("flat")).toBe("flat");
  });

  it("writes only the flat map into the URL", () => {
    expect(projectionParam("globe")).toBeNull();
    expect(projectionParam("flat")).toBe("flat");
  });
});
