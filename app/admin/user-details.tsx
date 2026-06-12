import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserDetailsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 justify-center items-center p-6 bg-fintech-background">
      <Text className="text-lg font-bold text-fintech-text mb-2">User Details Inspector</Text>
      <Text className="text-xs text-fintech-textMuted text-center mb-6">
        This screen allows administrators to examine uploaded user registration papers.
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-fintech-primary px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-bold text-xs">Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
