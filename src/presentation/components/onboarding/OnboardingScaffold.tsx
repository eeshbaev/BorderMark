import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingProgress } from '@/presentation/components/OnboardingProgress';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

import { OnboardingBulletList } from './OnboardingBulletList';

const TOTAL_STEPS = 6;

interface OnboardingScaffoldProps {
  step: number;
  headline: string;
  body: string;
  bullets?: string[];
  visual?: ReactNode;
  ctaLabel?: string;
  onContinue: () => void;
  trustNote?: string;
  continueDisabled?: boolean;
  busy?: boolean;
}

export function OnboardingScaffold({
  step,
  headline,
  body,
  bullets,
  visual,
  ctaLabel = 'Continue',
  onContinue,
  trustNote,
  continueDisabled = false,
  busy = false,
}: OnboardingScaffoldProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false} showHeader={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {router.canGoBack() ? (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
            >
              <AccessibleText style={[styles.backLabel, { color: colors.accent }]}>← Back</AccessibleText>
            </Pressable>
          ) : null}
          <OnboardingProgress step={step} total={TOTAL_STEPS} />
          <AccessibleText style={[styles.headline, { color: colors.text }]} accessibilityRole="header">
            {headline}
          </AccessibleText>
          <AccessibleText style={[styles.body, { color: colors.textSecondary }]}>{body}</AccessibleText>
          {bullets?.length ? <OnboardingBulletList items={bullets} /> : null}
          {visual ? <View style={styles.visual}>{visual}</View> : null}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: continueDisabled ? colors.border : colors.primary,
                opacity: busy ? 0.7 : 1,
              },
            ]}
            onPress={onContinue}
            disabled={continueDisabled || busy}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            accessibilityState={{ disabled: continueDisabled || busy }}
          >
            <AccessibleText style={[styles.buttonText, { color: continueDisabled ? colors.muted : colors.onPrimary }]}>
              {ctaLabel}
            </AccessibleText>
          </Pressable>
          {trustNote ? (
            <AccessibleText style={[styles.trustNote, { color: colors.muted }]}>{trustNote}</AccessibleText>
          ) : null}
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
  headline: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  body: { fontSize: typography.body, lineHeight: 24 },
  visual: { marginTop: spacing.sm },
  footer: { gap: spacing.sm, padding: spacing.xl, paddingTop: spacing.md },
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: typography.title, fontWeight: '600' },
  trustNote: { fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
});
