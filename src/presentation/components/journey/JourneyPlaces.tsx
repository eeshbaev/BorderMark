import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { countryFlag } from '@/data/dataset/countries';
import { buildCountryBiographies } from '@/domain/services/journeyService';
import { EmptyState } from '@/presentation/components/EmptyState';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import { getAllCountries } from '@/data/dataset/countries';

export function JourneyPlaces() {
  const { colors } = useTheme();
  const router = useRouter();
  const stays = useBorderMarkStore((state) => state.stays);
  const placeVisits = useBorderMarkStore((state) => state.placeVisits);
  const memoryRecords = useBorderMarkStore((state) => state.memoryRecords);
  const notes = useBorderMarkStore((state) => state.notes);
  const today = useBorderMarkStore((state) => state.today);

  const biographies = useMemo(
    () =>
      buildCountryBiographies({
        stays,
        placeVisits,
        memories: memoryRecords,
        notes,
        countries: getAllCountries(),
        today,
      }),
    [stays, placeVisits, memoryRecords, notes, today],
  );

  if (biographies.length === 0) {
    return (
      <EmptyState
        title="Places become your biography"
        body="Each country you record can hold chapters — cities lived in, visits remembered, notes and photos attached."
        actionLabel="Add stay"
        onAction={() => router.push('/stay/add')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AccessibleText style={[styles.intro, { color: colors.textSecondary }]}>
        Countries that became part of your life — not just pins on a map.
      </AccessibleText>

      {biographies.map((country) => (
        <Pressable
          key={country.countryCode}
          onPress={() => router.push(`/country/${country.countryCode}`)}
          accessibilityRole="button"
          accessibilityLabel={`${country.countryName}, ${country.chapters.length} chapters`}
          style={[styles.countryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.countryHeader}>
            <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
              {countryFlag(country.countryCode)}
            </AccessibleText>
            <View style={styles.countryHeaderText}>
              <AccessibleText style={[styles.countryName, { color: colors.text }]}>{country.countryName}</AccessibleText>
              <AccessibleText style={[styles.countryMeta, { color: colors.textSecondary }]}>
                Your history here
                {country.periodLabel ? ` · ${country.periodLabel}` : ''}
              </AccessibleText>
            </View>
            {country.isCurrentCountry ? (
              <AccessibleText style={[styles.currentBadge, { color: colors.accent }]}>Current</AccessibleText>
            ) : null}
          </View>

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <AccessibleText style={[styles.stat, { color: colors.textSecondary }]}>
              {country.recordedDaysLabel}
            </AccessibleText>
            {country.memoryCount > 0 ? (
              <AccessibleText style={[styles.stat, { color: colors.textSecondary }]}>📷 {country.memoryCount}</AccessibleText>
            ) : null}
            {country.noteCount > 0 ? (
              <AccessibleText style={[styles.stat, { color: colors.textSecondary }]}>📝 {country.noteCount}</AccessibleText>
            ) : null}
          </View>

          <View style={styles.chapters}>
            {country.chapters.slice(0, 3).map((chapter) => (
              <View key={chapter.stay.id} style={[styles.chapterRow, { borderTopColor: colors.border }]}>
                {chapter.stayTypeLabel ? (
                  <AccessibleText style={[styles.chapterType, { color: colors.text }]}>{chapter.stayTypeLabel}</AccessibleText>
                ) : null}
                {chapter.cityLabel ? (
                  <AccessibleText style={[styles.chapterCity, { color: colors.text, fontWeight: '600' }]}>
                    {chapter.cityLabel}
                  </AccessibleText>
                ) : null}
                <AccessibleText style={[styles.chapterDates, { color: colors.textSecondary }]}>
                  {chapter.dateLabel}
                  {chapter.durationLabel ? ` · ${chapter.durationLabel}` : ''}
                </AccessibleText>
                {(chapter.memoryCount > 0 || chapter.noteCount > 0) ? (
                  <AccessibleText style={[styles.chapterMeta, { color: colors.muted }]}>
                    {chapter.memoryCount > 0 ? `${chapter.memoryCount} photos` : ''}
                    {chapter.memoryCount > 0 && chapter.noteCount > 0 ? ' · ' : ''}
                    {chapter.noteCount > 0 ? `${chapter.noteCount} notes` : ''}
                  </AccessibleText>
                ) : null}
              </View>
            ))}
            {country.chapters.length > 3 ? (
              <AccessibleText style={[styles.moreChapters, { color: colors.accent }]}>
                +{country.chapters.length - 3} more chapters
              </AccessibleText>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  intro: { fontSize: typography.body, lineHeight: 22 },
  countryCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  flag: { fontSize: 28 },
  countryHeaderText: { flex: 1, gap: 4 },
  countryName: { fontSize: typography.section, fontWeight: '700' },
  countryMeta: { fontSize: typography.caption, lineHeight: 18 },
  currentBadge: { fontSize: typography.caption, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  stat: { fontSize: typography.caption, lineHeight: 18 },
  chapters: { gap: 0 },
  chapterRow: {
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chapterType: { fontSize: typography.caption, lineHeight: 18 },
  chapterCity: { fontSize: typography.title, lineHeight: 24 },
  chapterDates: { fontSize: typography.caption, lineHeight: 18 },
  chapterMeta: { fontSize: typography.caption, lineHeight: 18 },
  moreChapters: { fontSize: typography.caption, fontWeight: '600', padding: spacing.lg, paddingTop: spacing.sm },
});
