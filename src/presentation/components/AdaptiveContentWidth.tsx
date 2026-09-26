import { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { useResponsiveLayout } from '@/presentation/hooks/useResponsiveLayout';

interface AdaptiveContentWidthProps {
  children: ReactNode;
  style?: ViewStyle;
  /** When true, grows to fill parent height (non-scroll screens). */
  fill?: boolean;
}

/** Centers content and caps width on tablets / landscape / wide phones. */
export function AdaptiveContentWidth({ children, style, fill = false }: AdaptiveContentWidthProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { contentMaxWidth, horizontalPadding } = useResponsiveLayout();

  return (
    <View
      style={[
        styles.outer,
        fill && styles.fill,
        { width: windowWidth, paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      <View style={[styles.inner, fill && styles.fill, { maxWidth: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignSelf: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  fill: { flex: 1 },
});
