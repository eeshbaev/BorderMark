import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { countryFlag } from '@/data/dataset/countries';
import type { JourneyInsightItem, JourneyInsights } from '@/domain/services/journeyInsightsService';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface JourneyInsightsProps {
  insights: JourneyInsights;
}

export function JourneyInsightsSection({ insights }: JourneyInsightsProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const hasContent =
    insights.yourFirsts.length > 0 || insights.longestStay != null || insights.mostRevisited != null;

  if (!hasContent) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AccessibleText style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        Journey insights
      </AccessibleText>

      {insights.yourFirsts.length > 0 ? (
        <InsightGroup title="Your firsts" colors={colors}>
          {insights.yourFirsts.map((item) => (
            <InsightRow key={item.label} item={item} colors={colors} onPress={() => router.push(`/country/${item.countryCode}`)} />
          ))}
        </InsightGroup>
      ) : null}

      {insights.longestStay ? (
        <InsightGroup title="Your longest" colors={colors}>
          <InsightRow
            item={insights.longestStay}
            colors={colors}
            onPress={() => router.push(`/country/${insights.longestStay!.countryCode}`)}
          />
        </InsightGroup>
      ) : null}

      {insights.mostRevisited ? (
        <InsightGroup title="Your most revisited" colors={colors}>
          <InsightRow
            item={insights.mostRevisited}
            colors={colors}
            onPress={() => router.push(`/country/${insights.mostRevisited!.countryCode}`)}
          />
        </InsightGroup>
      ) : null}
    </View>
  );
}

function InsightGroup({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.group}>
      <AccessibleText style={[styles.groupTitle, { color: colors.textSecondary }]}>{title}</AccessibleText>
      {children}
    </View>
  );
}

function InsightRow({
  item,
  colors,
  onPress,
}: {
  item: JourneyInsightItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${item.countryName}, ${item.detail}`}
      style={styles.row}
    >
      <AccessibleText style={[styles.rowLabel, { color: colors.textSecondary }]}>{item.label}</AccessibleText>
      <View style={styles.rowValue}>
        <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
          {countryFlag(item.countryCode)}
        </AccessibleText>
        <AccessibleText style={[styles.countryName, { color: colors.text }]}>
          {item.countryName} · {item.detail}
        </AccessibleText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.section,
    fontWeight: '700',
  },
  group: { gap: spacing.sm },
  groupTitle: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: { gap: 4, minHeight: 44, justifyContent: 'center' },
  rowLabel: { fontSize: typography.caption, lineHeight: 18 },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { fontSize: 18 },
  countryName: { fontSize: typography.body, fontWeight: '600', lineHeight: 22, flex: 1 },
});
