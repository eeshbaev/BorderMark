import * as Haptics from 'expo-haptics';

import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';

export function useHaptics() {
  const reduceMotion = useReducedMotion();

  async function success() {
    if (reduceMotion) {
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function light() {
    if (reduceMotion) {
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function error() {
    if (reduceMotion) {
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  return { success, light, error };
}
