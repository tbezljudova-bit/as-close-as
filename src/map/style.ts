import type { FeatureCollection } from "geojson";
import {
  GeoJSONSource,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import {
  EMPTY_COLLECTION,
  allCityPoints,
  buildGraticule,
} from "../lib/features";
import { countryFeatures } from "../lib/world";
import { ACCENT, cityHalo, lineHalo } from "./glow";

export const baseStyle = {
  version: 8,
  sources: {
    countries: { type: "geojson", data: countryFeatures },
    graticule: { type: "geojson", data: buildGraticule() },
    cities: { type: "geojson", data: allCityPoints() },
    rings: { type: "geojson", data: EMPTY_COLLECTION },
    arcs: { type: "geojson", data: EMPTY_COLLECTION },
    arrows: { type: "geojson", data: EMPTY_COLLECTION },
    matches: { type: "geojson", data: EMPTY_COLLECTION },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0B0C0E" },
    },
    {
      id: "graticule",
      type: "line",
      source: "graticule",
      paint: {
        "line-color": "#222428",
        "line-width": 1,
        "line-opacity": 0.7,
      },
    },
    {
      id: "countries-fill",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": "#15171B",
      },
    },
    {
      id: "borders",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#2A2D33",
        "line-width": 1,
        "line-opacity": 1,
        "line-blur": 0,
      },
    },
    {
      id: "cities-dim",
      type: "circle",
      source: "cities",
      paint: {
        "circle-color": "#5C616A",
        "circle-opacity": 0.55,
        "circle-blur": 0,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          1.15,
          4,
          1.7,
        ],
      },
    },
    {
      id: "ring-band",
      type: "line",
      source: "rings",
      filter: ["!=", ["get", "kind"], "main"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#2A2D33",
        "line-width": 1,
        "line-opacity": 1,
        "line-blur": 0,
        "line-dasharray": [1.5, 1.5],
      },
    },
    {
      id: "ring-casing",
      type: "line",
      source: "rings",
      filter: ["==", ["get", "kind"], "main"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ACCENT,
        "line-width": lineHalo.width,
        "line-opacity": lineHalo.opacity,
        "line-blur": lineHalo.blur,
      },
    },
    {
      id: "ring-main",
      type: "line",
      source: "rings",
      filter: ["==", ["get", "kind"], "main"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ACCENT,
        "line-width": 1.25,
        "line-opacity": 1,
        "line-blur": 0,
      },
    },
    {
      id: "arcs",
      type: "line",
      source: "arcs",
      filter: ["==", ["get", "selected"], 0],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#4A4E56",
        "line-width": 1,
        "line-opacity": 0.55,
        "line-blur": 0,
      },
    },
    {
      id: "arcs-glow",
      type: "line",
      source: "arcs",
      filter: ["==", ["get", "selected"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ACCENT,
        "line-width": lineHalo.width,
        "line-opacity": lineHalo.opacity,
        "line-blur": lineHalo.blur,
      },
    },
    {
      id: "arcs-selected",
      type: "line",
      source: "arcs",
      filter: ["==", ["get", "selected"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ACCENT,
        "line-width": 1.5,
        "line-opacity": 1,
        "line-blur": 0,
      },
    },
    {
      id: "match-glow",
      type: "circle",
      source: "matches",
      paint: {
        "circle-color": ACCENT,
        "circle-radius": [
          "case",
          ["==", ["get", "picked"], 1],
          cityHalo.radius * 1.45,
          ["==", ["get", "muted"], 1],
          cityHalo.radius * 0.85,
          cityHalo.radius,
        ],
        "circle-blur": cityHalo.blur,
        "circle-opacity": [
          "case",
          ["==", ["get", "picked"], 1],
          Math.min(0.72, cityHalo.opacity * 1.35),
          ["==", ["get", "muted"], 1],
          cityHalo.opacity * 0.62,
          cityHalo.opacity,
        ],
      },
    },
    {
      id: "match-core",
      type: "circle",
      source: "matches",
      paint: {
        "circle-color": ACCENT,
        "circle-radius": [
          "case",
          ["==", ["get", "picked"], 1],
          4.25,
          ["==", ["get", "muted"], 1],
          2.4,
          2.75,
        ],
        "circle-stroke-width": 0,
        "circle-blur": 0,
        "circle-opacity": [
          "case",
          ["==", ["get", "picked"], 1],
          1,
          ["==", ["get", "muted"], 1],
          0.78,
          1,
        ],
      },
    },
  ],
} as StyleSpecification;

export function setGeo(
  map: MapLibreMap,
  id: string,
  data: FeatureCollection,
): void {
  const source = map.getSource(id);
  if (source && source.type === "geojson") {
    (source as GeoJSONSource).setData(data);
  }
}

function arrowImage(color: string): ImageData {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw an arrow.");
  context.clearRect(0, 0, size, size);
  context.beginPath();
  context.moveTo(16, 0);
  context.lineTo(27, 26);
  context.lineTo(16, 20);
  context.lineTo(5, 26);
  context.closePath();
  context.lineJoin = "miter";
  context.fillStyle = color;
  context.fill();
  return context.getImageData(0, 0, size, size);
}

export function decorateMap(map: MapLibreMap): void {
  if (!map.hasImage("arrow")) {
    map.addImage("arrow", arrowImage("#6A6E76"), { pixelRatio: 2 });
  }
  if (!map.hasImage("arrow-hot")) {
    map.addImage("arrow-hot", arrowImage(ACCENT), { pixelRatio: 2 });
  }
  if (map.getLayer("arrows")) return;
  map.addLayer({
    id: "arrows",
    type: "symbol",
    source: "arrows",
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "selected"], 1],
        "arrow-hot",
        "arrow",
      ],
      "icon-size": ["case", ["==", ["get", "selected"], 1], 0.85, 0.55],
      "icon-anchor": "top",
      "icon-rotate": ["get", "bearing"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": [
        "case",
        ["==", ["get", "selected"], 1],
        1,
        ["==", ["get", "muted"], 1],
        0.5,
        0.9,
      ],
    },
  });
}
