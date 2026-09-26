import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/presentation/components/EmptyState';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen, ScreenAction } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';

export default function RemindersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const reminders = useBorderMarkStore((state) => state.reminders);

  return (
    <Screen
      title="Reminders"
      subtitle="Important dates you choose to remember."
      action={<ScreenAction label="Add" onPress={() => router.push('/reminders/add')} accessibilityHint="Add a reminder" />}
    >
      {reminders.length === 0 ? (
        <EmptyState
          title="No reminders yet"
          body="Add reminders for renewals, appointments, or anything you want BorderMark to surface on your radar."
          actionLabel="Add reminder"
          onAction={() => router.push('/reminders/add')}
        />
      ) : (
        reminders.map((reminder) => (
          <View
            key={reminder.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="text"
          >
            <AccessibleText style={[styles.title, { color: colors.text }]}>{reminder.title}</AccessibleText>
            <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>{reminder.triggerDate}</AccessibleText>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 14 },
});
