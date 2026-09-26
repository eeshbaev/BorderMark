import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { STAY_TYPES } from '@/domain/services/stayType';
import type { StayType } from '@/shared/types';

import { JourneyPlaces } from '@/presentation/components/journey/JourneyPlaces';
import { JourneyTabBar, type JourneyViewMode } from '@/presentation/components/journey/JourneyTabBar';
import { JourneyTimeline } from '@/presentation/components/journey/JourneyTimeline';
import type { JourneyFilterState } from '@/presentation/components/journey/JourneyTimelineFilters';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

const DEFAULT_FILTERS: JourneyFilterState = {
  stayTypes: [],
  year: null,
  month: null,
};

export default function JourneyScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ stayType?: string }>();
  const [mode, setMode] = useState<JourneyViewMode>('timeline');
  const [filters, setFilters] = useState<JourneyFilterState>(DEFAULT_FILTERS);
  const journeyGroups = useBorderMarkStore((state) => state.journeyGroups);
  const journeySummary = useBorderMarkStore((state) => state.journeySummary);
  const journeyInsights = useBorderMarkStore((state) => state.journeyInsights);

  useEffect(() => {
    if (typeof params.stayType === 'string' && STAY_TYPES.includes(params.stayType as StayType)) {
      setMode('timeline');
      setFilters({
        stayTypes: [params.stayType as StayType],
        year: null,
        month: null,
      });
    }
  }, [params.stayType]);

  return (
    <Screen showBack={false}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AccessibleText
            style={{ color: colors.text, fontSize: typography.hero, fontWeight: '700', letterSpacing: -0.5 }}
            accessibilityRole="header"
          >
            Your life across borders.
          </AccessibleText>
          <AccessibleText style={{ color: colors.textSecondary, fontSize: typography.body, lineHeight: 22 }}>
            {journeySummary.label}
          </AccessibleText>
        </View>

        <JourneyTabBar mode={mode} onChange={setMode} />

        {mode === 'timeline' ? (
          <JourneyTimeline
            groups={journeyGroups}
            insights={journeyInsights}
            filters={filters}
            onFiltersChange={setFilters}
          />
        ) : (
          <JourneyPlaces />
        )}
      </View>
    </Screen>
  );
}
