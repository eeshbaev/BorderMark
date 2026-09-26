import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getCountryName } from '@/data/dataset/countries';
import { getCountryVisaPreference } from '@/data/repositories/visaCountryPreferenceRepository';
import { shouldAskVisaQuestion } from '@/domain/services/nationalityHomeLogic';
import {
  activeVisaStatusMessage,
  defaultVisaNeededForCountry,
  listActiveVisasForCountry,
  visaCoversStayWindow,
} from '@/domain/services/visaStayLogic';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { IsoDateField } from '@/presentation/components/IsoDateField';
import { RequiredFieldLabel } from '@/presentation/components/RequiredFieldLabel';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { Document } from '@/shared/types';

export interface StayVisaFormSlice {
  visaNeeded: boolean | null;
  visaDocumentId: string | null;
  visaIssueDate: string;
  visaExpiryDate: string;
  visaMaxStayDays: string;
}

interface StayVisaSectionProps {
  countryCode: string;
  nationalities: string[];
  arrivalDate: string;
  departureDate: string | null;
  value: StayVisaFormSlice;
  onChange: (patch: Partial<StayVisaFormSlice>) => void;
  errorMessage?: string | null;
}

export function StayVisaSection({
  countryCode,
  nationalities,
  arrivalDate,
  departureDate,
  value,
  onChange,
  errorMessage,
}: StayVisaSectionProps) {
  const { colors } = useTheme();
  const documents = useBorderMarkStore((state) => state.documents);
  const [preference, setPreference] = useState<boolean | null>(null);

  useEffect(() => {
    if (!shouldAskVisaQuestion(countryCode, nationalities)) {
      return;
    }
    void getCountryVisaPreference(countryCode).then(setPreference);
  }, [countryCode, nationalities]);

  useEffect(() => {
    if (value.visaNeeded != null || preference == null) {
      return;
    }
    onChange({ visaNeeded: preference });
  }, [preference, value.visaNeeded, onChange]);

  const checkDate = departureDate ?? arrivalDate;
  const activeVisas = useMemo(
    () => listActiveVisasForCountry(documents, countryCode, checkDate),
    [documents, countryCode, checkDate],
  );
  const coveringVisa = useMemo(
    () => activeVisas.find((document) => visaCoversStayWindow(document, arrivalDate, departureDate)),
    [activeVisas, arrivalDate, departureDate],
  );

  const countryName = getCountryName(countryCode);

  if (!shouldAskVisaQuestion(countryCode, nationalities)) {
    return (
      <AccessibleText style={{ color: colors.textSecondary, lineHeight: 22 }}>
        No visa question for {countryName} — it matches a nationality on your profile. Passport and visa scans still
        live in Profile → Documents.
      </AccessibleText>
    );
  }

  const statusMessage = activeVisaStatusMessage(documents, countryCode, arrivalDate, departureDate);
  const needsNewVisaDetails = value.visaNeeded === true && !value.visaDocumentId && !coveringVisa;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <RequiredFieldLabel title={`Need a visa for ${countryName}?`} />
      <AccessibleText style={{ color: colors.textSecondary, lineHeight: 20 }}>
        BorderMark remembers your answer for this country. Visa records live in Profile → Documents.
      </AccessibleText>

      <View style={styles.row}>
        {([
          { key: true, label: 'Yes, visa required' },
          { key: false, label: 'No visa needed' },
        ] as const).map((option) => {
          const selected = value.visaNeeded === option.key;
          return (
            <Pressable
              key={option.label}
              onPress={() =>
                onChange({
                  visaNeeded: selected ? null : option.key,
                  visaDocumentId: option.key ? value.visaDocumentId : null,
                })
              }
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accentMuted : colors.background,
                },
              ]}
            >
              <AccessibleText style={{ color: selected ? colors.accent : colors.text, fontWeight: selected ? '600' : '400' }}>
                {option.label}
              </AccessibleText>
            </Pressable>
          );
        })}
      </View>

      {preference != null ? (
        <AccessibleText style={{ color: colors.muted, fontSize: typography.caption }}>
          Last saved for this country: {preference ? 'visa required' : 'no visa needed'}.
        </AccessibleText>
      ) : null}

      {value.visaNeeded === true ? (
        <View style={styles.details}>
          {statusMessage ? (
            <AccessibleText style={{ color: colors.textSecondary, lineHeight: 20 }}>{statusMessage}</AccessibleText>
          ) : null}

          {coveringVisa && !value.visaDocumentId ? (
            <Pressable
              onPress={() => onChange({ visaDocumentId: coveringVisa.id })}
              accessibilityRole="button"
              accessibilityLabel="Use visa on file"
              style={[styles.useVisaButton, { borderColor: colors.accent, backgroundColor: colors.accentMuted }]}
            >
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>
                Use visa on file (expires {coveringVisa.expiryDate})
              </AccessibleText>
            </Pressable>
          ) : null}

          {value.visaDocumentId && coveringVisa?.id === value.visaDocumentId ? (
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>
              Using visa on file until {coveringVisa.expiryDate}.
            </AccessibleText>
          ) : null}

          {needsNewVisaDetails ? (
            <>
              <IsoDateField
                label="Visa issue date"
                value={value.visaIssueDate}
                onChangeText={(visaIssueDate) => onChange({ visaIssueDate })}
                required
              />
              <IsoDateField
                label="Visa expiry date"
                value={value.visaExpiryDate}
                onChangeText={(visaExpiryDate) => onChange({ visaExpiryDate })}
                required
              />
              <AccessibleTextInput
                label="Max days in country on this visa (optional)"
                value={value.visaMaxStayDays}
                onChangeText={(visaMaxStayDays) => onChange({ visaMaxStayDays })}
                keyboardType="number-pad"
                placeholder="e.g. 90 — creates a tracking rule"
              />
            </>
          ) : null}

          {value.visaDocumentId ? (
            <Pressable
              onPress={() => onChange({ visaDocumentId: null })}
              accessibilityRole="button"
              accessibilityLabel="Record a different visa"
            >
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Record a different visa</AccessibleText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {errorMessage ? (
        <AccessibleText style={{ color: colors.urgent }} accessibilityRole="alert">
          {errorMessage}
        </AccessibleText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { gap: spacing.md },
  useVisaButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function buildStayVisaFormInput(
  countryCode: string,
  nationalities: string[],
  slice: StayVisaFormSlice,
  arrivalDate: string,
  departureDate: string | null,
) {
  return {
    countryCode,
    nationalities,
    visaNeeded: slice.visaNeeded,
    visaDocumentId: slice.visaDocumentId,
    visaIssueDate: slice.visaIssueDate,
    visaExpiryDate: slice.visaExpiryDate,
    visaMaxStayDays: slice.visaMaxStayDays,
    stayArrivalDate: arrivalDate,
    stayDepartureDate: departureDate,
  };
}

export function initialStayVisaSlice(preference: boolean | null = null): StayVisaFormSlice {
  return {
    visaNeeded: preference,
    visaDocumentId: null,
    visaIssueDate: '',
    visaExpiryDate: '',
    visaMaxStayDays: '',
  };
}
