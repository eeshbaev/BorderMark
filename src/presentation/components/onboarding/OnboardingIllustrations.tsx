import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';

export function OnboardingMapMotif() {
  const { colors } = useTheme();

  return (
    <View style={styles.motifRow} accessibilityElementsHidden importantForAccessibility="no">
      {['🇳🇱', '🇩🇪', '🇺🇸', '🇬🇧'].map((flag) => (
        <View key={flag} style={[styles.motifChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.motifFlag}>{flag}</Text>
        </View>
      ))}
      <View style={[styles.motifIcon, { backgroundColor: colors.accentMuted }]}>
        <Ionicons name="map-outline" size={20} color={colors.accent} />
      </View>
    </View>
  );
}

export function OnboardingHomePreview() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.previewCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="image"
      accessibilityLabel="Preview of current stay card and radar item"
    >
      <View style={[styles.previewAccent, { backgroundColor: colors.accent }]} />
      <View style={styles.previewContent}>
        <AccessibleText style={[styles.previewLabel, { color: colors.muted }]}>Current stay</AccessibleText>
        <View style={styles.previewRow}>
          <Text style={styles.previewFlag} accessibilityElementsHidden>
            🇳🇱
          </Text>
          <AccessibleText style={[styles.previewTitle, { color: colors.text }]}>Netherlands</AccessibleText>
        </View>
        <View style={[styles.previewPill, { backgroundColor: colors.accentMuted }]}>
          <AccessibleText style={[styles.previewPillText, { color: colors.accent }]}>Day 12</AccessibleText>
        </View>
        <View style={[styles.radarRow, { borderTopColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <AccessibleText style={[styles.radarText, { color: colors.textSecondary }]}>
            Schengen: 78 days remaining
          </AccessibleText>
        </View>
      </View>
    </View>
  );
}

export function OnboardingDocumentPreview() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.previewCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="image"
      accessibilityLabel="Preview of passport document with expiry warning"
    >
      <View style={styles.previewContent}>
        <View style={styles.previewRow}>
          <Ionicons name="document-text-outline" size={22} color={colors.accent} />
          <View style={styles.previewTextBlock}>
            <AccessibleText style={[styles.previewTitle, { color: colors.text }]}>Passport</AccessibleText>
            <AccessibleText style={[styles.previewSub, { color: colors.textSecondary }]}>🇺🇿 Uzbekistan</AccessibleText>
          </View>
        </View>
        <View style={[styles.expiryBanner, { backgroundColor: colors.warning + '18', borderColor: colors.warning }]}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <AccessibleText style={[styles.expiryText, { color: colors.warning }]}>Expires in 45 days</AccessibleText>
        </View>
      </View>
    </View>
  );
}

export function OnboardingJourneyPreview() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.previewCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="image"
      accessibilityLabel="Preview of journey timeline with country chapters"
    >
      <View style={styles.previewContent}>
        {[
          { flag: '🇳🇱', title: 'Netherlands', meta: 'Lived · 2024–2025' },
          { flag: '🇩🇪', title: 'Germany', meta: 'Worked · 2023' },
        ].map((entry, index) => (
          <View key={entry.title} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
              {index === 0 ? <View style={[styles.timelineLine, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={styles.timelineBody}>
              <View style={styles.previewRow}>
                <Text style={styles.previewFlag} accessibilityElementsHidden>
                  {entry.flag}
                </Text>
                <AccessibleText style={[styles.previewTitle, { color: colors.text }]}>{entry.title}</AccessibleText>
              </View>
              <AccessibleText style={[styles.previewSub, { color: colors.textSecondary }]}>{entry.meta}</AccessibleText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  motifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  motifChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motifFlag: { fontSize: 18 },
  motifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: { borderWidth: 1, borderRadius: radii.card, overflow: 'hidden' },
  previewAccent: { height: 4 },
  previewContent: { padding: spacing.lg, gap: spacing.sm },
  previewLabel: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewFlag: { fontSize: 22 },
  previewTitle: { fontSize: typography.title, fontWeight: '600' },
  previewSub: { fontSize: typography.caption, lineHeight: 18 },
  previewTextBlock: { flex: 1, gap: 2 },
  previewPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  previewPillText: { fontSize: typography.caption, fontWeight: '700' },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  radarText: { flex: 1, fontSize: typography.caption, lineHeight: 18 },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  expiryText: { fontSize: typography.caption, fontWeight: '600' },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineRail: { width: 12, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { flex: 1, width: 2, marginTop: spacing.xs },
  timelineBody: { flex: 1, gap: 2, paddingBottom: spacing.md },
});
