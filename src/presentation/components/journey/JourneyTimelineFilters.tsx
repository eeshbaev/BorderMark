import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getAvailableFilterYears, type JourneyFilterState } from '@/domain/services/journeyService';
import { STAY_TYPES, STAY_TYPE_LABELS } from '@/domain/services/stayType';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';
import type { JourneyStayGroup, StayType } from '@/shared/types';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface JourneyTimelineFiltersProps {
  groups: JourneyStayGroup[];
  filters: JourneyFilterState;
  onChange: (filters: JourneyFilterState) => void;
}

export function JourneyTimelineFilters({ groups, filters, onChange }: JourneyTimelineFiltersProps) {
  const { colors } = useTheme();
  const years = getAvailableFilterYears(groups);

  function toggleStayType(stayType: StayType) {
    const next = filters.stayTypes.includes(stayType)
      ? filters.stayTypes.filter((value) => value !== stayType)
      : [...filters.stayTypes, stayType];
    onChange({ ...filters, stayTypes: next });
  }

  function setYear(year: number | null) {
    onChange({ ...filters, year, month: year == null ? null : filters.month });
  }

  function setMonth(month: number | null) {
    onChange({ ...filters, month });
  }

  const hasActiveFilters =
    filters.stayTypes.length > 0 || filters.year != null || filters.month != null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AccessibleText style={[styles.title, { color: colors.textSecondary }]}>Filter</AccessibleText>
        {hasActiveFilters ? (
          <Pressable
            onPress={() => onChange({ stayTypes: [], year: null, month: null })}
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            style={styles.clearButton}
          >
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Clear</AccessibleText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STAY_TYPES.map((stayType) => (
          <FilterChip
            key={stayType}
            label={STAY_TYPE_LABELS[stayType]}
            selected={filters.stayTypes.includes(stayType)}
            onPress={() => toggleStayType(stayType)}
            colors={colors}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <FilterChip
          label="All years"
          selected={filters.year == null}
          onPress={() => setYear(null)}
          colors={colors}
        />
        {years.map((year) => (
          <FilterChip
            key={year}
            label={String(year)}
            selected={filters.year === year}
            onPress={() => setYear(filters.year === year ? null : year)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {filters.year != null ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="All months"
            selected={filters.month == null}
            onPress={() => setMonth(null)}
            colors={colors}
          />
          {MONTH_LABELS.map((label, index) => (
            <FilterChip
              key={label}
              label={label}
              selected={filters.month === index + 1}
              onPress={() => setMonth(filters.month === index + 1 ? null : index + 1)}
              colors={colors}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accentMuted : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <AccessibleText style={{ color: selected ? colors.accent : colors.textSecondary, fontWeight: selected ? '700' : '500', fontSize: typography.caption }}>
        {label}
      </AccessibleText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  clearButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  chipRow: { gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
});

export type { JourneyFilterState };
