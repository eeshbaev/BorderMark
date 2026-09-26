import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { STAY_TYPES, STAY_TYPE_LABELS } from '@/domain/services/stayType';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';
import type { StayType } from '@/shared/types';

interface StayTypePickerProps {
  value: StayType | null;
  onChange: (value: StayType) => void;
  label?: string;
  errorMessage?: string | null;
}

export function StayTypePicker({
  value,
  onChange,
  label = 'Stay type',
  errorMessage,
}: StayTypePickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>{label}</AccessibleText>
      <AccessibleText style={[styles.hint, { color: colors.textSecondary }]}>Required</AccessibleText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {STAY_TYPES.map((stayType) => (
          <Chip
            key={stayType}
            label={STAY_TYPE_LABELS[stayType]}
            selected={value === stayType}
            onPress={() => onChange(stayType)}
            colors={colors}
          />
        ))}
      </ScrollView>
      {errorMessage ? (
        <AccessibleText style={{ color: colors.warning }} accessibilityRole="alert">
          {errorMessage}
        </AccessibleText>
      ) : null}
    </View>
  );
}

function Chip({
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
          backgroundColor: selected ? colors.accentMuted : colors.background,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <AccessibleText style={{ color: selected ? colors.accent : colors.text, fontWeight: selected ? '700' : '500' }}>
        {label}
      </AccessibleText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  hint: { fontSize: typography.caption },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
});
