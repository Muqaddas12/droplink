import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';

function TabIcon({
  symbol,
  focused,
  activeColor,
  activeFade,
  inactiveColor,
}: {
  symbol: string;
  focused: boolean;
  activeColor: string;
  activeFade: string;
  inactiveColor: string;
}) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused && { backgroundColor: activeFade },
      ]}
    >
      <Text style={[styles.iconText, { color: focused ? activeColor : inactiveColor }]}>
        {symbol}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { openSidebar, receivedCount } = useSidebar();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.bg,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        sceneStyle: {
          backgroundColor: colors.bg,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={openSidebar}
            activeOpacity={0.7}
            style={[styles.menuButton, { backgroundColor: colors.surface2 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
            {receivedCount > 0 && (
              <View style={[styles.menuBadgeDot, { backgroundColor: colors.primary, borderColor: colors.bg }]} />
            )}
          </TouchableOpacity>
        ),
        headerTitle: () => (
          <View style={styles.headerTitle}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoLetter}>D</Text>
            </View>
            <View>
              <Text style={[styles.brandName, { color: colors.text }]}>DropLink</Text>
              <Text style={[styles.tagline, { color: colors.subtext }]}>
                Private · Fast · Local
              </Text>
            </View>
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface1,
            borderTopColor: colors.border,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Local Share',
          tabBarLabel: 'Local Share',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="⊕"
              focused={focused}
              activeColor={colors.primary}
              activeFade={colors.primaryFade}
              inactiveColor={colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Internet Share',
          tabBarLabel: 'Internet Share',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="◎"
              focused={focused}
              activeColor={colors.accent}
              activeFade={colors.accentFade}
              inactiveColor={colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginRight: 4,
    position: 'relative',
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  menuBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  tabBar: {
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 6,
    paddingTop: 4,
    elevation: 0,
  },
  tabItem: { height: 58 },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  iconWrap: {
    width: 34,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconText: {
    fontSize: 20,
  },
});