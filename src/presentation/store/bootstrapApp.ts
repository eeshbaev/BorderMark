import { getDatabase, reopenDatabase } from '@/data/database/client';
import { getBackupRestoreService } from '@/infrastructure/services/serviceFactory';

import { useBorderMarkStore } from '@/presentation/store/appStore';

function isNativeDatabaseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('NativeDatabase') ||
    message.includes('NullPointerException') ||
    message.includes('prepareAsync') ||
    message.includes('execAsync')
  );
}

export async function initializeApp(): Promise<void> {
  const recovery = await getBackupRestoreService().recoverInterruptedRestore();

  if (recovery?.databaseFileReplaced) {
    await reopenDatabase(false);
  } else {
    await getDatabase();
  }

  try {
    await useBorderMarkStore.getState().refresh();
  } catch (error) {
    if (!isNativeDatabaseError(error)) {
      throw error;
    }
    await reopenDatabase(false);
    await useBorderMarkStore.getState().refresh();
  }
}
