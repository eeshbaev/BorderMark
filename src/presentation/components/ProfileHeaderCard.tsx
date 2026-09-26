import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';

import { countryFlag, getCountryName } from '@/data/dataset/countries';
import { formatCitizenshipLabel } from '@/domain/services/citizenshipService';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/presentation/accessibility/constants';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useBorderMarkStore } from '@/presentation/store/appStore';
import { cardShadow, radii, spacing, typography } from '@/presentation/theme';
import { resolveProfilePhotoUri } from '@/infrastructure/storage/profilePhotoStorage';

function profileInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return '?';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function ProfileHeaderCard() {
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useBorderMarkStore((state) => state.profile);
  const photoUri = resolveProfilePhotoUri(FileSystem.documentDirectory, profile?.photoUri ?? null);
  const displayName = profile?.name?.trim() || 'Add your name';
  const hasName = Boolean(profile?.name?.trim());
  const citizenships = profile?.citizenships ?? [];
  const citizenshipLabel = formatCitizenshipLabel(citizenships, getCountryName);
  const hasCitizenships = citizenships.length > 0;

  return (
    <Pressable
      onPress={() => router.push('/settings/profile')}
      accessibilityRole="button"
      accessibilityLabel="Edit profile"
      accessibilityHint="Opens profile photo, name, and citizenship"
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View style={styles.avatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.accentMuted }]}>
            <Text style={[styles.initials, { color: colors.accent }]} accessibilityElementsHidden>
              {profileInitials(profile?.name)}
            </Text>
          </View>
        )}
        <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
          <Ionicons name="camera-outline" size={14} color={colors.onPrimary} accessibilityElementsHidden />
        </View>
      </View>

      <View style={styles.details}>
        <Text
          style={[styles.name, { color: hasName ? colors.text : colors.muted }]}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          {displayName}
        </Text>
        <View style={styles.countryRow}>
          {hasCitizenships ? (
            citizenships.slice(0, 3).map((code) => (
              <Text key={code} style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
                {countryFlag(code)}
              </Text>
            ))
          ) : (
            <Ionicons name="earth-outline" size={16} color={colors.muted} accessibilityElementsHidden />
          )}
          <Text
            style={[styles.country, { color: hasCitizenships ? colors.textSecondary : colors.muted }]}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {hasCitizenships ? citizenshipLabel : 'Add citizenship'}
          </Text>
        </View>
        <Text style={[styles.editHint, { color: colors.accent }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Edit profile
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.muted} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 44,
  },
  avatarWrap: { position: 'relative' },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 24, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: spacing.xs },
  name: { fontSize: typography.section, fontWeight: '600', flexShrink: 1 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flag: { fontSize: 16, lineHeight: 20 },
  country: { fontSize: typography.body, flexShrink: 1 },
  editHint: { fontSize: typography.caption, fontWeight: '600', marginTop: spacing.xs },
});
