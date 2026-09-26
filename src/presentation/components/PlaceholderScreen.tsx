import { Text } from 'react-native';

import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';

export default function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <Screen title={title}>
      <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{body}</Text>
    </Screen>
  );
}
