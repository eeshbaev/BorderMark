import { formatDocumentTypeCountLabel } from '@/shared/profileDocumentTypes';

describe('formatDocumentTypeCountLabel', () => {
  it('pluralizes common profile document types', () => {
    expect(formatDocumentTypeCountLabel('visa', 2)).toBe('2 visas');
    expect(formatDocumentTypeCountLabel('passport', 3)).toBe('3 passports');
    expect(formatDocumentTypeCountLabel('other', 4)).toBe('4 documents');
  });
});
