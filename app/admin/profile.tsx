import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

import { logout } from '../../src/redux/slices/authSlice';
import { RootState } from '../../src/redux/store';
import { userApi } from '../../src/services/userApi';
import { toggleTheme } from '../../src/redux/slices/themeSlice';

export default function AdminProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { user: reduxUser } = useSelector((state: RootState) => state.auth);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  // Dynamic Theme Helpers
  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textLight = isDark ? 'text-slate-300' : 'text-slate-600';
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-50';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';
  const tabBg = isDark ? 'bg-[#121E42]' : 'bg-slate-200/60';
  const activeTabBg = isDark ? 'bg-[#1E356A]' : 'bg-white';

  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Form states - Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Form states - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form states - 2FA
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMessage, setTwoFactorMessage] = useState('');
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [isDisabling2fa, setIsDisabling2fa] = useState(false);

  // Fetch backend profile settings with React Query
  const { data: profileResponse, isLoading: isProfileLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => userApi.getProfile(),
  });

  // Sync profile fields from API response
  useEffect(() => {
    if (profileResponse?.data?.user) {
      const user = profileResponse.data.user;
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [profileResponse]);

  const is2faEnabled = !!profileResponse?.data?.user?.twoFactorEnabled;

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) => userApi.updateProfile(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      Alert.alert('Success', response.message || 'Profile updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile.');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => userApi.changePassword(data),
    onSuccess: (response) => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', response.message || 'Password updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update password.');
    },
  });

  const start2faMutation = useMutation({
    mutationFn: () => userApi.startTwoFactorSetup(),
    onSuccess: (response) => {
      setTwoFactorSetup({
        qrCodeDataUrl: response.data.qrCodeDataUrl,
        manualEntryKey: response.data.manualEntryKey,
      });
      setTwoFactorMessage(response.message);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to initialize 2FA setup.');
    },
  });

  const confirm2faMutation = useMutation({
    mutationFn: (data: { twoFactorCode: string }) => userApi.confirmTwoFactorSetup(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      setTwoFactorMessage('');
      Alert.alert('Success', response.message || 'Two-factor authentication enabled!');
    },
    onError: (error: any) => {
      setTwoFactorMessage(error?.response?.data?.message || 'Invalid authenticator code. Please try again.');
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: (data: { twoFactorCode: string }) => userApi.disableTwoFactor(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      setIsDisabling2fa(false);
      setTwoFactorCode('');
      setTwoFactorMessage('');
      Alert.alert('Success', response.message || 'Two-factor authentication disabled.');
    },
    onError: (error: any) => {
      setTwoFactorMessage(error?.response?.data?.message || 'Invalid authenticator code. 2FA was not disabled.');
    },
  });

  const handleSaveProfile = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Validation Error', 'A valid email address is required.');
      return;
    }
    updateProfileMutation.mutate({ name, email });
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleStart2faSetup = () => {
    setTwoFactorMessage('');
    start2faMutation.mutate();
  };

  const handleConfirm2fa = () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      setTwoFactorMessage('Please enter a valid 6-digit verification code.');
      return;
    }
    confirm2faMutation.mutate({ twoFactorCode });
  };

  const handleDisable2fa = () => {
    if (!isDisabling2fa) {
      setIsDisabling2fa(true);
      setTwoFactorCode('');
      setTwoFactorMessage('Enter your authenticator code to confirm disabling 2FA.');
      return;
    }
    if (!/^\d{6}$/.test(twoFactorCode)) {
      setTwoFactorMessage('Please enter a valid 6-digit verification code.');
      return;
    }
    disable2faMutation.mutate({ twoFactorCode });
  };

  const handleCancel2faAction = () => {
    setTwoFactorSetup(null);
    setIsDisabling2fa(false);
    setTwoFactorCode('');
    setTwoFactorMessage('');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logout());
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const isMutationLoading =
    updateProfileMutation.isPending ||
    changePasswordMutation.isPending ||
    start2faMutation.isPending ||
    confirm2faMutation.isPending ||
    disable2faMutation.isPending;

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} className="p-4">
          
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-[11px] font-extrabold uppercase mb-0.5" style={{ color: isDark ? '#60A5FA' : '#1E3A8A', letterSpacing: 2 }}>Kenluk Pay</Text>
              <Text className={`text-xl font-bold ${textTitle}`}>Admin Profile</Text>
              <Text className={`text-xs ${textMuted} mt-0.5`}>Manage administrator account details and security</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={() => dispatch(toggleTheme())}
                style={{ width: 44, height: 44 }}
                className={`rounded-full items-center justify-center border ${isDark ? 'bg-blue-900/30 border-blue-800/40' : 'bg-blue-50 border-blue-100'}`}
              >
                <Feather name={isDark ? "sun" : "moon"} size={18} color={isDark ? "#60A5FA" : "#1E3A8A"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={{ width: 44, height: 44 }}
                className={`rounded-full items-center justify-center border ${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-100'}`}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Segmented Controls / Tabs */}
          <View className={`${tabBg} p-1 rounded-2xl flex-row mb-6`}>
            <TouchableOpacity
              onPress={() => setActiveTab('profile')}
              style={{ minHeight: 40 }}
              className={`flex-1 items-center justify-center rounded-xl py-2 ${activeTab === 'profile' ? activeTabBg + ' shadow-sm' : ''}`}
            >
              <Text className={`text-xs font-bold ${activeTab === 'profile' ? 'text-blue-500' : textMuted}`}>
                Profile Info
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('security')}
              style={{ minHeight: 40 }}
              className={`flex-1 items-center justify-center rounded-xl py-2 ${activeTab === 'security' ? activeTabBg + ' shadow-sm' : ''}`}
            >
              <Text className={`text-xs font-bold ${activeTab === 'security' ? 'text-blue-500' : textMuted}`}>
                Security & 2FA
              </Text>
            </TouchableOpacity>
          </View>

          {isProfileLoading ? (
            <View className="flex-1 justify-center py-10">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <View className="space-y-6">
              
              {/* TAB 1: PROFILE MANAGEMENT */}
              {activeTab === 'profile' && (
                <View className="space-y-6">
                  {/* Personal info Form */}
                  <View className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm space-y-4`}>
                    <Text className={`text-sm font-bold ${textTitle}`}>Admin Information</Text>

                    <View>
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Full Name</Text>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Administrator Name"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-medium`}
                      />
                    </View>

                    <View>
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Email Address</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="admin@company.com"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-medium`}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSaveProfile}
                      disabled={isMutationLoading}
                      style={{ minHeight: 44 }}
                      className="bg-blue-600 rounded-xl items-center justify-center mt-2"
                    >
                      {updateProfileMutation.isPending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-white font-bold text-sm">Save Profile Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 2: SECURITY & 2FA */}
              {activeTab === 'security' && (
                <View className="space-y-6">
                  
                  {/* Two-Factor Authentication Widget */}
                  <View className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm space-y-4`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Text className={`text-sm font-bold ${textTitle}`}>Two-Factor Authentication</Text>
                        <Text className={`text-[10px] ${textMuted} mt-0.5`}>Protect your admin account with an extra verification code step.</Text>
                      </View>
                      <View className={`px-2 py-0.5 rounded-full ${is2faEnabled ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                        <Text className={`text-[9px] font-bold uppercase ${is2faEnabled ? 'text-emerald-700' : 'text-red-700'}`}>
                          {is2faEnabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>
                    </View>

                    {/* Main setup/disable toggle buttons */}
                    {!twoFactorSetup && !isDisabling2fa && (
                      <TouchableOpacity
                        onPress={is2faEnabled ? handleDisable2fa : handleStart2faSetup}
                        disabled={isMutationLoading}
                        style={{ minHeight: 44 }}
                        className={`py-3.5 rounded-xl items-center justify-center ${is2faEnabled ? 'bg-red-50 border border-red-200' : 'bg-blue-600'}`}
                      >
                        {isMutationLoading ? (
                          <ActivityIndicator size="small" color={is2faEnabled ? '#EF4444' : '#ffffff'} />
                        ) : (
                          <Text className={`font-bold text-sm ${is2faEnabled ? 'text-red-600' : 'text-white'}`}>
                            {is2faEnabled ? 'Disable 2FA' : 'Configure Authenticator App'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* 2FA Setup Flow Panel */}
                    {twoFactorSetup && (
                      <View className={`${inputBg} border ${inputBorder} rounded-2xl p-4 space-y-4 mt-2`}>
                        <Text className={`text-xs font-bold ${textTitle}`}>Configure Authenticator</Text>
                        
                        <View className="items-center py-2 bg-white rounded-xl border border-slate-200">
                          {twoFactorSetup.qrCodeDataUrl ? (
                            <Image
                              source={{ uri: twoFactorSetup.qrCodeDataUrl }}
                              style={{ width: 180, height: 180 }}
                              resizeMode="contain"
                            />
                          ) : (
                            <ActivityIndicator size="small" color="#3B82F6" />
                          )}
                        </View>

                        <Text className={`text-[10px] ${textLight} leading-relaxed`}>
                          Scan the QR code in your authenticator app (Google Authenticator, Duo, etc.) or manually enter the key below:
                        </Text>

                        <View className={`${isDark ? 'bg-blue-950/45 border-blue-900/40' : 'bg-slate-200/50'} p-3 rounded-xl border flex-row justify-between items-center`}>
                          <View className="flex-1 mr-2">
                            <Text className={`text-[9px] ${textMuted} font-bold uppercase`}>Manual Secret Key</Text>
                            <Text className={`text-xs font-mono font-bold ${textTitle} select-all mt-0.5`}>
                              {twoFactorSetup.manualEntryKey}
                            </Text>
                          </View>
                          <Ionicons name="copy-outline" size={16} color={isDark ? '#60A5FA' : '#64748B'} />
                        </View>

                        <View className="space-y-3">
                          <Text className={`text-xs font-semibold ${textTitle}`}>Enter Verification Code</Text>
                          <TextInput
                            value={twoFactorCode}
                            onChangeText={(val) => setTwoFactorCode(val.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit code"
                            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                            keyboardType="number-pad"
                            maxLength={6}
                            className={`${isDark ? 'bg-[#0A1128] border-[#1F3978]' : 'bg-white border-slate-200'} border px-4 py-3 rounded-xl ${textInputColor} text-sm font-bold tracking-widest text-center`}
                          />
                        </View>

                        {twoFactorMessage ? (
                          <Text className="text-[10px] text-red-600 font-semibold">{twoFactorMessage}</Text>
                        ) : null}

                        <View className="flex-row space-x-2 pt-2">
                          <TouchableOpacity
                            onPress={handleConfirm2fa}
                            disabled={confirm2faMutation.isPending}
                            style={{ minHeight: 40 }}
                            className="flex-1 bg-blue-600 rounded-xl items-center justify-center"
                          >
                            {confirm2faMutation.isPending ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text className="text-white font-bold text-xs">Verify & Enable</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleCancel2faAction}
                            disabled={confirm2faMutation.isPending}
                            style={{ minHeight: 40 }}
                            className={`flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-xl items-center justify-center`}
                          >
                            <Text className={`${isDark ? 'text-slate-200' : 'text-slate-700'} font-bold text-xs`}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* 2FA Disable Flow Panel */}
                    {isDisabling2fa && (
                      <View className={`bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-4 mt-2`}>
                        <Text className="text-xs font-bold text-red-900">Disable 2FA Security</Text>
                        
                        <View className="space-y-3">
                          <Text className="text-xs font-semibold text-red-800">Authenticator Code</Text>
                          <TextInput
                            value={twoFactorCode}
                            onChangeText={(val) => setTwoFactorCode(val.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit code"
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                            maxLength={6}
                            className="bg-white border border-red-200 px-4 py-3 rounded-xl text-slate-900 text-sm font-bold tracking-widest text-center"
                          />
                        </View>

                        {twoFactorMessage ? (
                          <Text className="text-[10px] text-red-600 font-semibold">{twoFactorMessage}</Text>
                        ) : null}

                        <View className="flex-row space-x-2 pt-2">
                          <TouchableOpacity
                            onPress={handleDisable2fa}
                            disabled={disable2faMutation.isPending}
                            style={{ minHeight: 40 }}
                            className="flex-1 bg-red-600 rounded-xl items-center justify-center"
                          >
                            {disable2faMutation.isPending ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text className="text-white font-bold text-xs">Disable 2FA</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleCancel2faAction}
                            disabled={disable2faMutation.isPending}
                            style={{ minHeight: 40 }}
                            className="flex-1 bg-slate-200 rounded-xl items-center justify-center"
                          >
                            <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Change Password Form Widget */}
                  <View className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm space-y-4`}>
                    <Text className={`text-sm font-bold ${textTitle}`}>Change Password</Text>

                    <View>
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Current Password</Text>
                      <View className={`flex-row items-center ${inputBg} border ${inputBorder} rounded-xl px-3.5 py-0.5`}>
                        <TextInput
                          value={currentPassword}
                          onChangeText={setCurrentPassword}
                          placeholder="Your current password"
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          secureTextEntry={!showCurrentPassword}
                          autoCapitalize="none"
                          className={`flex-1 ${textInputColor} text-sm py-2.5`}
                        />
                        <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} className="p-1">
                          <Feather name={showCurrentPassword ? "eye-off" : "eye"} size={16} color={isDark ? '#60A5FA' : '#64748B'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View>
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>New Password</Text>
                      <View className={`flex-row items-center ${inputBg} border ${inputBorder} rounded-xl px-3.5 py-0.5`}>
                        <TextInput
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="At least 6 characters"
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          className={`flex-1 ${textInputColor} text-sm py-2.5`}
                        />
                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="p-1">
                          <Feather name={showNewPassword ? "eye-off" : "eye"} size={16} color={isDark ? '#60A5FA' : '#64748B'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View>
                      <Text className={`text-xs font-semibold ${textMuted} mb-1.5`}>Confirm New Password</Text>
                      <View className={`flex-row items-center ${inputBg} border ${inputBorder} rounded-xl px-3.5 py-0.5`}>
                        <TextInput
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="Confirm new password"
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          className={`flex-1 ${textInputColor} text-sm py-2.5`}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleChangePassword}
                      disabled={isMutationLoading}
                      style={{ minHeight: 44 }}
                      className="bg-blue-600 rounded-xl items-center justify-center mt-2"
                    >
                      {changePasswordMutation.isPending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-white font-bold text-sm">Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
