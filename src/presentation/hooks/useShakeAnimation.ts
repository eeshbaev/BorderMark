import { useCallback, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';

import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';

export function useShakeAnimation(): {
  shake: () => void;
  animatedStyle: Animated.WithAnimatedObject<ViewStyle>;
} {
  const translateX = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  const shake = useCallback(() => {
    if (reduceMotion) {
      return;
    }
    translateX.setValue(0);
    Animated.sequence([
      Animated.timing(translateX, { toValue: 12, duration: 45, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -12, duration: 45, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [reduceMotion, translateX]);

  return {
    shake,
    animatedStyle: { transform: [{ translateX }] },
  };
}
