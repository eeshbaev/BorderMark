import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { getBackupRestoreService } from '@/infrastructure/services/serviceFactory';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { RestoreSummary } from '@/shared/types';

export default function BackupScreen() {
  const { colors } = useTheme();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const [password, setPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [lastSummary, setLastSummary] = useState<RestoreSummary | null>(null);

  async function createBackup() {
    if (password.length < 8) {
      Alert.alert('Password required', 'Use at least 8 characters for backup encryption.');
      return;
    }

    try {
      const path = await getBackupRestoreService().createBackup(password);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
      }
      Alert.alert('Backup created', 'Your encrypted .bm backup is ready to share or store.');
    } catch {
      Alert.alert(
        'Backup couldn’t be created',
        'Your existing BorderMark data is safe. Check that you have enough storage and try again.',
      );
    }
  }

  async function pickAndRestore(mode: 'merge' | 'replace') {
    if (restorePassword.length < 8) {
      Alert.alert('Password required', 'Enter the backup password to restore.');
      return;
    }

    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/octet-stream', '*/*'],
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]) {
      return;
    }

    try {
      const bytes = await getBackupRestoreService().readBackupFromPath(picked.assets[0].uri);
      const summary =
        mode === 'merge'
          ? await getBackupRestoreService().mergeRestore(bytes, restorePassword)
          : await getBackupRestoreService().replaceRestore(bytes, restorePassword);
      setLastSummary(summary);
      await refresh();
      Alert.alert(
        'Restore complete',
        `${summary.mode === 'merge' ? 'Merged' : 'Replaced'} successfully.\nInserted: ${summary.inserted}\nUpdated: ${summary.updated}\nAttachments restored: ${summary.attachmentsRestored}`,
      );
    } catch (error) {
      Alert.alert(
        'Restore failed',
        error instanceof Error
          ? `${error.message}\n\nYour existing BorderMark data was not modified.`
          : 'Your existing BorderMark data was not modified.',
      );
    }
  }

  return (
    <Screen title="Backup & Restore" subtitle="Encrypted .bm backups use Argon2id and AES-256-GCM.">
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>Create backup</AccessibleText>
        <AccessibleTextInput
          label="Backup password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Backup password"
          textContentType="password"
        />
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={createBackup}
          accessibilityRole="button"
          accessibilityLabel="Create encrypted backup"
        >
          <AccessibleText style={[styles.buttonText, { color: colors.onPrimary }]}>Create encrypted backup</AccessibleText>
        </Pressable>
      </View>

      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>Restore backup</AccessibleText>
        <AccessibleTextInput
          label="Restore password"
          value={restorePassword}
          onChangeText={setRestorePassword}
          secureTextEntry
          placeholder="Backup password"
          textContentType="password"
        />
        <AccessibleText style={[styles.help, { color: colors.textSecondary }]}>
          Merge keeps current records unless the backup copy is newer. Replace swaps the entire dataset after creating
          a safety snapshot.
        </AccessibleText>
        <Pressable
          style={[styles.secondary, { borderColor: colors.border }]}
          onPress={() => pickAndRestore('merge')}
          accessibilityRole="button"
          accessibilityLabel="Merge backup"
        >
          <AccessibleText style={[styles.secondaryText, { color: colors.text }]}>Merge backup</AccessibleText>
        </Pressable>
        <Pressable
          style={[styles.secondary, { borderColor: colors.border }]}
          onPress={() => pickAndRestore('replace')}
          accessibilityRole="button"
          accessibilityLabel="Replace with backup"
        >
          <AccessibleText style={[styles.secondaryText, { color: colors.text }]}>Replace with backup</AccessibleText>
        </Pressable>
      </View>

      {lastSummary ? (
        <View
          style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="summary"
          accessibilityLabel={`Last restore: ${lastSummary.mode}. Inserted ${lastSummary.inserted}. Updated ${lastSummary.updated}.`}
        >
          <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>Last restore summary</AccessibleText>
          <AccessibleText style={{ color: colors.text }}>
            Mode: {lastSummary.mode}
            {'\n'}
            Inserted: {lastSummary.inserted}
            {'\n'}
            Updated: {lastSummary.updated}
            {'\n'}
            Kept: {lastSummary.kept}
            {'\n'}
            Attachments restored: {lastSummary.attachmentsRestored}
          </AccessibleText>
          {lastSummary.warnings.map((warning) => (
            <AccessibleText key={warning} style={{ color: colors.warning, marginTop: spacing.sm }}>
              {warning}
            </AccessibleText>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  help: { fontSize: typography.body, lineHeight: 22 },
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: typography.title, fontWeight: '600' },
  secondary: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryText: { fontSize: typography.title, fontWeight: '600' },
});
