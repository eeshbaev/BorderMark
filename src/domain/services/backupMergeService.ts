import type {
  AppSettings,
  Attachment,
  BackupDataset,
  CountryVisaPreference,
  Document,
  MemoryRecord,
  Note,
  PlaceVisit,
  Reminder,
  Rule,
  Stay,
  UserProfile,
} from '@/shared/types';

type Timestamped = { id: string; updatedAt: string };

function mergeEntityList<T extends Timestamped>(
  current: T[],
  incoming: T[],
): { merged: T[]; inserted: number; updated: number; kept: number } {
  const map = new Map<string, T>();
  let inserted = 0;
  let updated = 0;
  let kept = 0;

  for (const record of current) {
    map.set(record.id, record);
  }

  for (const incomingRecord of incoming) {
    const existing = map.get(incomingRecord.id);
    if (!existing) {
      map.set(incomingRecord.id, incomingRecord);
      inserted += 1;
      continue;
    }

    if (incomingRecord.updatedAt > existing.updatedAt) {
      map.set(incomingRecord.id, incomingRecord);
      updated += 1;
    } else {
      kept += 1;
    }
  }

  return { merged: [...map.values()], inserted, updated, kept };
}

function mergeCountryVisaPreferences(
  current: CountryVisaPreference[],
  incoming: CountryVisaPreference[],
): CountryVisaPreference[] {
  const map = new Map<string, CountryVisaPreference>();
  for (const record of current) {
    map.set(record.countryCode, record);
  }
  for (const incomingRecord of incoming) {
    const existing = map.get(incomingRecord.countryCode);
    if (!existing || incomingRecord.updatedAt > existing.updatedAt) {
      map.set(incomingRecord.countryCode, incomingRecord);
    }
  }
  return [...map.values()];
}

export function mergeBackupDatasets(
  current: BackupDataset,
  incoming: BackupDataset,
): { dataset: BackupDataset; inserted: number; updated: number; kept: number } {
  const entities: Array<keyof BackupDataset> = [
    'userProfile',
    'appSettings',
    'stays',
    'placeVisits',
    'memoryRecords',
    'notes',
    'documents',
    'attachments',
    'rules',
    'reminders',
  ];

  let inserted = 0;
  let updated = 0;
  let kept = 0;
  const merged: BackupDataset = {
    schemaVersion: Math.max(current.schemaVersion, incoming.schemaVersion),
    exportedAt: incoming.exportedAt,
    userProfile: [],
    appSettings: [],
    stays: [],
    placeVisits: [],
    memoryRecords: [],
    notes: [],
    documents: [],
    attachments: [],
    rules: [],
    reminders: [],
  };

  for (const key of entities) {
    const result = mergeEntityList(
      current[key] as Timestamped[],
      incoming[key] as Timestamped[],
    );
    (merged[key] as Timestamped[]) = result.merged as never;
    inserted += result.inserted;
    updated += result.updated;
    kept += result.kept;
  }

  merged.countryVisaPreferences = mergeCountryVisaPreferences(
    current.countryVisaPreferences ?? [],
    incoming.countryVisaPreferences ?? [],
  );

  return { dataset: merged, inserted, updated, kept };
}

export function validateBackupDataset(dataset: BackupDataset): string[] {
  const errors: string[] = [];
  const stayIds = new Set(dataset.stays.map((stay) => stay.id));
  const documentIds = new Set(dataset.documents.map((document) => document.id));
  const placeVisitIds = new Set(dataset.placeVisits.map((place) => place.id));
  const memoryIds = new Set(dataset.memoryRecords.map((memory) => memory.id));

  for (const place of dataset.placeVisits) {
    if (!stayIds.has(place.stayId)) {
      errors.push(`PlaceVisit ${place.id} references missing stay ${place.stayId}`);
    }
  }

  for (const memory of dataset.memoryRecords) {
    if (memory.stayId && !stayIds.has(memory.stayId)) {
      errors.push(`MemoryRecord ${memory.id} references missing stay ${memory.stayId}`);
    }
    if (memory.placeVisitId && !placeVisitIds.has(memory.placeVisitId)) {
      errors.push(`MemoryRecord ${memory.id} references missing place ${memory.placeVisitId}`);
    }
  }

  for (const note of dataset.notes) {
    if (note.stayId && !stayIds.has(note.stayId)) {
      errors.push(`Note ${note.id} references missing stay ${note.stayId}`);
    }
    if (note.placeVisitId && !placeVisitIds.has(note.placeVisitId)) {
      errors.push(`Note ${note.id} references missing place ${note.placeVisitId}`);
    }
    if (note.memoryRecordId && !memoryIds.has(note.memoryRecordId)) {
      errors.push(`Note ${note.id} references missing memory ${note.memoryRecordId}`);
    }
  }

  for (const reminder of dataset.reminders) {
    if (reminder.linkedDocumentId && !documentIds.has(reminder.linkedDocumentId)) {
      errors.push(`Reminder ${reminder.id} references missing document ${reminder.linkedDocumentId}`);
    }
  }

  const ownerChecks: Array<{ type: Attachment['ownerType']; ids: Set<string> }> = [
    { type: 'stay', ids: stayIds },
    { type: 'place_visit', ids: placeVisitIds },
    { type: 'memory_record', ids: memoryIds },
    { type: 'note', ids: new Set(dataset.notes.map((note) => note.id)) },
    { type: 'document', ids: documentIds },
  ];

  for (const attachment of dataset.attachments) {
    const owner = ownerChecks.find((entry) => entry.type === attachment.ownerType);
    if (!owner || !owner.ids.has(attachment.ownerId)) {
      errors.push(`Attachment ${attachment.id} references missing owner ${attachment.ownerType}:${attachment.ownerId}`);
    }
  }

  return errors;
}

export function validateAttachmentHashes(
  dataset: BackupDataset,
  attachmentFiles: Map<string, Uint8Array>,
  verifySha256: (bytes: Uint8Array, hash: string) => boolean,
): string[] {
  const errors: string[] = [];

  for (const attachment of dataset.attachments) {
    const bytes = attachmentFiles.get(attachment.id);
    if (!bytes) {
      errors.push(`Missing attachment file ${attachment.id}`);
      continue;
    }
    if (bytes.length !== attachment.fileSize) {
      errors.push(`Attachment size mismatch ${attachment.id}`);
    }
    if (!verifySha256(bytes, attachment.sha256)) {
      errors.push(`Attachment hash mismatch ${attachment.id}`);
    }
  }

  for (const [attachmentId] of attachmentFiles) {
    if (!dataset.attachments.some((attachment) => attachment.id === attachmentId)) {
      errors.push(`Unexpected attachment file ${attachmentId}`);
    }
  }

  return errors;
}

export function emptyBackupDataset(exportedAt: string): BackupDataset {
  return {
    schemaVersion: 1,
    exportedAt,
    userProfile: [],
    appSettings: [],
    stays: [],
    placeVisits: [],
    memoryRecords: [],
    notes: [],
    documents: [],
    attachments: [],
    rules: [],
    reminders: [],
  };
}

export type {
  UserProfile,
  AppSettings,
  Stay,
  PlaceVisit,
  MemoryRecord,
  Note,
  Document,
  Attachment,
  Rule,
  Reminder,
};
