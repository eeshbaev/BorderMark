import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AttentionList } from '@/presentation/components/AttentionList';
import { CurrentStayCard } from '@/presentation/components/CurrentStayCard';
import { EmptyState } from '@/presentation/components/EmptyState';
import { NationalityHomeCard } from '@/presentation/components/NationalityHomeCard';
import { getPrimaryNationality, shouldShowCurrentTripCard } from '@/domain/services/nationalityHomeService';
import { Screen } from '@/presentation/components/Screen';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import { greetingForHour } from '@/domain/utils/dates';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useBorderMarkStore((state) => state.profile);
  const currentStay = useBorderMarkStore((state) => state.currentStay);
  const attentionItems = useBorderMarkStore((state) => state.attentionItems);
  const greeting = greetingForHour(new Date().getHours());
  const name = profile?.name ? `, ${profile.name}` : '';
  const hasAttention = attentionItems.length > 0;
  const selectedNationality = getPrimaryNationality(profile);
  const showTripCard = shouldShowCurrentTripCard(currentStay?.stay ?? null, profile, selectedNationality);

  return (
    <Screen scroll showBack={false} showHeader={false}>
      <View style={styles.topBar}>
        <Text
          style={[styles.greeting, { color: colors.text }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          {greeting}
          {name}
        </Text>
        <Pressable
          onPress={() => router.push('/attention')}
          accessibilityRole="button"
          accessibilityLabel={
            hasAttention
              ? `Open attention center, ${attentionItems.length} items`
              : 'Open attention center'
          }
          style={({ pressed }) => [styles.alertButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {hasAttention ? (
            <View style={[styles.badge, { backgroundColor: colors.urgent }]} accessibilityElementsHidden />
          ) : null}
        </Pressable>
      </View>

      <View style={styles.hero}>
        {profile?.citizenships.length ? <NationalityHomeCard profile={profile} currentStay={currentStay} /> : null}
        {showTripCard && currentStay ? <CurrentStayCard currentStay={currentStay} /> : null}
        {!currentStay && !profile?.citizenships.length ? (
          <EmptyState
            title="Record your current stay"
            body="BorderMark becomes useful within seconds once you record where you are now."
            actionLabel="Add stay"
            onAction={() => router.push('/stay/add')}
          />
        ) : null}
      </View>

      <View style={styles.section} accessibilityRole="summary">
        <Text
          style={[styles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          On your radar
        </Text>
        <AttentionList items={attentionItems.slice(0, 4)} />
      </View>
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
  greeting: { fontSize: typography.hero, fontWeight: '600', flex: 1, flexShrink: 1 },
  alertButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hero: { gap: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: typography.title, fontWeight: '600' },
});
