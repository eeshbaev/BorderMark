import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import type { PendingStayAttachment } from '@/presentation/components/stay/stayFormState';
import { useTheme } from '@/presentation/hooks/useTheme';
import {
  pickStayFile,
  pickStayPhotoFromLibrary,
  takeStayPhoto,
  type PickedStayAttachment,
} from '@/presentation/utils/stayAttachmentPicker';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';
import type { Attachment, StayAttachmentCategory } from '@/shared/types';

const STAY_FILE_CATEGORIES: StayAttachmentCategory[] = ['photo', 'ticket', 'other'];

const CATEGORY_CONFIG: Record<
  StayAttachmentCategory,
  { label: string; hint: string; addLabel: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  photo: {
    label: 'Photos',
    hint: 'Memories from this city — not your passport or visa.',
    addLabel: 'Add photo',
    icon: 'image-outline',
  },
  ticket: {
    label: 'Tickets',
    hint: 'Railway tickets, boarding passes, or receipts between cities.',
    addLabel: 'Add ticket',
    icon: 'ticket-outline',
  },
  other: {
    label: 'Other',
    hint: 'Anything else you want to keep with this city stay.',
    addLabel: 'Add file',
    icon: 'document-outline',
  },
};

interface StayAttachmentsFormProps {
  pendingAttachments: PendingStayAttachment[];
  onPendingChange: (attachments: PendingStayAttachment[]) => void;
  savedAttachments?: Attachment[];
  onRemoveSaved?: (attachmentId: string) => void;
  readOnly?: boolean;
}

export function StayAttachmentsForm({
  pendingAttachments,
  onPendingChange,
  savedAttachments = [],
  onRemoveSaved,
  readOnly = false,
}: StayAttachmentsFormProps) {
  const { colors } = useTheme();

  function attachmentsForCategory(category: StayAttachmentCategory) {
    const pending = pendingAttachments.filter((item) => item.category === category);
    const saved = savedAttachments.filter((item) => item.category === category);
    return { pending, saved };
  }

  function addPending(item: PickedStayAttachment) {
    onPendingChange([...pendingAttachments, { ...item, id: `${Date.now()}-${Math.random()}` }]);
  }

  function removePending(id: string) {
    onPendingChange(pendingAttachments.filter((item) => item.id !== id));
  }

  async function handleAddPhoto() {
    Alert.alert('Add photo', 'Choose how to add a memory photo for this city.', [
      {
        text: 'Take photo',
        onPress: () => {
          void (async () => {
            try {
              const picked = await takeStayPhoto();
              if (picked) {
                addPending(picked);
              }
            } catch (error) {
              Alert.alert('Could not take photo', error instanceof Error ? error.message : 'Try again.');
            }
          })();
        },
      },
      {
        text: 'Choose from library',
        onPress: () => {
          void (async () => {
            try {
              const picked = await pickStayPhotoFromLibrary();
              if (picked) {
                addPending(picked);
              }
            } catch (error) {
              Alert.alert('Could not add photo', error instanceof Error ? error.message : 'Try again.');
            }
          })();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleAddFile(category: 'ticket' | 'other') {
    try {
      const picked = await pickStayFile(category);
      if (picked) {
        addPending(picked);
      }
    } catch (error) {
      Alert.alert('Could not add file', error instanceof Error ? error.message : 'Try again.');
    }
  }

  const visibleCategories = readOnly
    ? STAY_FILE_CATEGORIES.filter((category) => savedAttachments.some((item) => item.category === category))
    : STAY_FILE_CATEGORIES;

  if (readOnly && visibleCategories.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {!readOnly ? (
        <AccessibleText style={[styles.intro, { color: colors.textSecondary }]}>
          Passport, visa, and permit details live in Profile → Documents. Here you only add memories and travel files
          for this city.
        </AccessibleText>
      ) : null}

      {visibleCategories.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const { pending, saved } = attachmentsForCategory(category);
        const items = [...saved, ...pending];

        if (readOnly && items.length === 0) {
          return null;
        }

        return (
          <View
            key={category}
            style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.headerRow}>
              <Ionicons name={config.icon} size={20} color={colors.accent} accessibilityElementsHidden />
              <View style={styles.headerText}>
                <AccessibleText style={[styles.title, { color: colors.text }]} accessibilityRole="header">
                  {config.label}
                </AccessibleText>
                <AccessibleText style={[styles.hint, { color: colors.textSecondary }]}>{config.hint}</AccessibleText>
              </View>
            </View>

            {items.length > 0 ? (
              <View style={styles.fileList}>
                {saved.map((attachment) => (
                  <View
                    key={attachment.id}
                    style={[styles.fileRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <AccessibleText style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {attachment.fileName}
                    </AccessibleText>
                    {onRemoveSaved ? (
                      <Pressable
                        onPress={() => onRemoveSaved(attachment.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${attachment.fileName}`}
                        hitSlop={8}
                      >
                        <AccessibleText style={{ color: colors.urgent, fontWeight: '700' }}>×</AccessibleText>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                {pending.map((attachment) => (
                  <View
                    key={attachment.id}
                    style={[styles.fileRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <AccessibleText style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {attachment.fileName}
                    </AccessibleText>
                    <Pressable
                      onPress={() => removePending(attachment.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${attachment.fileName}`}
                      hitSlop={8}
                    >
                      <AccessibleText style={{ color: colors.urgent, fontWeight: '700' }}>×</AccessibleText>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {!readOnly ? (
              <Pressable
                onPress={() => {
                  if (category === 'photo') {
                    void handleAddPhoto();
                    return;
                  }
                  void handleAddFile(category);
                }}
                accessibilityRole="button"
                accessibilityLabel={config.addLabel}
                style={[styles.addButton, { borderColor: colors.border }]}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.accent} accessibilityElementsHidden />
                <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>{config.addLabel}</AccessibleText>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  intro: { fontSize: typography.caption, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: typography.body, fontWeight: '600' },
  hint: { fontSize: typography.caption, lineHeight: 18 },
  fileList: { gap: spacing.sm },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  fileName: { flex: 1, fontSize: typography.caption },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
});
