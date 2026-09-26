import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { DOCUMENT_TYPE_LABELS } from '@/data/repositories/documentRepository';
import { DocumentListRow } from '@/presentation/components/documents/DocumentListRow';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import { PROFILE_DOCUMENT_TYPES } from '@/shared/profileDocumentTypes';
import type { DocumentType } from '@/shared/types';

function documentIcon(type: DocumentType): string {
  switch (type) {
    case 'passport':
      return '🛂';
    case 'drivers_license':
      return '🚗';
    case 'visa':
      return '🛃';
    case 'residence_permit':
      return '🏠';
    case 'insurance':
      return '🛡️';
    default:
      return '📄';
  }
}

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const documents = useBorderMarkStore((state) => state.documents);

  return (
    <Screen
      title="Documents"
      subtitle="Passport, visa, and permits — kept in Profile, separate from city stays."
    >
      {PROFILE_DOCUMENT_TYPES.map((type) => {
        const items = documents.filter((document) => document.documentType === type);
        return (
          <View key={type} style={styles.section}>
            <View style={styles.sectionHeader}>
              <AccessibleText style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
                {documentIcon(type)}
              </AccessibleText>
              <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                {DOCUMENT_TYPE_LABELS[type]}
              </AccessibleText>
            </View>

            {items.length > 0 ? (
              items.map((document) => (
                <DocumentListRow
                  key={document.id}
                  document={document}
                  onPress={() => router.push(`/documents/${document.id}`)}
                />
              ))
            ) : (
              <AccessibleText style={[styles.empty, { color: colors.textSecondary }]}>
                No {DOCUMENT_TYPE_LABELS[type].toLowerCase()} saved yet.
              </AccessibleText>
            )}

            <Pressable
              onPress={() => router.push({ pathname: '/documents/add', params: { documentType: type } })}
              accessibilityRole="button"
              accessibilityLabel={`Add ${DOCUMENT_TYPE_LABELS[type].toLowerCase()}`}
              style={[styles.addButton, { borderColor: colors.border }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} accessibilityElementsHidden />
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>
                Add {DOCUMENT_TYPE_LABELS[type].toLowerCase()}
              </AccessibleText>
            </Pressable>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 20 },
  sectionTitle: { fontSize: typography.title, fontWeight: '600' },
  empty: { fontSize: typography.caption, lineHeight: 18, paddingVertical: spacing.xs },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    marginTop: spacing.xs,
  },
});
