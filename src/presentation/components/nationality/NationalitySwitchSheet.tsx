import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { countryFlag, getCountryName } from '@/data/dataset/countries';
import { switchToNationality } from '@/domain/services/nationalityHomeService';
import { AdaptiveBottomSheetShell } from '@/presentation/components/AdaptiveBottomSheetShell';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { AccessibleTextInput } from '@/presentation/components/AccessibleTextInput';
import { IsoDateField } from '@/presentation/components/IsoDateField';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { useTheme } from '@/presentation/hooks/useTheme';
import { saveUserProfile } from '@/presentation/store/profileActions';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { radii, spacing, typography } from '@/presentation/theme';

interface NationalitySwitchSheetProps {
  visible: boolean;
  nationalityCode: string;
  onClose: () => void;
  onSaved: (stayId: string) => void;
}

export function NationalitySwitchSheet({
  visible,
  nationalityCode,
  onClose,
  onSaved,
}: NationalitySwitchSheetProps) {
  const { colors } = useTheme();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const today = useBorderMarkStore((state) => state.today);
  const [arrivalDate, setArrivalDate] = useState(today);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setArrivalDate(today);
      setCity('');
      setError(null);
    }
  }, [visible, today, nationalityCode]);

  async function saveSwitch() {
    setSaving(true);
    setError(null);
    try {
      await saveUserProfile({ primaryNationality: nationalityCode });
      const stay = await switchToNationality(nationalityCode, today, {
        arrivalDate,
        city: city.trim() || null,
      });
      await refresh();
      onSaved(stay.id);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this nationality stay.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AdaptiveBottomSheetShell overlayColor={colors.overlay} onDismiss={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.titleRow}>
          <AccessibleText style={styles.titleFlag} accessibilityElementsHidden importantForAccessibility="no">
            {countryFlag(nationalityCode)}
          </AccessibleText>
          <AccessibleText style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Record stay in {getCountryName(nationalityCode)}
          </AccessibleText>
        </View>
        <AccessibleText style={{ color: colors.textSecondary, lineHeight: 22 }}>
          BorderMark will close your current nationality stay and start this one from the date you choose.
        </AccessibleText>

        <IsoDateField label="From" value={arrivalDate} onChangeText={setArrivalDate} />
        <AccessibleTextInput
          label="City (optional)"
          value={city}
          onChangeText={setCity}
          placeholder="Your city"
          autoCapitalize="words"
        />

        {error ? (
          <AccessibleText style={{ color: colors.urgent }} accessibilityRole="alert">
            {error}
          </AccessibleText>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancel}>
            <AccessibleText style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</AccessibleText>
          </Pressable>
          <View style={styles.primaryWrap}>
            <PrimaryButton label="Save" onPress={saveSwitch} loading={saving} />
          </View>
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
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleFlag: { fontSize: 24 },
  title: { fontSize: typography.title, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  primaryWrap: { flex: 1 },
});
