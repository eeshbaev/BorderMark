import { countryCodeFromCoordinates, getAllCountries } from '@/data/dataset/countries';

describe('country dataset', () => {
  it('includes a broad country list', () => {
    expect(getAllCountries().length).toBeGreaterThan(100);
  });
});

describe('countryCodeFromCoordinates', () => {
  it('resolves an unambiguous coordinate', () => {
    expect(countryCodeFromCoordinates(37.422, -122.084)).toBe('US');
  });

  it('prefers the smaller country when bounding boxes overlap', () => {
    expect(countryCodeFromCoordinates(41.2995, 69.2401)).toBe('UZ');
  });

  it('returns null when no country matches', () => {
    expect(countryCodeFromCoordinates(0, 0)).toBeNull();
  });
});
