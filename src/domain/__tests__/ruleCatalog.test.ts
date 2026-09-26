import { activeRuleResults, inactiveRuleResults } from '@/presentation/hooks/useRuleResults';
import { isBuiltInRule } from '@/domain/services/ruleCatalog';
import type { Rule, RuleCalculationResult } from '@/shared/types';

function pair(rule: Partial<Rule> & Pick<Rule, 'id' | 'enabled'>): { rule: Rule; result: RuleCalculationResult } {
  return {
    rule: {
      ruleType: 'schengen_90_180',
      name: 'Test',
      applicableCountries: null,
      threshold: 90,
      lookbackDays: 180,
      config: null,
      createdAt: '',
      updatedAt: '',
      ...rule,
    },
    result: {
      state: 'EXACT',
      daysUsed: 0,
      daysRemaining: 90,
      threshold: 90,
      windowStart: null,
      windowEnd: null,
      applicableStays: [],
      disclaimer: undefined,
      warnings: [],
    },
  };
}

describe('rule results partitioning', () => {
  it('splits active and inactive rules', () => {
    const results = [pair({ id: 'a', enabled: true }), pair({ id: 'b', enabled: false })];
    expect(activeRuleResults(results)).toHaveLength(1);
    expect(inactiveRuleResults(results)).toHaveLength(1);
  });
});

describe('ruleCatalog', () => {
  it('identifies built-in rules', () => {
    expect(isBuiltInRule({ ruleType: 'us_spt' } as Rule)).toBe(true);
    expect(isBuiltInRule({ ruleType: 'custom_threshold' } as Rule)).toBe(false);
  });
});
