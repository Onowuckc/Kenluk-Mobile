import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';
  const { token, user } = useSelector((state: RootState) => state.auth);

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role !== 'admin') {
    return <Redirect href="/(tabs)/dashboard" />;
  }


  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#60A5FA' : '#2563EB',
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.4)' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#060C1E' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1E356A' : '#E2E8F0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: 64 + (insets.bottom > 0 ? insets.bottom - 4 : 0),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      {/* ── Primary tab screens ── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="registrations"
        options={{
          title: 'Registrations',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-add' : 'person-add-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* ── Secondary screens hidden from tab bar ── */}
      <Tabs.Screen name="kyc" options={{ href: null }} />
      <Tabs.Screen name="user-details" options={{ href: null }} />
      <Tabs.Screen name="rates" options={{ href: null }} />
      <Tabs.Screen name="virtual-accounts" options={{ href: null }} />
      <Tabs.Screen name="simulations" options={{ href: null }} />
    </Tabs>
  );
}
