import dataset from '../../../assets/data/countries.v2.json';
import type { CountryRecord } from '@/shared/types';

interface CountryDataset {
  version: number;
  countries: CountryRecord[];
}

const parsed = dataset as CountryDataset;
const countries = parsed.countries;

export const COUNTRY_DATASET_VERSION = parsed.version;

export function getAllCountries(): CountryRecord[] {
  return [...countries].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCountryByCode(code: string): CountryRecord | undefined {
  return countries.find((country) => country.code === code);
}

export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name ?? code;
}

export function getSchengenCountries(): CountryRecord[] {
  return countries.filter((country) => country.schengen);
}

function boundingBoxArea(country: CountryRecord): number {
  if (!country.bounds) {
    return Number.POSITIVE_INFINITY;
  }
  const { minLat, maxLat, minLng, maxLng } = country.bounds;
  return (maxLat - minLat) * (maxLng - minLng);
}

export function countryCodeFromCoordinates(latitude: number, longitude: number): string | null {
  const matches = countries.filter((country) => {
    if (!country.bounds) {
      return false;
    }
    const { minLat, maxLat, minLng, maxLng } = country.bounds;
    return latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng;
  });

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0].code;
  }

  // Border regions can overlap coarse bounding boxes — prefer the smallest match.
  return [...matches].sort((a, b) => boundingBoxArea(a) - boundingBoxArea(b))[0].code;
}

export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
