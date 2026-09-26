import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { updateAppSettings } from '@/data/repositories/settingsRepository';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import type { AppearanceMode } from '@/shared/types';

const options: AppearanceMode[] = ['system', 'light', 'dark'];

export default function AppearanceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const current = useBorderMarkStore((state) => state.settings?.appearance ?? 'system');

  async function select(mode: AppearanceMode) {
    await updateAppSettings({ appearance: mode });
    await refresh();
    router.back();
  }

  return (
    <Screen title="Appearance">
      {options.map((option) => (
        <Pressable key={option} onPress={() => select(option)} style={{ paddingVertical: 14 }}>
          <Text style={{ color: colors.text, fontWeight: option === current ? '700' : '400' }}>
            {option}
          </Text>
        </Pressable>
      ))}
    </Screen>
  );
}
