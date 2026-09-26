import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { MilestoneRow } from '@/presentation/components/milestones/MilestoneRow';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, spacing, typography } from '@/presentation/theme';

const PREVIEW_COUNT = 4;

export function MilestonesSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const summary = useBorderMarkStore((state) => state.milestonesSummary);

  if (!summary) {
    return null;
  }

  const preview = summary.milestones.slice(0, PREVIEW_COUNT);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Your milestones
          </AccessibleText>
          <AccessibleText style={[styles.sectionBody, { color: colors.textSecondary }]}>
            Personal moments from your life across borders — not badges to collect.
          </AccessibleText>
        </View>
        {summary.milestones.length > 0 ? (
          <Pressable
            onPress={() => router.push('/achievements')}
            accessibilityRole="button"
            accessibilityLabel="View all milestones"
            style={({ pressed }) => [styles.viewAll, { opacity: pressed ? 0.7 : 1 }]}
          >
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>View all</AccessibleText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {preview.length === 0 ? (
          <AccessibleText style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Your milestones will appear here as BorderMark learns your story — first stays, days abroad, returns, and
            the places that shaped you.
          </AccessibleText>
        ) : (
          preview.map((milestone, index) => (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              showDivider={index > 0}
              onPress={() => {
                if (milestone.stayId) {
                  router.push(`/stay/${milestone.stayId}`);
                  return;
                }
                router.push(`/country/${milestone.countryCode}`);
              }}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  sectionTitle: { fontSize: typography.section, fontWeight: '600' },
  sectionBody: { fontSize: typography.body, lineHeight: 22 },
  viewAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  emptyBody: {
    fontSize: typography.body,
    lineHeight: 22,
    paddingVertical: spacing.lg,
  },
});
