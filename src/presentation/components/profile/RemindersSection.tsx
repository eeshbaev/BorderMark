import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, spacing, typography } from '@/presentation/theme';

const PREVIEW_LIMIT = 3;

export function RemindersSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const reminders = useBorderMarkStore((state) => state.reminders);
  const preview = reminders.slice(0, PREVIEW_LIMIT);
  const hasMore = reminders.length > PREVIEW_LIMIT;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Reminders
          </AccessibleText>
          <AccessibleText style={[styles.sectionBody, { color: colors.textSecondary }]}>
            Important dates you choose to remember
          </AccessibleText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/reminders/add')}
            accessibilityRole="button"
            accessibilityLabel="Add reminder"
            hitSlop={8}
          >
            <AccessibleText style={[styles.headerAction, { color: colors.accent }]}>Add</AccessibleText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/reminders')}
            accessibilityRole="button"
            accessibilityLabel="Open all reminders"
            hitSlop={8}
          >
            <AccessibleText style={[styles.headerAction, { color: colors.accent }]}>View all</AccessibleText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {reminders.length === 0 ? (
          <View style={styles.emptyBody}>
            <AccessibleText style={[styles.emptyText, { color: colors.textSecondary }]}>
              Renewals, appointments, and deadlines — BorderMark will surface them on your radar.
            </AccessibleText>
            <Pressable
              onPress={() => router.push('/reminders/add')}
              accessibilityRole="button"
              accessibilityLabel="Add reminder"
              style={[styles.emptyButton, { borderColor: colors.border }]}
            >
              <Ionicons name="add" size={16} color={colors.accent} accessibilityElementsHidden />
              <AccessibleText style={[styles.emptyButtonText, { color: colors.accent }]}>Add reminder</AccessibleText>
            </Pressable>
          </View>
        ) : (
          <>
            {preview.map((reminder, index) => (
              <Pressable
                key={reminder.id}
                onPress={() => router.push('/reminders')}
                accessibilityRole="button"
                accessibilityLabel={`${reminder.title}, ${reminder.triggerDate}`}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.rowText}>
                  <AccessibleText style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                    {reminder.title}
                  </AccessibleText>
                  <AccessibleText style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {reminder.triggerDate}
                  </AccessibleText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} accessibilityElementsHidden />
              </Pressable>
            ))}
            {hasMore ? (
              <Pressable
                onPress={() => router.push('/reminders')}
                accessibilityRole="button"
                accessibilityLabel={`View all ${reminders.length} reminders`}
                style={[styles.moreRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <AccessibleText style={[styles.moreText, { color: colors.accent }]}>
                  View all {reminders.length} reminders
                </AccessibleText>
              </Pressable>
            ) : null}
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
