import type { StayType } from '@/shared/types';

export const STAY_TYPES: StayType[] = ['lived', 'visited', 'worked', 'studied', 'transit', 'other'];

export const STAY_TYPE_LABELS: Record<StayType, string> = {
  lived: 'Lived',
  visited: 'Visited',
  worked: 'Worked',
  studied: 'Studied',
  transit: 'Transit',
  other: 'Other',
};

export const STAY_TYPE_ICONS: Record<StayType, string> = {
  lived: '🏠',
  visited: '✈️',
  worked: '💼',
  studied: '🎓',
  transit: '🚏',
  other: '📍',
};

export function formatStayTypeLabel(stayType: StayType | null | undefined): string | null {
  if (!stayType) {
    return null;
  }
  return STAY_TYPE_LABELS[stayType];
}

export function formatStayTypeWithIcon(stayType: StayType | null | undefined): string | null {
  if (!stayType) {
    return null;
  }
  return `${STAY_TYPE_ICONS[stayType]} ${STAY_TYPE_LABELS[stayType]}`;
}
