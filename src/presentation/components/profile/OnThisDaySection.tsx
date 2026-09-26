import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { countryFlag, getAllCountries } from '@/data/dataset/countries';
import {
  buildOnThisDaySummary,
  formatYearsAgoLabel,
  formatYearsAgoRangeLabel,
} from '@/domain/services/onThisDayService';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, spacing, typography } from '@/presentation/theme';

export function OnThisDaySection() {
  const { colors } = useTheme();
  const router = useRouter();
  const stays = useBorderMarkStore((state) => state.stays);
  const memories = useBorderMarkStore((state) => state.memoryRecords);
  const notes = useBorderMarkStore((state) => state.notes);
  const today = useBorderMarkStore((state) => state.today);

  const summary = useMemo(
    () =>
      buildOnThisDaySummary({
        stays,
        memories,
        notes,
        countryNames: new Map(getAllCountries().map((country) => [country.code, country.name])),
        today,
      }),
    [stays, memories, notes, today],
  );

  return (
    <View style={styles.section}>
      <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
        On this day
      </AccessibleText>

      <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.todayLabel, { color: colors.textSecondary }]}>Today</AccessibleText>
        <AccessibleText style={[styles.todayDate, { color: colors.text }]}>{summary.todayLabel}</AccessibleText>

        {summary.moments.length === 0 ? (
          <AccessibleText style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Your past will surface here on anniversaries like today — stays, memories, and notes from years gone by.
          </AccessibleText>
        ) : (
          summary.moments.map((moment, index) => (
            <Pressable
              key={`${moment.yearsAgo}-${moment.historicalDate}`}
              onPress={() => {
                if (moment.stayId) {
                  router.push(`/stay/${moment.stayId}`);
                  return;
                }
                if (moment.countryCode) {
                  router.push(`/country/${moment.countryCode}`);
                }
              }}
              accessibilityRole={moment.stayId || moment.countryCode ? 'button' : 'text'}
              accessibilityLabel={`${formatYearsAgoLabel(moment.yearsAgo)}${
                moment.countryName ? `, ${moment.countryName}` : ''
              }${moment.notePreview ? `, note ${moment.notePreview}` : ''}`}
              style={[
                styles.moment,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            >
              {moment.variant === 'there' || moment.yearsAgoEnd != null ? (
                <AccessibleText style={[styles.yearsAgo, { color: colors.accent }]}>
                  {moment.yearsAgoEnd != null
                    ? formatYearsAgoRangeLabel(moment.yearsAgo, moment.yearsAgoEnd)
                    : formatYearsAgoLabel(moment.yearsAgo)}
                </AccessibleText>
              ) : null}

              {moment.countryCode && moment.countryName && moment.variant !== 'lived' ? (
                <View style={styles.countryRow}>
                  <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                    {countryFlag(moment.countryCode)}
                  </AccessibleText>
                  <AccessibleText style={[styles.countryName, { color: colors.text }]}>
                    {moment.countryName}
                  </AccessibleText>
                </View>
              ) : null}

              {moment.variant === 'lived' && moment.countryCode ? (
                <View style={styles.countryRow}>
                  <AccessibleText style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                    {countryFlag(moment.countryCode)}
                  </AccessibleText>
                  <AccessibleText style={[styles.headline, { color: colors.text, flex: 1 }]}>
                    {moment.headline}
                  </AccessibleText>
                </View>
              ) : (
                <AccessibleText style={[styles.headline, { color: colors.text }]}>{moment.headline}</AccessibleText>
              )}

              {moment.memoryCount > 0 ? (
                <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
                  📷 {moment.memoryCount} {moment.memoryCount === 1 ? 'memory' : 'memories'}
                </AccessibleText>
              ) : null}

              {moment.notePreview ? (
                <AccessibleText style={[styles.notePreview, { color: colors.textSecondary }]}>
                  📝 &ldquo;{moment.notePreview}&rdquo;
                </AccessibleText>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { fontSize: typography.section, fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  todayLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  todayDate: { fontSize: typography.title, fontWeight: '700' },
  emptyBody: { fontSize: typography.body, lineHeight: 22 },
  moment: { gap: spacing.sm, paddingTop: spacing.md },
  yearsAgo: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { fontSize: 22 },
  countryName: { fontSize: typography.title, fontWeight: '700' },
  headline: { fontSize: typography.body, lineHeight: 22 },
  meta: { fontSize: typography.body, lineHeight: 22 },
  notePreview: { fontSize: typography.body, lineHeight: 22, fontStyle: 'italic' },
});
