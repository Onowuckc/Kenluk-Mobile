import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

export default function ValidationModal() {
  const router = useRouter();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-white';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <SafeAreaView className={`flex-1 justify-center items-center p-6 ${bgMain}`}>
      <Text className={`text-base font-bold ${textTitle} mb-2`}>Payment Verification</Text>
      <Text className={`text-xs ${textMuted} text-center mb-6`}>
        Verifying transaction status with Fidelity Core APIs...
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-blue-600 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-bold text-xs">Dismiss</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
