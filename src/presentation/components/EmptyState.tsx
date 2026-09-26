import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHint?: string;
  children?: ReactNode;
}

export function EmptyState({ title, body, actionLabel, onAction, actionHint, children }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="text"
    >
      <AccessibleText style={[styles.title, { color: colors.text }]}>{title}</AccessibleText>
      <AccessibleText style={[styles.body, { color: colors.textSecondary }]}>{body}</AccessibleText>
      {children}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} accessibilityHint={actionHint} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: typography.title, fontWeight: '600' },
  body: { fontSize: typography.body, lineHeight: 22 },
});
