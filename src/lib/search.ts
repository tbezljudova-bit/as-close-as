import type { City } from "./types";

export function searchCities(
  list: City[],
  query: string,
  limit = 8,
  excludeId?: number,
): City[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const ranked: { city: City; score: number }[] = [];
  for (const city of list) {
    if (city.id === excludeId) continue;
    let rank = 0;
    for (const key of city.keys) {
      if (key === needle) rank = Math.max(rank, 3);
      else if (key.startsWith(needle)) rank = Math.max(rank, 2);
      else if (key.includes(needle)) rank = Math.max(rank, 1);
    }
    if (rank === 0) continue;
    ranked.push({
      city,
      score: rank * 1_000_000_000 + city.population + (city.capital ? 250_000 : 0),
    });
  }
  ranked.sort(
    (a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name),
  );
  return ranked.slice(0, limit).map((item) => item.city);
}
