import { useRouter } from 'expo-router';

import { updateAppSettings } from '@/data/repositories/settingsRepository';
import { CountryPicker } from '@/presentation/components/CountryPicker';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useBorderMarkStore } from '@/presentation/store/appStore';

export default function DefaultCountryScreen() {
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const profile = useBorderMarkStore((state) => state.profile);
  const current = useBorderMarkStore((state) => state.settings?.defaultCountry);

  async function select(code: string) {
    await updateAppSettings({ defaultCountry: code });
    await refresh();
    router.back();
  }

  return (
    <Screen
      title="Form default country"
      subtitle="Prefills country fields when you add a stay or document. This is not your citizenship."
      scroll
    >
      <CountryPicker
        value={current ?? profile?.citizenships?.[0] ?? null}
        onChange={select}
        label="Default country"
        placeholder="Choose a default country"
      />
      <AccessibleText style={{ lineHeight: 22 }}>
        Manage your passport countries under Edit profile → Citizenship.
      </AccessibleText>
    </Screen>
  );
}
