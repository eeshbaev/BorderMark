import { StyleSheet, type TextStyle } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { typography } from '@/presentation/theme';

interface RequiredFieldLabelProps {
  title: string;
  style?: TextStyle;
}

export function RequiredFieldLabel({ title, style }: RequiredFieldLabelProps) {
  const { colors } = useTheme();

  return (
    <AccessibleText style={[styles.label, { color: colors.textSecondary }, style]} accessibilityRole="text">
      {title} ·{' '}
      <AccessibleText style={[styles.required, { color: colors.urgent }]} importantForAccessibility="yes">
        Required
      </AccessibleText>
    </AccessibleText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
