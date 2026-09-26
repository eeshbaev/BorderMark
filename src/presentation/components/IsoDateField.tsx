import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ISO_DATE, isValidIsoDate, parseIsoDate } from '@/domain/utils/dates';
import {
  formatIsoDateInput,
  normalizeIsoDateInput,
  parseIsoDateInput,
} from '@/domain/utils/isoDateInput';
import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { RequiredFieldLabel } from '@/presentation/components/RequiredFieldLabel';
import { IsoDatePickerSheet } from '@/presentation/components/IsoDatePickerSheet';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

type IsoDateFieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType' | 'onBlur'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  errorMessage?: string | null;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
  onBlur?: TextInputProps['onBlur'];
};

function resolvePickerDate(value: string, maximumDate?: Date, minimumDate?: Date): Date {
  const parsed = parseIsoDateInput(value);
  if (parsed) {
    return parseIsoDate(parsed);
  }
  if (maximumDate) {
    return maximumDate;
  }
  if (minimumDate) {
    return minimumDate;
  }
  return new Date();
}

export function IsoDateField({
  label,
  value,
  onChangeText,
  errorMessage,
  required = false,
  minimumDate,
  maximumDate,
  containerStyle,
  style,
  onBlur,
  ...rest
}: IsoDateFieldProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => resolvePickerDate(value, maximumDate, minimumDate));

  function openPicker() {
    setPickerDate(resolvePickerDate(value, maximumDate, minimumDate));
    setShowPicker(true);
  }

  function handleBlur(event: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) {
    onChangeText(normalizeIsoDateInput(value));
    onBlur?.(event);
  }

  const normalizedForDisplay = isValidIsoDate(value.trim()) ? value.trim() : formatIsoDateInput(value);

  return (
    <View style={[styles.container, containerStyle]}>
      {required ? (
        <RequiredFieldLabel title={label} />
      ) : (
        <AccessibleText style={[styles.label, { color: colors.textSecondary }]} accessibilityRole="text">
          {label}
        </AccessibleText>
      )}
      <View style={styles.row}>
        <AccessibleTextInput
          {...rest}
          showLabel={false}
          label={label}
          value={normalizedForDisplay}
          onChangeText={(raw) => onChangeText(formatIsoDateInput(raw))}
          onBlur={handleBlur}
          placeholder="YYYY-MM-DD"
          keyboardType="number-pad"
          maxLength={10}
          autoCorrect={false}
          errorMessage={errorMessage}
          style={[styles.input, style]}
        />
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`Open calendar for ${label}`}
          style={[
            styles.calendarButton,
            {
              borderColor: errorMessage ? colors.urgent : colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.accent} accessibilityElementsHidden />
        </Pressable>
      </View>

      <IsoDatePickerSheet
        visible={showPicker}
        title={label}
        date={pickerDate}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onDismiss={() => setShowPicker(false)}
        onConfirm={(date) => {
          onChangeText(format(date, ISO_DATE));
          setShowPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
  },
  calendarButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
});
