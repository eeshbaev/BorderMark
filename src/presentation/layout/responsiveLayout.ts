import { spacing } from '@/presentation/theme';

export type DeviceSize = 'compact' | 'medium' | 'expanded' | 'wide';

export interface ResponsiveLayoutMetrics {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  deviceSize: DeviceSize;
  contentMaxWidth: number;
  horizontalPadding: number;
  gridColumns: number;
  gridGap: number;
  gridItemWidth: number;
  modalMaxWidth: number;
}

function deviceSizeFromShortEdge(shortest: number): DeviceSize {
  if (shortest < 600) {
    return 'compact';
  }
  if (shortest < 768) {
    return 'medium';
  }
  if (shortest < 1024) {
    return 'expanded';
  }
  return 'wide';
}

function gridColumnsForSize(size: DeviceSize): number {
  switch (size) {
    case 'compact':
      return 2;
    case 'medium':
      return 3;
    case 'expanded':
      return 4;
    default:
      return 5;
  }
}

function contentMaxWidthForSize(size: DeviceSize, width: number): number {
  switch (size) {
    case 'compact':
      return width;
    case 'medium':
      return 720;
    case 'expanded':
      return 960;
    case 'wide':
      return 1120;
  }
}

function horizontalPaddingForSize(size: DeviceSize): number {
  switch (size) {
    case 'compact':
      return spacing.xl;
    case 'medium':
      return spacing.xxl;
    default:
      return spacing.xxxl;
  }
}

/** Pure layout math — testable without React Native dimensions hooks. */
export function computeResponsiveLayout(width: number, height: number): ResponsiveLayoutMetrics {
  const shortest = Math.min(width, height);
  const deviceSize = deviceSizeFromShortEdge(shortest);
  const isLandscape = width > height;
  const isTablet = shortest >= 600;
  const contentMaxWidth = contentMaxWidthForSize(deviceSize, width);
  const horizontalPadding = horizontalPaddingForSize(deviceSize);
  const gridColumns = gridColumnsForSize(deviceSize);
  const gridGap = spacing.sm;
  const contentWidth = Math.min(width, contentMaxWidth);
  const gridItemWidth = Math.max(
    120,
    (contentWidth - horizontalPadding * 2 - gridGap * (gridColumns - 1)) / gridColumns,
  );
  const modalMaxWidth = Math.min(520, contentWidth - horizontalPadding * 2);

  return {
    width,
    height,
    isLandscape,
    isTablet,
    deviceSize,
    contentMaxWidth,
    horizontalPadding,
    gridColumns,
    gridGap,
    gridItemWidth,
    modalMaxWidth,
  };
}
