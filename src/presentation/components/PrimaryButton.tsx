import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  disabledReason,
  loading = false,
  variant = 'primary',
  accessibilityHint,
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={(state) => [
          styles.button,
          isPrimary
            ? { backgroundColor: colors.primary, opacity: isDisabled ? 0.5 : 1 }
            : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, opacity: isDisabled ? 0.5 : 1 },
          state.pressed && !isDisabled ? { transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.accent} />
        ) : (
          <AccessibleText
            style={[
              styles.label,
              { color: isPrimary ? colors.onPrimary : colors.text },
            ]}
          >
            {label}
          </AccessibleText>
        )}
      </Pressable>
      {isDisabled && disabledReason ? (
        <AccessibleText style={[styles.helper, { color: colors.textSecondary }]} accessibilityLiveRegion="polite">
          {disabledReason}
        </AccessibleText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  button: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: typography.title, fontWeight: '600' },
  helper: { fontSize: typography.caption, lineHeight: 18 },
});
