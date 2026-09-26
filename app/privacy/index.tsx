import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

const sections = [
  {
    title: 'On this device',
    items: [
      'Stays, documents, rules, reminders, and notes',
      'Your settings and preferences',
      'App lock PIN (stored in secure device storage)',
    ],
  },
  {
    title: 'What never leaves by default',
    items: [
      'No BorderMark account or cloud sync',
      'No analytics, crash reporting, or third-party trackers',
      'No automatic uploads of location or documents',
    ],
  },
  {
    title: 'When data can leave this device',
    items: [
      'Encrypted backup — only when you create and save a file yourself',
      'Share sheet — only when you explicitly share a backup file',
      'Location — only when you tap “Use current location” during onboarding or stay creation',
      'Notifications — scheduled locally on this device; not sent to BorderMark servers',
    ],
  },
  {
    title: 'Your controls',
    items: [
      'App Lock and biometrics in Profile → Privacy & Security',
      'Notification categories in Profile → Notifications',
      'Delete the app to remove local data from this device',
    ],
  },
] as const;

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <Screen title="Privacy" subtitle="Transparent by default. No hidden sync.">
      <AccessibleText style={[styles.lead, { color: colors.textSecondary }]}>
        BorderMark is built for private life records across borders. Your data belongs on your device unless you
        choose to move it.
      </AccessibleText>

      {sections.map((section) => (
        <View key={section.title} style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AccessibleText style={[styles.groupTitle, { color: colors.text }]} accessibilityRole="header">
            {section.title}
          </AccessibleText>
          {section.items.map((item) => (
            <AccessibleText key={item} style={[styles.item, { color: colors.textSecondary }]}>
              · {item}
            </AccessibleText>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: typography.body, lineHeight: 24 },
  group: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  groupTitle: { fontSize: typography.title, fontWeight: '600', marginBottom: spacing.xs },
  item: { fontSize: typography.body, lineHeight: 22 },
});
