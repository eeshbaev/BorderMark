import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getCountryName } from '@/data/dataset/countries';
import { deleteRule, setRuleEnabled } from '@/data/repositories/contentRepository';
import { listStays } from '@/data/repositories/stayRepository';
import { isBuiltInRule, isCustomRule, isPresetBasedRule, ruleCatalogDescription } from '@/domain/services/ruleCatalog';
import { Screen, ScreenAction } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { Stay } from '@/shared/types';

export default function RuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const ruleResults = useBorderMarkStore((state) => state.ruleResults);
  const refresh = useBorderMarkStore((state) => state.refresh);
  const match = ruleResults.find(({ rule }) => rule.id === id);
  const [stays, setStays] = useState<Stay[]>([]);

  useEffect(() => {
    listStays().then(setStays);
  }, []);

  if (!match) {
    return (
      <Screen title="Rule">
        <Text style={{ color: colors.textSecondary }}>Rule not found.</Text>
      </Screen>
    );
  }

  const { rule, result } = match;
  const description = ruleCatalogDescription(rule);
  const applicableStays = stays.filter((stay) => result.applicableStays.includes(stay.id));

  async function onTrackingChange(enabled: boolean) {
    await setRuleEnabled(rule.id, enabled);
    await refresh();
  }

  function confirmDelete() {
    Alert.alert('Delete rule?', `Remove "${rule.name}" permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteRule(rule.id);
            await refresh();
            router.replace('/rules');
          })();
        },
      },
    ]);
  }

  return (
    <Screen
      title={rule.name}
      subtitle={description ?? 'Custom rolling day limit.'}
      action={
        isCustomRule(rule) && !isPresetBasedRule(rule) ? (
          <ScreenAction label="Edit" onPress={() => router.push(`/rules/edit/${rule.id}`)} />
        ) : undefined
      }
    >
      <View style={[styles.trackingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.trackingText}>
          <Text style={[styles.trackingTitle, { color: colors.text }]}>Track on Profile & radar</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {rule.enabled ? 'Active' : 'Off — find this rule under Library on the rules dashboard'}
          </Text>
        </View>
        <Switch
          value={rule.enabled}
          onValueChange={(value) => {
            void onTrackingChange(value);
          }}
          accessibilityLabel="Toggle rule tracking"
        />
      </View>

      {rule.enabled ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.answer, { color: colors.text }]}>
            {result.state === 'UNAVAILABLE' ? 'Unavailable' : `${result.daysUsed ?? 0} days used`}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {result.daysRemaining ?? 0} days remaining
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Based on your recorded stays.</Text>
        </View>
      ) : null}

      {result.disclaimer ? (
        <Text style={[styles.disclaimer, { color: colors.warning }]}>{result.disclaimer}</Text>
      ) : null}

      {isBuiltInRule(rule) ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Built-in templates cannot be deleted. Turn tracking off to hide them from Profile.
        </Text>
      ) : null}

      {rule.enabled ? (
        <>
          <Text style={[styles.section, { color: colors.textSecondary }]}>How this was calculated</Text>
          {result.windowStart && result.windowEnd ? (
            <Text style={[styles.meta, { color: colors.text }]}>
              Window: {result.windowStart} — {result.windowEnd}
            </Text>
          ) : null}

          {applicableStays.map((stay) => (
            <View key={stay.id} style={[styles.row, { borderColor: colors.border }]}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{getCountryName(stay.countryCode)}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {stay.arrivalDate ?? stay.approximatePeriod ?? 'Approximate'}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {isCustomRule(rule) ? (
        <Pressable onPress={confirmDelete} accessibilityRole="button" style={styles.deleteWrap}>
          <Text style={[styles.deleteText, { color: colors.urgent }]}>Delete custom rule</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trackingRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  trackingText: { flex: 1, gap: spacing.xs },
  trackingTitle: { fontSize: typography.body, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.xl, gap: spacing.sm },
  answer: { fontSize: 28, fontWeight: '700' },
  meta: { fontSize: typography.body, lineHeight: 22 },
  disclaimer: { fontSize: typography.body, lineHeight: 22, marginTop: spacing.md },
  note: { fontSize: typography.caption, lineHeight: 20, marginTop: spacing.md },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
  },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  rowTitle: { fontSize: typography.body, fontWeight: '600' },
  deleteWrap: { marginTop: spacing.xl, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: typography.body, fontWeight: '600' },
});
