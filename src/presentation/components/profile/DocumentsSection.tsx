import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getAttachmentService, getDocumentService } from '@/infrastructure/services/serviceFactory';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { ResponsiveGrid } from '@/presentation/components/ResponsiveGrid';
import { DocumentTypeCard } from '@/presentation/components/profile/DocumentTypeCard';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import { PROFILE_DOCUMENT_TYPES } from '@/shared/profileDocumentTypes';
import type { Document, DocumentType } from '@/shared/types';

function pickCardPreviewDocument(items: Document[], previewByDocId: Record<string, string>): Document | null {
  if (items.length === 0) {
    return null;
  }
  return items.find((document) => previewByDocId[document.id]) ?? items[0];
}

export function DocumentsSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const documents = useBorderMarkStore((state) => state.documents);
  const [previewByDocId, setPreviewByDocId] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadPreviews() {
      if (documents.length === 0) {
        setPreviewByDocId({});
        return;
      }

      const attachmentService = getAttachmentService();
      const withAttachments = await getDocumentService().listWithAttachments();
      const next: Record<string, string> = {};

      for (const item of withAttachments) {
        const image = item.attachments.find((attachment) => attachment.mimeType.startsWith('image/'));
        if (image) {
          next[item.id] = attachmentService.resolveAbsolutePath(image);
        }
      }

      if (!cancelled) {
        setPreviewByDocId(next);
      }
    }

    void loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [documents]);

  const documentsByType = useMemo(() => {
    const grouped = new Map<DocumentType, Document[]>();
    for (const type of PROFILE_DOCUMENT_TYPES) {
      grouped.set(type, []);
    }
    for (const document of documents) {
      grouped.get(document.documentType)?.push(document);
    }
    return grouped;
  }, [documents]);

  function openAdd(type: DocumentType) {
    router.push({
      pathname: '/documents/add',
      params: { documentType: type },
    });
  }

  function openType(type: DocumentType, items: Document[]) {
    if (items.length === 0) {
      return;
    }
    if (items.length > 1 || type === 'visa') {
      router.push(`/documents/by-type/${type}`);
      return;
    }
    router.push(`/documents/${items[0].id}`);
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AccessibleText style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Documents
          </AccessibleText>
          <AccessibleText style={[styles.sectionBody, { color: colors.textSecondary }]}>
            Passport, visa, and permits — stored in Profile, not on country stays
          </AccessibleText>
        </View>
        <Pressable
          onPress={() => router.push('/documents')}
          accessibilityRole="button"
          accessibilityLabel="Open documents wallet"
          hitSlop={8}
        >
          <AccessibleText style={[styles.viewAll, { color: colors.accent }]}>View all</AccessibleText>
        </Pressable>
      </View>

      <ResponsiveGrid columns={2}>
        {PROFILE_DOCUMENT_TYPES.map((type) => {
          const items = documentsByType.get(type) ?? [];
          const previewDocument = pickCardPreviewDocument(items, previewByDocId);
          return (
            <DocumentTypeCard
              key={type}
              type={type}
              documents={items}
              previewUri={previewDocument ? (previewByDocId[previewDocument.id] ?? null) : null}
              onOpen={() => openType(type, items)}
              onAdd={() => openAdd(type)}
            />
          );
        })}
      </ResponsiveGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, width: '100%', alignSelf: 'stretch' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  sectionTitle: { fontSize: typography.title, fontWeight: '600' },
  sectionBody: { fontSize: typography.caption, lineHeight: 18 },
  viewAll: { fontSize: typography.caption, fontWeight: '600', paddingTop: 2 },
});
