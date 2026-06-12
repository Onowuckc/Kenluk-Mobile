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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authApi } from '../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const logoImg = require('../../assets/splash-icon.png');
const backgroundImg = require('../../assets/images/Procurement 3.jpg');

export default function VerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; fromForgot?: string }>();

  const email = params.email || '';
  const isForgotMode = params.fromForgot === 'true';

  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleVerify = async () => {
    if (!otpCode) {
      setStatus({ type: 'error', message: 'Verification OTP code is required' });
      return;
    }

    if (isForgotMode && (!newPassword || newPassword !== confirmPassword)) {
      setStatus({ type: 'error', message: 'Passwords must match and not be empty' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      if (isForgotMode) {
        const response = await authApi.resetPassword({
          email,
          token: otpCode,
          password: newPassword
        });

        if (response.success) {
          setStatus({ type: 'success', message: 'Password reset successfully!' });
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1500);
        } else {
          setStatus({ type: 'error', message: response.message || 'Verification failed.' });
        }
      } else {
        const response = await authApi.verifyEmail({ email, code: otpCode });
        if (response.success) {
          setStatus({ type: 'success', message: 'Account verified successfully!' });
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1500);
        } else {
          setStatus({ type: 'error', message: response.message || 'Verification failed.' });
        }
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'A network error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setStatus(null);
    try {
      const response = await authApi.resendVerificationCode({ email });
      if (response.success) {
        setStatus({ type: 'success', message: 'Verification OTP resent to ' + email });
      } else {
        setStatus({ type: 'error', message: response.message || 'Unable to resend OTP.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Failed to resend code.' });
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
                  <Feather name="shield" size={20} color="#ffffff" />
                </View>
                <Text className="text-xl font-bold text-white tracking-tight">
                  {isForgotMode ? 'Verify Reset' : 'Verify Account'}
                </Text>
                <Text className="text-xs text-blue-200 mt-1 text-center">
                  Enter the code sent to {email || 'your email'}
                </Text>
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
                  {/* OTP Input */}
                  <View>
                    <Text className="text-xs font-semibold text-slate-700 mb-1.5">Verification Code</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                      <Feather name="key" size={16} color="#94A3B8" className="mr-2" />
                      <TextInput
                        value={otpCode}
                        onChangeText={setOtpCode}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        className="flex-1 text-slate-900 text-sm py-2.5 font-bold tracking-widest text-center"
                      />
                    </View>
                  </View>

                  {/* Reset Password Form elements */}
                  {isForgotMode && (
                    <>
                      <View>
                        <Text className="text-xs font-semibold text-slate-700 mb-1.5">New Password</Text>
                        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                          <Feather name="lock" size={16} color="#94A3B8" className="mr-2" />
                          <TextInput
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="At least 6 characters"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                            autoCapitalize="none"
                            className="flex-1 text-slate-900 text-sm py-2.5"
                          />
                        </View>
                      </View>

                      <View>
                        <Text className="text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</Text>
                        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                          <Feather name="lock" size={16} color="#94A3B8" className="mr-2" />
                          <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                            autoCapitalize="none"
                            className="flex-1 text-slate-900 text-sm py-2.5"
                          />
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Verify button */}
                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={isLoading}
                  className="bg-blue-600 py-3.5 rounded-xl items-center mt-6 justify-center flex-row shadow-sm shadow-blue-500/25 active:bg-blue-700"
                >
                  {isLoading && <ActivityIndicator size="small" color="#ffffff" className="mr-2" />}
                  <Text className="text-white font-bold text-sm">
                    {isForgotMode ? 'Reset Password' : 'Verify Account'}
                  </Text>
                </TouchableOpacity>

                {!isForgotMode && (
                  <TouchableOpacity onPress={handleResendOtp} className="mt-4 items-center py-2">
                    <Text className="text-xs text-blue-600 font-bold">Resend Verification Code</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="mt-2 items-center py-2">
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
