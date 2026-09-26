import { getDocumentExpiryState } from '@/domain/utils/documentExpiry';

describe('document expiry states', () => {
  it('uses 90/30/7 day attention thresholds', () => {
    expect(getDocumentExpiryState('2026-12-06', '2026-09-08')).toBe('upcoming');
    expect(getDocumentExpiryState('2026-10-01', '2026-09-08')).toBe('approaching');
    expect(getDocumentExpiryState('2026-09-12', '2026-09-08')).toBe('urgent');
    expect(getDocumentExpiryState('2026-09-01', '2026-09-08')).toBe('expired');
  });
});
