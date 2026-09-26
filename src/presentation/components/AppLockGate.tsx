import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import {
  authenticateWithBiometric,
  isBiometricAvailable,
  verifyAppLockPin,
} from '@/infrastructure/providers/secureStorageProvider';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { AppLogo } from '@/presentation/components/AppLogo';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { useHaptics } from '@/presentation/hooks/useHaptics';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

interface AppLockGateProps {
  children: ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const settings = useBorderMarkStore((state) => state.settings);
  const lockEnabled = Boolean(settings?.appLockEnabled);
  const unlockedThisSession = useRef(false);
  const [unlocked, setUnlocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }
    if (!lockEnabled) {
      setUnlocked(true);
      return;
    }
    if (!unlockedThisSession.current) {
      setUnlocked(false);
    }
  }, [lockEnabled, settings]);

  useEffect(() => {
    if (!lockEnabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        unlockedThisSession.current = false;
        setUnlocked(false);
        setPin('');
        setError(null);
      }
    });

    return () => subscription.remove();
  }, [lockEnabled]);

  useEffect(() => {
    if (!lockEnabled || unlocked || !settings?.biometricEnabled || !biometricAvailable) {
      return;
    }

    void (async () => {
      const ok = await authenticateWithBiometric();
      if (ok) {
        unlockedThisSession.current = true;
        setUnlocked(true);
        await haptics.success();
      }
    })();
  }, [biometricAvailable, haptics, lockEnabled, settings?.biometricEnabled, unlocked]);

  async function unlockWithPin() {
    if (pin.length < 4) {
      setError('Enter at least 4 digits.');
      return;
    }
    const valid = await verifyAppLockPin(pin);
    if (!valid) {
      setError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }
    setError(null);
    setPin('');
    unlockedThisSession.current = true;
    setUnlocked(true);
    await haptics.success();
  }

  async function unlockWithBiometric() {
    setError(null);
    const ok = await authenticateWithBiometric();
    if (ok) {
      unlockedThisSession.current = true;
      setUnlocked(true);
      await haptics.success();
      return;
    }
    setError('Biometric unlock failed. Use your PIN.');
  }

  if (!lockEnabled || unlocked) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <AppLogo size={72} />
        <AccessibleText style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          BorderMark is locked
        </AccessibleText>
        <AccessibleText style={[styles.body, { color: colors.textSecondary }]}>
          Enter your PIN to continue.
        </AccessibleText>
        <AccessibleTextInput
          label="App lock PIN"
          value={pin}
          onChangeText={(value) => {
            setPin(value);
            if (error) {
              setError(null);
            }
          }}
          secureTextEntry
          keyboardType="number-pad"
          placeholder="Enter PIN"
          textContentType="password"
          errorMessage={error ?? undefined}
        />
        <PrimaryButton
          label="Unlock"
          onPress={unlockWithPin}
          disabled={pin.length < 4}
          disabledReason={pin.length < 4 ? 'Enter at least 4 digits to unlock.' : undefined}
        />
        {settings?.biometricEnabled && biometricAvailable ? (
          <Pressable
            onPress={unlockWithBiometric}
            accessibilityRole="button"
            accessibilityLabel="Unlock with biometrics"
            style={styles.biometric}
          >
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Use biometrics</AccessibleText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  content: { gap: spacing.lg },
  title: { fontSize: typography.section, fontWeight: '700' },
  body: { fontSize: typography.body, lineHeight: 22 },
  biometric: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
