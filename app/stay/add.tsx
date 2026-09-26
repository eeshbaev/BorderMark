import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  createStayFromInput,
  saveStay as persistStayRecord,
  switchCurrentStayFromInput,
} from '@/data/repositories/stayRepository';
import { listPlaceVisitsForStay, syncStayCityList } from '@/data/repositories/placeVisitRepository';
import { citiesFromStayAndVisits } from '@/domain/services/stayCities';
import { getCountryByCode, getCountryName } from '@/data/dataset/countries';
import { StayConflictError } from '@/domain/services/stayValidation';
import { todayIso } from '@/domain/utils/dates';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { StayAttachmentsForm } from '@/presentation/components/stay/StayAttachmentsForm';
import { StayCountryCard } from '@/presentation/components/stay/StayCountryCard';
import { StayDateForm } from '@/presentation/components/stay/StayDateForm';
import { StayTypePicker } from '@/presentation/components/stay/StayTypePicker';
import {
  buildStayVisaFormInput,
  initialStayVisaSlice,
  StayVisaSection,
} from '@/presentation/components/stay/StayVisaSection';
import { applyStayVisaAfterSave, validateStayVisaForm } from '@/domain/services/visaStayService';
import { scheduleStayReflectionReminder } from '@/domain/services/stayReflectionService';
import {
  buildStayInputFromForm,
  StayValidationError,
  type StayFormState,
} from '@/presentation/components/stay/stayFormState';
import { Screen } from '@/presentation/components/Screen';
import { useHaptics } from '@/presentation/hooks/useHaptics';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { importPendingStayAttachments } from '@/presentation/utils/importStayAttachments';
import { spacing, typography } from '@/presentation/theme';

function resolveDefaultCountry(
  settingsCountry: string | null | undefined,
  citizenships: string[],
): string {
  return settingsCountry ?? citizenships[0] ?? 'UZ';
}

const initialForm = (defaultCountry: string, today: string): StayFormState => ({
  countryCode: defaultCountry,
  cities: [],
  notes: '',
  stayType: null,
  ...initialStayVisaSlice(),
  arrivalDate: today,
  departureDate: today,
  stillHere: true,
  pendingAttachments: [],
});

export default function AddStayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const params = useLocalSearchParams<{ countryCode?: string; fromAdd?: string; cityMove?: string }>();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const settings = useBorderMarkStore((state) => state.settings);
  const profile = useBorderMarkStore((state) => state.profile);
  const nationalities = profile?.citizenships ?? [];
  const currentStay = useBorderMarkStore((state) => state.currentStay);
  const defaultCountry = resolveDefaultCountry(settings?.defaultCountry, profile?.citizenships ?? []);
  const today = todayIso();
  const fromAddFlow = params.fromAdd === '1';
  const cityMoveFlow = params.cityMove === '1';
  const initialCountry =
    typeof params.countryCode === 'string' && params.countryCode ? params.countryCode : defaultCountry;
  const [form, setForm] = useState<StayFormState>(() => initialForm(initialCountry, today));
  const [cityDraft, setCityDraft] = useState('');
  const [editingLocation, setEditingLocation] = useState(!fromAddFlow);
  const [previousCities, setPreviousCities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stayTypeError, setStayTypeError] = useState<string | null>(null);
  const [visaError, setVisaError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCountry = useMemo(
    () => (form.countryCode ? getCountryByCode(form.countryCode) : null),
    [form.countryCode],
  );
  const screenTitle =
    cityMoveFlow && selectedCountry
      ? `New city in ${selectedCountry.name}`
      : fromAddFlow && selectedCountry
        ? selectedCountry.name
        : 'Add stay';
  const screenSubtitle = cityMoveFlow
    ? 'Tell BorderMark when you moved, why you are here, and add photos or tickets for this city.'
    : fromAddFlow
      ? 'When did you arrive? Choose your stay type and add details below.'
      : 'Where have you been — or where are you now?';
  const switchingCountries =
    fromAddFlow && form.stillHere && currentStay && currentStay.stay.countryCode !== form.countryCode;
  const backdatingBeforeCurrentStay =
    switchingCountries &&
    currentStay?.stay.arrivalDate &&
    form.arrivalDate < currentStay.stay.arrivalDate;
  const sameCountryMove =
    fromAddFlow && form.stillHere && currentStay && currentStay.stay.countryCode === form.countryCode;

  useEffect(() => {
    if (!sameCountryMove || !currentStay) {
      setPreviousCities([]);
      return;
    }

    void listPlaceVisitsForStay(currentStay.stay.id).then((visits) => {
      const existing = citiesFromStayAndVisits(currentStay.stay, visits);
      setPreviousCities(existing);
      setForm((current) => ({
        ...current,
        cities: existing.length > 0 ? existing : current.cities,
      }));
    });
  }, [sameCountryMove, currentStay]);

  function updateForm<K extends keyof StayFormState>(key: K, value: StayFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) {
      setError(null);
    }
    if (key === 'stayType' && stayTypeError) {
      setStayTypeError(null);
    }
  }

  function commitCity() {
    const trimmed = cityDraft.trim();
    if (!trimmed) {
      return;
    }
    setForm((current) => {
      const exists = current.cities.some((name) => name.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return current;
      }
      return { ...current, cities: [...current.cities, trimmed] };
    });
    setCityDraft('');
  }

  function removeCity(cityName: string) {
    updateForm(
      'cities',
      form.cities.filter((name) => name !== cityName),
    );
  }

  async function saveStay() {
    if (!form.countryCode) {
      setError('Choose a country for this stay.');
      return;
    }
    if (!form.stayType) {
      setStayTypeError('Choose what kind of stay this was.');
      return;
    }

    const departureForVisa =
      form.stillHere && !form.departureDate.trim() ? null : form.departureDate.trim() || null;
    const visaValidation = validateStayVisaForm(
      buildStayVisaFormInput(form.countryCode, nationalities, form, form.arrivalDate, departureForVisa),
    );
    if (visaValidation) {
      setVisaError(visaValidation);
      return;
    }

    setSaving(true);
    try {
      const input = buildStayInputFromForm(form);
      const crossCountryFromAdd =
        fromAddFlow &&
        currentStay != null &&
        form.countryCode !== currentStay.stay.countryCode;
      let stay = crossCountryFromAdd
        ? await switchCurrentStayFromInput(input, today)
        : await createStayFromInput(input, today);
      stay = await applyStayVisaAfterSave(
        stay,
        buildStayVisaFormInput(form.countryCode, nationalities, form, form.arrivalDate, departureForVisa),
      );
      stay = await persistStayRecord(stay, today);
      await scheduleStayReflectionReminder(stay, profile?.name ?? null, today);
      if (form.cities.length > 0) {
        await syncStayCityList(stay.id, form.cities, form.arrivalDate);
      }
      await importPendingStayAttachments(stay.id, form.pendingAttachments);
      await refresh();
      await haptics.success();

      if (fromAddFlow || cityMoveFlow) {
        router.replace(`/stay/${stay.id}`);
        return;
      }

      router.back();
    } catch (saveError) {
      if (saveError instanceof StayValidationError || saveError instanceof StayConflictError) {
        setError(saveError.message);
        return;
      }
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(form.countryCode && form.stayType);
  const departureForVisa =
    form.stillHere && !form.departureDate.trim() ? null : form.departureDate.trim() || null;

  return (
    <Screen
      title={screenTitle}
      subtitle={screenSubtitle}
      keyboardAvoiding
      footer={
        <PrimaryButton
          label="Save stay"
          onPress={saveStay}
          loading={saving}
          disabled={!canSave}
          disabledReason={
            !form.countryCode
              ? 'Choose a country to save this stay.'
              : !form.stayType
                ? 'Choose a stay type to save this stay.'
                : undefined
          }
        />
      }
    >
      {error ? (
        <AccessibleText style={[styles.error, { color: colors.urgent }]} accessibilityLiveRegion="polite">
          {error}
        </AccessibleText>
      ) : null}

      {sameCountryMove && currentStay ? (
        <View style={[styles.switchBanner, { backgroundColor: colors.accentMuted, borderColor: colors.border }]}>
          <AccessibleText style={[styles.switchTitle, { color: colors.text }]}>
            New city in {selectedCountry?.name ?? getCountryName(form.countryCode)}
          </AccessibleText>
          <AccessibleText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            BorderMark will keep your previous city in this country&apos;s story. Add when you moved, your stay type,
            photos, tickets, and notes for this city.
          </AccessibleText>
        </View>
      ) : null}

      {switchingCountries && currentStay ? (
        <View style={[styles.switchBanner, { backgroundColor: colors.accentMuted, borderColor: colors.border }]}>
          <AccessibleText style={[styles.switchTitle, { color: colors.text }]}>
            Moving from {currentStay.countryName} to {selectedCountry?.name ?? getCountryName(form.countryCode)}
          </AccessibleText>
          <AccessibleText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            {backdatingBeforeCurrentStay
              ? `BorderMark will log this trip abroad from ${form.arrivalDate} until the day before your ${currentStay.countryName} stay begins. Days outside logged trips are treated as home.`
              : `BorderMark allows one current country at a time. Saving will close your ${currentStay.countryName} stay and start ${selectedCountry?.name ?? 'this country'} from ${form.arrivalDate}.`}
          </AccessibleText>
        </View>
      ) : null}

      <StayCountryCard
        countryCode={form.countryCode}
        countryName={selectedCountry?.name ?? getCountryName(form.countryCode)}
        continent={selectedCountry?.continent}
        countrySelectionMode={fromAddFlow && selectedCountry && !editingLocation ? 'summary' : 'picker'}
        onCountryChange={(code) => {
          updateForm('countryCode', code);
          if (fromAddFlow) {
            setEditingLocation(false);
          }
        }}
        onChangeCountry={
          fromAddFlow && selectedCountry && !editingLocation ? () => setEditingLocation(true) : undefined
        }
        cities={form.cities}
        cityDraft={cityDraft}
        onCityDraftChange={setCityDraft}
        onCityCommit={commitCity}
        onCityRemove={removeCity}
        previousCities={previousCities}
      />

      <StayDateForm
        arrivalDate={form.arrivalDate}
        onArrivalDateChange={(value) => updateForm('arrivalDate', value)}
        departureDate={form.departureDate}
        onDepartureDateChange={(value) => updateForm('departureDate', value)}
        stillHere={form.stillHere}
        onStillHereChange={(value) => updateForm('stillHere', value)}
      />

      <StayVisaSection
        countryCode={form.countryCode}
        nationalities={nationalities}
        arrivalDate={form.arrivalDate}
        departureDate={departureForVisa}
        value={{
          visaNeeded: form.visaNeeded,
          visaDocumentId: form.visaDocumentId,
          visaIssueDate: form.visaIssueDate,
          visaExpiryDate: form.visaExpiryDate,
          visaMaxStayDays: form.visaMaxStayDays,
        }}
        onChange={(patch) => {
          setForm((current) => ({ ...current, ...patch }));
          if (visaError) {
            setVisaError(null);
          }
        }}
        errorMessage={visaError}
      />

      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StayTypePicker
          value={form.stayType}
          onChange={(value) => updateForm('stayType', value)}
          errorMessage={stayTypeError}
        />
      </View>

      <AccessibleTextInput
        label="Notes"
        value={form.notes}
        onChangeText={(value) => updateForm('notes', value)}
        placeholder="Anything you want to remember about this stay"
        multiline
      />

      <StayAttachmentsForm
        pendingAttachments={form.pendingAttachments}
        onPendingChange={(attachments) => updateForm('pendingAttachments', attachments)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  switchBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  switchTitle: { fontSize: typography.title, fontWeight: '600' },
  error: { fontSize: typography.body, lineHeight: 22 },
});
