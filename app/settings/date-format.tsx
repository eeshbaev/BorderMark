import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { updateAppSettings } from '@/data/repositories/settingsRepository';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import type { DateFormatPreference } from '@/shared/types';

const options: DateFormatPreference[] = ['DMY', 'MDY', 'YMD'];

export default function DateFormatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const current = useBorderMarkStore((state) => state.settings?.dateFormat ?? 'DMY');

  async function select(mode: DateFormatPreference) {
    await updateAppSettings({ dateFormat: mode });
    await refresh();
    router.back();
  }

  return (
    <Screen title="Date format">
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
