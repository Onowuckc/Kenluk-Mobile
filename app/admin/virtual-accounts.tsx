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
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

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

  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-50';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';

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
        return {
          text: 'Waiting',
          bg: isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200',
          textCol: isDark ? 'text-amber-400' : 'text-amber-700'
        };
      case 'COMPLETED':
        return {
          text: 'Completed',
          bg: isDark ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200',
          textCol: isDark ? 'text-emerald-400' : 'text-emerald-700'
        };
      case 'FAILED':
        return {
          text: 'Failed',
          bg: isDark ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50 border-red-200',
          textCol: isDark ? 'text-red-400' : 'text-red-700'
        };
      default:
        return {
          text: status,
          bg: isDark ? 'bg-slate-900/30 border-slate-800/50' : 'bg-slate-100 border-slate-200',
          textCol: isDark ? 'text-slate-400' : 'text-slate-600'
        };
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className={`px-4 py-3.5 border-b ${borderCard} ${bgCard} flex-row items-center justify-between`}>
        <View style={{ gap: 12 }} className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={20} color={isDark ? '#60A5FA' : '#1E3A8A'} />
          </TouchableOpacity>
          <View>
            <Text className={`text-base font-bold ${textTitle}`}>Virtual Accounts</Text>
            <Text className={`text-[10px] ${textMuted} mt-0.5`}>Track and credit Fidelity virtual bank transfers</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCleanup}
          disabled={cleanupMutation.isPending}
          className={`${isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50 border-blue-150'} border px-3 py-1.5 rounded-xl flex-row items-center`}
          style={{ gap: 4 }}
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
      <View style={{ gap: 8 }} className={`flex-row ${bgCard} border-b ${borderCard} p-2`}>
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
                ? isDark ? 'bg-blue-950/40 border-blue-800/60' : 'bg-blue-50 border-blue-200'
                : isDark ? 'bg-[#121E42] border-transparent' : 'bg-white border-transparent'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                statusFilter === tab.value
                  ? isDark ? 'text-blue-400' : 'text-blue-900'
                  : textMuted
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
          <View className={`flex-1 justify-center items-center py-20 ${bgCard} rounded-3xl border ${borderCard} shadow-sm mt-4`}>
            <Ionicons name="checkbox-outline" size={48} color="#94A3B8" />
            <Text className={`text-sm font-bold ${textTitle} mt-3`}>No Virtual Accounts</Text>
            <Text className={`text-xs ${textMuted} mt-1`}>No generated bank details match this criteria.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {accounts.map((acct) => {
              const badge = getStatusBadge(acct.status);

              return (
                <View key={acct._id} style={{ gap: 16 }} className={`${bgCard} border ${borderCard} rounded-3xl p-5 shadow-sm`}>
                  {/* Title block */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className={`text-sm font-bold ${textTitle}`}>{acct.userName}</Text>
                      <Text className={`text-[10px] ${textMuted} mt-0.5`}>{acct.userEmail}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      <Text className={`text-[8.5px] font-bold uppercase ${badge.textCol}`}>{badge.text}</Text>
                    </View>
                  </View>

                  {/* Bank info box */}
                  <View style={{ gap: 8 }} className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} rounded-2xl p-4`}>
                    <View className="flex-row justify-between">
                      <Text className={`text-[10px] ${textMuted}`}>Bank Details:</Text>
                      <Text className={`text-[10px] font-bold ${textTitle}`}>
                        {acct.bankName || 'N/A'} - {acct.accountNumber || 'Pending Acct No'}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className={`text-[10px] ${textMuted}`}>Account Name:</Text>
                      <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-750'}`}>{acct.accountName || 'N/A'}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className={`text-[10px] ${textMuted}`}>Reference:</Text>
                      <Text className={`text-[10px] font-bold ${textTitle} font-mono select-all`}>
                        {acct.reference || 'N/A'}
                      </Text>
                    </View>
                    <View className={`flex-row justify-between border-t ${borderCard} pt-2 mt-1.5`}>
                      <Text className={`text-[10px] ${textMuted}`}>Fund Amount:</Text>
                      <Text className={`text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>₦{acct.amount.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Operational actions */}
                  <View className="flex-row justify-between items-center pt-2">
                    <Text className={`text-[9px] ${textMuted}`}>
                      Generated: {acct.createdAt ? new Date(acct.createdAt).toLocaleString() : 'N/A'}
                    </Text>

                    {acct.status === 'WAITING_FOR_TRANSFER' && (
                      <TouchableOpacity
                        onPress={() => handleCompleteManually(acct)}
                        disabled={completeMutation.isPending}
                        className="bg-emerald-600 px-4 py-2 rounded-xl flex-row items-center"
                        style={{ gap: 4 }}
                      >
                        {completeMutation.isPending && <ActivityIndicator size="small" color="#ffffff" />}
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
