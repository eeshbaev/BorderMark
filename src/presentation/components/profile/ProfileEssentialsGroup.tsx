import { StyleSheet, View } from 'react-native';

import { DocumentsSection } from '@/presentation/components/profile/DocumentsSection';
import { RemindersSection } from '@/presentation/components/profile/RemindersSection';
import { RulesSection } from '@/presentation/components/profile/RulesSection';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

export function ProfileEssentialsGroup() {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <AccessibleText
        style={[styles.groupLabel, { color: colors.textSecondary }]}
        accessibilityRole="header"
      >
        Your BorderMark
      </AccessibleText>
      <DocumentsSection />
      <RulesSection />
      <RemindersSection />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xl },
  groupLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
