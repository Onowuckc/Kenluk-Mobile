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
  Image,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { login } from '../../src/redux/slices/authSlice';
import { authApi } from '../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const logoImg = require('../../assets/kenluk1.png');
const backgroundImg = require('../../assets/images/Procurement 3.jpg');

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMode, setTwoFactorMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string; twoFactor?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!twoFactorMode) {
      if (!email) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Invalid email address';
      }
      if (!password) {
        newErrors.password = 'Password is required';
      }
    } else {
      if (!twoFactorCode) {
        newErrors.twoFactor = '2FA code is required';
      } else if (!/^\d{6}$/.test(twoFactorCode)) {
        newErrors.twoFactor = '2FA code must be 6 digits';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});

    try {
      if (twoFactorMode) {
        const response = await authApi.verifyTwoFactor({ email, twoFactorCode });
        if (response.success && response.data.tokens && response.data.user) {
          dispatch(login({ user: response.data.user, token: response.data.tokens.accessToken }));
          if (response.data.user.role === 'admin') {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } else {
          setErrors({ general: response.message || 'Invalid 2FA code.' });
        }
        return;
      }

      const isAdmin = email.includes('admin');
      const response = isAdmin 
        ? await authApi.adminLogin({ email, password }) 
        : await authApi.login({ email, password });

      if (response.success) {
        if (response.data?.twoFactorRequired) {
          setTwoFactorMode(true);
          return;
        }

        if (response.data?.tokens && response.data?.user) {
          dispatch(login({ user: response.data.user, token: response.data.tokens.accessToken }));
          if (response.data.user.role === 'admin') {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } else {
          setErrors({ general: response.message || 'Login failed.' });
        }
      } else {
        setErrors({ general: response.message || 'Login failed. Please check credentials.' });
      }
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.message || 'Server connection failed. Please try again.' });
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
                  <Feather name="lock" size={20} color="#ffffff" />
                </View>
                <Text className="text-xl font-bold text-white tracking-tight">Welcome Back</Text>
                <Text className="text-xs text-blue-200 mt-1">Sign in to Kenluk Pay</Text>
              </LinearGradient>

              <View className="p-6">


                {errors.general && (
                  <View className="bg-red-50 border border-red-200 p-3.5 rounded-xl mb-4 flex-row items-center space-x-2">
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text className="text-red-600 text-xs flex-1">{errors.general}</Text>
                  </View>
                )}

                {!twoFactorMode ? (
                  <View className="space-y-4">
                    {/* Email Input */}
                    <View>
                      <Text className="text-xs font-semibold text-slate-700 mb-1.5">Email Address</Text>
                      <View className={`flex-row items-center bg-white border ${errors.email ? 'border-red-400' : focusedField === 'email' ? 'border-blue-500' : 'border-slate-200'} rounded-xl px-3.5 py-0.5`}>
                        <Feather name="mail" size={16} color={focusedField === 'email' ? '#2563EB' : '#94A3B8'} className="mr-2" />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="you@company.com"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="flex-1 text-slate-900 text-sm py-2.5"
                        />
                      </View>
                      {errors.email && <Text className="text-red-500 text-[10px] mt-1">{errors.email}</Text>}
                    </View>

                    {/* Password Input */}
                    <View>
                      <Text className="text-xs font-semibold text-slate-700 mb-1.5">Password</Text>
                      <View className={`flex-row items-center bg-white border ${errors.password ? 'border-red-400' : focusedField === 'password' ? 'border-blue-500' : 'border-slate-200'} rounded-xl px-3.5 py-0.5`}>
                        <Feather name="key" size={16} color={focusedField === 'password' ? '#2563EB' : '#94A3B8'} className="mr-2" />
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Enter your password"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          className="flex-1 text-slate-900 text-sm py-2.5"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                          <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                      {errors.password && <Text className="text-red-500 text-[10px] mt-1">{errors.password}</Text>}
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} className="self-end py-1">
                      <Text className="text-xs text-blue-600 font-semibold">Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="space-y-4">
                    {/* 2FA Input */}
                    <View>
                      <Text className="text-xs font-semibold text-slate-700 mb-1.5">6-Digit 2FA Code</Text>
                      <View className={`flex-row items-center bg-white border ${errors.twoFactor ? 'border-red-400' : focusedField === '2fa' ? 'border-blue-500' : 'border-slate-200'} rounded-xl px-3.5 py-0.5`}>
                        <Feather name="shield" size={16} color={focusedField === '2fa' ? '#2563EB' : '#94A3B8'} className="mr-2" />
                        <TextInput
                          value={twoFactorCode}
                          onChangeText={setTwoFactorCode}
                          onFocus={() => setFocusedField('2fa')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="123456"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={6}
                          className="flex-1 text-slate-900 text-sm py-2.5 font-bold tracking-widest text-center"
                        />
                      </View>
                      {errors.twoFactor && <Text className="text-red-500 text-[10px] mt-1">{errors.twoFactor}</Text>}
                    </View>

                    <TouchableOpacity onPress={() => setTwoFactorMode(false)} className="py-1">
                      <Text className="text-xs text-blue-600 font-semibold">Back to password login</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Login button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  className="bg-blue-600 py-3.5 rounded-xl items-center mt-6 justify-center flex-row shadow-sm shadow-blue-500/25 active:bg-blue-700"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : (
                    <Feather name="log-in" size={16} color="#ffffff" className="mr-2" />
                  )}
                  <Text className="text-white font-bold text-sm">
                    {twoFactorMode ? 'Verify 2FA' : 'Sign In'}
                  </Text>
                </TouchableOpacity>

                {/* Footer switcher */}
                <View className="flex-row justify-center mt-6 border-t border-slate-100 pt-4">
                  <Text className="text-xs text-slate-500">New to Kenluk Pay? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                    <Text className="text-xs text-blue-600 font-bold">Create an Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
