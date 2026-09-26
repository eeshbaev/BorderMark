import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { countryFlag, getAllCountries } from '@/data/dataset/countries';
import { buildCountryBiographies } from '@/domain/services/journeyService';
import { formatExpiryLabel } from '@/domain/utils/documentExpiry';
import { Screen } from '@/presentation/components/Screen';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';

export default function CountryChapterScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const stays = useBorderMarkStore((state) => state.stays);
  const placeVisits = useBorderMarkStore((state) => state.placeVisits);
  const memoryRecords = useBorderMarkStore((state) => state.memoryRecords);
  const notes = useBorderMarkStore((state) => state.notes);
  const documents = useBorderMarkStore((state) => state.documents);
  const today = useBorderMarkStore((state) => state.today);

  if (!code) {
    return (
      <Screen title="Country">
        <AccessibleText style={{ color: colors.textSecondary }}>Country not found.</AccessibleText>
      </Screen>
    );
  }

  const biography = buildCountryBiographies({
    stays,
    placeVisits,
    memories: memoryRecords,
    notes,
    countries: getAllCountries(),
    today,
  }).find((entry) => entry.countryCode === code);

  const countryDocuments = documents
    .filter((document) => document.issuingCountry === code)
    .sort((a, b) => a.title.localeCompare(b.title));

  if (!biography) {
    return (
      <Screen title="Country">
        <AccessibleText style={{ color: colors.textSecondary }}>Country not found.</AccessibleText>
      </Screen>
    );
  }

  return (
    <Screen title="" subtitle="" showHeader={false}>
      <View style={styles.hero}>
        <AccessibleText style={styles.heroFlag} accessibilityLabel={`Flag of ${biography.countryName}`}>
          {countryFlag(biography.countryCode)}
        </AccessibleText>
        <AccessibleText style={[styles.heroTitle, { color: colors.text }]} accessibilityRole="header">
          {biography.countryName}
        </AccessibleText>
        <AccessibleText style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          Your history here
          {biography.periodLabel ? ` · ${biography.periodLabel}` : ''}
        </AccessibleText>
        {biography.isCurrentCountry ? (
          <AccessibleText style={[styles.currentLabel, { color: colors.accent }]}>You&apos;re here now</AccessibleText>
        ) : null}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.summaryLine, { color: colors.textSecondary }]}>
          {biography.recordedDaysLabel}
        </AccessibleText>
        <View style={styles.summaryMeta}>
          {biography.memoryCount > 0 ? (
            <AccessibleText style={[styles.summaryLine, { color: colors.textSecondary }]}>
              📷 {biography.memoryCount} {biography.memoryCount === 1 ? 'memory' : 'memories'}
            </AccessibleText>
          ) : null}
          {biography.noteCount > 0 ? (
            <AccessibleText style={[styles.summaryLine, { color: colors.textSecondary }]}>
              📝 {biography.noteCount} {biography.noteCount === 1 ? 'note' : 'notes'}
            </AccessibleText>
          ) : null}
        </View>
      </View>

      <Section title="Chapters" colors={colors}>
        {biography.chapters.map((chapter) => (
          <Pressable
            key={chapter.stay.id}
            onPress={() => router.push(`/stay/${chapter.stay.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${biography.countryName}, ${chapter.dateLabel}`}
            style={[styles.chapterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {chapter.stayTypeLabel ? (
              <AccessibleText style={[styles.chapterType, { color: colors.text }]}>{chapter.stayTypeLabel}</AccessibleText>
            ) : null}
            {chapter.cityLabel ? (
              <AccessibleText style={[styles.chapterCity, { color: colors.text }]}>{chapter.cityLabel}</AccessibleText>
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
            {chapter.isCurrent ? (
              <AccessibleText style={[styles.currentBadge, { color: colors.accent }]}>Current</AccessibleText>
            ) : null}
          </Pressable>
        ))}
      </Section>

      {countryDocuments.length > 0 ? (
        <Section title="Documents" colors={colors}>
          {countryDocuments.map((document) => (
            <Pressable
              key={document.id}
              onPress={() => router.push(`/documents/${document.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${document.title}${
                document.expiryDate ? `, ${formatExpiryLabel(document.expiryDate, today)}` : ''
              }`}
              style={[styles.listRow, { borderColor: colors.border }]}
            >
              <View style={styles.rowText}>
                <AccessibleText style={[styles.rowTitle, { color: colors.text }]}>{document.title}</AccessibleText>
                <AccessibleText style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {document.expiryDate
                    ? formatExpiryLabel(document.expiryDate, today)
                    : 'No expiry recorded'}
                </AccessibleText>
              </View>
            </Pressable>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.section}>
      <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
        {title}
      </AccessibleText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  heroFlag: { fontSize: 56 },
  heroTitle: { fontSize: typography.hero, fontWeight: '700', textAlign: 'center' },
  heroSubtitle: { fontSize: typography.body, textAlign: 'center', lineHeight: 22 },
  currentLabel: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  summaryLine: { fontSize: typography.body, lineHeight: 22 },
  summaryMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: typography.section, fontWeight: '600' },
  chapterCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  chapterType: { fontSize: typography.caption, lineHeight: 18 },
  chapterCity: { fontSize: typography.title, fontWeight: '700', lineHeight: 24 },
  chapterDates: { fontSize: typography.body, lineHeight: 22 },
  chapterMeta: { fontSize: typography.caption, lineHeight: 18 },
  currentBadge: { fontSize: typography.caption, fontWeight: '700', marginTop: spacing.xs },
  listRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  rowText: { gap: 4 },
  rowTitle: { fontSize: typography.title, fontWeight: '600' },
  rowMeta: { fontSize: typography.caption, lineHeight: 18 },
});
