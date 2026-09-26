import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/presentation/hooks/useResponsiveLayout';
import { radii, spacing } from '@/presentation/theme';

interface AdaptiveBottomSheetShellProps {
  overlayColor: string;
  onDismiss: () => void;
  children: ReactNode;
}

/** Full-screen dimmed overlay with content anchored to the bottom edge (covers tab bar). */
export function AdaptiveBottomSheetShell({ overlayColor, onDismiss, children }: AdaptiveBottomSheetShellProps) {
  const insets = useSafeAreaInsets();
  const { modalMaxWidth, horizontalPadding, isTablet } = useResponsiveLayout();

  return (
    <View style={styles.root} accessibilityRole="none">
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View
        pointerEvents="box-none"
        style={[styles.sheetHost, isTablet ? { paddingHorizontal: horizontalPadding } : null]}
      >
        <View
          style={[
            styles.sheetFrame,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              maxWidth: isTablet ? modalMaxWidth : undefined,
            },
            isTablet ? { alignSelf: 'center', borderRadius: radii.sheet, overflow: 'hidden' } : null,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetHost: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  sheetFrame: {
    width: '100%',
  },
});
