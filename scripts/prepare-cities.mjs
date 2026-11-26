// Builds the city bundles from GeoNames dumps.
// Download (not committed):
//   https://download.geonames.org/export/dump/cities15000.zip
//   https://download.geonames.org/export/dump/cities5000.zip
//   https://download.geonames.org/export/dump/countryInfo.txt
// Usage: node scripts/prepare-cities.mjs /tmp/geonames

import fs from "node:fs";
import path from "node:path";

const sourceDir = process.argv[2] ?? "/tmp/geonames";
const citiesPath = path.join(sourceDir, "cities15000.txt");
const townsPath = path.join(sourceDir, "cities5000.txt");
const countriesPath = path.join(sourceDir, "countryInfo.txt");
const outDir = path.resolve("src/data");

const POPULATION_FLOOR = 50_000;
const TOWN_FLOOR = 5_000;
const ADMIN_CAPITAL_FLOOR = 20_000;

function isLatin(value) {
  return /^[\p{Script=Latin}\d .'\u2019-]+$/u.test(value);
}

function cleanAlias(value) {
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 24) return null;
  if (/\s{2,}/.test(trimmed) || trimmed.split(" ").length > 2) return null;
  if (/\d/.test(trimmed)) return null;
  if (!isLatin(trimmed)) return null;
  return trimmed;
}

function displayName(name, ascii) {
  if (isLatin(name)) return name;
  if (ascii && isLatin(ascii)) return ascii;
  return name;
}

function relatedAlias(name, alias) {
  const left = name.toLowerCase();
  const right = alias.toLowerCase();
  if (left === right) return false;
  if (left.includes(right) || right.includes(left)) return true;
  if (left.slice(0, 4) === right.slice(0, 4) && left.length >= 4 && right.length >= 4) return true;
  if (left.slice(-5) === right.slice(-5) && left.length >= 5 && right.length >= 5) return true;
  return false;
}

function aliasesFor(name, ascii, raw) {
  const seen = new Set([name.toLowerCase()]);
  const aliases = [];
  const push = (value) => {
    if (!value || aliases.length >= 2) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    aliases.push(value);
  };
  if (ascii && isLatin(ascii)) push(ascii);
  for (const part of raw.split(",")) {
    const alias = cleanAlias(part);
    if (!alias || !relatedAlias(name, alias)) continue;
    if (alias.length <= 4 && alias === alias.toUpperCase()) continue;
    push(alias);
  }
  return aliases;
}

const countries = {};
for (const line of fs.readFileSync(countriesPath, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const fields = line.split("\t");
  const code = fields[0];
  const name = fields[4];
  if (code && name) countries[code] = name;
}

function readPlace(line) {
  if (!line) return null;
  const fields = line.split("\t");
  if (fields.length < 15) return null;
  const id = Number(fields[0]);
  const lat = Number(fields[4]);
  const lon = Number(fields[5]);
  const population = Number(fields[14]);
  if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (fields[6] !== "P" || !fields[8]) return null;
  if (fields[7] === "PPLX" || fields[7] === "PPLL") return null;
  return {
    id,
    name: fields[1],
    ascii: fields[2],
    rawAliases: fields[3] ?? "",
    lat,
    lon,
    featureCode: fields[7],
    countryCode: fields[8],
    population: Number.isFinite(population) ? population : 0,
  };
}

function rowFor(place, withAliases) {
  const label = displayName(place.name, place.ascii);
  const capital = place.featureCode === "PPLC";
  const row = [
    place.id,
    label,
    place.countryCode,
    Math.round(place.lat * 10000) / 10000,
    Math.round(place.lon * 10000) / 10000,
    place.population,
    capital ? 1 : 0,
  ];
  if (withAliases) {
    const aliases = aliasesFor(label, place.ascii, place.rawAliases);
    if (aliases.length > 0) row.push(aliases.join("|"));
  }
  return row;
}

const kept = [];
const majorIds = new Set();
for (const line of fs.readFileSync(citiesPath, "utf8").split(/\r?\n/)) {
  const place = readPlace(line);
  if (!place) continue;
  const capital = place.featureCode === "PPLC";
  const adminCapital = place.featureCode === "PPLA";
  const keep =
    place.population >= POPULATION_FLOOR ||
    capital ||
    (adminCapital && place.population >= ADMIN_CAPITAL_FLOOR);
  if (!keep) continue;
  majorIds.add(place.id);
  kept.push(rowFor(place, true));
}

kept.sort((a, b) => b[5] - a[5] || a[1].localeCompare(b[1]) || a[0] - b[0]);

const towns = [];
if (fs.existsSync(townsPath)) {
  for (const line of fs.readFileSync(townsPath, "utf8").split(/\r?\n/)) {
    const place = readPlace(line);
    if (!place || majorIds.has(place.id) || place.population < TOWN_FLOOR) continue;
    towns.push(rowFor(place, false));
  }
  towns.sort((a, b) => b[5] - a[5] || a[1].localeCompare(b[1]) || a[0] - b[0]);
}

fs.mkdirSync(outDir, { recursive: true });
const cityBody = kept.map((row) => JSON.stringify(row)).join(",\n");
fs.writeFileSync(path.join(outDir, "cities.json"), `[\n${cityBody}\n]\n`);
const townBody = towns.map((row) => JSON.stringify(row)).join(",");
fs.writeFileSync(path.join(outDir, "towns.json"), `[${townBody}]`);
fs.writeFileSync(path.join(outDir, "countries.json"), `${JSON.stringify(countries, null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, "CITIES_CREDIT.txt"),
  [
    "City coordinates, names, and population are a trimmed subset of GeoNames.",
    "The main list is cities15000, keeping population of 50,000 or more, every national",
    "capital, and first-order administrative capitals of 20,000 people or more.",
    "towns.json is cities5000 places of 5,000 or more that are not already in that list.",
    "City sections and localities (GeoNames PPLX and PPLL) are left out.",
    "Short rings, under 500 km, match both files. Longer rings use the main list only.",
    "Source: https://www.geonames.org/",
    "License: Creative Commons Attribution 4.0 (CC BY 4.0)",
    "https://creativecommons.org/licenses/by/4.0/",
    "",
  ].join("\n"),
);

const cityBytes = fs.statSync(path.join(outDir, "cities.json")).size;
const townBytes = fs.statSync(path.join(outDir, "towns.json")).size;
console.log(
  `cities ${kept.length} bytes ${cityBytes} towns ${towns.length} bytes ${townBytes} countries ${Object.keys(countries).length}`,
);
