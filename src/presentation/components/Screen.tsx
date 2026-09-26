import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';

import { MAX_FONT_SIZE_MULTIPLIER, MIN_TOUCH_TARGET } from '@/presentation/accessibility/constants';
import { AdaptiveContentWidth } from '@/presentation/components/AdaptiveContentWidth';
import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  action?: ReactNode;
  footer?: ReactNode;
  /** When false, header is omitted from accessibility tree (for custom hero layouts). */
  showHeader?: boolean;
  /** Show back button when navigation history exists. Set false on root tab screens. */
  showBack?: boolean | 'auto';
  /** Renders subtitle as a large headline when no title is set. */
  largeSubtitle?: boolean;
  keyboardAvoiding?: boolean;
}

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  action,
  footer,
  showHeader = true,
  showBack = 'auto',
  largeSubtitle = false,
  keyboardAvoiding = false,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const segmentRoot = segments[0];
  const isTabRoot = segmentRoot === '(tabs)';
  const isOnboarding = segmentRoot === 'onboarding';

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  const shouldShowBack =
    showBack === false
      ? false
      : showBack === true
        ? true
        : !isTabRoot && !isOnboarding;

  const backControl = shouldShowBack ? (
    <Pressable
      onPress={handleBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={styles.backButton}
    >
      <AccessibleText style={[styles.backLabel, { color: colors.accent }]}>← Back</AccessibleText>
    </Pressable>
  ) : null;

  const header = showHeader && (title || subtitle || action || shouldShowBack) ? (
    <View style={styles.headerRow}>
      {backControl}
      <View style={[styles.headerText, !shouldShowBack && styles.headerTextFull]} accessibilityRole="header">
        {title ? (
          <AccessibleText
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {title}
          </AccessibleText>
        ) : null}
        {subtitle ? (
          <AccessibleText
            style={[
              largeSubtitle && !title ? styles.heroSubtitle : styles.subtitle,
              { color: largeSubtitle && !title ? colors.text : colors.textSecondary },
            ]}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {subtitle}
          </AccessibleText>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  ) : null;

  const content = (
    <AdaptiveContentWidth fill={!scroll}>
      <View style={[styles.content, !scroll && styles.contentFill]} accessibilityRole="none">
        {!showHeader && backControl ? <View style={styles.backOnlyRow}>{backControl}</View> : null}
        {header}
        {children}
      </View>
    </AdaptiveContentWidth>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, footer ? styles.scrollWithFooter : null]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  const layout = (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
      accessibilityRole="none"
    >
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(spacing.lg, insets.bottom),
            },
          ]}
        >
          <AdaptiveContentWidth fill={false}>{footer}</AdaptiveContentWidth>
        </View>
      ) : null}
    </SafeAreaView>
  );

  if (!keyboardAvoiding) {
    return layout;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {layout}
    </KeyboardAvoidingView>
  );
}

export function ScreenAction({
  label,
  onPress,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={styles.screenAction}
    >
      <AccessibleText style={{ color: colors.accent, fontWeight: '600' }}>{label}</AccessibleText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.massive, flexGrow: 1, width: '100%' },
  scrollWithFooter: { paddingBottom: spacing.xl },
  content: { paddingTop: spacing.xl, gap: spacing.xl },
  contentFill: { flex: 1 },
  backOnlyRow: { alignSelf: 'stretch' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  backButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  backLabel: { fontSize: typography.body, fontWeight: '600' },
  headerText: { flex: 1, gap: spacing.xs, flexShrink: 1, paddingTop: 10 },
  headerTextFull: { paddingTop: 0 },
  title: { fontSize: typography.section, fontWeight: '600', flexShrink: 1 },
  subtitle: { fontSize: typography.body, lineHeight: 22, flexShrink: 1 },
  heroSubtitle: { fontSize: typography.hero, fontWeight: '600', lineHeight: 36, flexShrink: 1 },
  action: { paddingTop: 10 },
  screenAction: { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
});
