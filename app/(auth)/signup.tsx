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
import { authApi } from '../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

const logoImg = require('../../assets/kenluk1.png');
const backgroundImg = require('../../assets/images/Procurement 3.jpg');

export default function SignupScreen() {
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
  const borderDivider = isDark ? 'border-blue-950/40' : 'border-slate-100';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!form.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.signup({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password,
      });

      if (response.success) {
        router.push({
          pathname: '/(auth)/verification',
          params: { email: form.email }
        });
      } else {
        setErrors({ general: response.message || 'Signup failed.' });
      }
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.message || 'Server connection failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
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
            <View className={`rounded-3xl shadow-2xl overflow-hidden border max-w-sm w-full self-center my-8 ${bgCard} ${borderCard}`}>
              {/* Header banner */}
              <LinearGradient
                colors={isDark ? ['#1E3A8A', '#0F1E43'] : ['#1E3A8A', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="px-6 py-8 items-center relative"
              >
                <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center mb-3 border border-white/10">
                  <Feather name="user-plus" size={20} color="#ffffff" />
                </View>
                <Text className="text-xl font-bold text-white tracking-tight">Create Account</Text>
                <Text className="text-xs text-blue-200 mt-1">Get started with Kenluk Pay</Text>
              </LinearGradient>

              <View className="p-6">


                {errors.general && (
                  <View className="bg-red-50 border border-red-200 p-3.5 rounded-xl mb-4 flex-row items-center space-x-2">
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text className="text-red-600 text-xs flex-1">{errors.general}</Text>
                  </View>
                )}

                <View className="space-y-4">
                  {/* First Name & Last Name row */}
                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>First Name</Text>
                      <View className={`flex-row items-center ${inputBg} border ${errors.firstName ? 'border-red-400' : focusedField === 'firstName' ? 'border-blue-500' : inputBorder} rounded-xl px-2.5 py-0.5`}>
                        <Feather name="user" size={14} color={focusedField === 'firstName' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 6 }} />
                        <TextInput
                          value={form.firstName}
                          onChangeText={(v) => updateForm('firstName', v)}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="John"
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          className={`flex-1 ${textInputColor} text-sm py-2`}
                        />
                      </View>
                      {errors.firstName && <Text className="text-red-500 text-[9px] mt-0.5">{errors.firstName}</Text>}
                    </View>

                    <View className="flex-1">
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Last Name</Text>
                      <View className={`flex-row items-center ${inputBg} border ${errors.lastName ? 'border-red-400' : focusedField === 'lastName' ? 'border-blue-500' : inputBorder} rounded-xl px-2.5 py-0.5`}>
                        <Feather name="user" size={14} color={focusedField === 'lastName' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 6 }} />
                        <TextInput
                          value={form.lastName}
                          onChangeText={(v) => updateForm('lastName', v)}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Doe"
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          className={`flex-1 ${textInputColor} text-sm py-2`}
                        />
                      </View>
                      {errors.lastName && <Text className="text-red-500 text-[9px] mt-0.5">{errors.lastName}</Text>}
                    </View>
                  </View>

                  {/* Email Input */}
                  <View>
                    <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Email Address</Text>
                    <View className={`flex-row items-center ${inputBg} border ${errors.email ? 'border-red-400' : focusedField === 'email' ? 'border-blue-500' : inputBorder} rounded-xl px-3 py-0.5`}>
                      <Feather name="mail" size={16} color={focusedField === 'email' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 8 }} />
                      <TextInput
                        value={form.email}
                        onChangeText={(v) => updateForm('email', v)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="you@company.com"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className={`flex-1 ${textInputColor} text-sm py-2.5`}
                      />
                    </View>
                    {errors.email && <Text className="text-red-500 text-[10px] mt-1">{errors.email}</Text>}
                  </View>

                  {/* Phone Input */}
                  <View>
                    <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Phone Number</Text>
                    <View className={`flex-row items-center ${inputBg} border ${errors.phoneNumber ? 'border-red-400' : focusedField === 'phoneNumber' ? 'border-blue-500' : inputBorder} rounded-xl px-3 py-0.5`}>
                      <Feather name="phone" size={16} color={focusedField === 'phoneNumber' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 8 }} />
                      <TextInput
                        value={form.phoneNumber}
                        onChangeText={(v) => updateForm('phoneNumber', v)}
                        onFocus={() => setFocusedField('phoneNumber')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="+234..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        keyboardType="phone-pad"
                        className={`flex-1 ${textInputColor} text-sm py-2.5`}
                      />
                    </View>
                    {errors.phoneNumber && <Text className="text-red-500 text-[10px] mt-1">{errors.phoneNumber}</Text>}
                  </View>

                  {/* Password Input */}
                  <View>
                    <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Password</Text>
                    <View className={`flex-row items-center ${inputBg} border ${errors.password ? 'border-red-400' : focusedField === 'password' ? 'border-blue-500' : inputBorder} rounded-xl px-3 py-0.5`}>
                      <Feather name="lock" size={16} color={focusedField === 'password' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 8 }} />
                      <TextInput
                        value={form.password}
                        onChangeText={(v) => updateForm('password', v)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Min. 6 characters"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        className={`flex-1 ${textInputColor} text-sm py-2.5`}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                        <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={isDark ? '#60A5FA' : '#64748B'} />
                      </TouchableOpacity>
                    </View>
                    {errors.password && <Text className="text-red-500 text-[10px] mt-1">{errors.password}</Text>}
                  </View>

                  {/* Confirm Password Input */}
                  <View>
                    <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Confirm Password</Text>
                    <View className={`flex-row items-center ${inputBg} border ${errors.confirmPassword ? 'border-red-400' : focusedField === 'confirmPassword' ? 'border-blue-500' : inputBorder} rounded-xl px-3 py-0.5`}>
                      <Feather name="lock" size={16} color={focusedField === 'confirmPassword' ? '#3B82F6' : (isDark ? '#475569' : '#94A3B8')} style={{ marginRight: 8 }} />
                      <TextInput
                        value={form.confirmPassword}
                        onChangeText={(v) => updateForm('confirmPassword', v)}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Re-enter password"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        className={`flex-1 ${textInputColor} text-sm py-2.5`}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                        <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={16} color={isDark ? '#60A5FA' : '#64748B'} />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && <Text className="text-red-500 text-[10px] mt-1">{errors.confirmPassword}</Text>}
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  onPress={handleSignup}
                  disabled={isLoading}
                  className="bg-blue-600 py-3.5 rounded-xl items-center mt-6 justify-center flex-row shadow-sm shadow-blue-500/25 active:bg-blue-700"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : (
                    <Feather name="user-plus" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  )}
                  <Text className="text-white font-bold text-sm">Create Account</Text>
                </TouchableOpacity>

                {/* Switch to login */}
                <View className={`flex-row justify-center mt-6 border-t ${borderDivider} pt-4`}>
                  <Text className={`text-xs ${textMuted}`}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                    <Text className={`text-xs ${textLink} font-bold`}>Sign In</Text>
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
