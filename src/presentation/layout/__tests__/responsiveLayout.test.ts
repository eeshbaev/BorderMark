import { computeResponsiveLayout } from '@/presentation/layout/responsiveLayout';

describe('computeResponsiveLayout', () => {
  it('uses two document columns on a typical phone', () => {
    const layout = computeResponsiveLayout(390, 844);
    expect(layout.deviceSize).toBe('compact');
    expect(layout.isTablet).toBe(false);
    expect(layout.gridColumns).toBe(2);
    expect(layout.contentMaxWidth).toBe(390);
  });

  it('expands grid and caps content width on tablet portrait', () => {
    const layout = computeResponsiveLayout(744, 1133);
    expect(layout.deviceSize).toBe('medium');
    expect(layout.isTablet).toBe(true);
    expect(layout.gridColumns).toBe(3);
    expect(layout.contentMaxWidth).toBe(720);
    expect(layout.gridItemWidth).toBeGreaterThan(180);
  });

  it('treats landscape phone by shortest edge', () => {
    const layout = computeResponsiveLayout(844, 390);
    expect(layout.isLandscape).toBe(true);
    expect(layout.deviceSize).toBe('compact');
    expect(layout.gridColumns).toBe(2);
  });

  it('uses wider grids on large tablets', () => {
    const layout = computeResponsiveLayout(900, 1200);
    expect(layout.deviceSize).toBe('expanded');
    expect(layout.gridColumns).toBe(4);
    expect(layout.contentMaxWidth).toBe(960);
  });
});
