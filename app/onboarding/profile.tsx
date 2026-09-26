import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getCountryName } from '@/data/dataset/countries';
import { getAttachmentService, getDocumentService } from '@/infrastructure/services/serviceFactory';
import { CitizenshipPicker } from '@/presentation/components/CitizenshipPicker';
import { OnboardingProgress } from '@/presentation/components/OnboardingProgress';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { RequiredFieldLabel } from '@/presentation/components/RequiredFieldLabel';
import { Screen } from '@/presentation/components/Screen';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useHaptics } from '@/presentation/hooks/useHaptics';
import { useShakeAnimation } from '@/presentation/hooks/useShakeAnimation';
import { useTheme } from '@/presentation/hooks/useTheme';
import { BirthDateTextInput } from '@/presentation/components/BirthDateTextInput';
import { validateProfileEssentialsForm } from '@/domain/services/profileValidation';
import { parseBirthDateInput } from '@/domain/utils/birthDate';
import { saveUserProfile } from '@/presentation/store/profileActions';
import { pickPassportUpload, type PassportUploadSelection } from '@/presentation/utils/passportUploadPicker';
import { radii, spacing, typography } from '@/presentation/theme';

export default function OnboardingProfileScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { shake, animatedStyle: shakeStyle } = useShakeAnimation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [citizenships, setCitizenships] = useState<string[]>([]);
  const [passportUpload, setPassportUpload] = useState<PassportUploadSelection | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [highlightRequired, setHighlightRequired] = useState(false);

  const essentialsError = validateProfileEssentialsForm(name, birthDateInput, citizenships);
  const canContinue = !essentialsError && !busy;

  function clearValidationHighlight() {
    setHighlightRequired(false);
    if (message) {
      setMessage(null);
    }
  }

  async function pickPassport() {
    setMessage(null);
    try {
      const picked = await pickPassportUpload();
      if (picked) {
        setPassportUpload(picked);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not pick passport file.');
    }
  }

  async function continueToLocation() {
    const validationError = validateProfileEssentialsForm(name, birthDateInput, citizenships);
    if (validationError) {
      setMessage(validationError);
      setHighlightRequired(true);
      shake();
      void haptics.error();
      return;
    }

    setBusy(true);
    setHighlightRequired(false);
    setMessage(null);
    try {
      const parsedBirthDate = parseBirthDateInput(birthDateInput)!;
      await saveUserProfile({
        name: name.trim(),
        birthDate: parsedBirthDate,
        citizenships,
        primaryNationality: citizenships[0] ?? null,
      });

      if (passportUpload) {
        const issuingCountry = citizenships[0];
        const created = await getDocumentService().create({
          title: `Passport · ${getCountryName(issuingCountry)}`,
          documentType: 'passport',
          issuingCountry,
        });
        await getAttachmentService().importAttachment({
          sourceUri: passportUpload.uri,
          fileName: passportUpload.fileName,
          mimeType: passportUpload.mimeType,
          ownerType: 'document',
          ownerId: created.id,
        });
      }

      router.push('/onboarding/location');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save your profile. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll={false} showHeader={false} keyboardAvoiding>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <AccessibleText style={[styles.backLabel, { color: colors.accent }]}>← Back</AccessibleText>
          </Pressable>
          <OnboardingProgress step={5} total={6} />
          <AccessibleText style={[styles.headline, { color: colors.text }]} accessibilityRole="header">
            Let's set up your profile.
          </AccessibleText>
          <AccessibleText style={[styles.body, { color: colors.textSecondary }]}>
            A few details help BorderMark greet you, apply the right rules, and show relevant documents.
          </AccessibleText>

          <Animated.View
            style={[
              styles.group,
              shakeStyle,
              {
                backgroundColor: colors.surface,
                borderColor: highlightRequired ? colors.urgent : colors.border,
                borderWidth: highlightRequired ? 2 : 1,
              },
            ]}
          >
            <RequiredFieldLabel title="Name" />
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
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              accessibilityLabel="Your name"
            />

            <RequiredFieldLabel title="Date of birth" />
            <BirthDateTextInput
              value={birthDateInput}
              onChangeText={(value) => {
                setBirthDateInput(value);
                clearValidationHighlight();
              }}
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              accessibilityLabel="Date of birth"
            />
            <AccessibleText style={[styles.hint, { color: colors.muted }]}>
              <AccessibleText style={{ color: colors.urgent, fontWeight: '600' }}>Required.</AccessibleText> BorderMark uses
              this with your first nationality to build your life timeline.
            </AccessibleText>

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
            <AccessibleText style={[styles.hint, { color: colors.muted }]}>
              Your first nationality is treated as where you were born and lived. You can edit this later in Profile.
            </AccessibleText>

            <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>Passport upload (optional)</AccessibleText>
            <Pressable
              onPress={pickPassport}
              style={[styles.uploadButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              accessibilityRole="button"
              accessibilityLabel={passportUpload ? 'Change passport upload' : 'Upload passport'}
            >
              <AccessibleText style={{ color: colors.text, fontWeight: '600' }}>
                {passportUpload ? passportUpload.fileName : 'Upload passport photo or PDF'}
              </AccessibleText>
            </Pressable>
            {passportUpload ? (
              <Pressable
                onPress={() => setPassportUpload(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove passport upload"
                style={styles.removeUpload}
              >
                <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Remove upload</AccessibleText>
              </Pressable>
            ) : null}
          </Animated.View>

          {message ? (
            <AccessibleText style={{ color: colors.warning }} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {message}
            </AccessibleText>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: busy ? 0.7 : canContinue ? 1 : 0.55,
              },
            ]}
            onPress={() => void continueToLocation()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: busy }}
            accessibilityHint={essentialsError ?? undefined}
          >
            <AccessibleText style={[styles.buttonText, { color: colors.onPrimary }]}>
              Continue
            </AccessibleText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.md },
  backButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { fontSize: typography.body, fontWeight: '600' },
  headline: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  body: { fontSize: typography.body, lineHeight: 24 },
  group: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, gap: spacing.lg },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    fontSize: typography.title,
  },
  hint: { fontSize: typography.caption, lineHeight: 18 },
  uploadButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeUpload: { minHeight: 44, justifyContent: 'center' },
  footer: { padding: spacing.xl, paddingTop: spacing.md },
  button: { minHeight: 52, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: typography.title, fontWeight: '600' },
});
