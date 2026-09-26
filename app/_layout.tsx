import 'react-native-gesture-handler';

import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initializeApp } from '@/presentation/store/bootstrapApp';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { AppLockGate } from '@/presentation/components/AppLockGate';
import { AppLogo } from '@/presentation/components/AppLogo';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useNotificationReconciliation } from '@/presentation/hooks/useNotificationReconciliation';
export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const [bootstrapping, setBootstrapping] = useState(true);
  const settings = useBorderMarkStore((state) => state.settings);
  const initialized = useBorderMarkStore((state) => state.initialized);

  useNotificationReconciliation(Boolean(settings?.onboardingCompleted));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('BorderMark bootstrap failed', error);
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
          void SplashScreen.hideAsync();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bootstrapping || !initialized || !settings) {
      return;
    }

    const inOnboarding = pathname.startsWith('/onboarding') || segments[0] === 'onboarding';
    const destination = !settings.onboardingCompleted
      ? inOnboarding
        ? null
        : '/onboarding'
      : inOnboarding
        ? '/(tabs)'
        : null;

    if (!destination) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      router.replace(destination);
    });

    return () => cancelAnimationFrame(frame);
  }, [bootstrapping, initialized, pathname, router, segments, settings]);

  function handleRetry() {
    setBootstrapping(true);
    void initializeApp().finally(() => setBootstrapping(false));
  }

  if (bootstrapping) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 24 }}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading BorderMark"
      >
        <AppLogo size={80} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!initialized || !settings) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
          gap: 24,
          padding: 32,
        }}
      >
        <AppLogo size={80} />
        <AccessibleText
          style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}
          accessibilityRole="header"
        >
          BorderMark could not load your data
        </AccessibleText>
        <AccessibleText style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          Try again. If this keeps happening, restart Metro with a cleared cache.
        </AccessibleText>
        <Pressable
          onPress={handleRetry}
          style={{
            minHeight: 48,
            borderRadius: 12,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading BorderMark"
        >
          <AccessibleText style={{ color: colors.onPrimary, fontWeight: '600' }}>Retry</AccessibleText>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppLockGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </AppLockGate>
    </GestureHandlerRootView>
  );
}
