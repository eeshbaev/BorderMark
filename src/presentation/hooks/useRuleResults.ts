import type { Rule, RuleCalculationResult } from '@/shared/types';

export type RuleResultPair = { rule: Rule; result: RuleCalculationResult };

export function activeRuleResults(ruleResults: RuleResultPair[]): RuleResultPair[] {
  return ruleResults.filter(({ rule }) => rule.enabled);
}

export function inactiveRuleResults(ruleResults: RuleResultPair[]): RuleResultPair[] {
  return ruleResults.filter(({ rule }) => !rule.enabled);
}
