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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const logoImg = require('../../assets/splash-icon.png');
const backgroundImg = require('../../assets/images/Procurement 3.jpg');

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    <SafeAreaView className="flex-1 bg-slate-950" edges={[]}>
      <ImageBackground
        source={backgroundImg}
        resizeMode="cover"
        className="flex-1"
        imageStyle={{ opacity: 0.3 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6 justify-center">
            <View className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-w-sm w-full self-center">
              {/* Header banner */}
              <LinearGradient
                colors={['#1E3A8A', '#1D4ED8']}
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
                {/* Logo and branding title */}
                <View className="items-center mb-6">
                  <Image 
                    source={logoImg} 
                    className="w-12 h-12 rounded-2xl mb-1" 
                    resizeMode="contain" 
                  />
                  <Text className="text-sm font-bold text-slate-800">KENLUK PAY</Text>
                </View>

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
                    <Text className="text-xs font-semibold text-slate-700 mb-1.5">Email Address</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                      <Feather name="mail" size={16} color="#94A3B8" className="mr-2" />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@company.com"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="flex-1 text-slate-900 text-sm py-2.5"
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
                  <Text className="text-xs text-slate-500 font-semibold">Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
