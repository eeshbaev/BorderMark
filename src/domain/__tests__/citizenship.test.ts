import {
  filterStaysForDefaultRules,
  isCitizenshipCountry,
  normalizeCitizenships,
  shouldSurfaceImmigrationDocument,
  staysForRuleCalculation,
} from '@/domain/services/citizenshipService';
import type { Document, Rule, Stay } from '@/shared/types';

function stay(countryCode: string): Stay {
  return {
    id: countryCode,
    countryCode,
    city: null,
    arrivalDate: '2026-01-01',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

describe('citizenshipService', () => {
  it('migrates legacy home country into citizenships', () => {
    expect(normalizeCitizenships([], 'UZ')).toEqual(['UZ']);
  });

  it('excludes citizenship stays from default rules', () => {
    const stays = [stay('UZ'), stay('NL')];
    expect(filterStaysForDefaultRules(stays, ['UZ'])).toEqual([stay('NL')]);
  });

  it('keeps all stays for custom rules', () => {
    const stays = [stay('UZ'), stay('NL')];
    const customRule: Rule = {
      id: 'custom',
      ruleType: 'custom_threshold',
      name: 'Custom',
      enabled: true,
      applicableCountries: ['UZ'],
      threshold: 30,
      lookbackDays: 180,
      config: null,
      createdAt: '',
      updatedAt: '',
    };
    expect(staysForRuleCalculation(customRule, stays, ['UZ'])).toEqual(stays);
  });

  it('hides visa and residence permit reminders for citizenship countries', () => {
    const visa: Document = {
      id: 'v1',
      title: 'Visa',
      documentType: 'visa',
      issueDate: null,
      expiryDate: '2027-01-01',
      issuingCountry: 'UZ',
      documentNumber: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
    };
    expect(shouldSurfaceImmigrationDocument(visa, ['UZ'])).toBe(false);
    expect(shouldSurfaceImmigrationDocument(visa, ['NL'])).toBe(true);
  });

  it('still surfaces passport expiry for citizenship countries', () => {
    const passport: Document = {
      id: 'p1',
      title: 'Passport',
      documentType: 'passport',
      issueDate: null,
      expiryDate: '2027-01-01',
      issuingCountry: 'UZ',
      documentNumber: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
    };
    expect(shouldSurfaceImmigrationDocument(passport, ['UZ'])).toBe(true);
  });

  it('detects citizenship country membership', () => {
    expect(isCitizenshipCountry('NL', ['UZ', 'NL'])).toBe(true);
    expect(isCitizenshipCountry('GE', ['UZ', 'NL'])).toBe(false);
  });
});
