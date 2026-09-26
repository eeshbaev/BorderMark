export type RulePresetRegion = 'tax_indicator' | 'europe' | 'americas' | 'asia_pacific' | 'africa';

export type RulePresetWindowMode = 'rolling' | 'calendar_year';

export interface RulePresetDefinition {
  key: string;
  region: RulePresetRegion;
  name: string;
  description: string;
  applicableCountries: string[];
  threshold: number;
  lookbackDays: number;
  windowMode: RulePresetWindowMode;
}

export const RULE_PRESET_REGION_LABELS: Record<RulePresetRegion, string> = {
  tax_indicator: 'Tax presence indicators',
  europe: 'Europe',
  americas: 'Americas',
  asia_pacific: 'Asia-Pacific',
  africa: 'Africa',
};

/** Opt-in patterns only — not legal advice. Custom rules use rolling or calendar-year windows. */
export const RULE_PRESET_DEFINITIONS: RulePresetDefinition[] = [
  {
    key: 'ca_183_calendar',
    region: 'tax_indicator',
    name: 'Canada · 183 days (calendar year)',
    description: 'Days in Canada in the current calendar year. Common tax-residency indicator — not legal advice.',
    applicableCountries: ['CA'],
    threshold: 183,
    lookbackDays: 365,
    windowMode: 'calendar_year',
  },
  {
    key: 'gb_183_calendar',
    region: 'tax_indicator',
    name: 'United Kingdom · 183 days (calendar year)',
    description: 'Days in the UK in the current calendar year. Statutory residence test uses more than day counts.',
    applicableCountries: ['GB'],
    threshold: 183,
    lookbackDays: 365,
    windowMode: 'calendar_year',
  },
  {
    key: 'au_183_calendar',
    region: 'tax_indicator',
    name: 'Australia · 183 days (calendar year)',
    description: 'Days in Australia in the current calendar year. Residency tests include other factors.',
    applicableCountries: ['AU'],
    threshold: 183,
    lookbackDays: 365,
    windowMode: 'calendar_year',
  },
  {
    key: 'nz_183_calendar',
    region: 'tax_indicator',
    name: 'New Zealand · 183 days (calendar year)',
    description: 'Days in New Zealand in the current calendar year. Tax residency is not day-count alone.',
    applicableCountries: ['NZ'],
    threshold: 183,
    lookbackDays: 365,
    windowMode: 'calendar_year',
  },
  {
    key: 'sg_183_calendar',
    region: 'tax_indicator',
    name: 'Singapore · 183 days (calendar year)',
    description: 'Days in Singapore in the current calendar year. Used as a rough presence indicator.',
    applicableCountries: ['SG'],
    threshold: 183,
    lookbackDays: 365,
    windowMode: 'calendar_year',
  },
  {
    key: 'ie_90_365',
    region: 'europe',
    name: 'Ireland · 90 / 365 days',
    description: 'Rolling count for Ireland (outside Schengen 90/180). Adjust if your passport rules differ.',
    applicableCountries: ['IE'],
    threshold: 90,
    lookbackDays: 365,
    windowMode: 'rolling',
  },
  {
    key: 'br_90_365',
    region: 'americas',
    name: 'Brazil · 90 / 365 days',
    description: 'Rolling stay guide for many visitor regimes. Entry rules may be per visit.',
    applicableCountries: ['BR'],
    threshold: 90,
    lookbackDays: 365,
    windowMode: 'rolling',
  },
  {
    key: 'mx_180_365',
    region: 'americas',
    name: 'Mexico · 180 / 365 days',
    description: 'Rolling guide — Mexican visitor stays are often counted per entry, not as one rolling total.',
    applicableCountries: ['MX'],
    threshold: 180,
    lookbackDays: 365,
    windowMode: 'rolling',
  },
  {
    key: 'jp_90_365',
    region: 'asia_pacific',
    name: 'Japan · 90 / 365 days',
    description: 'Rolling guide for visa-free short stays. Each entry may have its own limit.',
    applicableCountries: ['JP'],
    threshold: 90,
    lookbackDays: 365,
    windowMode: 'rolling',
  },
  {
    key: 'th_90_180',
    region: 'asia_pacific',
    name: 'Thailand · 90 / 180 days',
    description: 'Rolling 90-in-180 style guide. Land-border and visa types can differ.',
    applicableCountries: ['TH'],
    threshold: 90,
    lookbackDays: 180,
    windowMode: 'rolling',
  },
  {
    key: 'my_90_365',
    region: 'asia_pacific',
    name: 'Malaysia · 90 / 365 days',
    description: 'Rolling stay guide for short visits. Passport and entry type matter.',
    applicableCountries: ['MY'],
    threshold: 90,
    lookbackDays: 365,
    windowMode: 'rolling',
  },
  {
    key: 'kr_90_180',
    region: 'asia_pacific',
    name: 'South Korea · 90 / 180 days',
    description: 'Rolling short-stay guide. Visa waiver rules vary by nationality.',
    applicableCountries: ['KR'],
    threshold: 90,
    lookbackDays: 180,
    windowMode: 'rolling',
  },
  {
    key: 'za_90_365',
    region: 'africa',
    name: 'South Africa · 90 / 365 days',
    description: 'Rolling visitor stay guide. Per-entry limits may apply instead.',
    applicableCountries: ['ZA'],
    threshold: 90,
    lookbackDays: 365,
    windowMode: 'rolling',
  },
];

export function getRulePresetByKey(key: string): RulePresetDefinition | undefined {
  return RULE_PRESET_DEFINITIONS.find((preset) => preset.key === key);
}

const PRESET_REGION_ORDER: RulePresetRegion[] = [
  'tax_indicator',
  'europe',
  'americas',
  'asia_pacific',
  'africa',
];

export function listAvailableRulePresets(
  existingRules: Array<{ config: Record<string, unknown> | null }>,
): RulePresetDefinition[] {
  const usedKeys = new Set(
    existingRules
      .map((rule) => rule.config?.presetKey)
      .filter((key): key is string => typeof key === 'string' && key.length > 0),
  );
  return RULE_PRESET_DEFINITIONS.filter((preset) => !usedKeys.has(preset.key));
}

export function groupPresetsByRegion(
  presets: RulePresetDefinition[],
): Array<{ region: RulePresetRegion; label: string; presets: RulePresetDefinition[] }> {
  return PRESET_REGION_ORDER.map((region) => ({
    region,
    label: RULE_PRESET_REGION_LABELS[region],
    presets: presets.filter((preset) => preset.region === region),
  })).filter((group) => group.presets.length > 0);
}
