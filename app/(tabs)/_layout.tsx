import { Feather, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const THEME = {
  bg: '#080D1A',
  surface: '#0F172A',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F8FAFC',
  textMuted: '#64748B',
  tabActiveBg: 'rgba(59, 130, 246, 0.14)',
};

function BrandHeader() {
  return (
    <View style={styles.headerTitle}>
      <View style={styles.logoBadge}>
        <Feather name="share-2" size={19} color="#FFFFFF" />
      </View>
      <View style={styles.brandCopy}>
        <View style={styles.brandTitleRow}>
          <Text style={styles.brandName}>DropLink</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
        <Text style={styles.brandTagline}>Fast & Private File Transfer</Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => <BrandHeader />,
        headerStyle: {
          backgroundColor: THEME.bg,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'left',

        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Local Share',
          tabBarLabel: 'Local Share',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
              <Ionicons
                name={focused ? 'wifi' : 'wifi-outline'}
                size={22}
                color={focused ? THEME.primary : THEME.textMuted}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Internet Share',
          tabBarLabel: 'Internet Share',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
              <Ionicons
                name={focused ? 'globe' : 'globe-outline'}
                size={22}
                color={focused ? THEME.primary : THEME.textMuted}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /* Header Brand */
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primaryDark,
    shadowColor: THEME.primary,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandCopy: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.4,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.6,
  },
  brandTagline: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
    letterSpacing: 0.2,
  },

  /* Tab Bar */
  tabBar: {
    height: 66,
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 6,
    paddingBottom: 8,
    elevation: 0,
  },
  tabItem: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabIconWrap: {
    width: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabIconWrapActive: {
    backgroundColor: THEME.tabActiveBg,
  },
});