import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface OnboardingProgressProps {
  step: number;
  total: number;
}

export function OnboardingProgress({ step, total }: OnboardingProgressProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={`Step ${step} of ${total}`}>
      <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>
        Step {step} of {total}
      </AccessibleText>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              { backgroundColor: index < step ? colors.accent : colors.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: typography.caption, fontWeight: '600', letterSpacing: 0.5 },
  track: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
