import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { NoOpNotificationPort } from '@/infrastructure/notifications/noOpNotificationPort';
import type { NotificationPort } from '@/infrastructure/notifications/notificationPort';

let cachedPort: NotificationPort | null = null;

function isExpoGoClient(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  );
}

function shouldUseNoOpPort(): boolean {
  // SDK 53+ Expo Go on Android throws when expo-notifications is loaded.
  return Platform.OS === 'android' && isExpoGoClient();
}

export function createNotificationPort(): NotificationPort {
  if (cachedPort) {
    return cachedPort;
  }

  if (shouldUseNoOpPort()) {
    cachedPort = new NoOpNotificationPort();
    return cachedPort;
  }

  try {
    // Lazy require avoids crashing Expo Go at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExpoNotificationPort } = require('@/infrastructure/notifications/expoNotificationPort') as {
      ExpoNotificationPort: new () => NotificationPort;
    };
    cachedPort = new ExpoNotificationPort();
    return cachedPort;
  } catch (error) {
    console.warn('BorderMark notifications unavailable; using no-op port.', error);
    cachedPort = new NoOpNotificationPort();
    return cachedPort;
  }
}
