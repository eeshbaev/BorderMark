import {
  buildDocumentAttentionItems,
  buildRuleAttentionItems,
  buildStayVisaAttentionItems,
} from '@/domain/services/attentionService';
import type { Document, Rule, RuleCalculationResult, Stay } from '@/shared/types';

function visaDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    title: 'Visa',
    documentType: 'visa',
    issueDate: null,
    expiryDate: '2026-12-12',
    issuingCountry: 'PL',
    documentNumber: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildDocumentAttentionItems', () => {
  it('includes issuing country in the radar title', () => {
    const items = buildDocumentAttentionItems([visaDocument()], '2026-09-25', ['UZ']);
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toContain('Poland');
    expect(items[0]!.title).toContain('Visa');
    expect(items[0]!.subtitle).toMatch(/Expires in \d+ days/);
  });

  it('prompts to add country when issuing country is missing', () => {
    const items = buildDocumentAttentionItems([visaDocument({ issuingCountry: null })], '2026-09-25', ['UZ']);
    expect(items[0]!.title).toBe('Visa');
    expect(items[0]!.subtitle).toContain('Add issuing country');
  });
});

function abroadStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'CN',
    city: null,
    arrivalDate: '2026-09-01',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'visited',
    visaNeeded: true,
    visaDocumentId: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('buildRuleAttentionItems', () => {
  it('does not duplicate visa day-cap rules that are linked to a document', () => {
    const document = visaDocument({ id: 'visa-jp', issuingCountry: 'JP', maxStayDays: 14 });
    const rule: Rule = {
      id: 'rule-jp',
      ruleType: 'custom_threshold',
      name: 'Japan visa · 14 days',
      enabled: true,
      applicableCountries: ['JP'],
      threshold: 14,
      lookbackDays: 14,
      config: { linkedDocumentId: 'visa-jp' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const result: RuleCalculationResult = {
      state: 'EXACT',
      daysUsed: 0,
      daysRemaining: 14,
      threshold: 14,
      windowStart: '2026-09-01',
      windowEnd: '2026-11-01',
      applicableStays: [],
      warnings: [],
    };
    const docItems = buildDocumentAttentionItems([document], '2026-09-25', ['UZ'], [{ rule, result }]);
    const ruleItems = buildRuleAttentionItems([rule], [{ rule, result }]);
    expect(ruleItems).toHaveLength(0);
    expect(docItems).toHaveLength(1);
    expect(docItems[0]!.subtitle).toContain('stay days');
  });
});

describe('buildDocumentAttentionItems visa radar window', () => {
  it('includes visas on radar even when expiry is more than 90 days away', () => {
    const japan = visaDocument({
      id: 'visa-jp',
      issuingCountry: 'JP',
      expiryDate: '2026-12-01',
    });
    const australia = visaDocument({
      id: 'visa-au',
      issuingCountry: 'AU',
      expiryDate: '2027-06-01',
      maxStayDays: 30,
    });
    const rule: Rule = {
      id: 'rule-au',
      ruleType: 'custom_threshold',
      name: 'Australia visa · 30 days',
      enabled: true,
      applicableCountries: ['AU'],
      threshold: 30,
      lookbackDays: 30,
      config: { linkedDocumentId: 'visa-au' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const result: RuleCalculationResult = {
      state: 'EXACT',
      daysUsed: 0,
      daysRemaining: 30,
      threshold: 30,
      windowStart: '2026-09-01',
      windowEnd: '2027-06-01',
      applicableStays: [],
      warnings: [],
    };
    const items = buildDocumentAttentionItems(
      [japan, australia],
      '2026-09-25',
      ['UZ'],
      [{ rule, result }],
    );
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.sourceId).sort()).toEqual(['visa-au', 'visa-jp']);
    const au = items.find((item) => item.sourceId === 'visa-au');
    expect(au?.subtitle).toContain('stay days');
  });
});

describe('buildDocumentAttentionItems visa dedupe', () => {
  it('shows one radar row per issuing country when duplicate visa documents exist', () => {
    const soonerExpiry = visaDocument({
      id: 'visa-sooner',
      issuingCountry: 'JP',
      updatedAt: '2026-01-01T00:00:00.000Z',
      expiryDate: '2026-11-01',
    });
    const laterExpiry = visaDocument({
      id: 'visa-later',
      issuingCountry: 'JP',
      updatedAt: '2026-08-01T00:00:00.000Z',
      expiryDate: '2026-12-01',
    });
    const items = buildDocumentAttentionItems([soonerExpiry, laterExpiry], '2026-09-25', ['UZ']);
    expect(items).toHaveLength(1);
    expect(items[0]!.sourceId).toBe('visa-sooner');
  });

  it('prefers an active visa over a more recently updated expired duplicate', () => {
    const active = visaDocument({
      id: 'visa-active-jp',
      issuingCountry: 'JP',
      updatedAt: '2026-01-01T00:00:00.000Z',
      expiryDate: '2026-12-01',
    });
    const expired = visaDocument({
      id: 'visa-expired-jp',
      issuingCountry: 'JP',
      updatedAt: '2026-09-20T00:00:00.000Z',
      expiryDate: '2024-01-01',
    });
    const australia = visaDocument({
      id: 'visa-au',
      issuingCountry: 'AU',
      expiryDate: '2027-06-01',
    });
    const items = buildDocumentAttentionItems([active, expired, australia], '2026-09-25', ['UZ']);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.sourceId).sort()).toEqual(['visa-active-jp', 'visa-au']);
  });
});

describe('buildStayVisaAttentionItems', () => {
  it('flags current stays that need a visa but have none linked', () => {
    const items = buildStayVisaAttentionItems([abroadStay()], [], ['UZ'], '2026-09-25');
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toContain('China');
    expect(items[0]!.sourceType).toBe('stay');
  });
});
