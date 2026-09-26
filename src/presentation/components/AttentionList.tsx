import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { attentionItemAccessibilityLabel } from '@/presentation/accessibility/labels';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';
import type { AttentionItem } from '@/shared/types';

interface AttentionListProps {
  items: AttentionItem[];
}

const priorityMeta = {
  urgent: { label: 'Urgent', colorKey: 'urgent' as const },
  important: { label: 'Important', colorKey: 'warning' as const },
  upcoming: { label: 'Upcoming', colorKey: 'accent' as const },
} as const;

export function AttentionList({ items }: AttentionListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <View
        style={[styles.empty, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="text"
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          You&apos;re all caught up.
        </Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          BorderMark will surface documents, rules, and reminders here when they need attention.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const meta = priorityMeta[item.priority];
        const dotColor = colors[meta.colorKey];
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={attentionItemAccessibilityLabel(item)}
            onPress={() => {
              if (item.sourceType === 'document') {
                router.push(`/documents/${item.sourceId}`);
              } else if (item.sourceType === 'rule') {
                router.push(`/rules/${item.sourceId}`);
              } else if (item.sourceType === 'stay') {
                router.push(`/stay/${item.sourceId}`);
              } else {
                router.push('/reminders');
              }
            }}
            style={[styles.item, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.priorityRow}>
              <View style={[styles.priorityDot, { backgroundColor: dotColor }]} accessibilityElementsHidden />
              <Text style={[styles.priority, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {meta.label}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {item.subtitle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 44,
  },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priority: { fontSize: typography.caption, fontWeight: '600' },
  title: { fontSize: typography.title, fontWeight: '600', flexShrink: 1 },
  subtitle: { fontSize: typography.body, lineHeight: 20, flexShrink: 1 },
  empty: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: typography.title, fontWeight: '600' },
  emptyBody: { fontSize: typography.body, lineHeight: 22 },
});
