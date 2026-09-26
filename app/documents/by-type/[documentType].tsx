import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DOCUMENT_TYPE_LABELS } from '@/data/repositories/documentRepository';
import { getDocumentExpiryState } from '@/domain/services/documentService';
import { DocumentListRow } from '@/presentation/components/documents/DocumentListRow';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { Screen } from '@/presentation/components/Screen';
import { MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import { isProfileDocumentType } from '@/shared/profileDocumentTypes';
import type { Document } from '@/shared/types';

type VisaFilter = 'active' | 'archive';

function compareActiveVisas(a: Document, b: Document): number {
  if (!a.expiryDate && !b.expiryDate) {
    return a.title.localeCompare(b.title);
  }
  if (!a.expiryDate) {
    return 1;
  }
  if (!b.expiryDate) {
    return -1;
  }
  return a.expiryDate.localeCompare(b.expiryDate);
}

function compareArchivedVisas(a: Document, b: Document): number {
  if (!a.expiryDate && !b.expiryDate) {
    return a.title.localeCompare(b.title);
  }
  if (!a.expiryDate) {
    return 1;
  }
  if (!b.expiryDate) {
    return -1;
  }
  return b.expiryDate.localeCompare(a.expiryDate);
}

function partitionVisas(items: Document[], today: string): { active: Document[]; archive: Document[] } {
  const active: Document[] = [];
  const archive: Document[] = [];
  for (const document of items) {
    if (getDocumentExpiryState(document.expiryDate, today) === 'expired') {
      archive.push(document);
    } else {
      active.push(document);
    }
  }
  active.sort(compareActiveVisas);
  archive.sort(compareArchivedVisas);
  return { active, archive };
}

export default function DocumentsByTypeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { documentType: rawType } = useLocalSearchParams<{ documentType: string }>();
  const documents = useBorderMarkStore((state) => state.documents);
  const today = useBorderMarkStore((state) => state.today);
  const [visaFilter, setVisaFilter] = useState<VisaFilter>('active');
  const documentType = rawType && isProfileDocumentType(rawType) ? rawType : null;
  const items = useMemo(
    () => (documentType ? documents.filter((document) => document.documentType === documentType) : []),
    [documentType, documents],
  );
  const visaGroups = useMemo(
    () => (documentType === 'visa' ? partitionVisas(items, today) : null),
    [documentType, items, today],
  );

  if (!documentType) {
    return (
      <Screen title="Documents">
        <AccessibleText style={{ color: colors.textSecondary }}>Unknown document type.</AccessibleText>
      </Screen>
    );
  }

  const label = DOCUMENT_TYPE_LABELS[documentType];
  const visibleVisas =
    documentType === 'visa' && visaGroups
      ? visaFilter === 'active'
        ? visaGroups.active
        : visaGroups.archive
      : items;

  return (
    <Screen
      title={label}
      subtitle={
        items.length > 0 ? `${items.length} saved in Profile` : `No ${label.toLowerCase()} saved yet.`
      }
    >
      {documentType === 'visa' && visaGroups ? (
        <>
          <VisaFilterToggle
            value={visaFilter}
            onChange={setVisaFilter}
            activeCount={visaGroups.active.length}
            archiveCount={visaGroups.archive.length}
            colors={colors}
          />
          {visibleVisas.length > 0 ? (
            <View style={styles.list}>
              {visibleVisas.map((document) => (
                <DocumentListRow
                  key={document.id}
                  document={document}
                  onPress={() => router.push(`/documents/${document.id}`)}
                />
              ))}
            </View>
          ) : (
            <AccessibleText style={[styles.sectionEmpty, { color: colors.textSecondary }]}>
              {visaFilter === 'active' ? 'No active visas.' : 'No archived visas.'}
            </AccessibleText>
          )}
        </>
      ) : (
        <View style={styles.list}>
          {items.map((document) => (
            <DocumentListRow
              key={document.id}
              document={document}
              onPress={() => router.push(`/documents/${document.id}`)}
            />
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/documents/add', params: { documentType } })}
        accessibilityRole="button"
        accessibilityLabel={`Add ${label.toLowerCase()}`}
        style={[styles.addButton, { borderColor: colors.border }]}
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.accent} accessibilityElementsHidden />
        <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>
          Add {label.toLowerCase()}
        </AccessibleText>
      </Pressable>
    </Screen>
  );
}

function VisaFilterToggle({
  value,
  onChange,
  activeCount,
  archiveCount,
  colors,
}: {
  value: VisaFilter;
  onChange: (value: VisaFilter) => void;
  activeCount: number;
  archiveCount: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View
      style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}
      accessibilityRole="tablist"
    >
      <FilterTab
        label="Active"
        count={activeCount}
        selected={value === 'active'}
        onPress={() => onChange('active')}
        colors={colors}
      />
      <FilterTab
        label="Archive"
        count={archiveCount}
        selected={value === 'archive'}
        onPress={() => onChange('archive')}
        colors={colors}
      />
    </View>
  );
}

function FilterTab({
  label,
  count,
  selected,
  onPress,
  colors,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${count} visas`}
      style={[
        styles.toggleButton,
        {
          backgroundColor: selected ? colors.surface : 'transparent',
          borderColor: selected ? colors.border : 'transparent',
        },
      ]}
    >
      <AccessibleText
        style={[
          styles.toggleLabel,
          { color: selected ? colors.text : colors.textSecondary, fontWeight: selected ? '700' : '600' },
        ]}
      >
        {label}
      </AccessibleText>
      <View style={[styles.countPill, { backgroundColor: selected ? colors.accentMuted : colors.border }]}>
        <AccessibleText
          style={[styles.countText, { color: selected ? colors.accent : colors.textSecondary }]}
        >
          {count}
        </AccessibleText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
  },
  toggleLabel: { fontSize: typography.body },
  countPill: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontSize: typography.caption, fontWeight: '700' },
  sectionEmpty: { fontSize: typography.body, lineHeight: 22, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    marginTop: spacing.md,
  },
});
