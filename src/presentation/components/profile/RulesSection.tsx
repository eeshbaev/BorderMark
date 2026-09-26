import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { activeRuleResults } from '@/presentation/hooks/useRuleResults';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, spacing, typography } from '@/presentation/theme';

const PREVIEW_LIMIT = 3;

export function RulesSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const ruleResults = useBorderMarkStore((state) => state.ruleResults);
  const active = activeRuleResults(ruleResults);
  const preview = active.slice(0, PREVIEW_LIMIT);
  const hasMore = active.length > PREVIEW_LIMIT;
  const libraryCount = ruleResults.length - active.length;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Rules
          </AccessibleText>
          <AccessibleText style={[styles.sectionBody, { color: colors.textSecondary }]}>
            Track only what matters to you
          </AccessibleText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/rules/add')}
            accessibilityRole="button"
            accessibilityLabel="Add rule"
            hitSlop={8}
          >
            <AccessibleText style={[styles.headerAction, { color: colors.accent }]}>Add</AccessibleText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/rules')}
            accessibilityRole="button"
            accessibilityLabel="Open all rules"
            hitSlop={8}
          >
            <AccessibleText style={[styles.headerAction, { color: colors.accent }]}>View all</AccessibleText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {active.length === 0 ? (
          <View style={styles.emptyBody}>
            <AccessibleText style={[styles.emptyText, { color: colors.textSecondary }]}>
              No rules are tracking yet. Open the rules dashboard to turn on Schengen, US, or custom limits.
            </AccessibleText>
            <Pressable
              onPress={() => router.push('/rules')}
              accessibilityRole="button"
              accessibilityLabel="Open rules dashboard"
              style={[styles.emptyButton, { borderColor: colors.border }]}
            >
              <AccessibleText style={[styles.emptyButtonText, { color: colors.accent }]}>Rules dashboard</AccessibleText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/rules/add')}
              accessibilityRole="button"
              accessibilityLabel="Add custom rule"
              hitSlop={8}
            >
              <AccessibleText style={[styles.linkAction, { color: colors.accent }]}>Add custom rule</AccessibleText>
            </Pressable>
          </View>
        ) : (
          <>
            {preview.map(({ rule, result }, index) => (
              <Pressable
                key={rule.id}
                onPress={() => router.push(`/rules/${rule.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${rule.name}, ${result.daysUsed ?? 0} of ${result.threshold} days used`}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.rowText}>
                  <AccessibleText style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                    {rule.name}
                  </AccessibleText>
                  {result.state === 'UNAVAILABLE' ? (
                    <AccessibleText style={[styles.rowMeta, { color: colors.warning }]} numberOfLines={1}>
                      Unavailable — resolve data conflicts
                    </AccessibleText>
                  ) : (
                    <AccessibleText style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {result.state === 'ESTIMATED' ? '~' : ''}
                      {result.daysUsed ?? 0} / {result.threshold} days · {result.daysRemaining ?? 0} remaining
                    </AccessibleText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} accessibilityElementsHidden />
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push('/rules')}
              accessibilityRole="button"
              accessibilityLabel="Open rules dashboard"
              style={[styles.moreRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <AccessibleText style={[styles.moreText, { color: colors.accent }]}>
                {hasMore
                  ? `Rules dashboard · ${active.length} active`
                  : libraryCount > 0
                    ? `Rules dashboard · ${libraryCount} in library`
                    : 'Rules dashboard'}
              </AccessibleText>
            </Pressable>
          </>
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 2 },
  headerAction: { fontSize: typography.caption, fontWeight: '600' },
  sectionTitle: { fontSize: typography.title, fontWeight: '600' },
  sectionBody: { fontSize: typography.caption, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  emptyBody: { padding: spacing.lg, gap: spacing.md },
  emptyText: { fontSize: typography.body, lineHeight: 22 },
  emptyButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  emptyButtonText: { fontSize: typography.caption, fontWeight: '600' },
  linkAction: { fontSize: typography.caption, fontWeight: '600', alignSelf: 'flex-start' },
  row: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: typography.body, fontWeight: '600' },
  rowMeta: { fontSize: typography.caption, lineHeight: 18 },
  moreRow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  moreText: { fontSize: typography.caption, fontWeight: '600' },
});
