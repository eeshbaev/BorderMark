export type DatePrecision = 'exact' | 'month' | 'year' | 'approximate';

export type RuleType =
  | 'schengen_90_180'
  | 'us_spt'
  | 'us_183_day_counter'
  | 'custom_threshold';

export type RuleCalculationState = 'EXACT' | 'ESTIMATED' | 'UNAVAILABLE';

export type AttachmentOwnerType =
  | 'stay'
  | 'place_visit'
  | 'memory_record'
  | 'note'
  | 'document';

export type StayAttachmentCategory = 'photo' | 'ticket' | 'other';

export type ReminderType = 'one_time' | 'annual';

export type DocumentType =
  | 'passport'
  | 'visa'
  | 'residence_permit'
  | 'drivers_license'
  | 'insurance'
  | 'other';

export type AppearanceMode = 'system' | 'light' | 'dark';

export type DateFormatPreference = 'DMY' | 'MDY' | 'YMD';

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends Timestamps {
  id: string;
  name: string | null;
  /** @deprecated Use citizenships. Kept in sync with the first citizenship. */
  homeCountry: string | null;
  /** Nationality country codes — first entry is the birth / home nationality. */
  citizenships: string[];
  birthDate: string | null;
  /** Active nationality shown on the Home anchor card; defaults to first citizenship. */
  primaryNationality: string | null;
  photoUri: string | null;
}

export interface AppSettings extends Timestamps {
  id: string;
  appearance: AppearanceMode;
  dateFormat: DateFormatPreference;
  defaultCountry: string | null;
  notificationPreferences: NotificationPreferences;
  biometricEnabled: boolean;
  appLockEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface NotificationPreferences {
  documentExpiry: boolean;
  ruleThresholds: boolean;
  reminders: boolean;
  stayMilestones: boolean;
  stayReflection: boolean;
}

export type DerivedNotificationKind =
  | 'reminder_one_time'
  | 'reminder_annual'
  | 'document_expiry'
  | 'rule_threshold'
  | 'stay_milestone'
  | 'stay_reflection';

export interface NotificationCandidate {
  id: string;
  sourceType: AttentionItem['sourceType'];
  sourceId: string;
  notificationType: DerivedNotificationKind;
  title: string;
  body: string;
  triggerAt: Date;
  data: Record<string, unknown>;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface ReconciliationResult {
  permissionStatus: NotificationPermissionStatus;
  desiredCount: number;
  scheduledCount: number;
  cancelledCount: number;
  skippedCount: number;
  errors: string[];
}

export type StayType = 'lived' | 'visited' | 'worked' | 'studied' | 'transit' | 'other';

export interface Stay extends Timestamps {
  id: string;
  countryCode: string;
  city: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  datePrecision: DatePrecision;
  approximatePeriod: string | null;
  approximateDurationDays: number | null;
  stayType: StayType | null;
  /** Visa required for this destination (when abroad). */
  visaNeeded: boolean | null;
  /** Profile visa document covering this stay, when applicable. */
  visaDocumentId?: string | null;
  notes: string | null;
}

export interface PlaceVisit extends Timestamps {
  id: string;
  stayId: string;
  name: string;
  visitDate: string | null;
  datePrecision: DatePrecision;
  approximatePeriod: string | null;
  notes: string | null;
}

export interface MemoryRecord extends Timestamps {
  id: string;
  stayId: string | null;
  placeVisitId: string | null;
  title: string | null;
  caption: string | null;
  memoryDate: string | null;
  datePrecision: DatePrecision;
  approximatePeriod: string | null;
}

export interface Note extends Timestamps {
  id: string;
  stayId: string | null;
  placeVisitId: string | null;
  memoryRecordId: string | null;
  title: string | null;
  content: string;
  noteDate: string | null;
}

export interface Document extends Timestamps {
  id: string;
  title: string;
  documentType: DocumentType;
  issueDate: string | null;
  expiryDate: string | null;
  issuingCountry: string | null;
  documentNumber: string | null;
  notes: string | null;
  linkedStayId?: string | null;
  /** Optional max days in country allowed on this visa (feeds a custom rule). */
  maxStayDays?: number | null;
  /** Optional entry allowance (e.g. 1 single, 2 double). Metadata only. */
  maxEntries?: number | null;
}

export interface Attachment extends Timestamps {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  localPath: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  category: StayAttachmentCategory | null;
}

export interface Rule extends Timestamps {
  id: string;
  ruleType: RuleType;
  name: string;
  enabled: boolean;
  applicableCountries: string[] | null;
  threshold: number | null;
  lookbackDays: number | null;
  config: Record<string, unknown> | null;
}

export interface Reminder extends Timestamps {
  id: string;
  title: string;
  message: string | null;
  reminderType: ReminderType;
  triggerDate: string;
  annualMonth: number | null;
  annualDay: number | null;
  linkedDocumentId: string | null;
  enabled: boolean;
}

export interface CountryRecord {
  code: string;
  name: string;
  continent: string;
  schengen: boolean;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface DateInterval {
  start: string;
  end: string;
  approximate: boolean;
}

export interface RuleCalculationResult {
  state: RuleCalculationState;
  daysUsed: number | null;
  daysRemaining: number | null;
  threshold: number;
  windowStart: string | null;
  windowEnd: string | null;
  applicableStays: string[];
  warnings: string[];
  estimatedRange?: { min: number; max: number };
  disclaimer?: string;
}

export interface AttentionItem {
  id: string;
  priority: 'urgent' | 'important' | 'upcoming';
  title: string;
  subtitle: string;
  actionLabel?: string;
  sourceType: 'document' | 'rule' | 'reminder' | 'stay';
  sourceId: string;
}

export interface PreviousStayView {
  stay: Stay;
  countryName: string;
  leftLabel: string;
}

export interface CurrentStayView {
  stay: Stay;
  dayCount: number;
  countryName: string;
  dateLabel: string;
  previousStay: PreviousStayView | null;
}

export interface JourneySummary {
  countryCount: number;
  livedCountryCount: number;
  stayCount: number;
  hasRichData: boolean;
  label: string;
}

export interface JourneyStayGroup {
  year: number;
  continentCount: number;
  countryCount: number;
  totalDays: number;
  stayCount: number;
  items: JourneyTimelineItem[];
}

export interface RestoreSummary {
  mode: 'merge' | 'replace';
  inserted: number;
  updated: number;
  kept: number;
  attachmentsRestored: number;
  warnings: string[];
  /** True when interrupted-restore recovery replaced bordermark.db on disk. */
  databaseFileReplaced?: boolean;
}

export interface OrphanReport {
  filesWithoutRecords: string[];
  recordsWithoutFiles: string[];
}

export type DocumentExpiryState = 'normal' | 'upcoming' | 'approaching' | 'urgent' | 'expired';

export interface DocumentWithAttachments extends Document {
  attachments: Attachment[];
  expiryState: DocumentExpiryState;
}

export interface JourneyTimelineItem {
  stay: Stay;
  countryName: string;
  dayCount: number | null;
  dateLabel: string;
  durationLabel: string | null;
  cityLabel: string | null;
  stayTypeLabel: string | null;
  memoryCount: number;
  noteCount: number;
  documentCount: number;
  isCurrent: boolean;
  isApproximate?: boolean;
  precisionBadge?: string | null;
  sortKey: string;
  filterYear: number;
  filterMonth: number | null;
}

export interface CountryVisaPreference {
  countryCode: string;
  needsVisa: boolean;
  updatedAt: string;
}

export interface BackupDataset {
  schemaVersion: number;
  exportedAt: string;
  userProfile: UserProfile[];
  appSettings: AppSettings[];
  stays: Stay[];
  placeVisits: PlaceVisit[];
  memoryRecords: MemoryRecord[];
  notes: Note[];
  documents: Document[];
  attachments: Attachment[];
  rules: Rule[];
  reminders: Reminder[];
  countryVisaPreferences?: CountryVisaPreference[];
}

export interface PersonalMilestone {
  id: string;
  title: string;
  countryCode: string;
  countryName: string;
  detail: string;
  sortKey: string;
  stayId: string | null;
}

export interface MilestonesSummary {
  milestones: PersonalMilestone[];
}
