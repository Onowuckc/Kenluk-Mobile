import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

const backgroundImg = require('../../assets/images/Procurement 3.jpg');

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Auth screens consistently use the default theme (isDark = false)
  const isDark = false;

  // Dynamic Theme Helpers
  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-900';
  const bgCard = isDark ? 'bg-[#0F1E43]/90' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]/60' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-700';
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-white';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';
  const textLink = isDark ? 'text-blue-400' : 'text-blue-600';

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleReset = async () => {
    if (!email) {
      setStatus({ type: 'error', message: 'Email address is required' });
      return;
    }
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await authApi.forgotPassword({ email });
      if (response.success) {
        setStatus({ type: 'success', message: response.message || 'OTP code sent to email.' });
        setTimeout(() => {
          router.push({
            pathname: '/(auth)/verification',
            params: { email, fromForgot: 'true' }
          });
        }, 1500);
      } else {
        setStatus({ type: 'error', message: response.message || 'Unable to request password reset.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'A network error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={[]}>
      <ImageBackground
        source={backgroundImg}
        resizeMode="cover"
        className="flex-1"
        imageStyle={{ opacity: isDark ? 0.15 : 0.3 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="p-6">
            <View className={`rounded-3xl shadow-2xl overflow-hidden border max-w-sm w-full self-center ${bgCard} ${borderCard}`}>
              {/* Header banner */}
              <LinearGradient
                colors={isDark ? ['#1E3A8A', '#0F1E43'] : ['#1E3A8A', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="px-6 py-8 items-center relative"
              >
                <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center mb-3 border border-white/10">
                  <Feather name="key" size={20} color="#ffffff" />
                </View>
                <Text className="text-xl font-bold text-white tracking-tight">Reset Password</Text>
                <Text className="text-xs text-blue-200 mt-1">Enter email to request reset OTP</Text>
              </LinearGradient>

              <View className="p-6">
                {status && (
                  <View className={`p-3.5 rounded-xl mb-4 border flex-row items-center space-x-2 ${status.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <Feather name={status.type === 'success' ? 'check-circle' : 'alert-circle'} size={16} color={status.type === 'success' ? '#059669' : '#EF4444'} />
                    <Text className={`text-xs flex-1 ${status.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {status.message}
                    </Text>
                  </View>
                )}

                <View className="space-y-4">
                  <View>
                    <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Email Address</Text>
                    <View className={`flex-row items-center ${inputBg} border ${focusedField === 'email' ? 'border-blue-500' : inputBorder} rounded-xl px-3.5 py-0.5`}>
                      <Feather name="mail" size={16} color={focusedField === 'email' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 8 }} />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="you@company.com"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className={`flex-1 ${textInputColor} text-sm py-2.5`}
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={isLoading}
                  className="bg-blue-600 py-3.5 rounded-xl items-center mt-6 justify-center flex-row shadow-sm shadow-blue-500/25 active:bg-blue-700"
                >
                  {isLoading && <ActivityIndicator size="small" color="#ffffff" className="mr-2" />}
                  <Text className="text-white font-bold text-sm">Send Reset OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} className="mt-4 items-center py-2">
                  <Text className={`text-xs ${textLink} font-semibold`}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
