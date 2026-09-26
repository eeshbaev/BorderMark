import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DOCUMENT_TYPE_LABELS } from '@/data/repositories/documentRepository';
import { syncVisaDocumentDayCapRule } from '@/domain/services/visaStayService';
import {
  parseIsoDateInput,
  validateDocumentIssueAndExpiryDates,
} from '@/domain/utils/isoDateInput';
import { getAttachmentService, getDocumentService } from '@/infrastructure/services/serviceFactory';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { CountryPicker } from '@/presentation/components/CountryPicker';
import { IsoDateField } from '@/presentation/components/IsoDateField';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { Screen } from '@/presentation/components/Screen';
import { useHaptics } from '@/presentation/hooks/useHaptics';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { spacing, typography } from '@/presentation/theme';
import type { DocumentType } from '@/shared/types';

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

function resolveDefaultCountry(
  settingsCountry: string | null | undefined,
  citizenships: string[],
): string {
  return settingsCountry ?? citizenships[0] ?? 'UZ';
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

export default function AddDocumentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ issuingCountry?: string; documentType?: string }>();
  const haptics = useHaptics();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const settings = useBorderMarkStore((state) => state.settings);
  const profile = useBorderMarkStore((state) => state.profile);
  const defaultCountry = resolveDefaultCountry(settings?.defaultCountry, profile?.citizenships ?? []);
  const initialCountry =
    typeof params.issuingCountry === 'string' && params.issuingCountry
      ? params.issuingCountry
      : defaultCountry;

  const lockedType = DOCUMENT_TYPES.includes(params.documentType as DocumentType)
    ? (params.documentType as DocumentType)
    : null;
  const initialDocumentType = lockedType ?? 'passport';
  const typeLabel = DOCUMENT_TYPE_LABELS[initialDocumentType];
  const isVisa = initialDocumentType === 'visa';

  const [title, setTitle] = useState(typeLabel);
  const [documentType] = useState<DocumentType>(initialDocumentType);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingCountry, setIssuingCountry] = useState(initialCountry);
  const [maxStayDaysInput, setMaxStayDaysInput] = useState('');
  const [maxEntriesInput, setMaxEntriesInput] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingScan, setPendingScan] = useState<{
    uri: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const titleMissing = title.trim().length === 0;
  const dateValidationError = validateDocumentIssueAndExpiryDates(issueDate, expiryDate);
  const canSave = !titleMissing && dateValidationError == null;

  async function pickScan() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf'],
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    const asset = result.assets[0];
    setPendingScan({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    });
  }

  async function saveDocument() {
    if (titleMissing) {
      setError('Enter a title for this document.');
      return;
    }
    const datesError = validateDocumentIssueAndExpiryDates(issueDate, expiryDate);
    if (datesError) {
      setError(datesError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const maxStayDays = isVisa ? parseOptionalPositiveInt(maxStayDaysInput) : null;
      const maxEntries = isVisa ? parseOptionalPositiveInt(maxEntriesInput) : null;
      const created = await getDocumentService().create({
        title: title.trim(),
        documentType,
        issueDate: parseIsoDateInput(issueDate)!,
        expiryDate: parseIsoDateInput(expiryDate)!,
        issuingCountry: issuingCountry || null,
        documentNumber: documentNumber.trim() || null,
        notes: notes.trim() || null,
        maxStayDays,
        maxEntries,
      });
      if (isVisa) {
        await syncVisaDocumentDayCapRule(created);
      }
      if (pendingScan) {
        await getAttachmentService().importAttachment({
          sourceUri: pendingScan.uri,
          fileName: pendingScan.fileName,
          mimeType: pendingScan.mimeType,
          ownerType: 'document',
          ownerId: created.id,
        });
      }
      await refresh();
      await haptics.success();
      router.replace(`/documents/${created.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save document. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={`Add ${typeLabel.toLowerCase()}`}
      subtitle="Saved in Profile → Documents. You can add a scan now or on the next screen."
      keyboardAvoiding
      footer={
        <PrimaryButton
          label={`Save ${typeLabel.toLowerCase()}`}
          onPress={saveDocument}
          loading={saving}
          disabled={!canSave}
          disabledReason={
            titleMissing
              ? 'Enter a title to save this document.'
              : dateValidationError ?? undefined
          }
        />
      }
    >
      {error ? (
        <AccessibleText style={[styles.error, { color: colors.urgent }]} accessibilityLiveRegion="polite">
          {error}
        </AccessibleText>
      ) : null}

      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.typeBadge, { color: colors.accent, backgroundColor: colors.accentMuted }]}>
          {typeLabel}
        </AccessibleText>
        <AccessibleTextInput label="Title" value={title} onChangeText={setTitle} placeholder={typeLabel} />
        <IsoDateField label="Issue date" value={issueDate} onChangeText={setIssueDate} required />
        <IsoDateField label="Expiry date" value={expiryDate} onChangeText={setExpiryDate} required />
        <CountryPicker
          value={issuingCountry}
          onChange={setIssuingCountry}
          label="Issuing country"
          placeholder="Choose issuing country"
        />
        {isVisa ? (
          <>
            <AccessibleTextInput
              label="Max days in country (optional)"
              value={maxStayDaysInput}
              onChangeText={setMaxStayDaysInput}
              keyboardType="number-pad"
              placeholder="e.g. 90 — turns on a tracking rule"
            />
            <AccessibleText style={[styles.hint, { color: colors.textSecondary }]}>
              BorderMark can add a rule under Profile → Rules when you save a day limit here.
            </AccessibleText>
            <AccessibleTextInput
              label="Number of entries (optional)"
              value={maxEntriesInput}
              onChangeText={setMaxEntriesInput}
              keyboardType="number-pad"
              placeholder="e.g. 1 single, 2 double — leave blank if unlimited"
            />
          </>
        ) : null}
        <AccessibleTextInput
          label="Document number (optional)"
          value={documentNumber}
          onChangeText={setDocumentNumber}
          secureTextEntry
          placeholder="Hidden by default on detail screen"
        />
        <AccessibleTextInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Optional" />
      </View>

      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AccessibleText style={[styles.attachTitle, { color: colors.text }]} accessibilityRole="header">
          Scan or photo (optional)
        </AccessibleText>
        <AccessibleText style={[styles.hint, { color: colors.textSecondary, marginTop: 0 }]}>
          JPEG, PNG, or PDF of the visa sticker or approval letter.
        </AccessibleText>
        {pendingScan && pendingScan.mimeType.startsWith('image/') ? (
          <Image
            source={{ uri: pendingScan.uri }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="Selected visa scan preview"
          />
        ) : null}
        {pendingScan ? (
          <AccessibleText style={{ color: colors.textSecondary, fontSize: typography.caption }}>
            {pendingScan.fileName}
          </AccessibleText>
        ) : null}
        <View style={styles.attachActions}>
          <Pressable
            onPress={pickScan}
            accessibilityRole="button"
            accessibilityLabel="Choose scan or photo"
            style={[styles.attachButton, { borderColor: colors.border }]}
          >
            <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>
              {pendingScan ? 'Replace file' : 'Choose image or PDF'}
            </AccessibleText>
          </Pressable>
          {pendingScan ? (
            <Pressable
              onPress={() => setPendingScan(null)}
              accessibilityRole="button"
              accessibilityLabel="Remove selected scan"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <AccessibleText style={{ color: colors.urgent, fontWeight: '600' }}>Remove</AccessibleText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.lg },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: typography.caption,
    fontWeight: '700',
    overflow: 'hidden',
  },
  hint: { fontSize: typography.caption, lineHeight: 18, marginTop: -spacing.sm },
  attachTitle: { fontSize: typography.body, fontWeight: '600' },
  preview: { width: '100%', height: 160, borderRadius: 12 },
  attachActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  attachButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: typography.body, lineHeight: 22 },
});
