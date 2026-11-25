import { formatDistance, formatPercent } from "./format";
import { sortMatches } from "./match";
import type { Match, Unit } from "./types";

export type SentenceName = {
  id: number;
  name: string;
};

export type SentenceKind = "pair" | "pair-empty" | "radius" | "radius-empty";

export type SentenceModel = {
  kind: SentenceKind;
  plain: string;
  originName: string;
  targetName: string | null;
  distanceLabel: string;
  names: SentenceName[];
  detail: string;
};

const NAME_LIMIT = 4;

export function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function buildSentence(args: {
  originName: string;
  targetName: string | null;
  radiusKm: number;
  unit: Unit;
  tolerance: number;
  matches: Match[];
}): SentenceModel {
  const distanceLabel = `≈ ${formatDistance(args.radiusKm, args.unit)}`;
  const names = sortMatches(args.matches, "population")
    .slice(0, NAME_LIMIT)
    .map((match) => ({ id: match.city.id, name: match.city.name }));
  const band = formatPercent(args.tolerance);
  const count = args.matches.length;
  const detail =
    count === 0
      ? ""
      : `${count.toLocaleString("en-US")} ${count === 1 ? "city sits" : "cities sit"} within ±${band}% of that distance.`;

  if (args.targetName) {
    if (names.length === 0) {
      const plain = `${args.originName} is ${distanceLabel} from ${args.targetName}. No other city in this set sits within ±${band}% of that distance.`;
      return {
        kind: "pair-empty",
        plain,
        originName: args.originName,
        targetName: args.targetName,
        distanceLabel,
        names,
        detail: "",
      };
    }
    const plain = `${args.originName} is as close to ${args.targetName} (${distanceLabel}) as it is to ${joinNames(names.map((name) => name.name))}.`;
    return {
      kind: "pair",
      plain,
      originName: args.originName,
      targetName: args.targetName,
      distanceLabel,
      names,
      detail,
    };
  }

  if (names.length === 0) {
    const plain = `No city in this set sits within ±${band}% of ${distanceLabel} from ${args.originName}.`;
    return {
      kind: "radius-empty",
      plain,
      originName: args.originName,
      targetName: null,
      distanceLabel,
      names,
      detail: "",
    };
  }

  const plain = `${args.originName} is ${distanceLabel} from ${joinNames(names.map((name) => name.name))}.`;
  return {
    kind: "radius",
    plain,
    originName: args.originName,
    targetName: null,
    distanceLabel,
    names,
    detail,
  };
}
