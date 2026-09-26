import { useColorScheme } from 'react-native';

import { getThemeColors, type ThemeColors } from '@/presentation/theme';
import { useBorderMarkStore } from '@/presentation/store/appStore';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const systemScheme = useColorScheme();
  const appearance = useBorderMarkStore((state) => state.settings?.appearance ?? 'system');
  const resolved =
    appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;

  return {
    colors: getThemeColors(resolved),
    isDark: resolved === 'dark',
  };
}
