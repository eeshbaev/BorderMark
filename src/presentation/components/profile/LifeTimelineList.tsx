import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { countryFlag } from '@/data/dataset/countries';
import type { LifeTimelineEntry } from '@/domain/services/lifeTimelineService';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface LifeTimelineListProps {
  entries: LifeTimelineEntry[];
}

export function LifeTimelineList({ entries }: LifeTimelineListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        const isInferred = entry.kind === 'inferred_home';

        return (
          <View
            key={isInferred ? `inferred-${entry.fromDate}-${entry.toDate}` : entry.stay.id}
            style={styles.row}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isInferred ? colors.muted : colors.accent,
                    borderColor: colors.surface,
                  },
                ]}
              />
              {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
            </View>

            {isInferred ? (
              <View style={[styles.content, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={styles.contentHeader}>
                  <AccessibleText style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
                    {countryFlag(entry.countryCode)}
                  </AccessibleText>
                  <View style={styles.contentText}>
                    <AccessibleText style={[styles.title, { color: colors.text }]}>
                      Lived · {entry.countryName}
                    </AccessibleText>
                    <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
                      {entry.fromLabel} → {entry.toLabel}
                    </AccessibleText>
                    <AccessibleText style={[styles.note, { color: colors.muted }]}>
                      Home (from birth & primary nationality). Add stays to refine trips abroad.
                    </AccessibleText>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push(`/stay/${entry.stay.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.label} in ${entry.countryName}, ${entry.dateLabel}`}
                style={[styles.content, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <View style={styles.contentHeader}>
                  <AccessibleText style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
                    {entry.icon}
                  </AccessibleText>
                  <View style={styles.contentText}>
                    <AccessibleText style={[styles.title, { color: colors.text }]}>
                      {entry.label} · {entry.countryName}
                      {entry.isCurrent ? ' · Now' : ''}
                    </AccessibleText>
                    <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
                      {entry.dateLabel}
                      {entry.city ? ` · ${entry.city}` : ''}
                    </AccessibleText>
                  </View>
                  <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                    {countryFlag(entry.countryCode)}
                  </AccessibleText>
                </View>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 16, alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: spacing.md,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: spacing.xs,
    minHeight: 24,
  },
  content: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  contentHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  contentText: { flex: 1, gap: spacing.xs },
  icon: { fontSize: 20, width: 24, textAlign: 'center', marginTop: 2 },
  flag: { fontSize: 18 },
  title: { fontSize: typography.body, fontWeight: '600', lineHeight: 22 },
  meta: { fontSize: typography.caption, lineHeight: 18 },
  note: { fontSize: typography.caption, lineHeight: 18 },
});
