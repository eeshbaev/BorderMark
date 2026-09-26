import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { countryFlag } from '@/data/dataset/countries';
import { DOCUMENT_TYPE_LABELS } from '@/data/repositories/documentRepository';
import {
  formatExpiryLabel,
  getDocumentExpiryState,
} from '@/domain/services/documentService';
import { syncVisaDocumentDayCapRule } from '@/domain/services/visaStayService';
import { getAttachmentService, getDocumentService } from '@/infrastructure/services/serviceFactory';
import { expiryAccessibilityLabel } from '@/presentation/accessibility/labels';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { IsoDateField } from '@/presentation/components/IsoDateField';
import {
  parseIsoDateInput,
  validateDocumentIssueAndExpiryDates,
} from '@/domain/utils/isoDateInput';
import { Screen } from '@/presentation/components/Screen';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { Attachment, DocumentWithAttachments } from '@/shared/types';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const [document, setDocument] = useState<DocumentWithAttachments | null>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxStayDaysInput, setMaxStayDaysInput] = useState('');
  const [maxEntriesInput, setMaxEntriesInput] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      getDocumentService().getWithAttachments(id).then((result) => {
        if (result) {
          setDocument(result);
          setTitle(result.title);
          setIssueDate(result.issueDate ?? '');
          setExpiryDate(result.expiryDate ?? '');
          setMaxStayDaysInput(
            result.maxStayDays != null && result.maxStayDays > 0 ? String(result.maxStayDays) : '',
          );
          setMaxEntriesInput(
            result.maxEntries != null && result.maxEntries > 0 ? String(result.maxEntries) : '',
          );
          setNotes(result.notes ?? '');
        }
      });
    }
  }, [id]);

  if (!document) {
    return (
      <Screen title="Document">
        <AccessibleText style={{ color: colors.textSecondary }}>Loading…</AccessibleText>
      </Screen>
    );
  }

  function parseOptionalPositiveInt(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return Math.floor(parsed);
  }

  async function saveEdits() {
    if (!document) return;
    const datesError = validateDocumentIssueAndExpiryDates(issueDate, expiryDate);
    if (datesError) {
      Alert.alert('Invalid dates', datesError);
      return;
    }
    const isVisa = document.documentType === 'visa';
    const updated = await getDocumentService().update({
      ...document,
      title,
      issueDate: parseIsoDateInput(issueDate)!,
      expiryDate: parseIsoDateInput(expiryDate)!,
      maxStayDays: isVisa ? parseOptionalPositiveInt(maxStayDaysInput) : document.maxStayDays ?? null,
      maxEntries: isVisa ? parseOptionalPositiveInt(maxEntriesInput) : document.maxEntries ?? null,
      notes: notes || null,
    });
    if (isVisa) {
      await syncVisaDocumentDayCapRule(updated);
    }
    setDocument(updated);
    setEditing(false);
    await refresh();
  }

  async function attachFile() {
    if (!document) return;
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf'],
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    const asset = result.assets[0];
    const attachment = await getAttachmentService().importAttachment({
      sourceUri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      ownerType: 'document',
      ownerId: document.id,
    });
    setDocument({
      ...document,
      attachments: [attachment, ...document.attachments],
      expiryState: document.expiryState,
    });
    await refresh();
  }

  async function openAttachment(attachment: Attachment) {
    const service = getAttachmentService();
    const uri = service.resolveAbsolutePath(attachment);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: attachment.mimeType });
    }
  }

  async function removeAttachment(attachment: Attachment) {
    if (!document) return;
    await getAttachmentService().deleteAttachment(attachment.id);
    setDocument({
      ...document,
      attachments: document.attachments.filter((item) => item.id !== attachment.id),
      expiryState: document.expiryState,
    });
    await refresh();
  }

  function confirmDelete() {
    if (!document) return;
    Alert.alert(
      'Delete this document?',
      `${document.title}\n\nThis will also delete ${document.attachments.length} attachment(s).\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await getDocumentService().delete(document.id);
            await refresh();
            router.back();
          },
        },
      ],
    );
  }

  const expiryState = getDocumentExpiryState(document.expiryDate);
  const expiryText = formatExpiryLabel(document.expiryDate);
  const preview = document.attachments.find((attachment) => attachment.mimeType.startsWith('image/'));

  return (
    <Screen title={document.title}>
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="summary"
        accessibilityLabel={expiryAccessibilityLabel(document.title, expiryText)}
      >
        <AccessibleText style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
          🛂
        </AccessibleText>
        <AccessibleText style={[styles.type, { color: colors.textSecondary }]}>
          {DOCUMENT_TYPE_LABELS[document.documentType]}
        </AccessibleText>
        {document.issueDate ? (
          <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
            Issued: {document.issueDate}
          </AccessibleText>
        ) : null}
        <AccessibleText
          style={[styles.expiry, { color: expiryState === 'urgent' ? colors.urgent : colors.textSecondary }]}
        >
          Expires: {expiryText}
        </AccessibleText>
        {document.documentType === 'visa' && document.maxStayDays ? (
          <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
            Max stay: {document.maxStayDays} days (tracking rule)
          </AccessibleText>
        ) : null}
        {document.documentType === 'visa' && document.maxEntries ? (
          <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
            Entries: {document.maxEntries}
          </AccessibleText>
        ) : null}
        {document.issuingCountry ? (
          <AccessibleText style={[styles.meta, { color: colors.text }]}>
            {countryFlag(document.issuingCountry)} {document.issuingCountry}
          </AccessibleText>
        ) : null}
        {document.documentNumber ? (
          <Pressable
            onPress={() => setShowNumber((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={showNumber ? 'Hide document number' : 'Show document number'}
          >
            <AccessibleText style={[styles.meta, { color: colors.textSecondary }]}>
              Document number: {showNumber ? document.documentNumber : '••••••••'}
            </AccessibleText>
          </Pressable>
        ) : null}
      </View>

      {preview ? (
        <Image
          source={{ uri: getAttachmentService().resolveAbsolutePath(preview) }}
          style={styles.preview}
          resizeMode="cover"
          accessibilityLabel={`Preview of ${preview.fileName}`}
        />
      ) : null}

      {editing ? (
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AccessibleTextInput label="Document title" value={title} onChangeText={setTitle} />
          <IsoDateField label="Issue date" value={issueDate} onChangeText={setIssueDate} required />
          <IsoDateField label="Expiry date" value={expiryDate} onChangeText={setExpiryDate} required />
          {document.documentType === 'visa' ? (
            <>
              <AccessibleTextInput
                label="Max days in country (optional)"
                value={maxStayDaysInput}
                onChangeText={setMaxStayDaysInput}
                keyboardType="number-pad"
                placeholder="e.g. 90 — turns on a tracking rule"
              />
              <AccessibleTextInput
                label="Number of entries (optional)"
                value={maxEntriesInput}
                onChangeText={setMaxEntriesInput}
                keyboardType="number-pad"
                placeholder="e.g. 1 single, 2 double"
              />
            </>
          ) : null}
          <AccessibleTextInput label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={saveEdits}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            <AccessibleText style={[styles.buttonText, { color: colors.onPrimary }]}>Save changes</AccessibleText>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit document"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Edit document</AccessibleText>
        </Pressable>
      )}

      <View style={styles.section}>
        <AccessibleText style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
          ATTACHMENTS
        </AccessibleText>
        {document.attachments.length === 0 ? (
          <AccessibleText style={{ color: colors.textSecondary }}>No files attached yet.</AccessibleText>
        ) : (
          document.attachments.map((attachment) => (
            <View key={attachment.id} style={[styles.attachmentRow, { borderColor: colors.border }]}>
              <Pressable
                style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
                onPress={() => openAttachment(attachment)}
                accessibilityRole="button"
                accessibilityLabel={`Open attachment ${attachment.fileName}`}
              >
                <AccessibleText style={[styles.attachmentName, { color: colors.text }]}>{attachment.fileName}</AccessibleText>
                <AccessibleText style={[styles.attachmentMeta, { color: colors.textSecondary }]}>
                  {attachment.mimeType} · {(attachment.fileSize / 1024).toFixed(1)} KB
                </AccessibleText>
              </Pressable>
              <Pressable
                onPress={() => removeAttachment(attachment)}
                accessibilityRole="button"
                accessibilityLabel={`Remove attachment ${attachment.fileName}`}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}
              >
                <AccessibleText style={{ color: colors.urgent }}>Remove</AccessibleText>
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={attachFile}
          accessibilityRole="button"
          accessibilityLabel="Attach image or PDF"
        >
          <AccessibleText style={[styles.secondaryButtonText, { color: colors.text }]}>Attach image or PDF</AccessibleText>
        </Pressable>
      </View>

      <Pressable
        onPress={confirmDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete document"
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <AccessibleText style={{ color: colors.urgent, fontWeight: '600' }}>Delete document</AccessibleText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.xl, gap: spacing.sm },
  icon: { fontSize: 32 },
  type: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  expiry: { fontSize: typography.body },
  meta: { fontSize: typography.body },
  preview: { width: '100%', height: 180, borderRadius: 16 },
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: typography.title, fontWeight: '600' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 0.8 },
  attachmentRow: { borderBottomWidth: 1, paddingVertical: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  attachmentName: { fontSize: typography.title, fontWeight: '600' },
  attachmentMeta: { fontSize: typography.caption, marginTop: 2 },
  secondaryButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: typography.body, fontWeight: '600' },
});
