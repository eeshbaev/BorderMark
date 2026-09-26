import { format, getDaysInMonth, setDate, setMonth, setYear, startOfDay } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ISO_DATE } from '@/domain/utils/dates';
import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface IsoDatePickerSheetProps {
  visible: boolean;
  title: string;
  date: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
}

function clampDate(date: Date, minimumDate?: Date, maximumDate?: Date): Date {
  const day = startOfDay(date);
  if (minimumDate && day < startOfDay(minimumDate)) {
    return startOfDay(minimumDate);
  }
  if (maximumDate && day > startOfDay(maximumDate)) {
    return startOfDay(maximumDate);
  }
  return day;
}

function StepperRow({
  label,
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.stepperRow}>
      <AccessibleText style={[styles.stepperLabel, { color: colors.textSecondary }]}>{label}</AccessibleText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onDecrement}
          accessibilityRole="button"
          accessibilityLabel={decrementLabel}
          style={[styles.stepperButton, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <AccessibleText style={[styles.stepperGlyph, { color: colors.text }]}>−</AccessibleText>
        </Pressable>
        <AccessibleText style={[styles.stepperValue, { color: colors.text }]} accessibilityRole="text">
          {value}
        </AccessibleText>
        <Pressable
          onPress={onIncrement}
          accessibilityRole="button"
          accessibilityLabel={incrementLabel}
          style={[styles.stepperButton, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <AccessibleText style={[styles.stepperGlyph, { color: colors.text }]}>+</AccessibleText>
        </Pressable>
      </View>
    </View>
  );
}

export function IsoDatePickerSheet({
  visible,
  title,
  date,
  minimumDate,
  maximumDate,
  onConfirm,
  onDismiss,
}: IsoDatePickerSheetProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(() => clampDate(date, minimumDate, maximumDate));

  useEffect(() => {
    if (visible) {
      setDraft(clampDate(date, minimumDate, maximumDate));
    }
  }, [visible, date, minimumDate, maximumDate]);

  const previewIso = useMemo(() => format(draft, ISO_DATE), [draft]);

  function setClamped(next: Date) {
    setDraft(clampDate(next, minimumDate, maximumDate));
  }

  function shiftYear(delta: number) {
    setClamped(setYear(draft, draft.getFullYear() + delta));
  }

  function shiftMonth(delta: number) {
    const next = setMonth(draft, draft.getMonth() + delta);
    const daysInMonth = getDaysInMonth(next);
    setClamped(setDate(next, Math.min(draft.getDate(), daysInMonth)));
  }

  function shiftDay(delta: number) {
    setClamped(setDate(draft, draft.getDate() + delta));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          {title}
        </AccessibleText>
        <AccessibleText style={[styles.preview, { color: colors.accent }]} accessibilityRole="text">
          {previewIso}
        </AccessibleText>

        <StepperRow
          label="Year"
          value={String(draft.getFullYear())}
          onDecrement={() => shiftYear(-1)}
          onIncrement={() => shiftYear(1)}
          decrementLabel="Previous year"
          incrementLabel="Next year"
        />
        <StepperRow
          label="Month"
          value={format(draft, 'MMMM')}
          onDecrement={() => shiftMonth(-1)}
          onIncrement={() => shiftMonth(1)}
          decrementLabel="Previous month"
          incrementLabel="Next month"
        />
        <StepperRow
          label="Day"
          value={String(draft.getDate())}
          onDecrement={() => shiftDay(-1)}
          onIncrement={() => shiftDay(1)}
          decrementLabel="Previous day"
          incrementLabel="Next day"
        />

        <Pressable
          onPress={() => onConfirm(draft)}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
        >
          <AccessibleText style={[styles.doneLabel, { color: colors.onPrimary }]}>Done</AccessibleText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  preview: {
    fontSize: typography.hero,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepperRow: {
    gap: spacing.sm,
  },
  stepperLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepperButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: {
    fontSize: typography.title,
    fontWeight: '600',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.body,
    fontWeight: '600',
  },
  doneButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  doneLabel: {
    fontSize: typography.body,
    fontWeight: '700',
  },
});
