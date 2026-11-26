import { useEffect, useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { SidePanel } from "./components/SidePanel";
import { cities, defaultOrigin, defaultTarget, findCityById } from "./lib/cities";
import { formatDistanceNumber, toKm } from "./lib/format";
import { haversineKm } from "./lib/geo";
import { matchCities, sortMatches } from "./lib/match";
import { buildSentence } from "./lib/sentence";
import { projectionFromParam, projectionParam } from "./lib/view";
import type {
  City,
  CompareMode,
  ProjectionMode,
  SortKey,
  Unit,
} from "./lib/types";

type InitialState = {
  mode: CompareMode;
  origin: City;
  target: City;
  distanceKm: number;
  distanceText: string;
  unit: Unit;
  tolerancePct: number;
  sortKey: SortKey;
  projection: ProjectionMode;
  selectedId: number | null;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readInitial(): InitialState {
  const params = new URLSearchParams(window.location.search);
  const from = Number(params.get("from"));
  const origin = (Number.isFinite(from) && findCityById(from)) || defaultOrigin;
  const unit: Unit = params.get("unit") === "mi" ? "mi" : "km";
  const tolerancePct = clamp(Number(params.get("tol") ?? 3), 0.5, 12);
  const sortKey: SortKey = params.get("sort") === "fit" ? "closeness" : "population";
  const projection = projectionFromParam(params.get("view"));
  const pick = Number(params.get("pick"));
  const selectedId = Number.isFinite(pick) ? pick : null;
  if (params.has("km")) {
    const distanceKm = clamp(Number(params.get("km")), 1, 20000);
    return {
      mode: "distance",
      origin,
      target: defaultTarget,
      distanceKm,
      distanceText: formatDistanceNumber(distanceKm, unit),
      unit,
      tolerancePct,
      sortKey,
      projection,
      selectedId,
    };
  }
  const to = Number(params.get("to"));
  const target = (Number.isFinite(to) && findCityById(to)) || defaultTarget;
  const distanceKm = haversineKm(origin, target);
  return {
    mode: "city",
    origin,
    target,
    distanceKm,
    distanceText: formatDistanceNumber(distanceKm, unit),
    unit,
    tolerancePct,
    sortKey,
    projection,
    selectedId,
  };
}

export default function App() {
  const [initial] = useState(readInitial);
  const [mode, setMode] = useState<CompareMode>(initial.mode);
  const [origin, setOrigin] = useState(initial.origin);
  const [target, setTarget] = useState(initial.target);
  const [distanceKm, setDistanceKm] = useState(initial.distanceKm);
  const [distanceText, setDistanceText] = useState(initial.distanceText);
  const [unit, setUnit] = useState<Unit>(initial.unit);
  const [tolerancePct, setTolerancePct] = useState(initial.tolerancePct);
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey);
  const [projection, setProjection] = useState<ProjectionMode>(initial.projection);
  const [selectedId, setSelectedId] = useState<number | null>(initial.selectedId);
  const [riseNonce, setRiseNonce] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const invalidPair = mode === "city" && origin.id === target.id;
  const radiusKm = invalidPair
    ? 0
    : mode === "city"
      ? haversineKm(origin, target)
      : distanceKm;
  const tolerance = tolerancePct / 100;

  const rawMatches = useMemo(() => {
    if (!(radiusKm > 0)) return [];
    return matchCities({
      cities,
      origin,
      radiusKm,
      tolerance,
      excludeIds: mode === "city" ? [target.id] : [],
    });
  }, [origin, radiusKm, tolerance, mode, target.id]);

  const matches = useMemo(
    () => sortMatches(rawMatches, sortKey),
    [rawMatches, sortKey],
  );

  const selected = matches.find((match) => match.city.id === selectedId) ?? null;

  const sentence = invalidPair
    ? null
    : buildSentence({
        originName: origin.name,
        targetName: mode === "city" ? target.name : null,
        radiusKm,
        unit,
        tolerance,
        matches: rawMatches,
      });

  const selectedCityId = selected?.city.id ?? null;

  useEffect(() => {
    if (selectedCityId == null) return;
    document
      .getElementById(`match-${selectedCityId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedCityId, riseNonce]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const title =
      mode === "city"
        ? `As Close As · ${origin.name} and ${target.name}`
        : `As Close As · ${origin.name}`;
    document.title = title;
  }, [mode, origin.name, target.name]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (origin.id !== defaultOrigin.id) params.set("from", String(origin.id));
    if (mode === "distance") params.set("km", String(Math.round(distanceKm)));
    else if (target.id !== defaultTarget.id) params.set("to", String(target.id));
    if (unit !== "km") params.set("unit", unit);
    if (tolerancePct !== 3) params.set("tol", String(tolerancePct));
    if (sortKey !== "population") params.set("sort", "fit");
    const view = projectionParam(projection);
    if (view) params.set("view", view);
    if (selectedCityId != null) params.set("pick", String(selectedCityId));
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", next);
  }, [
    origin.id,
    target.id,
    mode,
    distanceKm,
    unit,
    tolerancePct,
    sortKey,
    projection,
    selectedCityId,
  ]);

  function selectCity(id: number | null) {
    if (id != null && id === selectedId) setRiseNonce((value) => value + 1);
    setSelectedId(id);
  }

  function changeMode(next: CompareMode) {
    if (next === "distance") {
      const km = !invalidPair && mode === "city" ? haversineKm(origin, target) : distanceKm;
      setDistanceKm(km);
      setDistanceText(formatDistanceNumber(km, unit));
    }
    setMode(next);
    setSelectedId(null);
  }

  function changeUnit(next: Unit) {
    setUnit(next);
    setDistanceText(formatDistanceNumber(distanceKm, next));
  }

  function changeDistance(value: string) {
    setDistanceText(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setDistanceKm(clamp(toKm(parsed, unit), 1, 20000));
    }
  }

  return (
    <div
      className="app"
      data-ready={mapReady ? "true" : "false"}
      data-match-count={matches.length}
    >
      <SidePanel
        cities={cities}
        origin={origin}
        target={target}
        mode={mode}
        unit={unit}
        distanceText={distanceText}
        radiusKm={radiusKm}
        tolerancePct={tolerancePct}
        sortKey={sortKey}
        invalidPair={invalidPair}
        matches={matches}
        selectedId={selected?.city.id ?? null}
        sentence={sentence}
        onOrigin={(city) => {
          setOrigin(city);
          setSelectedId(null);
        }}
        onTarget={(city) => {
          setTarget(city);
          setSelectedId(null);
        }}
        onMode={changeMode}
        onUnit={changeUnit}
        onDistanceText={changeDistance}
        onTolerance={setTolerancePct}
        onSort={setSortKey}
        onSelect={selectCity}
      />
      <MapView
        origin={origin}
        target={target}
        showTarget={mode === "city" && !invalidPair}
        radiusKm={radiusKm}
        tolerance={tolerance}
        matches={matches}
        selected={selected}
        riseNonce={riseNonce}
        projection={projection}
        unit={unit}
        onSelect={selectCity}
        onProjection={setProjection}
        onReady={() => setMapReady(true)}
      />
    </div>
  );
}
