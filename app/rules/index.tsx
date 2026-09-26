import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { activateRulePreset, deleteRule, setRuleEnabled } from '@/data/repositories/contentRepository';
import { isBuiltInRule, isCustomRule, isPresetBasedRule, ruleCatalogDescription } from '@/domain/services/ruleCatalog';
import { groupPresetsByRegion, listAvailableRulePresets } from '@/domain/services/rulePresetCatalog';
import { PresetLibraryCard } from '@/presentation/components/rules/PresetLibraryCard';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { EmptyState } from '@/presentation/components/EmptyState';
import { Screen, ScreenAction } from '@/presentation/components/Screen';
import { activeRuleResults, inactiveRuleResults } from '@/presentation/hooks/useRuleResults';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function RulesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const rules = useBorderMarkStore((state) => state.rules);
  const ruleResults = useBorderMarkStore((state) => state.ruleResults);
  const refresh = useBorderMarkStore((state) => state.refresh);

  const active = useMemo(() => activeRuleResults(ruleResults), [ruleResults]);
  const inactive = useMemo(() => inactiveRuleResults(ruleResults), [ruleResults]);
  const inactiveBuiltIns = useMemo(() => inactive.filter(({ rule }) => isBuiltInRule(rule)), [inactive]);
  const inactiveSaved = useMemo(
    () => inactive.filter(({ rule }) => isCustomRule(rule) && !isBuiltInRule(rule)),
    [inactive],
  );
  const presetGroups = useMemo(() => {
    const available = listAvailableRulePresets(rules);
    return groupPresetsByRegion(available);
  }, [rules]);

  async function toggleRule(id: string, enabled: boolean) {
    await setRuleEnabled(id, enabled);
    await refresh();
  }

  function confirmDeleteCustom(id: string, name: string) {
    Alert.alert('Delete rule?', `Remove "${name}" from BorderMark. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteRule(id);
            await refresh();
          })();
        },
      },
    ]);
  }

  return (
    <Screen
      title="Rules"
      subtitle="Common patterns are opt-in. Only active rules appear on Profile."
      action={
        <ScreenAction
          label="Add"
          onPress={() => router.push('/rules/add')}
          accessibilityHint="Add a custom tracking rule"
        />
      }
    >
      <SectionLabel colors={colors} title="Active tracking" />
      {active.length === 0 ? (
        <AccessibleText style={[styles.hint, { color: colors.textSecondary }]}>
          No rules are tracking yet. Activate a template below or add your own.
        </AccessibleText>
      ) : (
        active.map(({ rule, result }) => (
          <RuleCard
            key={rule.id}
            colors={colors}
            rule={rule}
            result={result}
            onOpen={() => router.push(`/rules/${rule.id}`)}
            onDeactivate={() => toggleRule(rule.id, false)}
            onEdit={
              isCustomRule(rule) && !isPresetBasedRule(rule)
                ? () => router.push(`/rules/edit/${rule.id}`)
                : undefined
            }
            onDelete={
              isCustomRule(rule) ? () => confirmDeleteCustom(rule.id, rule.name) : undefined
            }
          />
        ))
      )}

      <SectionLabel colors={colors} title="Built-in templates" />
      {inactiveBuiltIns.length === 0 ? (
        <AccessibleText style={[styles.hint, { color: colors.textSecondary }]}>
          Schengen and US templates are active or not installed yet.
        </AccessibleText>
      ) : (
        inactiveBuiltIns.map(({ rule, result }) => (
          <LibraryCard
            key={rule.id}
            colors={colors}
            rule={rule}
            description={ruleCatalogDescription(rule)}
            onActivate={() => toggleRule(rule.id, true)}
            onOpen={() => router.push(`/rules/${rule.id}`)}
            previewMeta={null}
          />
        ))
      )}

      <AccessibleText style={[styles.disclaimer, { color: colors.muted }]}>
        Patterns below are guides from your stays — not immigration or tax advice.
      </AccessibleText>

      {presetGroups.map((group) => (
        <View key={group.region}>
          <SectionLabel colors={colors} title={group.label} />
          {group.presets.map((preset) => (
            <PresetLibraryCard
              key={preset.key}
              preset={preset}
              colors={colors}
              onActivate={() => {
                void (async () => {
                  await activateRulePreset(preset.key);
                  await refresh();
                })();
              }}
            />
          ))}
        </View>
      ))}

      {inactiveSaved.length > 0 ? (
        <>
          <SectionLabel colors={colors} title="Your rules — off" />
          {inactiveSaved.map(({ rule, result }) => (
            <LibraryCard
              key={rule.id}
              colors={colors}
              rule={rule}
              description={ruleCatalogDescription(rule)}
              onActivate={() => toggleRule(rule.id, true)}
              onOpen={() => router.push(`/rules/${rule.id}`)}
              onEdit={!isPresetBasedRule(rule) ? () => router.push(`/rules/edit/${rule.id}`) : undefined}
              onDelete={() => confirmDeleteCustom(rule.id, rule.name)}
              previewMeta={`${result.daysUsed ?? 0} / ${result.threshold} days (preview)`}
            />
          ))}
        </>
      ) : null}

      {ruleResults.length === 0 ? (
        <EmptyState
          title="No rule templates yet"
          body="BorderMark is loading rule templates. Pull to refresh or restart the app."
          actionLabel="Add custom rule"
          onAction={() => router.push('/rules/add')}
        />
      ) : null}
    </Screen>
  );
}

function SectionLabel({ title, colors }: { title: string; colors: { textSecondary: string } }) {
  return (
    <AccessibleText style={[styles.section, { color: colors.textSecondary }]} accessibilityRole="header">
      {title}
    </AccessibleText>
  );
}

function RuleCard({
  colors,
  rule,
  result,
  onOpen,
  onDeactivate,
  onEdit,
  onDelete,
}: {
  colors: {
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    warning: string;
    accent: string;
    urgent: string;
  };
  rule: { id: string; name: string };
  result: {
    state: string;
    daysUsed: number | null;
    threshold: number;
    daysRemaining: number | null;
  };
  onOpen: () => void;
  onDeactivate: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" style={styles.cardMain}>
        <AccessibleText style={[styles.title, { color: colors.text }]}>{rule.name}</AccessibleText>
        {result.state === 'UNAVAILABLE' ? (
          <AccessibleText style={[styles.meta, { color: colors.warning }]}>Unavailable — resolve data conflicts</AccessibleText>
        ) : (
          <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
            {result.state === 'ESTIMATED' ? '~' : ''}
            {result.daysUsed ?? 0} / {result.threshold} days · {result.daysRemaining ?? 0} remaining
          </AccessibleText>
        )}
      </Pressable>
      <View style={styles.actions}>
        {onEdit ? (
          <ActionChip label="Edit" color={colors.accent} onPress={onEdit} />
        ) : null}
        <ActionChip label="Turn off" color={colors.textSecondary} onPress={onDeactivate} />
        {onDelete ? <ActionChip label="Delete" color={colors.urgent} onPress={onDelete} /> : null}
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Open rule details">
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function LibraryCard({
  colors,
  rule,
  description,
  onActivate,
  onOpen,
  onEdit,
  onDelete,
  previewMeta,
}: {
  colors: {
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    accent: string;
    urgent: string;
  };
  rule: { name: string };
  description: string | null;
  onActivate: () => void;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  previewMeta: string | null;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" style={styles.cardMain}>
        <AccessibleText style={[styles.title, { color: colors.text }]}>{rule.name}</AccessibleText>
        {description ? (
          <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>{description}</AccessibleText>
        ) : null}
        {previewMeta ? (
          <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>{previewMeta}</AccessibleText>
        ) : null}
      </Pressable>
      <View style={styles.actions}>
        <ActionChip label="Turn on" color={colors.accent} onPress={onActivate} />
        {onEdit ? <ActionChip label="Edit" color={colors.accent} onPress={onEdit} /> : null}
        {onDelete ? <ActionChip label="Delete" color={colors.urgent} onPress={onDelete} /> : null}
      </View>
    </View>
  );
}

function ActionChip({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, minHeight: 36, justifyContent: 'center' }]}
    >
      <AccessibleText style={{ color, fontSize: typography.caption, fontWeight: '600' }}>{label}</AccessibleText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  hint: { fontSize: typography.body, lineHeight: 22, marginBottom: spacing.md },
  disclaimer: { fontSize: typography.caption, lineHeight: 18, marginBottom: spacing.sm },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardMain: { gap: spacing.xs },
  title: { fontSize: typography.title, fontWeight: '600' },
  meta: { fontSize: typography.body, lineHeight: 22 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
