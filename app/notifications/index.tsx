import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { updateAppSettings } from '@/data/repositories/settingsRepository';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import {
  getNotificationService,
} from '@/infrastructure/services/serviceFactory';
import { reconcileNotifications } from '@/presentation/store/appStore';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { NotificationPermissionStatus, ReconciliationResult } from '@/shared/types';

function permissionLabel(status: NotificationPermissionStatus): string {
  switch (status) {
    case 'granted':
      return 'Allowed';
    case 'denied':
      return 'Blocked';
    default:
      return 'Not requested';
  }
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const settings = useBorderMarkStore((state) => state.settings);
  const refresh = useBorderMarkStore((state) => state.refresh);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');
  const [lastResult, setLastResult] = useState<ReconciliationResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }
    void (async () => {
      const status = await getNotificationService().getPermissionStatus();
      setPermissionStatus(status);
      const result = await reconcileNotifications();
      if (result) {
        setLastResult(result);
        setPermissionStatus(result.permissionStatus);
      }
    })();
  }, [settings]);

  async function togglePreference(
    key: 'documentExpiry' | 'ruleThresholds' | 'reminders' | 'stayMilestones' | 'stayReflection',
    value: boolean,
  ): Promise<void> {
    if (!settings) {
      return;
    }
    setBusy(true);
    try {
      await updateAppSettings({
        notificationPreferences: {
          ...settings.notificationPreferences,
          [key]: value,
        },
      });
      await refresh();
      const result = await reconcileNotifications();
      if (result) {
        setLastResult(result);
        setPermissionStatus(result.permissionStatus);
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestPermission(): Promise<void> {
    setBusy(true);
    try {
      const status = await getNotificationService().requestPermissions();
      setPermissionStatus(status);
      const result = await reconcileNotifications();
      if (result) {
        setLastResult(result);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return null;
  }

  const prefs = settings.notificationPreferences;

  return (
    <Screen
      title="Notifications"
      subtitle="Reminders and attention items are scheduled locally from your data — never stored as permanent delivery state."
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>System permission</AccessibleText>
        <AccessibleText style={[styles.value, { color: colors.text }]}>
          Notification permission: {permissionLabel(permissionStatus)}
        </AccessibleText>
        {permissionStatus !== 'granted' ? (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Allow notifications"
          >
            <AccessibleText style={[styles.buttonText, { color: colors.onPrimary }]}>Allow notifications</AccessibleText>
          </Pressable>
        ) : null}
        {permissionStatus === 'denied' ? (
          <Pressable
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open system settings"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <AccessibleText style={{ color: colors.accent, marginTop: spacing.sm }}>Open system settings</AccessibleText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
          What BorderMark may schedule
        </AccessibleText>
        <PreferenceRow
          label="Document expiry"
          description="90, 30, and 7 days before expiry"
          value={prefs.documentExpiry}
          disabled={busy}
          onValueChange={(value) => togglePreference('documentExpiry', value)}
          colors={colors}
        />
        <PreferenceRow
          label="Rule thresholds"
          description="Approaching Schengen, US SPT, and custom limits"
          value={prefs.ruleThresholds}
          disabled={busy}
          onValueChange={(value) => togglePreference('ruleThresholds', value)}
          colors={colors}
        />
        <PreferenceRow
          label="Your reminders"
          description="One-time and annual reminders you create"
          value={prefs.reminders}
          disabled={busy}
          onValueChange={(value) => togglePreference('reminders', value)}
          colors={colors}
        />
        <PreferenceRow
          label="Stay milestones"
          description="Every 10 days abroad while you are on a trip"
          value={prefs.stayMilestones}
          disabled={busy}
          onValueChange={(value) => togglePreference('stayMilestones', value)}
          colors={colors}
        />
        <PreferenceRow
          label="Stay reflection"
          description="A gentle prompt a couple of days after a stay ends"
          value={prefs.stayReflection}
          disabled={busy}
          onValueChange={(value) => togglePreference('stayReflection', value)}
          colors={colors}
        />
      </View>

      {lastResult ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Last reconciliation
          </AccessibleText>
          <AccessibleText style={{ color: colors.textSecondary }}>
            {lastResult.desiredCount} desired · {lastResult.scheduledCount} scheduled ·{' '}
            {lastResult.cancelledCount} cancelled · {lastResult.skippedCount} unchanged
          </AccessibleText>
          {lastResult.errors.length > 0 ? (
            <AccessibleText style={{ color: colors.warning, marginTop: spacing.sm }}>
              {lastResult.errors.join('\n')}
            </AccessibleText>
          ) : null}
        </View>
      ) : null}

      <AccessibleText style={[styles.footer, { color: colors.textSecondary }]}>
        BorderMark reconciles notifications on launch and when returning to the app. Delivery state is
        derived from your documents, rules, and reminders — not persisted as domain truth.
        {Platform.OS === 'android' ? ' Local notifications only; no cloud push.' : ''}
      </AccessibleText>
    </Screen>
  );
}

function PreferenceRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
  colors,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <AccessibleText style={[styles.rowLabel, { color: colors.text }]}>{label}</AccessibleText>
        <AccessibleText style={{ color: colors.textSecondary, fontSize: typography.caption }}>{description}</AccessibleText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={{ disabled, checked: value }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  value: { fontSize: typography.title, fontWeight: '600' },
  sectionTitle: { fontSize: typography.title, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: typography.body, fontWeight: '600' },
  button: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { fontSize: typography.body, fontWeight: '600' },
  footer: { fontSize: typography.caption, lineHeight: 20 },
});
