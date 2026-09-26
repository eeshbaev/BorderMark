import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';


import { CitizenshipPicker } from '@/presentation/components/CitizenshipPicker';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { Screen } from '@/presentation/components/Screen';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { RequiredFieldLabel } from '@/presentation/components/RequiredFieldLabel';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useHaptics } from '@/presentation/hooks/useHaptics';
import { useShakeAnimation } from '@/presentation/hooks/useShakeAnimation';
import { useTheme } from '@/presentation/hooks/useTheme';
import { BirthDateTextInput } from '@/presentation/components/BirthDateTextInput';
import { validateProfileEssentialsForm } from '@/domain/services/profileValidation';
import { formatBirthDateDisplay, parseBirthDateInput } from '@/domain/utils/birthDate';
import { reloadUserProfile, saveUserProfile } from '@/presentation/store/profileActions';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { pickProfileImageUri } from '@/presentation/utils/profilePhotoPicker';
import { importProfilePhoto, removeProfilePhoto, resolveProfilePhotoUri } from '@/infrastructure/storage/profilePhotoStorage';
import { radii, spacing, typography } from '@/presentation/theme';

function profileInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { shake, animatedStyle: shakeStyle } = useShakeAnimation();
  const router = useRouter();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const storeProfile = useBorderMarkStore((state) => state.profile);
  const [name, setName] = useState(() => storeProfile?.name ?? '');
  const [birthDateInput, setBirthDateInput] = useState(() =>
    storeProfile?.birthDate ? formatBirthDateDisplay(storeProfile.birthDate) : '',
  );
  const [citizenships, setCitizenships] = useState<string[]>(() => storeProfile?.citizenships ?? []);
  const [photoUri, setPhotoUri] = useState<string | null>(() => storeProfile?.photoUri ?? null);
  const [previewUri, setPreviewUri] = useState<string | null>(() =>
    resolveProfilePhotoUri(FileSystem.documentDirectory, storeProfile?.photoUri ?? null),
  );
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(() => storeProfile != null);
  const [highlightRequired, setHighlightRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void reloadUserProfile().then((loaded) => {
      if (cancelled) {
        return;
      }
      setName(loaded.name ?? '');
      setBirthDateInput(loaded.birthDate ? formatBirthDateDisplay(loaded.birthDate) : '');
      setCitizenships(loaded.citizenships);
      setPhotoUri(loaded.photoUri ?? null);
      setPreviewUri(resolveProfilePhotoUri(FileSystem.documentDirectory, loaded.photoUri ?? null));
      setPhotoRemoved(false);
      setPendingPhotoUri(null);
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function pickPhoto() {
    setError(null);
    try {
      const uri = await pickProfileImageUri();
      if (!uri) {
        return;
      }
      setPendingPhotoUri(uri);
      setPreviewUri(uri);
      setPhotoRemoved(false);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Could not choose a photo.');
    }
  }

  function removePhoto() {
    setPendingPhotoUri(null);
    setPreviewUri(null);
    setPhotoRemoved(true);
  }

  function clearValidationHighlight() {
    setHighlightRequired(false);
    setError(null);
  }

  async function saveProfile() {
    if (!hydrated) {
      return;
    }
    const validationError = validateProfileEssentialsForm(name, birthDateInput, citizenships);
    if (validationError) {
      setError(validationError);
      setHighlightRequired(true);
      shake();
      void haptics.error();
      return;
    }

    setSaving(true);
    setError(null);
    setHighlightRequired(false);
    try {
      let nextPhotoUri = photoUri;

      if (photoRemoved) {
        await removeProfilePhoto(photoUri);
        nextPhotoUri = null;
      } else if (pendingPhotoUri) {
        if (photoUri) {
          await removeProfilePhoto(photoUri);
        }
        nextPhotoUri = await importProfilePhoto(pendingPhotoUri);
      }

      await saveUserProfile({
        name: name.trim(),
        birthDate: parseBirthDateInput(birthDateInput)!,
        citizenships,
        primaryNationality: citizenships[0] ?? null,
        photoUri: nextPhotoUri,
      });
      await refresh();
      router.back();
    } catch {
      setError('Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Edit profile"
      scroll
      keyboardAvoiding
      footer={
        <PrimaryButton
          label="Save profile"
          onPress={() => void saveProfile()}
          loading={saving}
          disabled={!hydrated || saving}
          disabledReason={!hydrated ? 'Loading your profile…' : undefined}
        />
      }
    >
      <View style={styles.stack}>
        <View style={styles.photoSection}>
          <Pressable
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityLabel={previewUri ? 'Change profile photo' : 'Add profile photo'}
            style={styles.avatarButton}
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.accentMuted }]}>
                <AccessibleText style={[styles.initials, { color: colors.accent }]} accessibilityElementsHidden>
                  {profileInitials(name)}
                </AccessibleText>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Ionicons name="camera-outline" size={16} color={colors.onPrimary} accessibilityElementsHidden />
            </View>
          </Pressable>

          <View style={styles.photoActions}>
            <Pressable
              onPress={pickPhoto}
              accessibilityRole="button"
              accessibilityLabel="Choose photo"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Choose photo</AccessibleText>
            </Pressable>
            {previewUri ? (
              <Pressable
                onPress={removePhoto}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <AccessibleText style={{ color: colors.urgent, fontWeight: '600' }}>Remove</AccessibleText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Animated.View
          style={[
            styles.essentialsCard,
            shakeStyle,
            {
              borderColor: highlightRequired ? colors.urgent : colors.border,
              borderWidth: highlightRequired ? 2 : 1,
              backgroundColor: colors.surface,
            },
          ]}
        >
        <View style={styles.field}>
          <RequiredFieldLabel title="Name" style={styles.settingsLabel} />
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              clearValidationHighlight();
            }}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoCorrect={false}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            accessibilityLabel="Your name"
          />
        </View>

        <View style={styles.field}>
          <RequiredFieldLabel title="Date of birth" style={styles.settingsLabel} />
          <BirthDateTextInput
            value={birthDateInput}
            onChangeText={(value) => {
              setBirthDateInput(value);
              clearValidationHighlight();
            }}
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            accessibilityLabel="Date of birth"
          />
        </View>

        <CitizenshipPicker
          value={citizenships}
          onChange={(codes) => {
            setCitizenships(codes);
            clearValidationHighlight();
          }}
          label="Nationality"
          placeholder="Add your nationality countries"
          minCount={1}
        />
        </Animated.View>

        {error ? (
          <AccessibleText style={{ color: colors.urgent }} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </AccessibleText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  essentialsCard: {
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  photoSection: { alignItems: 'center', gap: spacing.md },
  avatarButton: { position: 'relative' },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 32, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', gap: spacing.xl },
  field: { gap: spacing.sm },
  label: { fontSize: typography.caption, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  settingsLabel: { letterSpacing: 0.6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    fontSize: typography.body,
  },
});
