import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { countryFlag, getCountryByCode, getCountryName } from '@/data/dataset/countries';
import {
  getPrimaryNationality,
  isAbroad,
  isInNationalityCountry,
  returnToNationality,
  shouldSwitchNationalityStay,
} from '@/domain/services/nationalityHomeService';
import { formatBirthDateDisplay } from '@/domain/utils/birthDate';
import { NationalityCityEditor } from '@/presentation/components/nationality/NationalityCityEditor';
import { NationalitySwitchSheet } from '@/presentation/components/nationality/NationalitySwitchSheet';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { useTheme } from '@/presentation/hooks/useTheme';
import { saveUserProfile } from '@/presentation/store/profileActions';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';
import type { CurrentStayView, UserProfile } from '@/shared/types';

interface NationalityHomeCardProps {
  profile: UserProfile;
  currentStay: CurrentStayView | null;
}

export function NationalityHomeCard({ profile, currentStay }: NationalityHomeCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const today = useBorderMarkStore((state) => state.today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [switchCode, setSwitchCode] = useState<string | null>(null);

  const selectedCode = getPrimaryNationality(profile);
  const country = selectedCode ? getCountryByCode(selectedCode) : null;
  const current = currentStay?.stay ?? null;
  const abroad = isAbroad(current, profile);
  const inNationality = isInNationalityCountry(current, profile);
  const activeNationalityStay =
    currentStay && selectedCode && currentStay.stay.countryCode === selectedCode ? currentStay : null;
  const hasMultiple = profile.citizenships.length > 1;

  const birthHint = useMemo(() => {
    if (!profile.birthDate || !selectedCode) {
      return null;
    }
    return `Born ${formatBirthDateDisplay(profile.birthDate)} · ${getCountryName(selectedCode)}`;
  }, [profile.birthDate, selectedCode]);

  if (!selectedCode || !country) {
    return null;
  }

  async function selectNationality(code: string) {
    setPickerOpen(false);
    if (code === selectedCode) {
      return;
    }

    if (shouldSwitchNationalityStay(current, profile, code)) {
      setSwitchCode(code);
      return;
    }

    await saveUserProfile({ primaryNationality: code });
    await refresh();
  }

  async function handleReturn() {
    setReturning(true);
    try {
      const stay = await returnToNationality(selectedCode!, today);
      await refresh();
      router.push(`/stay/${stay.id}`);
    } finally {
      setReturning(false);
    }
  }

  function openNationalityStay() {
    if (activeNationalityStay) {
      router.push(`/stay/${activeNationalityStay.stay.id}`);
      return;
    }
    if (inNationality && current) {
      router.push(`/stay/${current.id}`);
      return;
    }
    router.push({
      pathname: '/stay/add',
      params: { countryCode: selectedCode, fromAdd: '1' },
    });
  }

  return (
    <>
      <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.accent, { backgroundColor: colors.primary }]} />

        <View style={styles.headerRow}>
          <AccessibleText style={[styles.kicker, { color: colors.muted }]} accessibilityRole="header">
            Nationality
          </AccessibleText>
          {hasMultiple ? (
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose nationality"
              style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <AccessibleText style={[styles.selectorText, { color: colors.text }]} numberOfLines={1}>
                {getCountryName(selectedCode)}
              </AccessibleText>
              <Ionicons name="chevron-down" size={16} color={colors.muted} accessibilityElementsHidden />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={openNationalityStay}
          accessibilityRole="button"
          accessibilityLabel={`Nationality home, ${getCountryName(selectedCode)}`}
          style={styles.body}
        >
          <Text style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
            {countryFlag(selectedCode)}
          </Text>
          <View style={styles.bodyText}>
            <AccessibleText style={[styles.countryName, { color: colors.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {country.name}
            </AccessibleText>
            <AccessibleText style={{ color: colors.textSecondary }}>{country.continent}</AccessibleText>
            {birthHint ? (
              <AccessibleText style={[styles.birthHint, { color: colors.textSecondary }]}>{birthHint}</AccessibleText>
            ) : null}
            {activeNationalityStay ? (
              <View style={styles.metaRow}>
                {activeNationalityStay.stay.city ? (
                  <AccessibleText style={{ color: colors.textSecondary }}>{activeNationalityStay.stay.city}</AccessibleText>
                ) : null}
                <View style={[styles.dayPill, { backgroundColor: colors.accentMuted }]}>
                  <AccessibleText style={[styles.dayLabel, { color: colors.accent }]}>
                    Day {activeNationalityStay.dayCount}
                  </AccessibleText>
                </View>
                <AccessibleText style={{ color: colors.textSecondary }}>{activeNationalityStay.dateLabel}</AccessibleText>
              </View>
            ) : abroad ? (
              <AccessibleText style={[styles.homeBody, { color: colors.textSecondary }]}>
                Tap Return when you head home, or choose another nationality above.
              </AccessibleText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} accessibilityElementsHidden />
        </Pressable>

        {activeNationalityStay ? <NationalityCityEditor stay={activeNationalityStay.stay} /> : null}

        {abroad ? (
          <View style={[styles.returnRow, activeNationalityStay ? styles.returnRowTight : null]}>
            <PrimaryButton
              label="Return"
              onPress={handleReturn}
              loading={returning}
              accessibilityHint={`Close your current trip and record your return to ${getCountryName(selectedCode)} today`}
            />
          </View>
        ) : null}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setPickerOpen(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AccessibleText style={[styles.modalTitle, { color: colors.text }]} accessibilityRole="header">
            Choose nationality
          </AccessibleText>
          {profile.citizenships.map((code) => (
            <Pressable
              key={code}
              onPress={() => selectNationality(code)}
              accessibilityRole="button"
              accessibilityState={{ selected: code === selectedCode }}
              style={[styles.modalRow, { borderBottomColor: colors.border }]}
            >
              <Text style={styles.modalFlag} accessibilityElementsHidden>
                {countryFlag(code)}
              </Text>
              <AccessibleText style={{ color: colors.text, flex: 1 }}>{getCountryName(code)}</AccessibleText>
              {code === selectedCode ? (
                <Ionicons name="checkmark" size={18} color={colors.accent} accessibilityElementsHidden />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Modal>

      {switchCode ? (
        <NationalitySwitchSheet
          visible
          nationalityCode={switchCode}
          onClose={() => setSwitchCode(null)}
          onSaved={(stayId) => router.push(`/stay/${stayId}`)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingLeft: spacing.xl + 4,
  },
  kicker: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: '58%',
  },
  selectorText: { fontSize: typography.caption, fontWeight: '600', flexShrink: 1 },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingLeft: spacing.xl + 4,
    paddingVertical: spacing.lg,
  },
  flag: { fontSize: 40, lineHeight: 44 },
  bodyText: { flex: 1, gap: spacing.xs },
  countryName: { fontSize: typography.section, fontWeight: '600' },
  birthHint: { fontSize: typography.caption, lineHeight: 18 },
  homeBody: { fontSize: typography.body, lineHeight: 22, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  dayPill: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  dayLabel: { fontSize: typography.caption, fontWeight: '600' },
  returnRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, paddingLeft: spacing.xl + 4 },
  returnRowTight: { paddingTop: spacing.sm },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  modalSheet: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    top: '30%',
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: typography.title, fontWeight: '600', marginBottom: spacing.sm },
  modalRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  modalFlag: { fontSize: 22, width: 32, textAlign: 'center' },
});
