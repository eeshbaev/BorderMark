import type { Stay, StayType } from '@/shared/types';

export const MY_LIFE_STAY_TYPES: StayType[] = ['lived', 'studied', 'worked', 'visited', 'transit', 'other'];

export const MY_LIFE_LABELS: Record<StayType, string> = {
  lived: 'Lived',
  studied: 'Studied',
  worked: 'Worked',
  visited: 'Visited',
  transit: 'Passed through',
  other: 'Other',
};

export const MY_LIFE_ICONS: Record<StayType, string> = {
  lived: '🏠',
  studied: '🎓',
  worked: '💼',
  visited: '✈️',
  transit: '🚉',
  other: '📍',
};

export interface MyLifeCategory {
  stayType: StayType;
  label: string;
  icon: string;
  countryCount: number;
  countryCodes: string[];
}

export interface MyLifeSummary {
  categories: MyLifeCategory[];
  hasData: boolean;
}

export function formatMyLifeCountryCount(count: number): string {
  return `${count} ${count === 1 ? 'country' : 'countries'}`;
}

export function buildMyLifeSummary(stays: Stay[]): MyLifeSummary {
  const countriesByType = new Map<StayType, Set<string>>();

  for (const stay of stays) {
    if (!stay.stayType) {
      continue;
    }
    if (!countriesByType.has(stay.stayType)) {
      countriesByType.set(stay.stayType, new Set());
    }
    countriesByType.get(stay.stayType)!.add(stay.countryCode);
  }

  const categories = MY_LIFE_STAY_TYPES.map((stayType) => {
    const countryCodes = [...(countriesByType.get(stayType) ?? [])].sort();
    return {
      stayType,
      label: MY_LIFE_LABELS[stayType],
      icon: MY_LIFE_ICONS[stayType],
      countryCount: countryCodes.length,
      countryCodes,
    };
  }).filter((category) => category.countryCount > 0);

  return {
    categories,
    hasData: categories.length > 0,
  };
}
