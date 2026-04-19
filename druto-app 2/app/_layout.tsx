import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { initializeCache } from '@/lib/queryCache';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                      // Retry once instead of 3× (faster error display)
      refetchOnWindowFocus: false,   // Don't refetch when app comes back to foreground (saves battery)
      staleTime: 1000 * 60 * 5,     // 5 min global default — hooks can override
    },
  },
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import Animated, { FadeOut, withTiming, useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { View, Image, StyleSheet } from 'react-native';
import { useState } from 'react';

export default function RootLayout() {
  usePushNotifications();
  const [isAppReady, setIsAppReady] = useState(false);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) {
      console.error("Font loading error:", error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Delay briefly to ensure the first frame is rendered
      setTimeout(async () => {
        await initializeCache();
        setIsAppReady(true);
        await SplashScreen.hideAsync();
      }, 500);
    }
  }, [loaded]);

  if (!loaded) {
    return null; // Wait for fonts to load
  }

  return (
    <View style={{ flex: 1 }}>
      <RootLayoutNav />
      {/* Animated Splash Screen Overlay */}
      {!isAppReady && (
        <Animated.View
          exiting={FadeOut.duration(800)}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#900A12', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }
          ]}
          pointerEvents="none"
        >
          {/* We show the splash icon exactly as the native splash screen did */}
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
          />
        </Animated.View>
      )}
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StackScreen />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function StackScreen() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="restaurant/[slug]" />
      <Stack.Screen name="owner/dashboard" />
      <Stack.Screen name="scan/index" />
      <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
    </Stack>
  );
}
