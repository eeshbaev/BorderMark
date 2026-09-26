import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import {
  settingsMenuSections,
  type SettingsMenuSection,
} from '@/presentation/components/settings/settingsMenuSections';
import { useTheme } from '@/presentation/hooks/useTheme';
import { cardShadow, spacing, typography } from '@/presentation/theme';

interface SettingsMenuProps {
  sections?: SettingsMenuSection[];
}

export function SettingsMenu({ sections = settingsMenuSections }: SettingsMenuProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AccessibleText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
            accessibilityRole="header"
          >
            {section.title}
          </AccessibleText>
          <View style={[styles.group, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.row,
                  index < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <AccessibleText style={[styles.rowLabel, { color: colors.text }]}>{item.label}</AccessibleText>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} accessibilityElementsHidden />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: typography.title },
});
