import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { countryFlag, getAllCountries, getCountryName } from '@/data/dataset/countries';
import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { RequiredFieldLabel } from '@/presentation/components/RequiredFieldLabel';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';
import { useTheme } from '@/presentation/hooks/useTheme';
import { radii, spacing, typography } from '@/presentation/theme';
import type { CountryRecord } from '@/shared/types';

interface CitizenshipPickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  label?: string;
  placeholder?: string;
  minCount?: number;
}

export function CitizenshipPicker({
  value,
  onChange,
  label = 'Nationality',
  placeholder = 'Add your nationality countries',
  minCount = 0,
}: CitizenshipPickerProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const countries = useMemo(() => getAllCountries(), []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return countries;
    }
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(normalized) || country.code.toLowerCase().includes(normalized),
    );
  }, [countries, query]);

  function toggleCountry(country: CountryRecord) {
    if (value.includes(country.code)) {
      removeCitizenship(country.code);
      return;
    }
    onChange([...value, country.code]);
  }

  function removeCitizenship(code: string) {
    if (value.length <= minCount) {
      return;
    }
    onChange(value.filter((item) => item !== code));
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? getCountryName(value[0]!)
        : `${value.length} citizenships selected`;

  return (
    <>
      <View style={styles.field}>
        {minCount > 0 ? (
          <RequiredFieldLabel title={label} style={styles.requiredLabel} />
        ) : (
          <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>{label}</AccessibleText>
        )}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            value.length > 0 ? `Citizenships: ${value.map(getCountryName).join(', ')}. Change citizenships` : placeholder
          }
          accessibilityHint="Opens citizenship list"
          style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {value.length > 0 ? (
            <View style={styles.selectedRow}>
              {value.slice(0, 3).map((code) => (
                <AccessibleText key={code} style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                  {countryFlag(code)}
                </AccessibleText>
              ))}
              <AccessibleText style={[styles.triggerText, { color: colors.text }]}>{summary}</AccessibleText>
            </View>
          ) : (
            <AccessibleText style={[styles.triggerText, { color: colors.muted }]}>{placeholder}</AccessibleText>
          )}
          <AccessibleText style={[styles.chevron, { color: colors.muted }]} accessibilityElementsHidden importantForAccessibility="no">
            ▾
          </AccessibleText>
        </Pressable>

        {value.length > 0 ? (
          <View style={styles.tagRow} accessibilityRole="list">
            {value.map((code) => {
              const canRemove = value.length > minCount;
              return (
                <View
                  key={code}
                  style={[styles.tag, { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}
                >
                  <AccessibleText style={styles.tagFlag} accessibilityElementsHidden importantForAccessibility="no">
                    {countryFlag(code)}
                  </AccessibleText>
                  <AccessibleText style={[styles.tagText, { color: colors.text }]}>{getCountryName(code)}</AccessibleText>
                  {canRemove ? (
                    <Pressable
                      onPress={() => removeCitizenship(code)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${getCountryName(code)} citizenship`}
                      hitSlop={8}
                      style={styles.removeTag}
                    >
                      <AccessibleText style={{ color: colors.accent, fontWeight: '700' }}>×</AccessibleText>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {value.length > 0 ? (
          <AccessibleText style={[styles.helper, { color: colors.textSecondary }]}>
            Tap × to remove a citizenship, or open the list to add another. BorderMark won&apos;t apply visa, residence,
            or default immigration rules to these countries unless you add a custom rule yourself.
          </AccessibleText>
        ) : null}
      </View>

      <Modal
        visible={open}
        animationType={reduceMotion ? 'none' : 'slide'}
        transparent
        onRequestClose={() => setOpen(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close citizenship list"
          />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <AccessibleText style={[styles.sheetTitle, { color: colors.text }]} accessibilityRole="header">
                Choose citizenship
              </AccessibleText>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Done"
                style={styles.closeButton}
              >
                <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Done</AccessibleText>
              </Pressable>
            </View>

            <AccessibleText style={{ color: colors.textSecondary, lineHeight: 22 }}>
              Select every passport you hold. Tap a selected country again to remove it.
            </AccessibleText>

            <AccessibleTextInput
              label="Search countries"
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or code"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              accessibilityRole="list"
              ListEmptyComponent={
                <AccessibleText style={[styles.empty, { color: colors.textSecondary }]}>No countries found.</AccessibleText>
              }
              renderItem={({ item }) => {
                const selected = value.includes(item.code);
                return (
                  <Pressable
                    onPress={() => toggleCountry(item)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={item.name}
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.row,
                      {
                        backgroundColor: selected ? colors.background : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <AccessibleText style={styles.rowFlag} accessibilityElementsHidden importantForAccessibility="no">
                      {countryFlag(item.code)}
                    </AccessibleText>
                    <AccessibleText
                      style={[styles.rowName, { color: colors.text, fontWeight: selected ? '700' : '400' }]}
                    >
                      {item.name}
                    </AccessibleText>
                    {selected ? (
                      <AccessibleText style={[styles.selectedMark, { color: colors.accent }]}>Selected</AccessibleText>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  requiredLabel: { letterSpacing: 0.8 },
  helper: { fontSize: typography.caption, lineHeight: 18 },
  trigger: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  flag: { fontSize: 22 },
  triggerText: { flex: 1, fontSize: typography.title, fontWeight: '500' },
  chevron: { fontSize: 18, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  tagFlag: { fontSize: 16 },
  tagText: { fontSize: typography.caption, fontWeight: '600' },
  removeTag: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: typography.section, fontWeight: '600' },
  closeButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.sm },
  list: { flexGrow: 0 },
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowFlag: { fontSize: 22, width: 32, textAlign: 'center' },
  rowName: { flex: 1, fontSize: typography.body },
  selectedMark: { fontSize: typography.caption, fontWeight: '600' },
  empty: { paddingVertical: spacing.xl, textAlign: 'center' },
});
