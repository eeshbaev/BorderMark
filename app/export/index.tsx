import { useRouter } from 'expo-router';

import { EmptyState } from '@/presentation/components/EmptyState';
import { Screen } from '@/presentation/components/Screen';

export default function ExportScreen() {
  const router = useRouter();

  return (
    <Screen title="Export" subtitle="Readable exports are coming soon.">
      <EmptyState
        title="Use encrypted backup today"
        body="BorderMark V1 supports encrypted backup and restore from Profile → Backup & Restore. CSV and PDF summaries will arrive in a future update."
        actionLabel="Open Backup & Restore"
        onAction={() => router.push('/backup')}
        actionHint="Opens backup and restore settings"
      />
    </Screen>
  );
}
