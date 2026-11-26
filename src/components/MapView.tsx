import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  ScaleControl,
} from "maplibre-gl";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import {
  buildArcFeatures,
  buildMatchPoints,
  buildRingFeatures,
} from "../lib/features";
import { boundsForRing } from "../lib/geo";
import { matchesForLines } from "../lib/match";
import type { City, LatLon, Match, ProjectionMode, Unit } from "../lib/types";
import { MAP_GLOW, cityHalo } from "../map/glow";
import { baseStyle, decorateMap, setGeo } from "../map/style";
import { RiseCard } from "./RiseCard";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

type MapViewProps = {
  origin: City;
  target: City | null;
  showTarget: boolean;
  radiusKm: number;
  tolerance: number;
  matches: Match[];
  selected: Match | null;
  riseNonce: number;
  projection: ProjectionMode;
  unit: Unit;
  onSelect: (id: number | null) => void;
  onProjection: (projection: ProjectionMode) => void;
  onReady: () => void;
};

type ScreenPoint = {
  x: number;
  y: number;
  shift: number;
};

export function MapView({
  origin,
  target,
  showTarget,
  radiusKm,
  tolerance,
  matches,
  selected,
  riseNonce,
  projection,
  unit,
  onSelect,
  onProjection,
  onReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const scaleRef = useRef<ScaleControl | null>(null);
  const originMarker = useRef<Marker | null>(null);
  const targetMarker = useRef<Marker | null>(null);
  const matchesRef = useRef(matches);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const fitted = useRef(false);
  const notified = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [screen, setScreen] = useState<ScreenPoint | null>(null);

  useEffect(() => {
    matchesRef.current = matches;
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: baseStyle,
        center: [origin.lon, origin.lat],
        zoom: 2.4,
        attributionControl: false,
        maplibreLogo: false,
        fadeDuration: 0,
        maxPitch: 0,
        pitch: 0,
        dragRotate: false,
        canvasContextAttributes: {
          preserveDrawingBuffer: true,
          antialias: true,
        },
      });
    } catch (error) {
      console.error(error);
      setFailed(true);
      return;
    }
    mapRef.current = map;
    const scale = new ScaleControl({ maxWidth: 110, unit: "metric" });
    scaleRef.current = scale;
    map.addControl(scale, "bottom-left");
    map.addControl(
      new AttributionControl({
        compact: false,
        customAttribution: "© GeoNames, CC BY 4.0 · Natural Earth",
      }),
      "bottom-right",
    );
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();

    let cancelled = false;
    const onClick = (event: { point: { x: number; y: number } }) => {
      const id = nearestMatchId(map, event.point, matchesRef.current);
      onSelectRef.current(id);
    };
    const onMove = (event: { point: { x: number; y: number } }) => {
      const id = nearestMatchId(map, event.point, matchesRef.current);
      map.getCanvas().style.cursor = id == null ? "" : "pointer";
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("load", () => {
      if (cancelled) return;
      map.setProjection({ type: projection === "globe" ? "globe" : "mercator" });
      map.setRenderWorldCopies(projection === "flat");
      map.resize();
      decorateMap(map);
      setReady(true);
    });

    return () => {
      cancelled = true;
      originMarker.current = null;
      targetMarker.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The map instance is created once. Later effects push new data into it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    map.setProjection({ type: projection === "globe" ? "globe" : "mercator" });
    map.setRenderWorldCopies(projection === "flat");
    if (projection === "globe") {
      map.setSky({
        "sky-color": "#0B0C0E",
        "horizon-color": "#15171B",
        "fog-color": "#0B0C0E",
        "sky-horizon-blend": 0.12,
        "atmosphere-blend": MAP_GLOW ? 0.22 : 0,
      });
    }
    const animate = fitted.current;
    fitted.current = true;
    fitRing(map, origin, radiusKm, animate);
  }, [ready, projection, origin, radiusKm]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    setGeo(
      map,
      "rings",
      radiusKm > 1 ? buildRingFeatures(origin, radiusKm, tolerance) : { type: "FeatureCollection", features: [] },
    );
    const lined = matchesForLines(matches, selected?.city.id ?? null);
    const arcs = buildArcFeatures(origin, lined, selected?.city.id ?? null);
    setGeo(map, "arcs", arcs.lines);
    setGeo(map, "arrows", arcs.arrows);
    setGeo(map, "matches", buildMatchPoints(matches, selected?.city.id ?? null));
    if (map.getLayer("arcs")) {
      map.setPaintProperty("arcs", "line-opacity", selected ? 0.16 : 0.55);
    }
    if (map.getLayer("cities-dim")) {
      map.setPaintProperty("cities-dim", "circle-opacity", selected ? 0.18 : 0.55);
    }
    const hidden = [origin.id];
    if (showTarget && target) hidden.push(target.id);
    if (map.getLayer("cities-dim")) {
      map.setFilter("cities-dim", [
        "!",
        ["in", ["get", "id"], ["literal", hidden]],
      ] as FilterSpecification);
    }
  }, [ready, origin, target, showTarget, radiusKm, tolerance, matches, selected]);

  useEffect(() => {
    if (!ready || notified.current) return;
    const map = mapRef.current;
    if (!map) return;
    const notify = () => {
      if (notified.current) return;
      notified.current = true;
      onReadyRef.current();
    };
    map.once("idle", notify);
  }, [ready]);

  useEffect(() => {
    if (!ready || !MAP_GLOW) return;
    const map = mapRef.current;
    if (!map) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paintGlow = (wave: number) => {
      if (!map.getLayer("match-glow")) return;
      map.setPaintProperty(
        "match-glow",
        "circle-opacity",
        [
          "case",
          ["any", ["==", ["get", "muted"], 1], ["==", ["get", "picked"], 1]],
          0,
          cityHalo.opacity * (0.75 + wave * 0.25),
        ] as ExpressionSpecification,
      );
      map.setPaintProperty(
        "match-glow",
        "circle-radius",
        [
          "case",
          ["any", ["==", ["get", "muted"], 1], ["==", ["get", "picked"], 1]],
          0,
          cityHalo.radius + wave * 1.2,
        ] as ExpressionSpecification,
      );
    };
    if (reduce) {
      paintGlow(0.5);
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      if (!document.hidden) paintGlow(0.5 + 0.5 * Math.sin(now / 900));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  useEffect(() => {
    scaleRef.current?.setUnit(unit === "km" ? "metric" : "imperial");
  }, [unit, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    originMarker.current = upsertPin(map, originMarker.current, origin, "origin");
    if (showTarget && target) {
      targetMarker.current = upsertPin(map, targetMarker.current, target, "target");
    } else if (targetMarker.current) {
      targetMarker.current.remove();
      targetMarker.current = null;
    }
  }, [ready, origin, target, showTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selected) return;
    const point = map.project([selected.city.lon, selected.city.lat]);
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    const targetX = Math.min(width - 56, Math.max(56, point.x));
    const targetY = Math.min(height - 80, Math.max(340, point.y));
    if (Math.abs(targetX - point.x) < 2 && Math.abs(targetY - point.y) < 2) return;
    const center = map.project(map.getCenter());
    const next = map.unproject([
      center.x - (targetX - point.x),
      center.y - (targetY - point.y),
    ]);
    map.easeTo({ center: next, duration: 480, bearing: 0, pitch: 0 });
  }, [ready, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selected) {
      setScreen(null);
      return;
    }
    const update = () => {
      const projected = map.project([selected.city.lon, selected.city.lat]);
      const originPoint = map.project([origin.lon, origin.lat]);
      const width = map.getContainer().clientWidth;
      const cardHalf = 120;
      let shift = 0;
      if (projected.x < cardHalf + 16) shift = cardHalf + 16 - projected.x;
      if (projected.x > width - cardHalf - 16) {
        shift = width - cardHalf - 16 - projected.x;
      }
      const aboveOrigin =
        originPoint.y < projected.y - 36 && originPoint.y > projected.y - 280;
      if (aboveOrigin && Math.abs(originPoint.x - projected.x) < 150 && Math.abs(shift) < 48) {
        shift = originPoint.x >= projected.x ? -160 : 160;
      }
      setScreen({ x: projected.x, y: projected.y, shift });
    };
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
    };
  }, [ready, selected, origin]);

  return (
    <section className="stage" aria-label="Equal-distance map">
      <p className="sr-only">
        Matching cities are listed beside the map. Choose one to lift it off the map.
      </p>
      <div ref={containerRef} className="map-canvas" />
      {failed ? (
        <p className="map-error">The map could not start in this browser.</p>
      ) : null}
      <div className="legend" aria-hidden="true">
        <span>
          <i className="swatch dim" /> Other cities
        </span>
        <span>
          <i className="swatch glow" /> On the ring
        </span>
        <span>
          <i className="swatch ring" /> Equal distance
        </span>
      </div>
      <p className="map-caption">
        {projection === "flat"
          ? "Web Mercator stretches a true circle of distance."
          : "On the globe, that ring is a circle."}
      </p>
      <div className="view-toggle">
        <ToggleGroup
          type="single"
          value={projection}
          aria-label="Map projection"
          onValueChange={(value) => {
            if (value === "flat" || value === "globe") onProjection(value);
          }}
        >
          <ToggleGroupItem value="globe">Globe</ToggleGroupItem>
          <ToggleGroupItem value="flat">Map</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="rise-layer">
        {selected && screen ? (
          <div
            key={`${selected.city.id}-${riseNonce}`}
            className="rise-anchor"
            style={{ left: screen.x, top: screen.y }}
          >
            <div className="rise-shadow" />
            <RiseCard match={selected} unit={unit} shift={screen.shift} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function nearestMatchId(
  map: MapLibreMap,
  point: { x: number; y: number },
  matches: Match[],
): number | null {
  if (!map.getLayer("match-core")) return null;
  const features = map.queryRenderedFeatures([point.x, point.y], {
    layers: ["match-core", "match-glow"],
  });
  let best: { id: number; distance: number } | null = null;
  const seen = new Set<number>();
  for (const feature of features) {
    const id = Number(feature.properties?.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    const match = matches.find((item) => item.city.id === id);
    if (!match) continue;
    const projected = map.project([match.city.lon, match.city.lat]);
    const dx = projected.x - point.x;
    const dy = projected.y - point.y;
    const distance = dx * dx + dy * dy;
    if (!best || distance < best.distance) best = { id, distance };
  }
  return best?.id ?? null;
}

function fitRing(
  map: MapLibreMap,
  origin: LatLon,
  radiusKm: number,
  animate: boolean,
) {
  const duration = animate ? 750 : 0;
  if (!(radiusKm > 1) || radiusKm > 16000) {
    map.easeTo({
      center: [origin.lon, origin.lat],
      zoom: radiusKm > 16000 ? 1.15 : 3.2,
      bearing: 0,
      pitch: 0,
      duration,
    });
    return;
  }
  const [[west, south], [east, north]] = boundsForRing(origin, radiusKm);
  if (east - west > 300 || east > 180 || west < -180) {
    map.easeTo({
      center: [origin.lon, origin.lat],
      zoom: 1.35,
      bearing: 0,
      pitch: 0,
      duration,
    });
    return;
  }
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    {
      padding: { top: 84, bottom: 72, left: 56, right: 56 },
      duration,
      maxZoom: 5.4,
      bearing: 0,
      pitch: 0,
    },
  );
}

function upsertPin(
  map: MapLibreMap,
  marker: Marker | null,
  city: City,
  kind: "origin" | "target",
): Marker {
  if (!marker) {
    const element = document.createElement("div");
    element.className = `pin pin-${kind}`;
    element.innerHTML = `<span class="pin-name"></span><span class="pin-dot"></span>`;
    marker = new Marker({ element, anchor: "bottom" })
      .setLngLat([city.lon, city.lat])
      .addTo(map);
  }
  const name = marker.getElement().querySelector(".pin-name");
  if (name) name.textContent = city.name;
  marker.setLngLat([city.lon, city.lat]);
  return marker;
}
