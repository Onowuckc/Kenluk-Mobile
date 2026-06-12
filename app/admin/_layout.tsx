import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' } // fintech.background
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="user-details" />
    </Stack>
  );
}
