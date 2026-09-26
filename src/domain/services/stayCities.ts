import type { PlaceVisit, Stay } from '@/shared/types';

export function dedupeCityNamesPreserveOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** Chronological list for the form: earlier place visits, then current city on the stay. */
export function citiesFromStayAndVisits(stay: Stay, visits: PlaceVisit[]): string[] {
  const orderedVisits = [...visits]
    .filter((visit) => visit.name.trim())
    .sort((a, b) => (a.visitDate ?? a.createdAt).localeCompare(b.visitDate ?? b.createdAt));

  const cities = orderedVisits.map((visit) => visit.name.trim());
  const primary = stay.city?.trim();
  if (!primary) {
    return dedupeCityNamesPreserveOrder(cities);
  }
  const withoutPrimary = cities.filter((name) => name.toLowerCase() !== primary.toLowerCase());
  return dedupeCityNamesPreserveOrder([...withoutPrimary, primary]);
}

export function primaryCityFromList(cities: string[]): string | null {
  const normalized = dedupeCityNamesPreserveOrder(cities);
  return normalized.length > 0 ? normalized[normalized.length - 1] : null;
}

export function secondaryCitiesFromList(cities: string[]): string[] {
  const normalized = dedupeCityNamesPreserveOrder(cities);
  return normalized.slice(0, -1);
}
