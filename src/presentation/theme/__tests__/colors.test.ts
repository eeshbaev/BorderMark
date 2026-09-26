import { brandColors, darkColors, getThemeColors, lightColors } from '@/presentation/theme';

describe('theme colors', () => {
  it('defines brand core colors', () => {
    expect(brandColors.navy).toBe('#0F1B2D');
    expect(brandColors.teal).toBe('#3E7C78');
    expect(brandColors.cream).toBe('#F7F5F2');
  });

  it('maps light theme from brand tokens', () => {
    expect(lightColors.background).toBe(brandColors.cream);
    expect(lightColors.primary).toBe(brandColors.navy);
    expect(lightColors.accent).toBe(brandColors.teal);
  });

  it('returns light and dark palettes', () => {
    expect(getThemeColors('light').background).toBe(brandColors.cream);
    expect(getThemeColors('dark').background).toBe('#0B1220');
    expect(getThemeColors('dark').accent).toBe('#5EA8A3');
  });

  it('includes semantic on-color tokens', () => {
    expect(lightColors.onPrimary).toBe('#FFFFFF');
    expect(darkColors.onPrimary).toBe(brandColors.navy);
    expect(lightColors.overlay).toContain('rgba');
    expect(darkColors.overlay).toContain('rgba');
  });
});
