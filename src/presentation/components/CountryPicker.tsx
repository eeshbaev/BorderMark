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
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';
import { useTheme } from '@/presentation/hooks/useTheme';
import { radii, spacing, typography } from '@/presentation/theme';
import type { CountryRecord } from '@/shared/types';

interface CountryPickerProps {
  value: string | null;
  onChange: (code: string) => void;
  label?: string;
  placeholder?: string;
}

export function CountryPicker({
  value,
  onChange,
  label = 'Country',
  placeholder = 'Choose your country',
}: CountryPickerProps) {
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

  function selectCountry(country: CountryRecord) {
    onChange(country.code);
    setOpen(false);
    setQuery('');
  }

  const selectedName = value ? getCountryName(value) : null;

  return (
    <>
      <View style={styles.field}>
        <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>{label}</AccessibleText>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={selectedName ? `Selected country: ${selectedName}. Change country` : placeholder}
          accessibilityHint="Opens country list"
          style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {value ? (
            <>
              <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                {countryFlag(value)}
              </AccessibleText>
              <AccessibleText style={[styles.triggerText, { color: colors.text }]}>{selectedName}</AccessibleText>
            </>
          ) : (
            <AccessibleText style={[styles.triggerText, { color: colors.muted }]}>{placeholder}</AccessibleText>
          )}
          <AccessibleText style={[styles.chevron, { color: colors.muted }]} accessibilityElementsHidden importantForAccessibility="no">
            ▾
          </AccessibleText>
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType={reduceMotion ? 'none' : 'slide'}
        transparent
        onRequestClose={() => setOpen(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalRoot}>
          <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} accessibilityLabel="Close country list" />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.sheetHeader}>
            <AccessibleText style={[styles.sheetTitle, { color: colors.text }]} accessibilityRole="header">
              Choose country
            </AccessibleText>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Close</AccessibleText>
            </Pressable>
          </View>

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
              const selected = item.code === value;
              return (
                <Pressable
                  onPress={() => selectCountry(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected }}
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
  flag: { fontSize: 24 },
  triggerText: { flex: 1, fontSize: typography.title, fontWeight: '500' },
  chevron: { fontSize: 18, lineHeight: 20 },
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
