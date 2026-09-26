import * as Location from 'expo-location';

import { countryCodeFromCoordinates } from '@/data/dataset/countries';

export interface LocationResolution {
  countryCode: string | null;
  message?: string;
}

const LOCATION_TIMEOUT_MS = 15_000;

async function readDevicePosition(): Promise<Location.LocationObject> {
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return current;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function resolveCountryFromDevice(): Promise<LocationResolution> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return {
        countryCode: null,
        message: 'Location permission was not granted. Choose your country manually.',
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        countryCode: null,
        message: 'Location services are turned off on this device. Enable them in system settings, or choose your country manually.',
      };
    }

    let position: Location.LocationObject | null = null;
    try {
      position = await withTimeout(
        readDevicePosition(),
        LOCATION_TIMEOUT_MS,
        'Location timed out. Choose your country manually.',
      );
    } catch {
      position = await Location.getLastKnownPositionAsync();
    }

    if (!position) {
      return {
        countryCode: null,
        message: 'BorderMark could not get a location fix. Choose your country manually.',
      };
    }

    const countryCode = countryCodeFromCoordinates(position.coords.latitude, position.coords.longitude);
    if (!countryCode) {
      return {
        countryCode: null,
        message: 'BorderMark could not determine your country from this location. Choose your country manually.',
      };
    }

    return { countryCode };
  } catch {
    return {
      countryCode: null,
      message: 'Location could not be read. Choose your country manually.',
    };
  }
}
