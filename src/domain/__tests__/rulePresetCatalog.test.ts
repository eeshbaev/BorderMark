import { calculateCustomRule } from '@/domain/rules/ruleEngine';
import {
  getRulePresetByKey,
  listAvailableRulePresets,
  groupPresetsByRegion,
} from '@/domain/services/rulePresetCatalog';
import type { Rule, Stay } from '@/shared/types';

describe('rulePresetCatalog', () => {
  it('lists presets not yet saved', () => {
    const available = listAvailableRulePresets([]);
    expect(available.length).toBeGreaterThan(10);
    expect(listAvailableRulePresets([{ config: { presetKey: 'jp_90_365' } }])).not.toContainEqual(
      getRulePresetByKey('jp_90_365'),
    );
  });

  it('groups presets by region', () => {
    const groups = groupPresetsByRegion(listAvailableRulePresets([]));
    expect(groups.some((group) => group.region === 'tax_indicator')).toBe(true);
  });
});

describe('calendar-year custom rules', () => {
  const rule: Rule = {
    id: 'r1',
    ruleType: 'custom_threshold',
    name: 'Canada',
    enabled: true,
    applicableCountries: ['CA'],
    threshold: 183,
    lookbackDays: 365,
    config: { windowMode: 'calendar_year' },
    createdAt: '',
    updatedAt: '',
  };

  const stays: Stay[] = [
    {
      id: 's1',
      countryCode: 'CA',
      city: null,
      arrivalDate: '2026-01-10',
      departureDate: '2026-01-20',
      datePrecision: 'exact',
      approximatePeriod: null,
      approximateDurationDays: null,
      stayType: 'visited',
      visaNeeded: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('counts days in the current calendar year', () => {
    const result = calculateCustomRule(rule, stays, '2026-06-01');
    expect(result.state).toBe('EXACT');
    expect(result.daysUsed).toBe(11);
    expect(result.windowStart).toBe('2026-01-01');
    expect(result.disclaimer).toMatch(/Calendar-year/i);
  });
});
