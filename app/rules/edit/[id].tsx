import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { deleteRule, getRuleById, saveRule } from '@/data/repositories/contentRepository';
import { isCustomRule } from '@/domain/services/ruleCatalog';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function EditRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [threshold, setThreshold] = useState('');
  const [lookbackDays, setLookbackDays] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }
    void getRuleById(id).then((rule) => {
      if (!rule || !isCustomRule(rule)) {
        router.replace('/rules');
        return;
      }
      setName(rule.name);
      setCountryCode(rule.applicableCountries?.[0] ?? '');
      setThreshold(String(rule.threshold ?? ''));
      setLookbackDays(String(rule.lookbackDays ?? ''));
      setLoading(false);
    });
  }, [id, router]);

  async function saveChanges() {
    if (!id) {
      return;
    }
    const rule = await getRuleById(id);
    if (!rule || !isCustomRule(rule)) {
      return;
    }

    await saveRule({
      ...rule,
      name: name.trim() || rule.name,
      applicableCountries: [countryCode.trim().toUpperCase()],
      threshold: Number(threshold),
      lookbackDays: Number(lookbackDays),
    });
    await refresh();
    router.back();
  }

  function confirmDelete() {
    if (!id) {
      return;
    }
    Alert.alert('Delete rule?', 'This custom rule will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteRule(id);
            await refresh();
            router.replace('/rules');
          })();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Edit rule">
        <Text style={{ color: colors.textSecondary }}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Edit rule" subtitle="Custom country rolling limit.">
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Field label="Name" colors={colors}>
          <TextInput value={name} onChangeText={setName} style={inputStyle(colors)} />
        </Field>
        <Field label="Country code" colors={colors}>
          <TextInput
            value={countryCode}
            onChangeText={setCountryCode}
            style={inputStyle(colors)}
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Maximum days" colors={colors}>
          <TextInput value={threshold} onChangeText={setThreshold} keyboardType="number-pad" style={inputStyle(colors)} />
        </Field>
        <Field label="Rolling window (days)" colors={colors}>
          <TextInput value={lookbackDays} onChangeText={setLookbackDays} keyboardType="number-pad" style={inputStyle(colors)} />
        </Field>
      </View>
      <Pressable style={[styles.save, { backgroundColor: colors.primary }]} onPress={saveChanges}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>Save changes</Text>
      </Pressable>
      <Pressable onPress={confirmDelete} accessibilityRole="button" style={styles.deleteWrap}>
        <Text style={[styles.deleteText, { color: colors.urgent }]}>Delete rule</Text>
      </Pressable>
    </Screen>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: { textSecondary: string };
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(colors: { text: string; border: string }) {
  return {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    borderColor: colors.border,
  };
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.lg },
  label: { fontSize: typography.caption, fontWeight: '600', textTransform: 'uppercase' as const },
  save: { marginTop: spacing.lg, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: typography.body, fontWeight: '600' },
  deleteWrap: { marginTop: spacing.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: typography.body, fontWeight: '600' },
});
