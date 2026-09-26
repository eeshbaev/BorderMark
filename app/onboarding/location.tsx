import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { countryFlag, getCountryName } from '@/data/dataset/countries';
import { updateAppSettings } from '@/data/repositories/settingsRepository';
import { createStayFromInput } from '@/data/repositories/stayRepository';
import { resolveCountryFromDevice } from '@/infrastructure/providers/locationProvider';
import { todayIso } from '@/domain/utils/dates';
import { OnboardingProgress } from '@/presentation/components/OnboardingProgress';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { CountryPicker } from '@/presentation/components/CountryPicker';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { initializeApp } from '@/presentation/store/bootstrapApp';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function OnboardingLocationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useBorderMarkStore((state) => state.profile);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettingsLink, setShowSettingsLink] = useState(false);

  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? 'there';

  async function useCurrentLocation() {
    setMessage(null);
    setShowSettingsLink(false);
    setBusy(true);
    try {
      const result = await resolveCountryFromDevice();
      if (result.countryCode) {
        setSelectedCode(result.countryCode);
        return;
      }
      setMessage(result.message ?? 'Choose your country manually.');
      setShowSettingsLink(result.message?.includes('permission') ?? false);
    } finally {
      setBusy(false);
    }
  }

  async function recordStayAndFinish() {
    if (!selectedCode) {
      setMessage('Choose your country to record your first stay.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const today = todayIso();
      const isNationality = profile?.citizenships.includes(selectedCode) ?? false;
      await createStayFromInput(
        {
          countryCode: selectedCode,
          stayType: isNationality ? 'lived' : 'visited',
          visaNeeded: null,
          date: {
            datePrecision: 'exact',
            arrivalDate: today,
            departureDate: null,
            stillHere: true,
          },
        },
        today,
      );
      await updateAppSettings({ onboardingCompleted: true });
      await initializeApp();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not record your stay. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen scroll={false} showHeader={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <AccessibleText style={[styles.backLabel, { color: colors.accent }]}>← Back</AccessibleText>
          </Pressable>
          <OnboardingProgress step={6} total={6} />
          <AccessibleText style={[styles.welcome, { color: colors.text }]} accessibilityRole="header">
            Welcome to BorderMark,{' '}
            <Text style={{ color: colors.accent }} accessibilityRole="text">
              {firstName}
            </Text>
            .
          </AccessibleText>
          <AccessibleText style={[styles.headline, { color: colors.text }]}>Where are you now?</AccessibleText>
          <AccessibleText style={[styles.body, { color: colors.textSecondary }]}>
            Record your current stay to get started. You can add past stays and documents anytime.
          </AccessibleText>

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
            onPress={useCurrentLocation}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Use current location"
          >
            <AccessibleText style={[styles.buttonText, { color: colors.onPrimary }]}>
              {busy ? 'Detecting location…' : 'Use current location'}
            </AccessibleText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <AccessibleText style={[styles.dividerText, { color: colors.textSecondary }]}>or choose manually</AccessibleText>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <CountryPicker
            value={selectedCode}
            onChange={(code) => {
              setSelectedCode(code);
              setMessage(null);
            }}
            label="Current location"
            placeholder="Where are you now?"
          />

          {selectedCode ? (
            <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.flag} accessibilityElementsHidden>
                {countryFlag(selectedCode)}
              </Text>
              <AccessibleText style={[styles.countryName, { color: colors.text }]}>
                {getCountryName(selectedCode)}
              </AccessibleText>
              <AccessibleText style={[styles.previewHint, { color: colors.textSecondary }]}>
                Your first stay will start today.
              </AccessibleText>
            </View>
          ) : null}

          {message ? (
            <AccessibleText style={{ color: colors.warning }} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {message}
            </AccessibleText>
          ) : null}

          {showSettingsLink ? (
            <Pressable
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open system settings"
              style={styles.settingsLink}
            >
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Open system settings</AccessibleText>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: selectedCode ? colors.primary : colors.border,
                opacity: busy ? 0.7 : 1,
              },
            ]}
            onPress={recordStayAndFinish}
            disabled={busy || !selectedCode}
            accessibilityRole="button"
            accessibilityLabel={selectedCode ? `Record stay in ${getCountryName(selectedCode)}` : 'Record stay'}
            accessibilityState={{ disabled: !selectedCode || busy }}
          >
            <AccessibleText style={[styles.buttonText, { color: selectedCode ? colors.onPrimary : colors.muted }]}>
              Record stay
            </AccessibleText>
          </Pressable>
          <AccessibleText style={[styles.trustNote, { color: colors.muted }]}>
            You can back up or export your data anytime from Settings.
          </AccessibleText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.md },
  backButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { fontSize: typography.body, fontWeight: '600' },
  welcome: { fontSize: typography.hero, fontWeight: '700', lineHeight: 36 },
  headline: { fontSize: typography.section, fontWeight: '700' },
  body: { fontSize: typography.body, lineHeight: 24 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: typography.title, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: typography.caption, fontWeight: '600' },
  previewCard: { borderWidth: 1, borderRadius: 16, padding: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  flag: { fontSize: 28 },
  countryName: { fontSize: typography.section, fontWeight: '600' },
  previewHint: { fontSize: typography.caption, lineHeight: 18 },
  settingsLink: { minHeight: 44, justifyContent: 'center' },
  footer: { gap: spacing.sm, padding: spacing.xl, paddingTop: spacing.md },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trustNote: { fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
});
