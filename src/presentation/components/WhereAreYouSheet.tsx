import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { countryFlag, getCountryByCode, getCountryName } from '@/data/dataset/countries';
import { resolveCountryFromDevice } from '@/infrastructure/providers/locationProvider';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { AdaptiveBottomSheetShell } from '@/presentation/components/AdaptiveBottomSheetShell';
import { CountryPicker } from '@/presentation/components/CountryPicker';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { radii, spacing, typography } from '@/presentation/theme';

interface WhereAreYouSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function WhereAreYouSheet({ visible, onClose }: WhereAreYouSheetProps) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const maxSheetHeight = windowHeight * 0.88;
  const reduceMotion = useReducedMotion();
  const profile = useBorderMarkStore((state) => state.profile);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettingsLink, setShowSettingsLink] = useState(false);

  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const title = firstName ? `${firstName}, where are you now?` : 'Where are you now?';
  const selectedCountry = selectedCode ? getCountryByCode(selectedCode) : null;

  function resetState() {
    setSelectedCode(null);
    setMessage(null);
    setShowSettingsLink(false);
    setBusy(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function useCurrentLocation() {
    setMessage(null);
    setShowSettingsLink(false);
    setBusy(true);
    try {
      const result = await resolveCountryFromDevice();
      if (result.countryCode) {
        setSelectedCode(result.countryCode);
        return;
      }
      setMessage(result.message ?? 'Choose your country manually.');
      setShowSettingsLink(result.message?.includes('permission') ?? false);
    } finally {
      setBusy(false);
    }
  }

  function continueToDetails() {
    if (!selectedCode) {
      setMessage('Choose where you are to continue.');
      return;
    }
    handleClose();
    router.push({
      pathname: '/stay/add',
      params: { countryCode: selectedCode, fromAdd: '1' },
    });
  }

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <AdaptiveBottomSheetShell overlayColor={colors.overlay} onDismiss={handleClose}>
        <View
          style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: maxSheetHeight }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} accessibilityElementsHidden />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          <Text
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Record the country you are in now. You can add dates and notes on the next step.
          </Text>

          <Pressable
            style={[styles.locationButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
            onPress={useCurrentLocation}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            accessibilityHint="Detects your country from device location"
          >
            <Ionicons name="locate-outline" size={20} color={colors.onPrimary} accessibilityElementsHidden />
            <Text style={[styles.locationButtonText, { color: colors.onPrimary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {busy ? 'Detecting location…' : 'Use current location'}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              or choose manually
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <CountryPicker
            value={selectedCode}
            onChange={(code) => {
              setSelectedCode(code);
              setMessage(null);
            }}
            label="Country"
            placeholder="Choose country"
          />

          {selectedCountry ? (
            <View style={[styles.preview, { backgroundColor: colors.accentMuted, borderColor: colors.border }]}>
              <Text style={styles.previewFlag} accessibilityElementsHidden importantForAccessibility="no">
                {countryFlag(selectedCountry.code)}
              </Text>
              <View style={styles.previewText}>
                <Text style={[styles.previewCountry, { color: colors.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {selectedCountry.name}
                </Text>
                <Text style={[styles.previewContinent, { color: colors.textSecondary }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {selectedCountry.continent}
                </Text>
              </View>
            </View>
          ) : null}

          {message ? (
            <Text style={{ color: colors.warning }} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}

          {showSettingsLink ? (
            <Pressable
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open system settings"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Open system settings</Text>
            </Pressable>
          ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <PrimaryButton
              label="Continue"
              onPress={continueToDetails}
              disabled={busy || !selectedCode}
              loading={busy}
              disabledReason={!selectedCode ? 'Choose a country to continue.' : undefined}
              accessibilityHint={
                selectedCode ? `Continues to add stay in ${getCountryName(selectedCode)}` : undefined
              }
            />
          </View>
        </View>
      </AdaptiveBottomSheetShell>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: 'hidden',
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { fontSize: typography.section, fontWeight: '600', flexShrink: 1 },
  subtitle: { fontSize: typography.body, lineHeight: 22 },
  locationButton: {
    minHeight: 48,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  locationButtonText: { fontSize: typography.title, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: typography.caption, fontWeight: '600' },
  preview: {
    borderWidth: 1,
    borderRadius: radii.button,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewFlag: { fontSize: 28 },
  previewText: { flex: 1, gap: spacing.xs },
  previewCountry: { fontSize: typography.title, fontWeight: '600' },
  previewContinent: { fontSize: typography.body },
});
