import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { updateNationalityCity } from '@/domain/services/nationalityHomeService';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { radii, spacing, typography } from '@/presentation/theme';
import type { Stay } from '@/shared/types';

interface NationalityCityEditorProps {
  stay: Stay;
}

export function NationalityCityEditor({ stay }: NationalityCityEditorProps) {
  const { colors } = useTheme();
  const refresh = useBorderMarkStore((state) => state.refresh);
  const today = useBorderMarkStore((state) => state.today);
  const [cityDraft, setCityDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function commitCity() {
    const trimmed = cityDraft.trim();
    if (!trimmed) {
      return;
    }
    setSaving(true);
    try {
      await updateNationalityCity(stay, trimmed, today);
      setCityDraft('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <AccessibleText style={[styles.label, { color: colors.textSecondary }]}>City</AccessibleText>
      {stay.city ? (
        <View style={[styles.currentTag, { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}>
          <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>{stay.city}</AccessibleText>
        </View>
      ) : null}
      <View style={styles.row}>
        <TextInput
          value={cityDraft}
          onChangeText={setCityDraft}
          onSubmitEditing={commitCity}
          placeholder="Add or change city"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          editable={!saving}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
          ]}
          accessibilityLabel="City"
        />
        <Pressable
          onPress={commitCity}
          disabled={saving || !cityDraft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Save city"
          style={[
            styles.button,
            {
              backgroundColor: colors.accentMuted,
              borderColor: colors.accent,
              opacity: saving || !cityDraft.trim() ? 0.5 : 1,
            },
          ]}
        >
          <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>Save</AccessibleText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingLeft: spacing.xl + 4,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
