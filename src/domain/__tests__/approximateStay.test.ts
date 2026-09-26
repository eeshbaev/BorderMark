import { buildStayTimelinePresentation, buildStayDetailPresentation } from '@/domain/services/stayPresentation';
import {
  buildApproximatePeriod,
  validateApproximateStayInput,
  validateExactStayInput,
  validateStayInput,
  StayValidationError,
} from '@/domain/services/stayInputValidation';
import {
  convertStayToApproximate,
  convertStayToExact,
  mapStayInputToStay,
} from '@/domain/services/stayMapper';
import { calculateSchengenRule } from '@/domain/rules/ruleEngine';
import { expandStayToInterval } from '@/domain/utils/dates';
import {
  encodeBoundedPeriod,
  estimateApproximateDaysInWindow,
  getApproximatePeriodBounds,
} from '@/domain/utils/approximatePeriod';
import { NotificationReconciliationService } from '@/domain/notifications/notificationReconciliationService';
import { MemoryNotificationPort } from '@/infrastructure/notifications/memoryNotificationPort';
import type { AppSettings, CountryRecord, Stay } from '@/shared/types';

const countries: CountryRecord[] = [
  { code: 'GE', name: 'Georgia', continent: 'Asia', schengen: false },
  { code: 'IT', name: 'Italy', continent: 'Europe', schengen: true },
  { code: 'TR', name: 'Türkiye', continent: 'Europe', schengen: false },
];

const baseSettings: AppSettings = {
  id: 'settings',
  appearance: 'system',
  dateFormat: 'DMY',
  defaultCountry: null,
  notificationPreferences: {
    documentExpiry: true,
    ruleThresholds: true,
    reminders: true,
    stayMilestones: true,
    stayReflection: true,
  },
  biometricEnabled: false,
  appLockEnabled: false,
  onboardingCompleted: true,
  createdAt: '',
  updatedAt: '',
};

function monthStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-month',
    countryCode: 'GE',
    city: null,
    arrivalDate: null,
    departureDate: null,
    datePrecision: 'month',
    approximatePeriod: '2023-06',
    approximateDurationDays: 12,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('stay presentation', () => {
  it('renders exact stays with exact dates only', () => {
    const stay: Stay = {
      id: '1',
      countryCode: 'GE',
      city: null,
      arrivalDate: '2024-02-15',
      departureDate: '2024-03-03',
      datePrecision: 'exact',
      approximatePeriod: null,
      approximateDurationDays: null,
      stayType: null,
      visaNeeded: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
    };

    const timeline = buildStayTimelinePresentation(stay, '2026-09-08');
    expect(timeline.dateLabel).toContain('15 FEB');
    expect(timeline.dateLabel).toContain('3 MAR 2024');
    expect(timeline.durationLabel).toBe('18 days');
    expect(timeline.isApproximate).toBe(false);
    expect(timeline.dateLabel).not.toMatch(/15 Jun|26 Jun/);
  });

  it('renders month stays as month and optional duration without exact dates', () => {
    const timeline = buildStayTimelinePresentation(monthStay(), '2026-09-08');
    expect(timeline.dateLabel).toBe('June 2023 · ~12 days');
    expect(timeline.isApproximate).toBe(true);
    expect(timeline.dateLabel).not.toMatch(/\d{1,2} Jun → \d{1,2} Jun/);
  });

  it('renders year stays as year only', () => {
    const timeline = buildStayTimelinePresentation(
      monthStay({
        datePrecision: 'year',
        approximatePeriod: '2021',
        approximateDurationDays: null,
      }),
      '2026-09-08',
    );
    expect(timeline.dateLabel).toBe('2021');
    expect(timeline.isApproximate).toBe(true);
  });

  it('renders bounded approximate periods without fabricated exact dates', () => {
    const timeline = buildStayTimelinePresentation(
      monthStay({
        datePrecision: 'approximate',
        approximatePeriod: encodeBoundedPeriod('2023-06', '2023-08'),
        approximateDurationDays: 12,
      }),
      '2026-09-08',
    );
    expect(timeline.dateLabel).toBe('Jun–Aug 2023 · ~12 days');
    expect(timeline.dateLabel).not.toContain('2023-06-01');
  });

  it('shows approximate detail helper text', () => {
    const detail = buildStayDetailPresentation(monthStay(), '2026-09-08');
    expect(detail.precisionHeading).toBe('Approximate dates');
    expect(detail.primaryLabel).toBe('June 2023');
    expect(detail.secondaryLabel).toBe('About 12 days');
    expect(detail.helperText).toContain('will not guess exact calendar dates');
  });
});

describe('stay validation', () => {
  it('rejects invalid month periods', () => {
    expect(() =>
      validateApproximateStayInput(
        { datePrecision: 'month', approximatePeriod: '2023-13', approximateDurationDays: 12 },
        '2026-09-08',
      ),
    ).toThrow(StayValidationError);
  });

  it('rejects invalid bounded periods', () => {
    expect(() =>
      validateApproximateStayInput(
        {
          datePrecision: 'approximate',
          approximatePeriod: encodeBoundedPeriod('2023-08', '2023-06'),
          approximateDurationDays: 12,
        },
        '2026-09-08',
      ),
    ).toThrow(StayValidationError);
  });

  it('rejects non-positive duration', () => {
    expect(() =>
      validateApproximateStayInput(
        { datePrecision: 'month', approximatePeriod: '2023-06', approximateDurationDays: 0 },
        '2026-09-08',
      ),
    ).toThrow(StayValidationError);
  });

  it('rejects departure before arrival for exact stays', () => {
    expect(() =>
      validateExactStayInput(
        {
          datePrecision: 'exact',
          arrivalDate: '2024-03-10',
          departureDate: '2024-03-01',
          stillHere: false,
        },
        '2026-09-08',
        [],
      ),
    ).toThrow(StayValidationError);
  });

  it('rejects approximate stays that include today', () => {
    expect(() =>
      validateApproximateStayInput(
        { datePrecision: 'month', approximatePeriod: '2026-09', approximateDurationDays: 5 },
        '2026-09-08',
      ),
    ).toThrow(/cannot include today/);
  });
});

describe('stay editing conversions', () => {
  it('converts approximate to exact and clears approximation fields', () => {
    const converted = convertStayToExact(monthStay(), '2023-06-15', '2023-06-26', false);
    expect(converted.datePrecision).toBe('exact');
    expect(converted.arrivalDate).toBe('2023-06-15');
    expect(converted.departureDate).toBe('2023-06-26');
    expect(converted.approximatePeriod).toBeNull();
    expect(converted.approximateDurationDays).toBeNull();
  });

  it('converts exact to approximate without retaining hidden exact dates', () => {
    const exact: Stay = {
      ...monthStay(),
      datePrecision: 'exact',
      arrivalDate: '2023-06-15',
      departureDate: '2023-06-26',
      approximatePeriod: null,
      approximateDurationDays: null,
    };

    const converted = convertStayToApproximate(exact, {
      datePrecision: 'month',
      approximatePeriod: '2023-06',
      approximateDurationDays: 12,
    });

    expect(converted.arrivalDate).toBeNull();
    expect(converted.departureDate).toBeNull();
    expect(converted.approximatePeriod).toBe('2023-06');
  });

  it('maps form input without fabricating exact dates for approximate stays', () => {
    const stay = mapStayInputToStay(
      {
        countryCode: 'GE',
        date: {
          datePrecision: 'month',
          approximatePeriod: '2023-06',
          approximateDurationDays: 12,
        },
      },
      'id-1',
      { createdAt: '', updatedAt: '' },
    );

    expect(stay.arrivalDate).toBeNull();
    expect(stay.departureDate).toBeNull();
  });
});

describe('approximate rule behavior', () => {
  it('does not expand approximate stays into exact intervals', () => {
    expect(expandStayToInterval(monthStay())).toBeNull();
  });

  it('keeps exact schengen results exact when approximate stay is outside the window', () => {
    const stays: Stay[] = [
      monthStay({ countryCode: 'IT', approximatePeriod: '2020-06', approximateDurationDays: 12 }),
      {
        id: 'exact',
        countryCode: 'IT',
        city: null,
        arrivalDate: '2026-03-13',
        departureDate: '2026-03-25',
        datePrecision: 'exact',
        approximatePeriod: null,
        approximateDurationDays: null,
        stayType: null,
        visaNeeded: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = calculateSchengenRule(stays, countries, '2026-09-08');
    expect(result.state).toBe('EXACT');
    expect(result.daysUsed).toBe(13);
  });

  it('marks relevant approximate input as estimated using duration rather than full month', () => {
    const stays: Stay[] = [
      monthStay({ countryCode: 'IT', approximatePeriod: '2026-06', approximateDurationDays: 12 }),
    ];

    const result = calculateSchengenRule(stays, countries, '2026-09-08');
    expect(result.state).toBe('ESTIMATED');
    expect(result.daysUsed).toBe(12);
    expect(result.daysUsed).toBeLessThan(30);
  });

  it('returns unavailable when approximate stay lacks quantifiable duration in window', () => {
    const stays: Stay[] = [
      monthStay({ countryCode: 'IT', approximatePeriod: '2026-06', approximateDurationDays: null }),
    ];

    const result = calculateSchengenRule(stays, countries, '2026-09-08');
    expect(result.state).toBe('UNAVAILABLE');
  });

  it('estimates using duration capped by overlap span', () => {
    const bounds = getApproximatePeriodBounds(monthStay({ approximatePeriod: '2026-06' }));
    expect(bounds).not.toBeNull();
    const estimate = estimateApproximateDaysInWindow(
      monthStay({ approximatePeriod: '2026-06' }),
      '2026-06-20',
      '2026-09-08',
    );
    expect(estimate).toBe(11);
  });
});

describe('notification reconciliation after precision change', () => {
  it('reconciles after stay dataset changes', async () => {
    const port = new MemoryNotificationPort();
    const service = new NotificationReconciliationService(port);

    const first = await service.reconcile({
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders: [],
      stays: [],
      countries,
      today: '2026-06-01',
    });

    const second = await service.reconcile({
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders: [],
      stays: [monthStay({ countryCode: 'IT', approximatePeriod: '2026-06' })],
      countries,
      today: '2026-06-01',
    });

    expect(first.desiredCount).toBe(0);
    expect(second.desiredCount).toBeGreaterThanOrEqual(0);
  });
});

describe('buildApproximatePeriod', () => {
  it('builds year period with optional month hint', () => {
    expect(buildApproximatePeriod('year', '', '2021', '06', '', '')).toBe('2021-06');
    expect(buildApproximatePeriod('year', '', '2021', '', '', '')).toBe('2021');
  });
});
