import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { MilestonesSection } from '@/presentation/components/milestones/MilestonesSection';
import { MyLifeSection } from '@/presentation/components/profile/MyLifeSection';
import { ProfileEssentialsGroup } from '@/presentation/components/profile/ProfileEssentialsGroup';
import { OnThisDaySection } from '@/presentation/components/profile/OnThisDaySection';
import { ProfileHeaderCard } from '@/presentation/components/ProfileHeaderCard';
import { Screen } from '@/presentation/components/Screen';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll showHeader={false} showBack={false}>
      <View style={styles.topBar}>
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          Profile
        </Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityHint="Backup, privacy, notifications, and preferences"
          style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ProfileHeaderCard />
      <ProfileEssentialsGroup />
      <MyLifeSection />
      <OnThisDaySection />
      <MilestonesSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { fontSize: typography.hero, fontWeight: '600', flex: 1, flexShrink: 1 },
  settingsButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
