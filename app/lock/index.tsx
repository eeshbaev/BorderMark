import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { updateAppSettings } from '@/data/repositories/settingsRepository';
import {
  authenticateWithBiometric,
  clearAppLockPin,
  isBiometricAvailable,
  setAppLockPin,
  verifyAppLockPin,
} from '@/infrastructure/providers/secureStorageProvider';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { Screen } from '@/presentation/components/Screen';
import { useHaptics } from '@/presentation/hooks/useHaptics';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function AppLockScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const settings = useBorderMarkStore((state) => state.settings);
  const [pin, setPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  async function enableLock() {
    if (pin.length < 4) {
      setMessage('Use at least 4 digits.');
      setSuccess(null);
      return;
    }
    await setAppLockPin(pin);
    await updateAppSettings({ appLockEnabled: true });
    await refresh();
    setMessage(null);
    setSuccess('App lock enabled. Your PIN is stored securely on this device.');
    await haptics.success();
  }

  async function disableLock() {
    const valid = await verifyAppLockPin(pin);
    if (!valid) {
      setMessage('Enter your current PIN to disable app lock.');
      setSuccess(null);
      return;
    }
    await clearAppLockPin();
    await updateAppSettings({ appLockEnabled: false, biometricEnabled: false });
    await refresh();
    setPin('');
    setMessage(null);
    setSuccess('App lock disabled.');
    await haptics.success();
  }

  async function testBiometric() {
    const ok = await authenticateWithBiometric();
    setSuccess(ok ? 'Biometric authentication succeeded.' : null);
    setMessage(ok ? null : 'Biometric failed. Try again or use PIN.');
    if (ok) {
      await haptics.success();
    }
  }

  const pinTooShort = pin.length > 0 && pin.length < 4;

  return (
    <Screen title="App Lock" subtitle="App lock and backup passwords are independent." keyboardAvoiding>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>PIN</AccessibleText>
        <AccessibleTextInput
          label="App lock PIN"
          value={pin}
          onChangeText={(value) => {
            setPin(value);
            if (message) {
              setMessage(null);
            }
          }}
          secureTextEntry
          keyboardType="number-pad"
          placeholder="Enter PIN"
          textContentType="password"
          errorMessage={pinTooShort ? 'Use at least 4 digits.' : undefined}
        />
        <AccessibleText style={[styles.help, { color: colors.textSecondary }]}>
          If you forget your PIN, BorderMark provides a controlled reset path. Backup recovery remains independent of
          app lock.
        </AccessibleText>
      </View>

      {message ? (
        <AccessibleText style={{ color: colors.urgent }} accessibilityLiveRegion="polite">
          {message}
        </AccessibleText>
      ) : null}
      {success ? (
        <AccessibleText style={{ color: colors.accent }} accessibilityLiveRegion="polite">
          {success}
        </AccessibleText>
      ) : null}

      <PrimaryButton
        label={settings?.appLockEnabled ? 'Update PIN' : 'Enable app lock'}
        onPress={enableLock}
        disabled={pin.length < 4}
        disabledReason={pin.length < 4 ? 'Enter at least 4 digits to enable app lock.' : undefined}
      />

      {settings?.appLockEnabled ? (
        <PrimaryButton
          label="Disable app lock"
          variant="secondary"
          onPress={disableLock}
          disabled={pin.length < 4}
          disabledReason={pin.length < 4 ? 'Enter your current PIN to disable app lock.' : undefined}
        />
      ) : null}

      {biometricAvailable ? (
        <PrimaryButton label="Test biometric unlock" variant="secondary" onPress={testBiometric} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  help: { fontSize: typography.body, lineHeight: 22 },
});
