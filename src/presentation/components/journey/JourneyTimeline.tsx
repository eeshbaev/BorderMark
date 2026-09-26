import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { JourneyInsightsSection } from '@/presentation/components/journey/JourneyInsights';
import type { JourneyInsights } from '@/domain/services/journeyInsightsService';
import { filterJourneyGroups } from '@/domain/services/journeyService';
import { EmptyState } from '@/presentation/components/EmptyState';
import { countryFlag } from '@/data/dataset/countries';
import { journeyStayAccessibilityLabel } from '@/presentation/accessibility/labels';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import {
  JourneyTimelineFilters,
  type JourneyFilterState,
} from '@/presentation/components/journey/JourneyTimelineFilters';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';
import type { JourneyStayGroup } from '@/shared/types';

interface JourneyTimelineProps {
  groups: JourneyStayGroup[];
  insights: JourneyInsights;
  filters: JourneyFilterState;
  onFiltersChange: (filters: JourneyFilterState) => void;
}

export function JourneyTimeline({ groups, insights, filters, onFiltersChange }: JourneyTimelineProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const filteredGroups = filterJourneyGroups(groups, filters);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="Your journey starts here"
        body="Add the places and stays that shaped your life across borders."
        actionLabel="Add stay"
        onAction={() => router.push('/stay/add')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <JourneyInsightsSection insights={insights} />
      <JourneyTimelineFilters groups={groups} filters={filters} onChange={onFiltersChange} />

      {filteredGroups.length === 0 ? (
        <AccessibleText style={[styles.noResults, { color: colors.textSecondary }]}>
          No stays match these filters.
        </AccessibleText>
      ) : (
        filteredGroups.map((group) => (
          <View key={group.year} style={styles.yearBlock}>
            <AccessibleText style={[styles.year, { color: colors.text }]} accessibilityRole="header">
              {group.year}
            </AccessibleText>

            {group.items.map((item, index) => (
              <View key={item.stay.id}>
                <Pressable
                  onPress={() => router.push(`/stay/${item.stay.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={journeyStayAccessibilityLabel({
                    countryName: item.countryName,
                    dateLabel: item.dateLabel,
                    isCurrent: item.isCurrent ?? false,
                    isApproximate: item.isApproximate ?? false,
                    dayCount: item.dayCount,
                    precisionBadge: item.precisionBadge,
                  })}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: item.isCurrent ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                      {countryFlag(item.stay.countryCode)}
                    </AccessibleText>
                    <View style={styles.cardHeaderText}>
                      <AccessibleText style={[styles.country, { color: colors.text }]}>{item.countryName}</AccessibleText>
                      <AccessibleText style={[styles.dates, { color: colors.textSecondary }]}>{item.dateLabel}</AccessibleText>
                    </View>
                    {item.isCurrent ? (
                      <AccessibleText style={[styles.currentBadge, { color: colors.accent, borderColor: colors.accent }]}>
                        Current
                      </AccessibleText>
                    ) : null}
                  </View>

                  {item.durationLabel ? (
                    <AccessibleText style={[styles.duration, { color: colors.text }]}>{item.durationLabel}</AccessibleText>
                  ) : null}

                  {item.cityLabel ? (
                    <AccessibleText style={[styles.city, { color: colors.textSecondary }]}>{item.cityLabel}</AccessibleText>
                  ) : null}

                  {item.stayTypeLabel ? (
                    <AccessibleText style={[styles.stayType, { color: colors.textSecondary }]}>{item.stayTypeLabel}</AccessibleText>
                  ) : null}

                  {item.isApproximate ? (
                    <AccessibleText style={[styles.approximateBadge, { color: colors.warning }]}>
                      {item.precisionBadge ?? 'Approximate'}
                    </AccessibleText>
                  ) : null}

                  {(item.memoryCount > 0 || item.noteCount > 0) ? (
                    <AccessibleText style={[styles.meta, { color: colors.muted }]}>
                      {item.memoryCount > 0 ? `📷 ${item.memoryCount}` : ''}
                      {item.memoryCount > 0 && item.noteCount > 0 ? ' · ' : ''}
                      {item.noteCount > 0 ? `📝 ${item.noteCount}` : ''}
                    </AccessibleText>
                  ) : null}
                </Pressable>

                {index < group.items.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} accessibilityElementsHidden />
                ) : null}
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  noResults: { fontSize: typography.body, lineHeight: 22, paddingVertical: spacing.lg },
  yearBlock: { gap: spacing.md },
  year: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 44,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardHeaderText: { flex: 1, gap: 2 },
  flag: { fontSize: 24, marginTop: 2 },
  country: { fontSize: typography.title, fontWeight: '700' },
  dates: { fontSize: typography.body, lineHeight: 22 },
  currentBadge: {
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  duration: { fontSize: typography.body, fontWeight: '600' },
  city: { fontSize: typography.body, lineHeight: 22 },
  stayType: { fontSize: typography.caption, lineHeight: 18 },
  approximateBadge: { fontSize: typography.caption, fontWeight: '600' },
  meta: { fontSize: typography.caption, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md, marginHorizontal: spacing.lg },
});
