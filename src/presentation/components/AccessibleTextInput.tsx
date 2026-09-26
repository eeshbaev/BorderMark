import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface AccessibleTextInputProps extends TextInputProps {
  label: string;
  /** When false, label is omitted (parent renders it, e.g. IsoDateField). */
  showLabel?: boolean;
  errorMessage?: string | null;
}

export function AccessibleTextInput({
  label,
  showLabel = true,
  errorMessage,
  accessibilityLabel,
  style,
  ...props
}: AccessibleTextInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {showLabel ? (
        <AccessibleText
          style={[styles.label, { color: colors.textSecondary }]}
          accessibilityRole="text"
          nativeID={`${label}-label`}
        >
          {label}
        </AccessibleText>
      ) : null}
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={errorMessage ?? undefined}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        placeholderTextColor={colors.muted}
        style={[
          {
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            fontSize: typography.body,
            color: colors.text,
            borderColor: errorMessage ? colors.urgent : colors.border,
            minHeight: 44,
          },
          style,
        ]}
      />
      {errorMessage ? (
        <AccessibleText style={{ color: colors.urgent, fontSize: typography.caption }} accessibilityRole="alert">
          {errorMessage}
        </AccessibleText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
