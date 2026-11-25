import type { Unit } from "./types";

export const KM_PER_MILE = 1.609344;

export function toKm(value: number, unit: Unit): number {
  return unit === "km" ? value : value * KM_PER_MILE;
}

export function fromKm(km: number, unit: Unit): number {
  return unit === "km" ? km : km / KM_PER_MILE;
}

export function unitLabel(unit: Unit): string {
  return unit === "km" ? "km" : "mi";
}

function roundDistance(value: number): number {
  if (value >= 100) return Math.round(value);
  return Math.round(value * 10) / 10;
}

export function formatDistance(km: number, unit: Unit): string {
  const value = roundDistance(fromKm(km, unit));
  return `${value.toLocaleString("en-US")} ${unitLabel(unit)}`;
}

export function formatDistanceNumber(km: number, unit: Unit): string {
  return String(roundDistance(fromKm(km, unit)));
}

export function formatPercent(tolerance: number): string {
  const pct = Math.round(tolerance * 1000) / 10;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

function signed(value: number, digits?: number): string {
  const shown = digits == null ? String(value) : Math.abs(value).toFixed(digits);
  const body = digits == null ? Math.abs(value).toLocaleString("en-US") : shown;
  if (value > 0) return `+${body}`;
  if (value < 0) return `−${body}`;
  return digits == null ? "0" : value.toFixed(digits);
}

export function formatDelta(deltaKm: number, ratio: number, unit: Unit): string {
  const rounded = Math.round(fromKm(deltaKm, unit));
  const pct = Math.round(ratio * 1000) / 10;
  const distance =
    rounded === 0
      ? `0 ${unitLabel(unit)}`
      : `${signed(rounded)} ${unitLabel(unit)}`;
  const percent = Math.abs(pct) < 0.05 ? "0.0%" : `${signed(pct, 1)}%`;
  return `${distance} · ${percent}`;
}

export function formatBand(radiusKm: number, tolerance: number, unit: Unit): string {
  const band = roundDistance(fromKm(radiusKm * tolerance, unit));
  return `±${formatPercent(tolerance)}% · ±${band.toLocaleString("en-US")} ${unitLabel(unit)}`;
}

export function formatPopulation(population: number): string {
  if (population >= 1_000_000) {
    const millions = population / 1_000_000;
    const digits = millions >= 10 ? 0 : 1;
    return `${millions.toFixed(digits)}m`;
  }
  if (population >= 10_000) return `${Math.round(population / 1_000)}k`;
  return population.toLocaleString("en-US");
}
