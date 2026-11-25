import { useMemo, useState } from "react";
import { formatPopulation } from "../lib/format";
import { searchCities } from "../lib/search";
import type { City } from "../lib/types";
import { Input } from "./ui/input";

type CitySearchProps = {
  id: string;
  label: string;
  cities: City[];
  selected: City | null;
  excludeId?: number;
  onSelect: (city: City) => void;
};

export function CitySearch({
  id,
  label,
  cities,
  selected,
  excludeId,
  onSelect,
}: CitySearchProps) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(
    () => (open ? searchCities(cities, query, 8, excludeId) : []),
    [cities, excludeId, open, query],
  );

  function choose(city: City) {
    onSelect(city);
    setQuery(city.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        autoComplete="off"
        spellCheck={false}
        placeholder="Search for a city"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(event) => {
          event.currentTarget.select();
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(selected?.name ?? "");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const city = results[active];
            if (city) choose(city);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery(selected?.name ?? "");
          }
        }}
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" className="suggest">
          {results.length === 0 && (
            <li className="suggest-empty">No cities match that name.</li>
          )}
          {results.map((city, index) => (
            <li key={city.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? "suggest-item is-active" : "suggest-item"}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(city);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <span>
                  {city.name}
                  {city.capital ? <span className="suggest-cap">Capital</span> : null}
                </span>
                <span className="suggest-meta">
                  {city.country} · <span className="num">{formatPopulation(city.population)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
