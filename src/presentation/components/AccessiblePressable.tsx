import { Pressable, type PressableProps, StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';

interface AccessiblePressableProps extends PressableProps {
  accessibilityLabel: string;
  minHeight?: number;
}

export function AccessiblePressable({
  accessibilityLabel,
  accessibilityRole = 'button',
  minHeight = MIN_TOUCH_TARGET,
  style,
  children,
  ...props
}: AccessiblePressableProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={(state) => [
        styles.base,
        { minHeight, opacity: state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
  },
});
