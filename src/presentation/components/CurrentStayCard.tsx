import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { countryFlag } from '@/data/dataset/countries';
import { currentStayAccessibilityLabel } from '@/presentation/accessibility/labels';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';
import type { CurrentStayView } from '@/shared/types';

interface CurrentStayCardProps {
  currentStay: CurrentStayView;
}

export function CurrentStayCard({ currentStay }: CurrentStayCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/stay/${currentStay.stay.id}`)}
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={currentStayAccessibilityLabel(currentStay)}
      accessibilityHint="Opens stay details"
    >
      <View style={[styles.accent, { backgroundColor: colors.accent }]} />
      <View style={styles.row}>
        <Text style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
          {countryFlag(currentStay.stay.countryCode)}
        </Text>
        <View style={styles.content}>
          <Text
            style={[styles.currentLabel, { color: colors.muted }]}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            Current stay
          </Text>
          <Text style={[styles.country, { color: colors.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {currentStay.countryName}
          </Text>
          {currentStay.previousStay ? (
            <View style={styles.previousRow}>
              <Text
                style={[styles.previousLabel, { color: colors.textSecondary }]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                From home ·{' '}
                <Text style={styles.previousFlag} accessibilityElementsHidden importantForAccessibility="no">
                  {countryFlag(currentStay.previousStay.stay.countryCode)}
                </Text>{' '}
                {currentStay.previousStay.countryName}
              </Text>
              <Text
                style={[styles.previousDates, { color: colors.muted }]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                · {currentStay.previousStay.leftLabel}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.dayHighlight, { backgroundColor: colors.accentMuted }]}>
              <Text
                style={[styles.dayPrefix, { color: colors.accent }]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                Day
              </Text>
              <Text style={[styles.dayNumber, { color: colors.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {currentStay.dayCount}
              </Text>
            </View>
            <Text style={[styles.dates, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {currentStay.dateLabel}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} accessibilityElementsHidden />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    overflow: 'hidden',
    minHeight: 44,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingLeft: spacing.xl + 4,
    gap: spacing.md,
  },
  flag: { fontSize: 40, lineHeight: 44 },
  content: { flex: 1, gap: spacing.xs },
  currentLabel: {
    fontSize: typography.label,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  country: { fontSize: typography.section, fontWeight: '600', flexShrink: 1 },
  previousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  previousLabel: { fontSize: typography.body, flexShrink: 1 },
  previousFlag: { fontSize: typography.body },
  previousDates: { fontSize: typography.body, flexShrink: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  dayHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayPrefix: {
    fontSize: typography.title,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: typography.hero,
    fontWeight: '700',
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  dates: { fontSize: typography.body, flexShrink: 1 },
});
