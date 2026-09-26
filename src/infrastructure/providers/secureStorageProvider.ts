import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'bordermark.app_lock.pin';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock BorderMark',
    cancelLabel: 'Use PIN',
  });
  return result.success;
}

export async function setAppLockPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function verifyAppLockPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored === pin;
}

export async function clearAppLockPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function hasAppLockPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored != null;
}
