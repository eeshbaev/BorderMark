import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface OnboardingBulletListProps {
  items: string[];
}

export function OnboardingBulletList({ items }: OnboardingBulletListProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.list} accessibilityRole="list">
      {items.map((item) => (
        <View key={item} style={styles.row} accessibilityRole="text">
          <View style={[styles.dot, { backgroundColor: colors.accent }]} accessibilityElementsHidden />
          <AccessibleText style={[styles.text, { color: colors.textSecondary }]}>{item}</AccessibleText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  text: { flex: 1, fontSize: typography.body, lineHeight: 22 },
});
