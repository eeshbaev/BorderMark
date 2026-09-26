import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppLogo } from '@/presentation/components/AppLogo';
import { OnboardingProgress } from '@/presentation/components/OnboardingProgress';
import { OnboardingMapMotif } from '@/presentation/components/onboarding/OnboardingIllustrations';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

export default function OnboardingIntroScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false} showHeader={false}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <AppLogo size={96} />
            <OnboardingProgress step={1} total={6} />
            <Text style={[styles.brand, { color: colors.text }]}>BorderMark</Text>
            <OnboardingMapMotif />
          </View>
          <AccessibleText style={[styles.headline, { color: colors.text }]} accessibilityRole="header">
            Your life across borders.
          </AccessibleText>
          <AccessibleText style={[styles.body, { color: colors.textSecondary }]}>
            BorderMark keeps your places, days, documents, and important dates in one private place — built for people
            who live, work, and travel between countries.
          </AccessibleText>
        </View>
        <View style={styles.footer}>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/onboarding/stays')}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <AccessibleText style={[styles.buttonText, { color: colors.onPrimary }]}>Continue</AccessibleText>
          </Pressable>
          <AccessibleText style={[styles.trustNote, { color: colors.muted }]}>
            No account. Your data stays on your device.
          </AccessibleText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: spacing.xl },
  content: { gap: spacing.lg, marginTop: spacing.massive },
  hero: { gap: spacing.md, alignItems: 'flex-start' },
  brand: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  headline: { fontSize: 34, fontWeight: '700', lineHeight: 40 },
  body: { fontSize: typography.body, lineHeight: 24 },
  footer: { gap: spacing.sm },
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: typography.title, fontWeight: '600' },
  trustNote: { fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
});
