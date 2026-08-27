import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AppLaunchOverlay } from '@/components/AppLaunchOverlay';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => { void SplashScreen.hideAsync(); }, []);

  return (
    <>
      <Stack><Stack.Screen name="(tabs)" options={{ headerShown: false }} /></Stack>
      <AppLaunchOverlay />
    </>
  );
}