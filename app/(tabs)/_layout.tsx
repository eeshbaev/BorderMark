import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ColorValue,
  type PressableStateCallbackType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { WhereAreYouSheet } from '@/presentation/components/WhereAreYouSheet';
import { useTheme } from '@/presentation/hooks/useTheme';

type TabIconName = keyof typeof Ionicons.glyphMap;

const ADD_FAB_SIZE = 83;
const ADD_FAB_ICON = 53;
/** Content height of the tab bar above the safe-area inset (matches minHeight math). */
const TAB_BAR_BODY = 56;
/** Index of the add placeholder tab among the four bottom tabs. */
const ADD_TAB_INDEX = 1;
const TAB_COUNT = 4;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fabLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
  },
  addTabPlaceholder: {
    flex: 1,
  },
  addFab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#0F1B2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
});

function TabIcon({ name, color }: { name: TabIconName; color: ColorValue }) {
  return <Ionicons name={name} size={22} color={color} accessibilityElementsHidden />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [addVisible, setAddVisible] = useState(false);
  const tabBarBottom = Math.max(insets.bottom, 10);
  /** Center of FAB sits on the tab bar top edge so the circle extends above the border. */
  const addFabBottom = tabBarBottom + TAB_BAR_BODY - ADD_FAB_SIZE / 2;
  /** Align with the add tab slot (not screen center — four equal tabs). */
  const addFabLeft = (windowWidth * (ADD_TAB_INDEX + 0.5)) / TAB_COUNT - ADD_FAB_SIZE / 2;

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            minHeight: TAB_BAR_BODY + tabBarBottom,
            paddingBottom: tabBarBottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home tab',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarButton: ({ ref: _ref, style }) => (
              <View style={[style, styles.addTabPlaceholder]} pointerEvents="none" accessibilityElementsHidden />
            ),
          }}
          listeners={{ tabPress: (event) => event.preventDefault() }}
        />
        <Tabs.Screen
          name="journey"
          options={{
            title: 'Journey',
            tabBarAccessibilityLabel: 'Journey tab',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'map' : 'map-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarAccessibilityLabel: 'Profile tab',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'person' : 'person-outline'} color={color} />
            ),
          }}
        />
      </Tabs>
      <View pointerEvents="box-none" style={styles.fabLayer}>
        <Pressable
          onPress={() => setAddVisible(true)}
          style={({ pressed }: PressableStateCallbackType) => [
            styles.addFab,
            {
              left: addFabLeft,
              bottom: addFabBottom,
              width: ADD_FAB_SIZE,
              height: ADD_FAB_SIZE,
              borderRadius: ADD_FAB_SIZE / 2,
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Record where you are"
          accessibilityHint="Opens location picker to add your current stay"
        >
          <Ionicons name="add" size={ADD_FAB_ICON} color={colors.onPrimary} accessibilityElementsHidden />
        </Pressable>
      </View>
      <WhereAreYouSheet visible={addVisible} onClose={() => setAddVisible(false)} />
    </View>
  );
}
