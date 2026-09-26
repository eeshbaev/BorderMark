import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { createReminder } from '@/data/repositories/contentRepository';
import { todayIso } from '@/domain/utils/dates';
import { IsoDateField } from '@/presentation/components/IsoDateField';
import { Screen } from '@/presentation/components/Screen';
import { parseIsoDateInput } from '@/domain/utils/isoDateInput';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function AddReminderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const [title, setTitle] = useState('');
  const [triggerDate, setTriggerDate] = useState(todayIso());

  async function saveReminder() {
    const parsedTrigger = parseIsoDateInput(triggerDate) ?? triggerDate;
    await createReminder({
      title: title || 'Reminder',
      message: null,
      reminderType: 'one_time',
      triggerDate: parsedTrigger,
      annualMonth: null,
      annualDay: null,
      linkedDocumentId: null,
      enabled: true,
    });
    await refresh();
    router.back();
  }

  return (
    <Screen title="Add reminder">
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <IsoDateField label="Date" value={triggerDate} onChangeText={setTriggerDate} />
      </View>
      <Pressable style={[styles.save, { backgroundColor: colors.primary }]} onPress={saveReminder}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>Save reminder</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, fontSize: typography.body },
  save: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: typography.title, fontWeight: '600' },
});
