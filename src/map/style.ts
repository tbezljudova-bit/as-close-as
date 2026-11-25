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
      paint: { "background-color": "#071018" },
    },
    {
      id: "graticule",
      type: "line",
      source: "graticule",
      paint: {
        "line-color": "#1b303c",
        "line-width": 0.7,
        "line-opacity": 0.8,
      },
    },
    {
      id: "countries-fill",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "tone"], 1],
          "#18242d",
          "#141c24",
        ],
      },
    },
    {
      id: "coast-glow",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#8eb4c8",
        "line-width": 2.2,
        "line-blur": 1.2,
        "line-opacity": 0.22,
      },
    },
    {
      id: "borders",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#3c5566",
        "line-width": 0.7,
        "line-opacity": 0.9,
      },
    },
    {
      id: "cities-dim",
      type: "circle",
      source: "cities",
      paint: {
        "circle-color": "#93a8b8",
        "circle-opacity": 0.42,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          1.15,
          3,
          1.8,
          5.5,
          2.8,
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
        "line-color": "#ff8d72",
        "line-width": 1,
        "line-opacity": 0.55,
        "line-dasharray": [1.2, 1.5],
      },
    },
    {
      id: "ring-casing",
      type: "line",
      source: "rings",
      filter: ["==", ["get", "kind"], "main"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#3a120d",
        "line-width": 5,
        "line-opacity": 0.7,
        "line-blur": 0.3,
      },
    },
    {
      id: "ring-main",
      type: "line",
      source: "rings",
      filter: ["==", ["get", "kind"], "main"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ff5c3a",
        "line-width": 2.15,
        "line-opacity": 0.96,
      },
    },
    {
      id: "arcs",
      type: "line",
      source: "arcs",
      filter: ["==", ["get", "selected"], 0],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#e3a56c",
        "line-width": 1.15,
        "line-opacity": 0.62,
      },
    },
    {
      id: "arcs-glow",
      type: "line",
      source: "arcs",
      filter: ["==", ["get", "selected"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffbf70",
        "line-width": 8,
        "line-opacity": 0.38,
        "line-blur": 2,
      },
    },
    {
      id: "arcs-selected",
      type: "line",
      source: "arcs",
      filter: ["==", ["get", "selected"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#fff6e4",
        "line-width": 3.4,
        "line-opacity": 1,
      },
    },
    {
      id: "match-glow",
      type: "circle",
      source: "matches",
      paint: {
        "circle-color": [
          "case",
          ["==", ["get", "muted"], 1],
          "#5e584e",
          "#ffc56a",
        ],
        "circle-radius": ["case", ["==", ["get", "muted"], 1], 5, 14],
        "circle-blur": 0.82,
        "circle-opacity": [
          "case",
          ["==", ["get", "picked"], 1],
          0,
          ["==", ["get", "muted"], 1],
          0.05,
          0.46,
        ],
      },
    },
    {
      id: "match-core",
      type: "circle",
      source: "matches",
      paint: {
        "circle-color": [
          "case",
          ["==", ["get", "muted"], 1],
          "#8a8174",
          "#fff6e4",
        ],
        "circle-radius": ["case", ["==", ["get", "muted"], 1], 1.6, 3.6],
        "circle-stroke-color": [
          "case",
          ["==", ["get", "muted"], 1],
          "#4e483f",
          "#ffb03a",
        ],
        "circle-stroke-width": ["case", ["==", ["get", "muted"], 1], 0.6, 1.2],
        "circle-opacity": [
          "case",
          ["==", ["get", "picked"], 1],
          0,
          ["==", ["get", "muted"], 1],
          0.34,
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
  context.moveTo(16, 3);
  context.lineTo(28, 27);
  context.lineTo(16, 21);
  context.lineTo(4, 27);
  context.closePath();
  context.lineJoin = "round";
  context.lineWidth = 3;
  context.strokeStyle = "rgba(18, 10, 6, 0.9)";
  context.stroke();
  context.fillStyle = color;
  context.fill();
  return context.getImageData(0, 0, size, size);
}

export function decorateMap(map: MapLibreMap): void {
  if (!map.hasImage("arrow")) {
    map.addImage("arrow", arrowImage("#f0c48a"), { pixelRatio: 2 });
  }
  if (!map.hasImage("arrow-hot")) {
    map.addImage("arrow-hot", arrowImage("#fff6e6"), { pixelRatio: 2 });
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
      "icon-size": ["case", ["==", ["get", "selected"], 1], 1.15, 0.72],
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
        0.16,
        0.9,
      ],
    },
  });
}
