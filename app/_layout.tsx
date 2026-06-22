import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistGate } from 'redux-persist/integration/react';
import * as Notifications from 'expo-notifications';
import { store, persistor } from '../src/redux/store';
import { RootState } from '../src/redux/store';
import { registerForPushNotificationsAsync } from '../src/services/notificationService';
import '../global.css';

const queryClient = new QueryClient();

function AppLayout() {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  // Register push notifications when token and user are loaded
  useEffect(() => {
    if (token && user) {
      registerForPushNotificationsAsync();
    }
  }, [token, user]);

  // Set up listeners for notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'history') {
        if (user?.role === 'admin') {
          router.push('/admin/payments');
        } else {
          router.push('/(tabs)/payments');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, router]);

  return (
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
  );
}

// Root layout configuration for Redux and safe area providers
export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppLayout />
          </SafeAreaProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}


