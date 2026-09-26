import { getRulePresetByKey } from '@/domain/services/rulePresetCatalog';
import type { Rule, RuleType } from '@/shared/types';

export function getPresetKeyFromRule(rule: Rule): string | null {
  const key = rule.config?.presetKey;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

export function isPresetBasedRule(rule: Rule): boolean {
  return getPresetKeyFromRule(rule) != null;
}

export const BUILTIN_RULE_TYPES: Exclude<RuleType, 'custom_threshold'>[] = [
  'schengen_90_180',
  'us_spt',
  'us_183_day_counter',
];

export interface BuiltInRuleDefinition {
  ruleType: Exclude<RuleType, 'custom_threshold'>;
  name: string;
  description: string;
  threshold: number;
  lookbackDays: number | null;
  applicableCountries: string[] | null;
}

export const BUILTIN_RULE_DEFINITIONS: BuiltInRuleDefinition[] = [
  {
    ruleType: 'schengen_90_180',
    name: 'Schengen 90/180',
    description: 'Rolling 90 days inside the Schengen area within any 180-day window.',
    threshold: 90,
    lookbackDays: 180,
    applicableCountries: null,
  },
  {
    ruleType: 'us_183_day_counter',
    name: 'US 183-day counter',
    description: 'Calendar-year count of days physically present in the United States.',
    threshold: 183,
    lookbackDays: null,
    applicableCountries: ['US'],
  },
  {
    ruleType: 'us_spt',
    name: 'US Substantial Presence',
    description: 'Weighted estimate for the US Substantial Presence Test — not tax advice.',
    threshold: 183,
    lookbackDays: null,
    applicableCountries: ['US'],
  },
];

export function isBuiltInRuleType(ruleType: RuleType): ruleType is Exclude<RuleType, 'custom_threshold'> {
  return BUILTIN_RULE_TYPES.includes(ruleType as Exclude<RuleType, 'custom_threshold'>);
}

export function isBuiltInRule(rule: Rule): boolean {
  return isBuiltInRuleType(rule.ruleType);
}

export function isCustomRule(rule: Rule): boolean {
  return rule.ruleType === 'custom_threshold';
}

export function ruleCatalogDescription(rule: Rule): string | null {
  const match = BUILTIN_RULE_DEFINITIONS.find((item) => item.ruleType === rule.ruleType);
  if (match) {
    return match.description;
  }
  const presetKey = getPresetKeyFromRule(rule);
  if (presetKey) {
    return getRulePresetByKey(presetKey)?.description ?? null;
  }
  if (isCustomRule(rule)) {
    return 'Custom rolling or calendar-year day limit from your stays.';
  }
  return null;
}
