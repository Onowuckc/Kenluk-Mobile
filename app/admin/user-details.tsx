import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

import { adminApi } from '../../src/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  accountStatus: 'pending' | 'approved' | 'rejected';
  companyName?: string;
  phone?: string;
}

export default function UserDetailsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  // Fetch specific user
  const {
    data: responseData,
    isLoading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: () => adminApi.getUserById(userId!),
    enabled: Boolean(userId),
  });

  const user = responseData?.data as User;

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Sync profile fields from query response
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCompanyName(user.companyName || '');
      setPhone(user.phone || '');
      setIsVerified(Boolean(user.isVerified));
      setIsAdmin(Boolean(user.isAdmin));
    }
  }, [user]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (userData: any) => adminApi.updateUser(userId!, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      Alert.alert('Success', 'User profile updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update user.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Deleted', 'User deleted successfully.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete user.');
    },
  });

  const approveAccountMutation = useMutation({
    mutationFn: () => adminApi.approveAccount(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Approved', 'Account approved successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve account.');
    },
  });

  const rejectAccountMutation = useMutation({
    mutationFn: (reason: string) => adminApi.rejectAccount(userId!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Rejected', 'Account has been rejected.');
      setShowRejectModal(false);
      setRejectionReason('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reject account.');
    },
  });

  const handleUpdate = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Name and Email are required.');
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      companyName: companyName.trim(),
      phone: phone.trim(),
      isVerified,
      isAdmin,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user profile? This action is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const handleApproveAccount = () => {
    Alert.alert(
      'Approve Account',
      'Approve onboarding registrations for this user and activate payment services?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve User',
          onPress: () => approveAccountMutation.mutate(),
        },
      ]
    );
  };

  const handleRejectAccount = () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      Alert.alert('Validation Error', 'Rejection reason must be at least 10 characters.');
      return;
    }
    rejectAccountMutation.mutate(rejectionReason.trim());
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A8A" />
      </SafeAreaView>
    );
  }

  if (isError || !user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center p-6">
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-sm font-bold text-slate-800 mt-3">Failed to load user details.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-blue-600 px-6 py-2.5 rounded-xl">
          <Text className="text-white font-bold text-xs">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white flex-row items-center space-x-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">User Inspector</Text>
          <Text className="text-[10px] text-slate-400 mt-0.5">Admin profile and account moderation workflow</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} className="p-4 space-y-6">
        {/* Onboarding Status Decisions */}
        {user.accountStatus === 'pending' && (
          <View className="bg-amber-50 border border-amber-250 p-5 rounded-3xl space-y-3 shadow-sm">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="alert-circle" size={16} color="#B45309" />
              <Text className="text-xs font-bold text-amber-900">Onboarding Status: Pending</Text>
            </View>
            <Text className="text-[10px] text-amber-700 leading-relaxed">
              This user has submitted onboarding verification. Review their profile details below and make an onboarding approval decision.
            </Text>
            <View className="flex-row space-x-2.5 pt-1">
              <TouchableOpacity
                onPress={() => setShowRejectModal(true)}
                className="flex-1 bg-white border border-red-200 py-2.5 rounded-xl items-center"
              >
                <Text className="text-red-650 text-red-650 text-red-650 text-red-600 font-bold text-xs">Reject User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApproveAccount}
                className="flex-1 bg-emerald-600 py-2.5 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-xs">Approve User</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* User Card Info Form */}
        <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Account Metadata</Text>

          <View className="space-y-3">
            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter user name"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
              />
            </View>

            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
              />
            </View>

            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Company Name</Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Company Name"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
              />
            </View>

            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
              />
            </View>
          </View>
        </View>

        {/* Credentials Toggles */}
        <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Permissions & Verification</Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-xs font-bold text-slate-700">Verified Status</Text>
                <Text className="text-[9px] text-slate-400 mt-0.5">Toggle verification badge</Text>
              </View>
              <Switch value={isVerified} onValueChange={setIsVerified} />
            </View>

            <View className="flex-row justify-between items-center border-t border-slate-50 pt-4">
              <View>
                <Text className="text-xs font-bold text-slate-700">Admin Privileges</Text>
                <Text className="text-[9px] text-slate-400 mt-0.5">Grant administrative control credentials</Text>
              </View>
              <Switch value={isAdmin} onValueChange={setIsAdmin} />
            </View>
          </View>
        </View>

        {/* Update & Delete Actions */}
        <View className="space-y-3">
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={updateMutation.isPending}
            style={{ minHeight: 44 }}
            className="bg-blue-600 rounded-xl items-center justify-center flex-row"
          >
            {updateMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
            <Text className="text-white font-bold text-xs">Save Update changes</Text>
          </TouchableOpacity>

          {!user.isAdmin && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
              style={{ minHeight: 44 }}
              className="bg-red-50 border border-red-200 rounded-xl items-center justify-center flex-row"
            >
              {deleteMutation.isPending && <ActivityIndicator size="small" color="#EF4444" className="mr-1.5" />}
              <Text className="text-red-650 text-red-650 text-red-600 font-bold text-xs">Delete User profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Rejection Modal */}
      <Modal visible={showRejectModal} animationType="slide" transparent={true} onRequestClose={() => setShowRejectModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 space-y-4">
            <View className="flex-row justify-between items-center border-b border-slate-100 pb-3 mb-1">
              <View>
                <Text className="text-base font-bold text-slate-800">Reject User Onboarding</Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">Specify reasons for rejecting user verification</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRejectModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="space-y-2">
              <Text className="text-xs font-semibold text-slate-700">Rejection reason (Min 10 characters)</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="State reasons: failed BVN match, invalid document copies, etc."
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
                className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 text-xs font-medium h-20"
              />
            </View>

            <View className="flex-row space-x-3 pt-2">
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                className="flex-1 bg-slate-100 rounded-xl items-center justify-center py-3"
              >
                <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRejectAccount}
                disabled={rejectAccountMutation.isPending}
                className="flex-1 bg-red-65 bg-red-600 rounded-xl items-center justify-center flex-row py-3"
              >
                {rejectAccountMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
                <Text className="text-white font-bold text-xs">Reject Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
