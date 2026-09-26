import type { DocumentType } from '@/shared/types';

export const PROFILE_DOCUMENT_TYPES: DocumentType[] = [
  'passport',
  'visa',
  'residence_permit',
  'drivers_license',
  'insurance',
  'other',
];

export function isProfileDocumentType(value: string): value is DocumentType {
  return PROFILE_DOCUMENT_TYPES.includes(value as DocumentType);
}

/** Plural summary label when more than one document of the same type is saved. */
export function formatDocumentTypeCountLabel(type: DocumentType, count: number): string {
  switch (type) {
    case 'visa':
      return `${count} visas`;
    case 'passport':
      return `${count} passports`;
    case 'residence_permit':
      return `${count} residence permits`;
    case 'drivers_license':
      return `${count} driver's licenses`;
    case 'insurance':
      return `${count} insurance policies`;
    default:
      return `${count} documents`;
  }
}
