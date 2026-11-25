import { formatDelta, formatDistance } from "../lib/format";
import type { Match, Unit } from "../lib/types";

type RiseCardProps = {
  match: Match;
  unit: Unit;
  shift: number;
};

export function RiseCard({ match, unit, shift }: RiseCardProps) {
  return (
    <div
      className="rise-stack"
      style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
    >
      <article className="rise-card">
        <p className="rise-kicker">{match.city.country}</p>
        <h2 className="rise-name">{match.city.name}</h2>
        <p className="rise-meta">{formatDistance(match.distanceKm, unit)} from the origin</p>
        <p className="rise-delta">
          {formatDelta(match.deltaKm, match.deltaRatio, unit)} from the ring
        </p>
      </article>
      <div className="rise-orb" />
      <div className="rise-stem" />
    </div>
  );
}
