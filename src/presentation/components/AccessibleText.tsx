import { Text, type TextProps } from 'react-native';

import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';

export function AccessibleText({ maxFontSizeMultiplier, style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SIZE_MULTIPLIER}
      style={[{ flexShrink: 1 }, style]}
    />
  );
}
