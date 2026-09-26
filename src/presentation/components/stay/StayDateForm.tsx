import { Pressable, StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { IsoDateField } from '@/presentation/components/IsoDateField';
import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface StayDateFormProps {
  arrivalDate: string;
  onArrivalDateChange: (value: string) => void;
  departureDate: string;
  onDepartureDateChange: (value: string) => void;
  stillHere: boolean;
  onStillHereChange: (value: boolean) => void;
}

export function StayDateForm({
  arrivalDate,
  onArrivalDateChange,
  departureDate,
  onDepartureDateChange,
  stillHere,
  onStillHereChange,
}: StayDateFormProps) {
  const { colors } = useTheme();

  function handleDepartureChange(value: string) {
    onDepartureDateChange(value);
    if (value.trim()) {
      onStillHereChange(false);
    }
  }

  function toggleStillHere() {
    const next = !stillHere;
    onStillHereChange(next);
    if (next) {
      onDepartureDateChange('');
    }
  }

  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AccessibleText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Dates</AccessibleText>

      <View style={styles.field}>
        <IsoDateField label="From" value={arrivalDate} onChangeText={onArrivalDateChange} />
      </View>

      <View style={styles.field}>
        <IsoDateField label="To" value={departureDate} onChangeText={handleDepartureChange} />
        <AccessibleText style={[styles.fieldHint, { color: colors.muted }]}>
          End date means you returned home. Leave blank only if you are still in this country.
        </AccessibleText>
      </View>

      <Pressable
        onPress={toggleStillHere}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: stillHere }}
        accessibilityLabel="I am still here, optional"
        style={[
          styles.stillHereChip,
          {
            borderColor: stillHere ? colors.accent : colors.border,
            backgroundColor: stillHere ? colors.accentMuted : colors.background,
            minHeight: MIN_TOUCH_TARGET,
          },
        ]}
      >
        <AccessibleText style={{ color: stillHere ? colors.accent : colors.text, fontWeight: stillHere ? '600' : '400' }}>
          I am still here (optional)
        </AccessibleText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  sectionLabel: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { gap: spacing.sm },
  fieldHint: { fontSize: typography.caption, lineHeight: 18 },
  stillHereChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
});
