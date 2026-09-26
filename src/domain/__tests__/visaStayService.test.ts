import {
  isVisaDocumentActive,
  validateStayVisaForm,
  visaCoversStayWindow,
} from '@/domain/services/visaStayLogic';
import type { Document } from '@/shared/types';

const visaDoc = (overrides: Partial<Document> = {}): Document => ({
  id: 'v1',
  title: 'China visa',
  documentType: 'visa',
  issueDate: '2018-01-01',
  expiryDate: '2020-07-25',
  issuingCountry: 'CN',
  documentNumber: null,
  notes: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

describe('visaStayService', () => {
  it('detects active vs archived visas', () => {
    expect(isVisaDocumentActive(visaDoc(), '2020-07-25')).toBe(true);
    expect(isVisaDocumentActive(visaDoc(), '2020-07-26')).toBe(false);
  });

  it('checks stay coverage window', () => {
    expect(visaCoversStayWindow(visaDoc(), '2019-09-01', '2020-06-01')).toBe(true);
    expect(visaCoversStayWindow(visaDoc(), '2019-09-01', '2020-08-01')).toBe(false);
  });

  it('requires visa dates when visa is needed and no document is linked', () => {
    expect(
      validateStayVisaForm({
        countryCode: 'CN',
        nationalities: ['UZ'],
        visaNeeded: true,
        visaDocumentId: null,
        visaIssueDate: '',
        visaExpiryDate: '',
        visaMaxStayDays: '',
        stayArrivalDate: '2019-09-01',
        stayDepartureDate: '2020-06-01',
      }),
    ).toContain('issue date');
  });
});
