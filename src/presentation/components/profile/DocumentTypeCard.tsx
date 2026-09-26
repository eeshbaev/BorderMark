import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { countryFlag } from '@/data/dataset/countries';
import { DOCUMENT_TYPE_LABELS } from '@/data/repositories/documentRepository';
import { formatExpiryLabel, getDocumentExpiryState } from '@/domain/services/documentService';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';
import { formatDocumentTypeCountLabel } from '@/shared/profileDocumentTypes';
import type { Document, DocumentType } from '@/shared/types';

const TYPE_ICONS: Record<DocumentType, keyof typeof Ionicons.glyphMap> = {
  passport: 'id-card-outline',
  visa: 'document-text-outline',
  residence_permit: 'home-outline',
  drivers_license: 'car-outline',
  insurance: 'shield-outline',
  other: 'folder-outline',
};

function expiryColor(
  state: ReturnType<typeof getDocumentExpiryState>,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (state === 'urgent' || state === 'expired') {
    return colors.urgent;
  }
  if (state === 'approaching' || state === 'upcoming') {
    return colors.warning;
  }
  return colors.textSecondary;
}

function documentWithSoonestExpiry(documents: Document[]): Document {
  const withExpiry = documents.filter((document) => document.expiryDate);
  if (withExpiry.length === 0) {
    return documents[0];
  }
  return [...withExpiry].sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!))[0];
}

function activeVisaDocuments(documents: Document[]): Document[] {
  return documents.filter((document) => getDocumentExpiryState(document.expiryDate) !== 'expired');
}

function uniqueIssuingCountries(documents: Document[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const document of documents) {
    const code = document.issuingCountry?.toUpperCase();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

interface DocumentTypeCardProps {
  type: DocumentType;
  documents: Document[];
  previewUri: string | null;
  onOpen: () => void;
  onAdd: () => void;
}

export function DocumentTypeCard({ type, documents, previewUri, onOpen, onAdd }: DocumentTypeCardProps) {
  const { colors, isDark } = useTheme();
  const label = DOCUMENT_TYPE_LABELS[type];
  const displayDocuments = type === 'visa' ? activeVisaDocuments(documents) : documents;
  const documentCount = displayDocuments.length;
  const hasDocument = documentCount > 0;
  const isMulti = documentCount > 1;
  const primary = hasDocument ? documentWithSoonestExpiry(displayDocuments) : null;
  const expiryState = primary ? getDocumentExpiryState(primary.expiryDate) : null;
  const countryCodes = uniqueIssuingCountries(displayDocuments);
  const overlayColor = isDark ? 'rgba(11, 18, 32, 0.42)' : 'rgba(255, 255, 255, 0.52)';
  const footerColor = isDark ? 'rgba(11, 18, 32, 0.62)' : 'rgba(255, 255, 255, 0.78)';

  const archivedVisaCount = type === 'visa' ? documents.length - displayDocuments.length : 0;

  if (!hasDocument || !primary) {
    if (type === 'visa' && documents.length > 0) {
      return (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Visa, ${archivedVisaCount} archived`}
          style={({ pressed }) => [
            styles.card,
            styles.emptyCard,
            cardShadow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name={TYPE_ICONS.visa} size={18} color={colors.accent} accessibilityElementsHidden />
          </View>
          <AccessibleText style={[styles.emptyLabel, { color: colors.text }]} numberOfLines={1}>
            {label}
          </AccessibleText>
          <AccessibleText style={[styles.archiveHint, { color: colors.textSecondary }]}>
            {archivedVisaCount} archived
          </AccessibleText>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onAdd();
            }}
            accessibilityRole="button"
            accessibilityLabel="Add visa"
            style={[styles.addBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={16} color={colors.accent} accessibilityElementsHidden />
          </Pressable>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={`Add ${label.toLowerCase()}`}
        style={({ pressed }) => [
          styles.card,
          styles.emptyCard,
          cardShadow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name={TYPE_ICONS[type]} size={18} color={colors.accent} accessibilityElementsHidden />
        </View>
        <AccessibleText style={[styles.emptyLabel, { color: colors.text }]} numberOfLines={1}>
          {label}
        </AccessibleText>
        <View style={styles.emptyAddRow}>
          <Ionicons name="add" size={14} color={colors.accent} accessibilityElementsHidden />
          <AccessibleText style={[styles.emptyAddText, { color: colors.accent }]}>Add</AccessibleText>
        </View>
      </Pressable>
    );
  }

  const footerTitle =
    type === 'visa'
      ? isMulti
        ? formatDocumentTypeCountLabel(type, documentCount)
        : label
      : isMulti
        ? formatDocumentTypeCountLabel(type, documentCount)
        : primary.title;
  let footerMeta =
    type === 'visa' && isMulti
      ? `Next: ${formatExpiryLabel(primary.expiryDate)}`
      : formatExpiryLabel(primary.expiryDate);
  if (type === 'visa' && archivedVisaCount > 0) {
    footerMeta = `${footerMeta} · ${archivedVisaCount} archived`;
  }
  const showCenterFlags = countryCodes.length > 0 && (type === 'visa' || isMulti);
  const showFooterFlags = countryCodes.length > 0 && type !== 'visa';
  const accessibilitySummary = isMulti
    ? `${footerTitle}, ${countryCodes.length} countries, ${footerMeta}`
    : `${primary.title}, ${footerMeta}`;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={accessibilitySummary}
      accessibilityHint={isMulti ? 'Opens list of all saved documents of this type' : undefined}
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.94 : 1 }]}
    >
      {previewUri ? (
        <Image
          source={{ uri: previewUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accentMuted }]} />
      )}

      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />

      {!previewUri ? (
        <View style={styles.fallbackIcon}>
          {showCenterFlags ? (
            <View style={styles.centerFlags}>
              {countryCodes.slice(0, 4).map((code) => (
                <AccessibleText key={code} style={styles.centerFlag} accessibilityElementsHidden importantForAccessibility="no">
                  {countryFlag(code)}
                </AccessibleText>
              ))}
              {countryCodes.length > 4 ? (
                <AccessibleText style={[styles.centerFlagMore, { color: colors.textSecondary }]}>
                  +{countryCodes.length - 4}
                </AccessibleText>
              ) : null}
            </View>
          ) : (
            <Ionicons name={TYPE_ICONS[type]} size={28} color={colors.accent} accessibilityElementsHidden />
          )}
        </View>
      ) : null}

      <View style={[styles.footer, { backgroundColor: footerColor, borderColor: colors.border }]}>
        <View style={styles.footerText}>
          <AccessibleText style={[styles.footerTitle, { color: colors.text }]} numberOfLines={1}>
            {footerTitle}
          </AccessibleText>
          <AccessibleText
            style={[styles.footerMeta, { color: expiryColor(expiryState!, colors) }]}
            numberOfLines={1}
          >
            {footerMeta}
          </AccessibleText>
        </View>
        {showFooterFlags ? (
          <View style={styles.footerFlags}>
            {countryCodes.slice(0, isMulti ? 3 : 1).map((code) => (
              <AccessibleText key={code} style={styles.footerFlag} accessibilityElementsHidden importantForAccessibility="no">
                {countryFlag(code)}
              </AccessibleText>
            ))}
            {isMulti && countryCodes.length > 3 ? (
              <AccessibleText style={[styles.footerFlagMore, { color: colors.textSecondary }]}>
                +{countryCodes.length - 3}
              </AccessibleText>
            ) : null}
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Add another ${label.toLowerCase()}`}
        style={[styles.addBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
        hitSlop={8}
      >
        <Ionicons name="add" size={16} color={colors.accent} accessibilityElementsHidden />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 118,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyCard: {
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptyAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyAddText: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  archiveHint: {
    fontSize: typography.caption,
    lineHeight: 18,
  },
  fallbackIcon: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  centerFlag: { fontSize: 28 },
  centerFlagMore: { fontSize: typography.caption, fontWeight: '700' },
  footer: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: { flex: 1, gap: 1 },
  footerTitle: { fontSize: typography.caption, fontWeight: '700' },
  footerMeta: { fontSize: 11, lineHeight: 14 },
  footerFlags: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  footerFlag: { fontSize: 16 },
  footerFlagMore: { fontSize: 11, fontWeight: '700' },
  addBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
