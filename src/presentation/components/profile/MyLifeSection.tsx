import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { buildLifeTimeline } from '@/domain/services/lifeTimelineService';
import { buildMyLifeSummary, formatMyLifeCountryCount } from '@/domain/services/myLifeService';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { LifeTimelineList } from '@/presentation/components/profile/LifeTimelineList';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, spacing, typography } from '@/presentation/theme';

export function MyLifeSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const stays = useBorderMarkStore((state) => state.stays);
  const profile = useBorderMarkStore((state) => state.profile);
  const today = useBorderMarkStore((state) => state.today);

  const summary = useMemo(() => buildMyLifeSummary(stays), [stays]);
  const timeline = useMemo(() => buildLifeTimeline(profile, stays, today), [profile, stays, today]);

  return (
    <View style={styles.section}>
      <View style={styles.headerText}>
        <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
          My life
        </AccessibleText>
        <AccessibleText style={[styles.sectionBody, { color: colors.textSecondary }]}>
          Your lifeline from birth through every stay
        </AccessibleText>
      </View>

      <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {timeline.length === 0 ? (
          <AccessibleText style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Add your birth date and nationality, then record stays to build your life timeline.
          </AccessibleText>
        ) : (
          <LifeTimelineList entries={timeline} />
        )}

        {summary.hasData ? (
          <View style={[styles.summaryBlock, { borderTopColor: colors.border }]}>
            <AccessibleText style={[styles.summaryLabel, { color: colors.textSecondary }]} accessibilityRole="header">
              By chapter
            </AccessibleText>
            {summary.categories.map((category, index) => (
              <Pressable
                key={category.stayType}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/journey',
                    params: { stayType: category.stayType },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${category.label}, ${formatMyLifeCountryCount(category.countryCount)}`}
                style={[
                  styles.summaryRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.rowMain}>
                  <AccessibleText style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
                    {category.icon}
                  </AccessibleText>
                  <AccessibleText style={[styles.rowLabel, { color: colors.text }]}>{category.label}</AccessibleText>
                </View>
                <AccessibleText style={[styles.rowCount, { color: colors.textSecondary }]}>
                  {formatMyLifeCountryCount(category.countryCount)}
                </AccessibleText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  headerText: { gap: spacing.xs },
  sectionTitle: { fontSize: typography.section, fontWeight: '600' },
  sectionBody: { fontSize: typography.body, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  emptyBody: { fontSize: typography.body, lineHeight: 22, padding: spacing.lg },
  summaryBlock: { borderTopWidth: StyleSheet.hairlineWidth },
  summaryLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  summaryRow: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { fontSize: 20, width: 24, textAlign: 'center' },
  rowLabel: { fontSize: typography.body, fontWeight: '600' },
  rowCount: { fontSize: typography.caption },
});
