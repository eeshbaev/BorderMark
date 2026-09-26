import { useWindowDimensions } from 'react-native';

import {
  computeResponsiveLayout,
  type ResponsiveLayoutMetrics,
} from '@/presentation/layout/responsiveLayout';

export function useResponsiveLayout(): ResponsiveLayoutMetrics {
  const { width, height } = useWindowDimensions();
  return computeResponsiveLayout(width, height);
}
