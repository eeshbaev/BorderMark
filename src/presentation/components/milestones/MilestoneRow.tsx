import { Pressable, StyleSheet, View } from 'react-native';

import { countryFlag } from '@/data/dataset/countries';
import type { PersonalMilestone } from '@/shared/types';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface MilestoneRowProps {
  milestone: PersonalMilestone;
  onPress?: () => void;
  showDivider?: boolean;
}

export function MilestoneRow({ milestone, onPress, showDivider = false }: MilestoneRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${milestone.title}, ${milestone.countryName}, ${milestone.detail}`}
      style={[styles.row, showDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
    >
      <AccessibleText style={[styles.title, { color: colors.textSecondary }]}>{milestone.title}</AccessibleText>
      <View style={styles.valueRow}>
        <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
          {countryFlag(milestone.countryCode)}
        </AccessibleText>
        <AccessibleText style={[styles.value, { color: colors.text }]}>
          {milestone.countryName} · {milestone.detail}
        </AccessibleText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  title: { fontSize: typography.caption, lineHeight: 18 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { fontSize: 20 },
  value: { fontSize: typography.body, fontWeight: '600', lineHeight: 22, flex: 1 },
});
