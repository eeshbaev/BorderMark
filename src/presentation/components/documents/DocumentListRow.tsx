import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { countryFlag } from '@/data/dataset/countries';
import { formatExpiryLabel, getDocumentExpiryState } from '@/domain/services/documentService';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';
import type { Document, DocumentExpiryState } from '@/shared/types';

function expiryColor(state: DocumentExpiryState, colors: ReturnType<typeof useTheme>['colors']): string {
  if (state === 'urgent' || state === 'expired') {
    return colors.urgent;
  }
  if (state === 'approaching' || state === 'upcoming') {
    return colors.warning;
  }
  return colors.textSecondary;
}

interface DocumentListRowProps {
  document: Document;
  onPress: () => void;
}

export function DocumentListRow({ document, onPress }: DocumentListRowProps) {
  const { colors } = useTheme();
  const expiryState = getDocumentExpiryState(document.expiryDate);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${document.title}, ${formatExpiryLabel(document.expiryDate)}`}
    >
      <View style={{ flex: 1 }}>
        <AccessibleText style={[styles.title, { color: colors.text }]}>{document.title}</AccessibleText>
        <AccessibleText style={[styles.meta, { color: expiryColor(expiryState, colors) }]}>
          {formatExpiryLabel(document.expiryDate)}
        </AccessibleText>
      </View>
      {document.issuingCountry ? (
        <View style={styles.flagWrap} accessibilityElementsHidden importantForAccessibility="no">
          <AccessibleText style={styles.flag}>{countryFlag(document.issuingCountry)}</AccessibleText>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  title: { fontSize: typography.body, fontWeight: '600' },
  meta: { fontSize: typography.caption, marginTop: 2 },
  flagWrap: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: 32, lineHeight: 36 },
});
