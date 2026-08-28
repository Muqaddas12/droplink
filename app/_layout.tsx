import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';

import { AppLaunchOverlay } from '@/components/AppLaunchOverlay';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isDark, colors } = useTheme();

  const navTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        background: colors.bg,
        card: colors.surface1,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [isDark, colors]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="received-files" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
      </Stack>
      <Sidebar />
      <AppLaunchOverlay />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      <SidebarProvider>
        <RootNavigator />
      </SidebarProvider>
    </ThemeProvider>
  );
}