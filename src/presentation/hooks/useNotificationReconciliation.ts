import { useEffect, useRef } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';

import { reconcileNotifications } from '@/presentation/store/appStore';

export function useNotificationReconciliation(enabled: boolean): void {
  const reconcilingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function runReconciliation(): Promise<void> {
      if (reconcilingRef.current) {
        return;
      }
      reconcilingRef.current = true;
      try {
        await reconcileNotifications();
      } finally {
        reconcilingRef.current = false;
      }
    }

    const startupTask = InteractionManager.runAfterInteractions(() => {
      void runReconciliation();
    });

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        InteractionManager.runAfterInteractions(() => {
          void runReconciliation();
        });
      }
    });

    return () => {
      startupTask.cancel();
      subscription.remove();
    };
  }, [enabled]);
}
