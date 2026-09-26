import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { MilestoneRow } from '@/presentation/components/milestones/MilestoneRow';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function MilestonesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const summary = useBorderMarkStore((state) => state.milestonesSummary);
  const milestones = summary?.milestones ?? [];

  return (
    <Screen
      title="Your milestones"
      subtitle="Biographical moments from your life across borders."
      scroll
    >
      {milestones.length === 0 ? (
        <AccessibleText style={{ color: colors.textSecondary, fontSize: typography.body, lineHeight: 22 }}>
          As you record stays and tag them with Lived, Visited, or Worked, BorderMark will surface the moments that
          shaped your story.
        </AccessibleText>
      ) : (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', paddingHorizontal: spacing.lg, backgroundColor: colors.surface }}>
          {milestones.map((milestone, index) => (
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
          ))}
        </View>
      )}
    </Screen>
  );
}
