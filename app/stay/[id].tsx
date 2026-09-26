import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getAllCountries, getCountryName, countryFlag } from '@/data/dataset/countries';
import { listPlaceVisitsForStay, syncStayCityList } from '@/data/repositories/placeVisitRepository';
import { citiesFromStayAndVisits } from '@/domain/services/stayCities';
import { getDocumentById } from '@/data/repositories/documentRepository';
import { deleteStay, getStayById, saveStay, updateStayFromInput } from '@/data/repositories/stayRepository';
import { getAttachmentService } from '@/infrastructure/services/serviceFactory';
import { calculateRule, isStayApplicableToRule } from '@/domain/rules/ruleEngine';
import { buildStayDetailPresentation } from '@/domain/services/stayPresentation';
import { formatStayTypeWithIcon } from '@/domain/services/stayType';
import { isCurrentStay } from '@/domain/utils/dates';
import { StayConflictError } from '@/domain/services/stayValidation';
import { todayIso } from '@/domain/utils/dates';
import {
  ruleStateAccessibilityLabel,
  stayDetailAccessibilityLabel,
} from '@/presentation/accessibility/labels';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { StayAttachmentsForm } from '@/presentation/components/stay/StayAttachmentsForm';
import { StayCountryCard } from '@/presentation/components/stay/StayCountryCard';
import { StayDateForm } from '@/presentation/components/stay/StayDateForm';
import { StayTypePicker } from '@/presentation/components/stay/StayTypePicker';
import {
  buildStayVisaFormInput,
  StayVisaSection,
} from '@/presentation/components/stay/StayVisaSection';
import { shouldAskVisaQuestion } from '@/domain/services/nationalityHomeLogic';
import { applyStayVisaAfterSave, validateStayVisaForm } from '@/domain/services/visaStayService';
import { formatIsoDateDisplay } from '@/domain/utils/isoDateInput';
import { scheduleStayReflectionReminder } from '@/domain/services/stayReflectionService';
import { importPendingStayAttachments } from '@/presentation/utils/importStayAttachments';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import {
  buildStayInputFromForm,
  stayFormFromStay,
  StayValidationError,
  type StayFormState,
} from '@/presentation/components/stay/stayFormState';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { Attachment, Rule, RuleCalculationResult, Stay } from '@/shared/types';

function ruleImpactMessage(result: RuleCalculationResult): string {
  if (result.state === 'EXACT') {
    return 'This stay uses exact dates.';
  }
  if (result.state === 'ESTIMATED') {
    return 'This stay has approximate dates, so this rule result is an estimate.';
  }
  return 'The dates are too uncertain to determine whether the threshold was reached.';
}

export default function StayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const profile = useBorderMarkStore((state) => state.profile);
  const nationalities = profile?.citizenships ?? [];
  const rules = useBorderMarkStore((state) => state.rules);
  const stays = useBorderMarkStore((state) => state.stays);
  const documents = useBorderMarkStore((state) => state.documents);
  const today = todayIso();
  const [stay, setStay] = useState<Stay | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StayFormState | null>(null);
  const [cityDraft, setCityDraft] = useState('');
  const [previousCities, setPreviousCities] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [stayTypeError, setStayTypeError] = useState<string | null>(null);
  const [visaError, setVisaError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      void (async () => {
        const loaded = await getStayById(id);
        setStay(loaded);
        if (loaded) {
          const [savedAttachments, visits] = await Promise.all([
            getAttachmentService().listForOwner('stay', loaded.id),
            listPlaceVisitsForStay(loaded.id),
          ]);
          setAttachments(savedAttachments);
          setPreviousCities([]);
          const linkedVisa = loaded.visaDocumentId
            ? await getDocumentById(loaded.visaDocumentId)
            : null;
          setForm({
            ...stayFormFromStay(loaded, today, linkedVisa),
            cities: citiesFromStayAndVisits(loaded, visits),
          });
        }
      })();
    }
  }, [id, today]);

  if (!stay || !form) {
    return (
      <Screen title="Stay">
        <AccessibleText style={{ color: colors.textSecondary }}>Loading…</AccessibleText>
      </Screen>
    );
  }

  const stayId = stay.id;
  const departureForVisa =
    form.stillHere && !form.departureDate.trim() ? null : form.departureDate.trim() || null;

  const presentation = buildStayDetailPresentation(stay, today);
  const linkedVisaDocument = stay.visaDocumentId
    ? documents.find((document) => document.id === stay.visaDocumentId) ?? null
    : null;
  const showVisaSummary = shouldAskVisaQuestion(stay.countryCode, nationalities);
  const applicableRules = rules
    .map((rule) => ({
      rule,
      result: calculateRule(rule, stays, getAllCountries(), today),
    }))
    .filter(({ rule }) => isStayApplicableToRule(stay, rule, getAllCountries()));

  function updateForm<K extends keyof StayFormState>(key: K, value: StayFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function commitCity() {
    if (!form) {
      return;
    }
    const trimmed = cityDraft.trim();
    if (!trimmed) {
      return;
    }
    const exists = form.cities.some((name) => name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setCityDraft('');
      return;
    }
    updateForm('cities', [...form.cities, trimmed]);
    setCityDraft('');
  }

  async function saveChanges() {
    if (!form) {
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
    try {
      const input = buildStayInputFromForm(form);
      let updated = await updateStayFromInput(stayId, input, today);
      updated = await applyStayVisaAfterSave(
        updated,
        buildStayVisaFormInput(form.countryCode, nationalities, form, form.arrivalDate, departureForVisa),
      );
      updated = await saveStay(updated, today);
      await scheduleStayReflectionReminder(updated, profile?.name ?? null, today);
      await syncStayCityList(stayId, form.cities, form.arrivalDate);
      await importPendingStayAttachments(stayId, form.pendingAttachments);
      const savedAttachments = await getAttachmentService().listForOwner('stay', stayId);
      const visits = await listPlaceVisitsForStay(stayId);
      const reloaded = (await getStayById(stayId)) ?? updated;
      setStay(reloaded);
      const linkedVisa = reloaded.visaDocumentId
        ? await getDocumentById(reloaded.visaDocumentId)
        : null;
      setForm({
        ...stayFormFromStay(reloaded, today, linkedVisa),
        cities: citiesFromStayAndVisits(reloaded, visits),
      });
      setAttachments(savedAttachments);
      setEditing(false);
      setStayTypeError(null);
      await refresh();
    } catch (error) {
      if (error instanceof StayValidationError || error instanceof StayConflictError) {
        Alert.alert('Check your stay details', error.message);
        return;
      }
      throw error;
    }
  }

  async function confirmDelete() {
    Alert.alert('Delete stay?', 'This stay and its linked records will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStay(stayId);
          await refresh();
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen
      title={getCountryName(stay.countryCode)}
      action={
        editing ? (
          <Pressable
            onPress={() => setEditing(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Cancel</AccessibleText>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit stay"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Edit</AccessibleText>
          </Pressable>
        )
      }
    >
      {editing ? (
        <>
          <StayCountryCard
            countryCode={stay.countryCode}
            countryName={getCountryName(stay.countryCode)}
            cities={form.cities}
            cityDraft={cityDraft}
            onCityDraftChange={setCityDraft}
            onCityCommit={commitCity}
            onCityRemove={(cityName) =>
              updateForm(
                'cities',
                form.cities.filter((name) => name !== cityName),
              )
            }
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
            countryCode={stay.countryCode}
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
              setForm((current) => (current ? { ...current, ...patch } : current));
              setVisaError(null);
            }}
            errorMessage={visaError}
          />
          <StayTypePicker
            value={form.stayType}
            onChange={(value) => {
              updateForm('stayType', value);
              setStayTypeError(null);
            }}
            errorMessage={stayTypeError}
          />
          <AccessibleTextInput
            label="Notes"
            value={form.notes}
            onChangeText={(value) => updateForm('notes', value)}
            placeholder="Anything you want to remember about this stay"
            multiline
          />
          <StayAttachmentsForm
            pendingAttachments={form.pendingAttachments}
            onPendingChange={(items) => updateForm('pendingAttachments', items)}
            savedAttachments={attachments}
            onRemoveSaved={(attachmentId) => {
              void (async () => {
                await getAttachmentService().deleteAttachment(attachmentId);
                setAttachments(await getAttachmentService().listForOwner('stay', stayId));
                await refresh();
              })();
            }}
          />
          <Pressable
            style={[styles.save, { backgroundColor: colors.primary }]}
            onPress={saveChanges}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            <AccessibleText style={[styles.saveText, { color: colors.onPrimary }]}>Save changes</AccessibleText>
          </Pressable>
        </>
      ) : (
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="summary"
          accessibilityLabel={stayDetailAccessibilityLabel({
            countryName: getCountryName(stay.countryCode),
            isCurrent: isCurrentStay(stay, today),
            primaryLabel: presentation.primaryLabel,
            secondaryLabel: presentation.secondaryLabel,
            precisionHeading: presentation.precisionHeading,
            helperText: presentation.helperText,
          })}
        >
          <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
            {countryFlag(stay.countryCode)}
          </AccessibleText>
          {isCurrentStay(stay, today) ? (
            <AccessibleText style={[styles.currentLabel, { color: colors.accent }]}>Current stay</AccessibleText>
          ) : null}
          {presentation.precisionHeading ? (
            <AccessibleText style={[styles.precision, { color: colors.warning }]}>{presentation.precisionHeading}</AccessibleText>
          ) : null}
          <AccessibleText style={[styles.primary, { color: colors.text }]}>{presentation.primaryLabel}</AccessibleText>
          {presentation.secondaryLabel ? (
            <AccessibleText style={[styles.secondary, { color: colors.textSecondary }]}>{presentation.secondaryLabel}</AccessibleText>
          ) : null}
          {presentation.helperText ? (
            <AccessibleText style={[styles.helper, { color: colors.textSecondary }]}>{presentation.helperText}</AccessibleText>
          ) : null}
          {formatStayTypeWithIcon(stay.stayType) ? (
            <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
              {formatStayTypeWithIcon(stay.stayType)}
            </AccessibleText>
          ) : null}
          {stay.city ? <AccessibleText style={[styles.meta, { color: colors.text }]}>{stay.city}</AccessibleText> : null}
          {stay.notes ? <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>{stay.notes}</AccessibleText> : null}
          {showVisaSummary ? (
            <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
              {stay.visaNeeded === false
                ? 'No visa required for this stay.'
                : linkedVisaDocument?.expiryDate
                  ? `Visa on file · expires ${formatIsoDateDisplay(linkedVisaDocument.expiryDate)}`
                  : stay.visaNeeded === true
                    ? 'Visa required — add issue and expiry dates when editing.'
                    : 'Visa requirement not recorded.'}
            </AccessibleText>
          ) : null}
        </View>
      )}

      {!editing && isCurrentStay(stay, today) ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/stay/add',
              params: { countryCode: stay.countryCode, fromAdd: '1', cityMove: '1' },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Add another city in this country"
          style={[styles.actionCard, { backgroundColor: colors.accentMuted, borderColor: colors.border }]}
        >
          <AccessibleText style={[styles.actionTitle, { color: colors.text }]}>Add another city</AccessibleText>
          <AccessibleText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            Moved within {getCountryName(stay.countryCode)}? Register your new city with dates, stay type, photos, and
            notes.
          </AccessibleText>
        </Pressable>
      ) : null}

      {!editing && attachments.length > 0 ? (
        <StayAttachmentsForm
          pendingAttachments={[]}
          onPendingChange={() => undefined}
          savedAttachments={attachments}
          readOnly
        />
      ) : null}

      {!editing && applicableRules.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Rule calculations
          </AccessibleText>
          {applicableRules.map(({ rule, result }) => (
            <RuleImpactRow key={rule.id} rule={rule} result={result} stay={stay} colors={colors} />
          ))}
        </View>
      ) : null}

      {!editing ? (
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete stay"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <AccessibleText style={{ color: colors.urgent, fontWeight: '600' }}>Delete stay</AccessibleText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function RuleImpactRow({
  rule,
  result,
  stay,
  colors,
}: {
  rule: Rule;
  result: RuleCalculationResult;
  stay: Stay;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const affects = stay.datePrecision !== 'exact';
  if (!affects && result.state === 'EXACT') {
    return null;
  }

  return (
    <View style={styles.ruleRow} accessibilityRole="text">
      <AccessibleText style={[styles.ruleName, { color: colors.text }]}>{rule.name}</AccessibleText>
      <AccessibleText style={[styles.ruleState, { color: colors.textSecondary }]}>
        {ruleStateAccessibilityLabel(result.state)}
      </AccessibleText>
      <AccessibleText style={[styles.ruleBody, { color: colors.textSecondary }]}>{ruleImpactMessage(result)}</AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 8, marginBottom: spacing.lg },
  flag: { fontSize: 36 },
  currentLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  precision: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  primary: { fontSize: typography.section, fontWeight: '600' },
  secondary: { fontSize: typography.body },
  helper: { fontSize: typography.caption, lineHeight: 20, marginTop: spacing.sm },
  meta: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: typography.title, fontWeight: '600', marginBottom: spacing.sm },
  ruleRow: { gap: 4, marginBottom: spacing.md },
  ruleName: { fontSize: typography.body, fontWeight: '600' },
  ruleState: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  ruleBody: { fontSize: typography.caption, lineHeight: 18 },
  actionCard: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  actionTitle: { fontSize: typography.title, fontWeight: '600' },
  save: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveText: { fontSize: typography.title, fontWeight: '600' },
});
