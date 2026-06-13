import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

import { adminApi } from '../../src/services/api';

interface VirtualAccount {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  reference?: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminVirtualAccountsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Status Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'WAITING_FOR_TRANSFER' | 'COMPLETED' | 'FAILED'>('all');

  // 1. Fetch virtual accounts
  const {
    data: responseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-virtual-accounts-list', statusFilter],
    queryFn: () => adminApi.getVirtualAccounts(statusFilter !== 'all' ? `?status=${statusFilter}` : ''),
  });

  const accounts = useMemo(() => {
    return (responseData?.data?.virtualAccounts || []) as VirtualAccount[];
  }, [responseData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Mutations
  const cleanupMutation = useMutation({
    mutationFn: () => adminApi.cleanupVirtualAccounts(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-accounts-list'] });
      Alert.alert(
        'Cleanup Successful',
        `Cleaned up stale accounts. Matched: ${res.data?.matched}, Modified: ${res.data?.modified}`
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to cleanup stale accounts.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (paymentId: string) => adminApi.completeVirtualAccount(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-accounts-list'] });
      Alert.alert('Success', 'Virtual account marked as completed and user wallet has been credited.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to manually complete virtual account payment.');
    },
  });

  const handleCleanup = () => {
    Alert.alert(
      'Cleanup Stale Accounts',
      'This will search for and terminate any pending virtual accounts that failed generation. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Cleanup',
          onPress: () => cleanupMutation.mutate(),
        },
      ]
    );
  };

  const handleCompleteManually = (account: VirtualAccount) => {
    Alert.alert(
      'Manual Completion',
      `Force complete the deposit of ₦${account.amount.toLocaleString()} for ${account.userName}? This credits their wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Credit Wallet',
          onPress: () => completeMutation.mutate(account._id),
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_FOR_TRANSFER':
        return { text: 'Waiting', bg: 'bg-amber-55 bg-amber-50 border-amber-200', textCol: 'text-amber-700' };
      case 'COMPLETED':
        return { text: 'Completed', bg: 'bg-emerald-50 border-emerald-200', textCol: 'text-emerald-700' };
      case 'FAILED':
        return { text: 'Failed', bg: 'bg-red-50 border-red-200', textCol: 'text-red-700' };
      default:
        return { text: status, bg: 'bg-slate-100 border-slate-200', textCol: 'text-slate-600' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-bold text-slate-800">Virtual Accounts</Text>
            <Text className="text-[10px] text-slate-400 mt-0.5">Track and credit Fidelity virtual bank transfers</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCleanup}
          disabled={cleanupMutation.isPending}
          className="bg-blue-50 border border-blue-150 px-3 py-1.5 rounded-xl flex-row items-center space-x-1"
        >
          {cleanupMutation.isPending ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Feather name="refresh-cw" size={11} color="#2563EB" />
          )}
          <Text className="text-blue-700 font-bold text-[10px]">Cleanup Stale</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-slate-100 p-2 space-x-2">
        {[
          { label: 'All', value: 'all' as const },
          { label: 'Waiting', value: 'WAITING_FOR_TRANSFER' as const },
          { label: 'Completed', value: 'COMPLETED' as const },
          { label: 'Failed', value: 'FAILED' as const },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setStatusFilter(tab.value)}
            className={`flex-1 py-2 items-center rounded-xl border ${
              statusFilter === tab.value
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-transparent'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                statusFilter === tab.value ? 'text-blue-900' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        className="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        {isLoading && !refreshing ? (
          <View className="flex-1 justify-center py-20">
            <ActivityIndicator size="large" color="#1E3A8A" />
          </View>
        ) : accounts.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <Ionicons name="checkbox-outline" size={48} color="#94A3B8" />
            <Text className="text-sm font-bold text-slate-800 mt-3">No Virtual Accounts</Text>
            <Text className="text-xs text-slate-400 mt-1">No generated bank details match this criteria.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {accounts.map((acct) => {
              const badge = getStatusBadge(acct.status);

              return (
                <View key={acct._id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                  {/* Title block */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-slate-800">{acct.userName}</Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">{acct.userEmail}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      <Text className={`text-[8.5px] font-bold uppercase ${badge.textCol}`}>{badge.text}</Text>
                    </View>
                  </View>

                  {/* Bank info box */}
                  <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-[10px] text-slate-400">Bank Details:</Text>
                      <Text className="text-[10px] font-bold text-slate-700">
                        {acct.bankName || 'N/A'} - {acct.accountNumber || 'Pending Acct No'}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-[10px] text-slate-400">Account Name:</Text>
                      <Text className="text-[10px] font-bold text-slate-750">{acct.accountName || 'N/A'}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-[10px] text-slate-400">Reference:</Text>
                      <Text className="text-[10px] font-bold text-slate-700 font-mono select-all">
                        {acct.reference || 'N/A'}
                      </Text>
                    </View>
                    <View className="flex-row justify-between border-t border-slate-150 pt-2 mt-1.5">
                      <Text className="text-[10px] text-slate-400">Fund Amount:</Text>
                      <Text className="text-xs font-bold text-blue-900">₦{acct.amount.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Operational actions */}
                  <View className="flex-row justify-between items-center pt-2">
                    <Text className="text-[9px] text-slate-400">
                      Generated: {acct.createdAt ? new Date(acct.createdAt).toLocaleString() : 'N/A'}
                    </Text>

                    {acct.status === 'WAITING_FOR_TRANSFER' && (
                      <TouchableOpacity
                        onPress={() => handleCompleteManually(acct)}
                        disabled={completeMutation.isPending}
                        className="bg-emerald-600 px-4 py-2 rounded-xl flex-row items-center space-x-1"
                      >
                        {completeMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1" />}
                        <Feather name="check-circle" size={11} color="#ffffff" />
                        <Text className="text-white font-bold text-[10px]">Force Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
