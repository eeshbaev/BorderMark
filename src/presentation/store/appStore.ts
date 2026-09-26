import { create } from 'zustand';

import { getAllCountries } from '@/data/dataset/countries';
import { reopenDatabase } from '@/data/database/client';
import { listDocuments } from '@/data/repositories/documentRepository';
import { listMemoryRecords } from '@/data/repositories/memoryRepository';
import { listNotes } from '@/data/repositories/noteRepository';
import { listPlaceVisits } from '@/data/repositories/placeVisitRepository';
import { listReminders, listRules } from '@/data/repositories/contentRepository';
import { getAppSettings, getUserProfile } from '@/data/repositories/settingsRepository';
import { listStays } from '@/data/repositories/stayRepository';
import { calculateRule } from '@/domain/rules/ruleEngine';
import { staysForRuleCalculation } from '@/domain/services/citizenshipService';
import {
  buildDocumentAttentionItems,
  buildRuleAttentionItems,
  buildStayVisaAttentionItems,
  sortAttentionItems,
} from '@/domain/services/attentionService';
import { buildHomeOriginForAbroadStay } from '@/domain/services/tripOriginService';
import { findCurrentStay } from '@/domain/services/stayValidation';
import { runNotificationReconciliation } from '@/infrastructure/services/notificationReconciliationRunner';
import { buildMilestonesSummary } from '@/domain/services/milestoneService';
import { buildJourneySummary, buildJourneyTimelineGroups } from '@/domain/services/journeyService';
import { buildJourneyInsights, type JourneyInsights } from '@/domain/services/journeyInsightsService';
import { buildPlacesByContinent } from '@/domain/services/countryChapterService';
import {
  formatStayDateLabel,
  inclusiveDayCount,
  isValidIsoDate,
  todayIso,
} from '@/domain/utils/dates';
import type {
  MilestonesSummary,
  AppSettings,
  AttentionItem,
  CurrentStayView,
  JourneyStayGroup,
  JourneySummary,
  MemoryRecord,
  Note,
  PlaceVisit,
  Rule,
  RuleCalculationResult,
  Stay,
  UserProfile,
  Document,
  Reminder,
  ReconciliationResult,
} from '@/shared/types';
import type { PlacesContinentGroup } from '@/domain/services/countryChapterService';
import { getCountryName } from '@/data/dataset/countries';

interface BorderMarkState {
  initialized: boolean;
  loading: boolean;
  today: string;
  settings: AppSettings | null;
  profile: UserProfile | null;
  stays: Stay[];
  documents: Document[];
  rules: Rule[];
  reminders: Reminder[];
  ruleResults: Array<{ rule: Rule; result: RuleCalculationResult }>;
  attentionItems: AttentionItem[];
  currentStay: CurrentStayView | null;
  journeyGroups: JourneyStayGroup[];
  journeySummary: JourneySummary;
  journeyInsights: JourneyInsights;
  placeVisits: PlaceVisit[];
  memoryRecords: MemoryRecord[];
  notes: Note[];
  placesGroups: PlacesContinentGroup[];
  milestonesSummary: MilestonesSummary | null;
  refresh: () => Promise<void>;
}

function buildCurrentStayView(
  stay: Stay,
  profile: UserProfile | null,
  today: string,
): CurrentStayView {
  const dayCount =
    stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)
      ? inclusiveDayCount(stay.arrivalDate, today)
      : stay.approximateDurationDays ?? 0;

  return {
    stay,
    dayCount,
    countryName: getCountryName(stay.countryCode),
    dateLabel: formatStayDateLabel(stay, today),
    previousStay: buildHomeOriginForAbroadStay(stay, profile),
  };
}

function buildJourneyGroups(
  stays: Stay[],
  placeVisits: PlaceVisit[],
  memories: MemoryRecord[],
  notes: Note[],
  today: string,
): JourneyStayGroup[] {
  const countryNames = new Map(getAllCountries().map((country) => [country.code, country.name]));
  return buildJourneyTimelineGroups({
    stays,
    placeVisits,
    memories,
    notes,
    countryNames,
    today,
  });
}

let refreshInFlight: Promise<void> | null = null;

export const useBorderMarkStore = create<BorderMarkState>((set, get) => ({
  initialized: false,
  loading: false,
  today: todayIso(),
  settings: null,
  profile: null,
  stays: [],
  documents: [],
  rules: [],
  reminders: [],
  ruleResults: [],
  attentionItems: [],
  currentStay: null,
  journeyGroups: [],
  journeySummary: {
    countryCount: 0,
    livedCountryCount: 0,
    stayCount: 0,
    hasRichData: false,
    label: 'Your journey so far',
  },
  journeyInsights: {
    yourFirsts: [],
    longestStay: null,
    mostRevisited: null,
  },
  placeVisits: [],
  memoryRecords: [],
  notes: [],
  placesGroups: [],
  milestonesSummary: null,

  refresh: async () => {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      set({ loading: true });

      async function loadState() {
        const today = todayIso();
        const settings = await getAppSettings();
        const profile = await getUserProfile();
        const stays = await listStays();
        const documents = await listDocuments();
        const rules = await listRules();
        const reminders = await listReminders();
        const placeVisits = await listPlaceVisits();
        const memoryRecords = await listMemoryRecords();
        const notesList = await listNotes();

        const countries = getAllCountries();
        const citizenships = profile?.citizenships ?? [];
        const ruleResults = rules.map((rule) => ({
          rule,
          result: calculateRule(
            rule,
            staysForRuleCalculation(rule, stays, citizenships),
            countries,
            today,
          ),
        }));

        const attentionItems = sortAttentionItems([
          ...buildDocumentAttentionItems(documents, today, citizenships, ruleResults),
          ...buildStayVisaAttentionItems(stays, documents, citizenships, today),
          ...buildRuleAttentionItems(rules, ruleResults),
        ]);

        const current = findCurrentStay(stays, today);
        let currentStay: CurrentStayView | null = null;
        let journeyGroups: JourneyStayGroup[] = [];
        let journeySummary = get().journeySummary;
        let journeyInsights = get().journeyInsights;
        let placesGroups: PlacesContinentGroup[] = [];
        let milestonesSummary: MilestonesSummary | null = null;

        try {
          currentStay =
            current && isValidIsoDate(current.arrivalDate)
              ? buildCurrentStayView(current, profile, today)
              : null;
          journeyGroups = buildJourneyGroups(stays, placeVisits, memoryRecords, notesList, today);
          journeySummary = buildJourneySummary(stays);
          journeyInsights = buildJourneyInsights({
            stays,
            citizenships,
            countryNames: new Map(countries.map((country) => [country.code, country.name])),
            today,
          });
          placesGroups = buildPlacesByContinent({ stays, countries, today });
          milestonesSummary = buildMilestonesSummary({
            profile,
            stays,
            countryNames: new Map(countries.map((country) => [country.code, country.name])),
            today,
          });
        } catch (presentationError) {
          console.warn('BorderMark could not build some dashboard views', presentationError);
        }

        set({
          initialized: true,
          loading: false,
          today,
          settings,
          profile,
          stays,
          documents,
          rules,
          reminders,
          ruleResults,
          attentionItems,
          currentStay,
          journeyGroups,
          journeySummary,
          journeyInsights,
          placeVisits,
          memoryRecords,
          notes: notesList,
          placesGroups,
          milestonesSummary,
        });

        if (settings.onboardingCompleted) {
          try {
            await reconcileNotifications();
          } catch (notificationError) {
            console.warn('BorderMark notification reconciliation skipped', notificationError);
          }
        }
      }

      async function markInitializedWithoutData() {
        let settings = get().settings;
        if (!settings) {
          try {
            settings = await getAppSettings();
          } catch {
            settings = null;
          }
        }

        set({
          initialized: true,
          loading: false,
          settings,
        });
      }

      function isDatabaseError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        return (
          message.includes('NativeDatabase') ||
          message.includes('SQLite') ||
          message.includes('prepareAsync') ||
          message.includes('execAsync')
        );
      }

      try {
        await loadState();
      } catch (error) {
        if (!isDatabaseError(error)) {
          console.error('BorderMark refresh failed', error);
          await markInitializedWithoutData();
          return;
        }
        console.error('BorderMark refresh failed, retrying database connection', error);
        try {
          await reopenDatabase(false);
          await loadState();
        } catch (retryError) {
          if (!isDatabaseError(retryError)) {
            console.error('BorderMark refresh failed after reconnect', retryError);
            await markInitializedWithoutData();
            return;
          }
          console.error('BorderMark refresh retry failed, resetting local database', retryError);
          try {
            await reopenDatabase(true);
            await loadState();
          } catch (resetError) {
            console.error('BorderMark refresh reset failed', resetError);
            await markInitializedWithoutData();
          }
        }
      }
    })();

    try {
      await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  },
}));

export async function reconcileNotifications(): Promise<ReconciliationResult | null> {
  const state = useBorderMarkStore.getState();
  if (!state.settings || !state.initialized) {
    return null;
  }

  return runNotificationReconciliation({
    settings: state.settings,
    documents: state.documents,
    rules: state.rules,
    reminders: state.reminders,
    stays: state.stays,
    citizenships: state.profile?.citizenships ?? [],
    profileName: state.profile?.name ?? null,
    today: state.today,
  });
}

