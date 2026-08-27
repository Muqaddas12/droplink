import React from 'react';
import { Tabs } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

function TabBarIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={[styles.tabIcon, { color }]}>{symbol}</Text>;
}
export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        /*
         * HEADER
         */

        headerShown: true,

        headerTitle: () => (
          <View
            style={styles.headerTitle}
          >
            <View style={styles.logo}>
              <Text
                style={styles.logoText}
              >
                D
              </Text>
            </View>

            <View>
              <Text
                style={styles.brandName}
              >
                DropLink
              </Text>

              <Text
                style={styles.brandTagline}
              >
                Share files anywhere
              </Text>
            </View>
          </View>
        ),

        headerStyle: {
          backgroundColor: '#f8fafc',
        },

        headerShadowVisible: false,

        headerTitleAlign: 'left',

        /*
         * SIMPLE BOTTOM NAV
         */

        tabBarActiveTintColor:
          '#2563eb',

        tabBarInactiveTintColor:
          '#9ca3af',

        tabBarStyle:
          styles.tabBar,

        tabBarLabelStyle:
          styles.tabLabel,

        tabBarIconStyle:
          styles.tabIconStyle,

        tabBarItemStyle:
          styles.tabItem,

        tabBarShowLabel: true,
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: 'Local Share',

          tabBarLabel: 'Local Share',

          tabBarIcon: ({
            color,
          }) => (
            <TabBarIcon
              symbol="⌁"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: 'Internet Share',

          tabBarLabel:
            'Internet Share',

          tabBarIcon: ({
            color,
          }) => (
            <TabBarIcon
              symbol="◎"
              color={color}
            />
          ),
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({

  /*
   * HEADER
   */

  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    width: 38,
    height: 38,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#2563eb',

    marginRight: 10,
  },

  logoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  brandName: {
    fontSize: 19,
    lineHeight: 21,

    fontWeight: '900',

    color: '#111827',

    letterSpacing: -0.3,
  },

  brandTagline: {
    marginTop: 1,

    fontSize: 10,

    fontWeight: '600',

    color: '#9ca3af',
  },


  /*
   * ORIGINAL-STYLE BOTTOM BAR
   */

  tabBar: {
    height: 64,

    backgroundColor: '#ffffff',

    borderTopWidth: 1,

    borderTopColor: '#e5e7eb',

    elevation: 8,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -2,
    },

    shadowOpacity: 0.06,

    shadowRadius: 8,

    paddingTop: 4,

    paddingBottom: 5,
  },

  tabItem: {
    height: 58,
  },

  tabLabel: {
    fontSize: 11,

    fontWeight: '700',

    marginTop: -1,
  },

  tabIcon: { fontSize: 24, fontWeight: '700',
    marginBottom: -2,
  },

  tabIconStyle: {
    marginTop: 2,
  },

});