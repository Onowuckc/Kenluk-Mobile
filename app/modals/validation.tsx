import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ValidationModal() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
      <Text className="text-base font-bold text-fintech-text mb-2">Payment Verification</Text>
      <Text className="text-xs text-fintech-textMuted text-center mb-6">
        Verifying transaction status with Fidelity Core APIs...
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-fintech-primary px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-bold text-xs">Dismiss</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
