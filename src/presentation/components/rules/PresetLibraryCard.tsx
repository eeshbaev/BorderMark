import { Pressable, StyleSheet, View } from 'react-native';

import type { RulePresetDefinition } from '@/domain/services/rulePresetCatalog';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { spacing, typography } from '@/presentation/theme';

interface PresetLibraryCardProps {
  preset: RulePresetDefinition;
  colors: {
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    accent: string;
  };
  onActivate: () => void;
}

export function PresetLibraryCard({ preset, colors, onActivate }: PresetLibraryCardProps) {
  const windowLabel =
    preset.windowMode === 'calendar_year'
      ? `${preset.threshold} days · calendar year`
      : `${preset.threshold} / ${preset.lookbackDays} days rolling`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardMain}>
        <AccessibleText style={[styles.title, { color: colors.text }]}>{preset.name}</AccessibleText>
        <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>{preset.description}</AccessibleText>
        <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>{windowLabel}</AccessibleText>
      </View>
      <Pressable
        onPress={onActivate}
        accessibilityRole="button"
        accessibilityLabel={`Turn on ${preset.name}`}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, minHeight: 36, justifyContent: 'center' }]}
      >
        <AccessibleText style={{ color: colors.accent, fontSize: typography.caption, fontWeight: '600' }}>
          Turn on
        </AccessibleText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardMain: { gap: spacing.xs },
  title: { fontSize: typography.body, fontWeight: '600', lineHeight: 22 },
  meta: { fontSize: typography.caption, lineHeight: 18 },
});
