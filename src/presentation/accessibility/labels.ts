import type { AttentionItem, CurrentStayView } from '@/shared/types';

export function currentStayAccessibilityLabel(currentStay: CurrentStayView): string {
  const arrival = currentStay.dateLabel.replace(' → TODAY', '').replace(' → ', ', departed ');
  const previous = currentStay.previousStay
    ? `Left home from ${currentStay.previousStay.countryName}. ${currentStay.previousStay.leftLabel}. `
    : '';
  return `${previous}Current stay: ${currentStay.countryName}. Day ${currentStay.dayCount}. ${arrival}`;
}

export function attentionItemAccessibilityLabel(item: AttentionItem): string {
  const priority =
    item.priority === 'urgent'
      ? 'Urgent'
      : item.priority === 'important'
        ? 'Important'
        : 'Upcoming';
  return `${priority}. ${item.title}. ${item.subtitle}`;
}

export function approximateStatusLabel(isApproximate: boolean, precisionBadge?: string | null): string {
  if (!isApproximate) {
    return '';
  }
  return precisionBadge ?? 'Approximate';
}

export function expiryAccessibilityLabel(title: string, expiryText: string): string {
  return `${title}. ${expiryText}`;
}

export interface JourneyStayA11yInput {
  countryName: string;
  dateLabel: string;
  isCurrent: boolean;
  isApproximate: boolean;
  dayCount?: number | null;
  precisionBadge?: string | null;
}

export function journeyStayAccessibilityLabel(item: JourneyStayA11yInput): string {
  const prefix = item.isCurrent ? 'Current stay: ' : '';
  const parts = [`${prefix}${item.countryName}`, item.dateLabel];

  if (item.isApproximate) {
    parts.push(approximateStatusLabel(true, item.precisionBadge));
    if (item.dayCount != null) {
      parts.push(`about ${item.dayCount} days`);
    }
  } else if (item.dayCount != null) {
    parts.push(`${item.dayCount} days`);
  }

  return parts.filter(Boolean).join('. ');
}

export interface StayDetailA11yInput {
  countryName: string;
  isCurrent: boolean;
  primaryLabel: string;
  secondaryLabel?: string | null;
  precisionHeading?: string | null;
  helperText?: string | null;
}

export function stayDetailAccessibilityLabel(input: StayDetailA11yInput): string {
  const parts: string[] = [];
  if (input.isCurrent) {
    parts.push(`Current stay: ${input.countryName}`);
  } else {
    parts.push(`Stay in ${input.countryName}`);
  }
  if (input.precisionHeading) {
    parts.push(input.precisionHeading);
  }
  parts.push(input.primaryLabel);
  if (input.secondaryLabel) {
    parts.push(input.secondaryLabel);
  }
  if (input.helperText) {
    parts.push(input.helperText);
  }
  return parts.join('. ');
}

export function ruleStateAccessibilityLabel(state: 'EXACT' | 'ESTIMATED' | 'UNAVAILABLE'): string {
  switch (state) {
    case 'EXACT':
      return 'Exact calculation';
    case 'ESTIMATED':
      return 'Estimated calculation';
    default:
      return 'Unable to determine';
  }
}
