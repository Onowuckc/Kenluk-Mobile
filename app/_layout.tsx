import React from 'react';
import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../src/redux/store';
import '../global.css';

const queryClient = new QueryClient();

// Root layout configuration for Redux and safe area providers
export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
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
              <Stack.Screen name="modals/kyc" options={{ presentation: 'modal' }} />
            </Stack>
          </SafeAreaProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

