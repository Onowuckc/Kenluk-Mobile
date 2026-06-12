import React from 'react';
import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '../src/redux/store';
import '../global.css';

// Root layout configuration for Redux and safe area providers
export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F8FAFC' }, // fintech.background
          }}
        >
          {/* Main stack screens */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="admin" options={{ gestureEnabled: false }} />
          <Stack.Screen name="modals/funding" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/validation" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </Provider>
  );
}
