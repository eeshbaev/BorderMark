import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { createCustomRule } from '@/data/repositories/contentRepository';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function AddRuleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const [name, setName] = useState('Country limit');
  const [countryCode, setCountryCode] = useState('TR');
  const [threshold, setThreshold] = useState('120');
  const [lookbackDays, setLookbackDays] = useState('365');

  async function saveRule() {
    await createCustomRule({
      name,
      applicableCountries: [countryCode.toUpperCase()],
      threshold: Number(threshold),
      lookbackDays: Number(lookbackDays),
    });
    await refresh();
    router.back();
  }

  return (
    <Screen
      title="Add rule"
      subtitle="Fully custom limit. For common country patterns, use the rules dashboard library."
    >
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Field label="Name" colors={colors}>
          <TextInput value={name} onChangeText={setName} style={inputStyle(colors)} />
        </Field>
        <Field label="Country code" colors={colors}>
          <TextInput value={countryCode} onChangeText={setCountryCode} style={inputStyle(colors)} autoCapitalize="characters" />
        </Field>
        <Field label="Maximum days" colors={colors}>
          <TextInput value={threshold} onChangeText={setThreshold} keyboardType="number-pad" style={inputStyle(colors)} />
        </Field>
        <Field label="Rolling window (days)" colors={colors}>
          <TextInput value={lookbackDays} onChangeText={setLookbackDays} keyboardType="number-pad" style={inputStyle(colors)} />
        </Field>
      </View>
      <Pressable style={[styles.save, { backgroundColor: colors.primary }]} onPress={saveRule}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>Save rule</Text>
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
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  save: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: typography.title, fontWeight: '600' },
});
