import { Children, ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { useResponsiveLayout } from '@/presentation/hooks/useResponsiveLayout';

interface ResponsiveGridProps {
  children: ReactNode;
  /** Override column count (e.g. always 2 on Profile document preview). */
  columns?: number;
}

export function ResponsiveGrid({ children, columns }: ResponsiveGridProps) {
  const { gridGap, gridColumns } = useResponsiveLayout();
  const cols = Math.max(1, columns ?? gridColumns);
  const itemWidthPercent = `${100 / cols}%` as DimensionValue;

  return (
    <View style={[styles.grid, { marginHorizontal: -gridGap / 2 }]}>
      {Children.map(children, (child, index) => (
        <View
          key={index}
          style={{
            width: itemWidthPercent,
            paddingHorizontal: gridGap / 2,
            marginBottom: gridGap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
});
