import { LINE_CAP } from "../lib/match";
import { formatBand, formatDelta, formatDistance, formatPopulation } from "../lib/format";
import type { SentenceModel } from "../lib/sentence";
import type { City, CompareMode, Match, SortKey, Unit } from "../lib/types";
import { CitySearch } from "./CitySearch";
import { SentenceView } from "./SentenceView";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

type SidePanelProps = {
  cities: City[];
  origin: City;
  target: City;
  mode: CompareMode;
  unit: Unit;
  distanceText: string;
  radiusKm: number;
  tolerancePct: number;
  sortKey: SortKey;
  invalidPair: boolean;
  matches: Match[];
  selectedId: number | null;
  sentence: SentenceModel | null;
  onOrigin: (city: City) => void;
  onTarget: (city: City) => void;
  onMode: (mode: CompareMode) => void;
  onUnit: (unit: Unit) => void;
  onDistanceText: (value: string) => void;
  onTolerance: (value: number) => void;
  onSort: (sortKey: SortKey) => void;
  onSelect: (id: number | null) => void;
};

export function SidePanel({
  cities,
  origin,
  target,
  mode,
  unit,
  distanceText,
  radiusKm,
  tolerancePct,
  sortKey,
  invalidPair,
  matches,
  selectedId,
  sentence,
  onOrigin,
  onTarget,
  onMode,
  onUnit,
  onDistanceText,
  onTolerance,
  onSort,
  onSelect,
}: SidePanelProps) {
  const band =
    radiusKm > 0
      ? formatBand(radiusKm, tolerancePct / 100, unit)
      : `±${tolerancePct}%`;

  return (
    <aside className="panel">
      <div className="panel-top">
        <p className="product-name">As Close As</p>
        {invalidPair ? (
          <p className="sentence" role="alert">
            Choose a different city. The radius is the distance between two places.
          </p>
        ) : sentence ? (
          <div aria-live="polite">
            <SentenceView
              sentence={sentence}
              selectedId={selectedId}
              onSelect={(id) => onSelect(id)}
            />
            {sentence.detail ? <p className="sentence-detail">{sentence.detail}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="panel-controls">
        <CitySearch
          key={origin.id}
          id="origin-city"
          label="From"
          cities={cities}
          selected={origin}
          onSelect={onOrigin}
        />
        <div className="control-row">
          <div>
            <p className="field-label" id="mode-label">
              Radius from
            </p>
            <ToggleGroup
              type="single"
              value={mode}
              aria-labelledby="mode-label"
              onValueChange={(value) => {
                if (value === "city" || value === "distance") onMode(value);
              }}
            >
              <ToggleGroupItem value="city">A city</ToggleGroupItem>
              <ToggleGroupItem value="distance">A distance</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div>
            <p className="field-label" id="unit-label">
              Units
            </p>
            <ToggleGroup
              type="single"
              value={unit}
              aria-labelledby="unit-label"
              onValueChange={(value) => {
                if (value === "km" || value === "mi") onUnit(value);
              }}
            >
              <ToggleGroupItem value="km">km</ToggleGroupItem>
              <ToggleGroupItem value="mi">mi</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {mode === "city" ? (
          <CitySearch
            key={target.id}
            id="target-city"
            label="To"
            cities={cities}
            selected={target}
            excludeId={origin.id}
            onSelect={onTarget}
          />
        ) : (
          <div>
            <label htmlFor="distance-input" className="field-label">
              Distance in {unit === "km" ? "kilometers" : "miles"}
            </label>
            <Input
              id="distance-input"
              className="num"
              type="number"
              inputMode="decimal"
              min={1}
              max={unit === "km" ? 20000 : 12427}
              step={1}
              value={distanceText}
              onChange={(event) => onDistanceText(event.target.value)}
            />
          </div>
        )}
        <div>
          <div className="slider-label" id="tolerance-label">
            <span>Tolerance</span>
            <span className="num">{band}</span>
          </div>
          <Slider
            aria-labelledby="tolerance-label"
            aria-valuetext={band}
            min={0.5}
            max={12}
            step={0.5}
            value={[tolerancePct]}
            onValueChange={(value) => {
              const next = value[0];
              if (next != null) onTolerance(next);
            }}
          />
        </div>
      </div>

      <div className="list-wrap">
        <div className="list-toolbar">
          <ToggleGroup
            type="single"
            value={sortKey}
            aria-label="Sort cities"
            onValueChange={(value) => {
              if (value === "population" || value === "closeness") onSort(value);
            }}
          >
            <ToggleGroupItem value="population">Population</ToggleGroupItem>
            <ToggleGroupItem value="closeness">Closest</ToggleGroupItem>
          </ToggleGroup>
          {selectedId != null ? (
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
              Clear
            </Button>
          ) : null}
        </div>
        <div className="list-head">
          <span>
            <span className="num">{matches.length.toLocaleString("en-US")}</span>{" "}
            {matches.length === 1 ? "city" : "cities"}
          </span>
          <span>Distance</span>
        </div>
        {matches.length > LINE_CAP ? (
          <p className="cap-note">
            Every match is listed. Lines on the map show the {LINE_CAP} cities closest
            to the exact radius.
          </p>
        ) : null}
        {matches.length === 0 ? (
          <p className="empty-list">
            {invalidPair
              ? "Pick two different cities to draw a ring."
              : "No city in this set sits in the band. Widen the tolerance to look farther from the line."}
          </p>
        ) : (
          <ul className="city-list">
            {matches.map((match) => {
              const selected = match.city.id === selectedId;
              const tight = Math.abs(match.deltaRatio) <= 0.01;
              return (
                <li key={match.city.id}>
                  <button
                    type="button"
                    id={`match-${match.city.id}`}
                    className={selected ? "city-row is-selected" : "city-row"}
                    aria-pressed={selected}
                    onClick={() => onSelect(match.city.id)}
                  >
                    <span className="city-row-place">
                      <span className="city-row-name">{match.city.name}</span>
                      <span className="city-row-country">
                        {match.city.country}
                        {match.city.capital ? " · Capital" : ""}
                        {" · "}
                        <span className="num">{formatPopulation(match.city.population)}</span>
                      </span>
                    </span>
                    <span className="city-row-figures">
                      <span className="city-row-distance">
                        {formatDistance(match.distanceKm, unit)}
                      </span>
                      <span className={tight ? "city-row-delta is-tight" : "city-row-delta"}>
                        {formatDelta(match.deltaKm, match.deltaRatio, unit)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="panel-foot">
        <p>
          <span className="num">{cities.length.toLocaleString("en-US")}</span> cities from{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>
          , CC BY 4.0. Coastlines from Natural Earth.
        </p>
        <p>A project by Tamara Bezljudova.</p>
      </footer>
    </aside>
  );
}
