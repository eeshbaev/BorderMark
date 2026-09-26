import {
  approximateStatusLabel,
  attentionItemAccessibilityLabel,
  currentStayAccessibilityLabel,
  expiryAccessibilityLabel,
  journeyStayAccessibilityLabel,
  ruleStateAccessibilityLabel,
  stayDetailAccessibilityLabel,
} from '@/presentation/accessibility/labels';
import type { AttentionItem, CurrentStayView } from '@/shared/types';

describe('accessibility labels', () => {
  const currentStay: CurrentStayView = {
    stay: {
      id: '1',
      countryCode: 'UZ',
      arrivalDate: '2026-08-21',
      departureDate: null,
      datePrecision: 'exact',
      approximatePeriod: null,
      approximateDurationDays: null,
      stayType: null,
      visaNeeded: null,
      city: null,
      notes: null,
      createdAt: '2026-08-21',
      updatedAt: '2026-08-21',
    },
    countryName: 'Uzbekistan',
    dayCount: 18,
    dateLabel: '21 Aug 2026 → TODAY',
    previousStay: null,
  };

  it('describes current stay with arrival context', () => {
    expect(currentStayAccessibilityLabel(currentStay)).toBe(
      'Current stay: Uzbekistan. Day 18. 21 Aug 2026',
    );
  });

  it('includes home origin when user is abroad', () => {
    const moved: CurrentStayView = {
      ...currentStay,
      stay: { ...currentStay.stay, countryCode: 'NL', arrivalDate: '2026-09-08' },
      countryName: 'Netherlands',
      dayCount: 1,
      dateLabel: '8 SEP → TODAY',
      previousStay: {
        stay: {
          id: 'home-origin-US',
          countryCode: 'US',
          arrivalDate: null,
          departureDate: null,
          datePrecision: 'exact',
          approximatePeriod: null,
          approximateDurationDays: null,
          stayType: null,
          visaNeeded: null,
          city: null,
          notes: null,
          createdAt: '2026-08-01',
          updatedAt: '2026-09-07',
        },
        countryName: 'United States',
        leftLabel: 'left 8 SEP',
      },
    };

    expect(currentStayAccessibilityLabel(moved)).toBe(
      'Left home from United States. left 8 SEP. Current stay: Netherlands. Day 1. 8 SEP',
    );
  });

  it('describes attention items with text priority, not color', () => {
    const item: AttentionItem = {
      id: 'a1',
      priority: 'urgent',
      title: 'Passport expiring',
      subtitle: 'Expiring in 5 days',
      sourceType: 'document',
      sourceId: 'd1',
    };
    expect(attentionItemAccessibilityLabel(item)).toBe(
      'Urgent. Passport expiring. Expiring in 5 days',
    );
  });

  it('includes approximate status in journey labels', () => {
    expect(
      journeyStayAccessibilityLabel({
        countryName: 'France',
        dateLabel: 'June 2023',
        isCurrent: false,
        isApproximate: true,
        dayCount: 12,
        precisionBadge: 'Approximate',
      }),
    ).toBe('France. June 2023. Approximate. about 12 days');
  });

  it('marks current stay in journey labels', () => {
    expect(
      journeyStayAccessibilityLabel({
        countryName: 'Uzbekistan',
        dateLabel: '21 Aug 2026 → TODAY',
        isCurrent: true,
        isApproximate: false,
        dayCount: 18,
      }),
    ).toBe('Current stay: Uzbekistan. 21 Aug 2026 → TODAY. 18 days');
  });

  it('communicates approximate detail on stay detail summary', () => {
    expect(
      stayDetailAccessibilityLabel({
        countryName: 'France',
        isCurrent: false,
        primaryLabel: 'June 2023 · ~12 days',
        secondaryLabel: 'Approximate month',
        precisionHeading: 'Approximate dates',
        helperText: 'BorderMark will not guess exact dates.',
      }),
    ).toContain('Approximate dates');
    expect(
      stayDetailAccessibilityLabel({
        countryName: 'France',
        isCurrent: false,
        primaryLabel: 'June 2023 · ~12 days',
        secondaryLabel: 'Approximate month',
        precisionHeading: 'Approximate dates',
        helperText: 'BorderMark will not guess exact dates.',
      }),
    ).toContain('June 2023 · ~12 days');
  });

  it('uses text for expiry without relying on color', () => {
    expect(expiryAccessibilityLabel('Passport', 'Expiring in 5 days')).toBe(
      'Passport. Expiring in 5 days',
    );
  });

  it('returns approximate badge text', () => {
    expect(approximateStatusLabel(true, 'Estimated')).toBe('Estimated');
    expect(approximateStatusLabel(false)).toBe('');
  });

  it('names rule calculation states in plain language', () => {
    expect(ruleStateAccessibilityLabel('EXACT')).toBe('Exact calculation');
    expect(ruleStateAccessibilityLabel('ESTIMATED')).toBe('Estimated calculation');
    expect(ruleStateAccessibilityLabel('UNAVAILABLE')).toBe('Unable to determine');
  });
});
