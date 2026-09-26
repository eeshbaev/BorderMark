import { Screen } from '@/presentation/components/Screen';
import { SettingsMenu } from '@/presentation/components/settings/SettingsMenu';

export default function SettingsScreen() {
  return (
    <Screen title="Settings" scroll>
      <SettingsMenu />
    </Screen>
  );
}
