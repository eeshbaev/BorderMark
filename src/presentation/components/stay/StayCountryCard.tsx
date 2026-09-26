import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { countryFlag } from '@/data/dataset/countries';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { CountryPicker } from '@/presentation/components/CountryPicker';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { radii, spacing, typography } from '@/presentation/theme';

interface StayCountryCardProps {
  countryCode: string;
  countryName: string;
  continent?: string;
  cities: string[];
  cityDraft: string;
  onCityDraftChange: (value: string) => void;
  onCityCommit: () => void;
  onCityRemove: (city: string) => void;
  previousCities?: string[];
  /** Show a compact country summary with an optional Change action. */
  countrySelectionMode?: 'summary' | 'picker';
  onCountryChange?: (code: string) => void;
  onChangeCountry?: () => void;
}

export function StayCountryCard({
  countryCode,
  countryName,
  continent,
  cities,
  cityDraft,
  onCityDraftChange,
  onCityCommit,
  onCityRemove,
  previousCities = [],
  countrySelectionMode = 'summary',
  onCountryChange,
  onChangeCountry,
}: StayCountryCardProps) {
  const { colors } = useTheme();
  const showPicker = countrySelectionMode === 'picker' && onCountryChange;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {showPicker ? (
        <View style={styles.pickerSection}>
          <CountryPicker
            value={countryCode || null}
            onChange={onCountryChange}
            label="Country"
            placeholder="Choose country"
          />
          {countryCode && continent ? (
            <AccessibleText style={[styles.continentHint, { color: colors.textSecondary }]}>{continent}</AccessibleText>
          ) : null}
        </View>
      ) : (
        <View style={styles.headerRow}>
          <Text style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
            {countryFlag(countryCode)}
          </Text>
          <View style={styles.headerText}>
            <AccessibleText style={[styles.countryName, { color: colors.text }]} accessibilityRole="text">
              {countryName}
            </AccessibleText>
            {continent ? <AccessibleText style={{ color: colors.textSecondary }}>{continent}</AccessibleText> : null}
          </View>
          {onChangeCountry ? (
            <Pressable
              onPress={onChangeCountry}
              accessibilityRole="button"
              accessibilityLabel="Change country"
              style={styles.changeButton}
            >
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Change</AccessibleText>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>Cities</AccessibleText>
      <AccessibleText style={{ color: colors.muted, fontSize: typography.caption, lineHeight: 18 }}>
        Add each city for this stay. The last city is treated as where you are now.
      </AccessibleText>
      {previousCities.length > 0 ? (
        <View style={styles.tagRow}>
          {previousCities.map((name) => (
            <View
              key={name}
              style={[styles.historyTag, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <AccessibleText style={[styles.historyTagText, { color: colors.textSecondary }]}>{name}</AccessibleText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.cityInputRow}>
        <TextInput
          value={cityDraft}
          onChangeText={onCityDraftChange}
          onSubmitEditing={onCityCommit}
          placeholder="Type your city"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          style={[
            styles.cityInput,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
          ]}
          accessibilityLabel="City"
        />
        <Pressable
          onPress={onCityCommit}
          accessibilityRole="button"
          accessibilityLabel="Add city"
          style={[styles.addCityButton, { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}
        >
          <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Add</AccessibleText>
        </Pressable>
      </View>

      {cities.length > 0 ? (
        <View style={styles.tagRow}>
          {cities.map((cityName, index) => {
            const isCurrent = index === cities.length - 1;
            return (
              <View
                key={`${cityName}-${index}`}
                style={[
                  isCurrent ? styles.currentTag : styles.historyTag,
                  {
                    backgroundColor: isCurrent ? colors.accentMuted : colors.background,
                    borderColor: isCurrent ? colors.accent : colors.border,
                  },
                ]}
              >
                <AccessibleText
                  style={[
                    isCurrent ? styles.currentTagText : styles.historyTagText,
                    { color: isCurrent ? colors.accent : colors.textSecondary },
                  ]}
                >
                  {cityName}
                </AccessibleText>
                <Pressable
                  onPress={() => onCityRemove(cityName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${cityName}`}
                  hitSlop={8}
                  style={styles.removeTag}
                >
                  <AccessibleText
                    style={{
                      color: isCurrent ? colors.accent : colors.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    ×
                  </AccessibleText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  pickerSection: { gap: spacing.xs },
  continentHint: { fontSize: typography.caption, lineHeight: 18, paddingLeft: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flag: { fontSize: 32 },
  headerText: { flex: 1, gap: spacing.xs },
  countryName: { fontSize: typography.title, fontWeight: '600' },
  changeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  historyTagText: { fontSize: typography.caption, fontWeight: '600' },
  cityInputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cityInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
  addCityButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  currentTagText: { fontSize: typography.body, fontWeight: '600' },
  removeTag: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
});
