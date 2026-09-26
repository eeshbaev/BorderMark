import { Pressable, StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/presentation/components/AccessibleText';
import { useTheme } from '@/presentation/hooks/useTheme';
import { spacing, typography } from '@/presentation/theme';

export type JourneyViewMode = 'timeline' | 'places';

interface JourneyTabBarProps {
  mode: JourneyViewMode;
  onChange: (mode: JourneyViewMode) => void;
}

export function JourneyTabBar({ mode, onChange }: JourneyTabBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="tablist"
    >
      <TabButton
        label="Timeline"
        selected={mode === 'timeline'}
        onPress={() => onChange('timeline')}
        accessibilityLabel="Timeline view"
      />
      <TabButton
        label="Places"
        selected={mode === 'places'}
        onPress={() => onChange('places')}
        accessibilityLabel="Places view"
      />
    </View>
  );
}

function TabButton({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.tab,
        {
          backgroundColor: selected ? colors.background : 'transparent',
          borderColor: selected ? colors.border : 'transparent',
        },
      ]}
    >
      <AccessibleText style={{ color: selected ? colors.text : colors.textSecondary, fontWeight: selected ? '700' : '500' }}>
        {label}
      </AccessibleText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
