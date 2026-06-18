import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { RootState } from '../../src/redux/store';
import { fetchWalletSummary } from '../../src/redux/slices/walletSlice';
import { ratesApi, paymentsApi, kycApi, authApi } from '../../src/services/api';
import { updateUser } from '../../src/redux/slices/authSlice';
import { toggleTheme } from '../../src/redux/slices/themeSlice';

interface PaymentRequest {
  _id?: string;
  recipientCompany: string;
  localAmount: number;
  status: string;
  rejectionReason?: string;
  createdAt?: string;
}

interface KycDocument {
  _id: string;
  type: string;
  status: string;
  rejectionReason?: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { user } = useSelector((state: RootState) => state.auth);
  const { summary, loading: walletLoading } = useSelector((state: RootState) => state.wallet || { summary: null, loading: false });
  
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textLight = isDark ? 'text-slate-300' : 'text-slate-600';
  const bgMuted = isDark ? 'bg-[#152757]' : 'bg-slate-50';
  const borderMuted = isDark ? 'border-[#1F3978]' : 'border-slate-200';

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: rateData,
    isLoading: isRateLoading,
    isError: isRateError,
    error: rateError,
    refetch: refetchRate,
  } = useQuery({
    queryKey: ['usd-ngn-rate'],
    queryFn: () => ratesApi.getUsdNgnRate(),
    refetchInterval: 300000,
    staleTime: 60000,
  });

  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.getMyPayments(),
    staleTime: 30000,
  });

  const {
    data: documentsData,
    isLoading: isDocumentsLoading,
    isError: isDocumentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => kycApi.getMyDocuments(),
    staleTime: 30000,
  });

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchWalletSummary() as any);
      authApi.verify().then((res) => {
        if (res.success && res.data?.user) {
          dispatch(updateUser(res.data.user));
        }
      }).catch(err => console.log('Sync user verification error:', err));
    }, [dispatch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(fetchWalletSummary() as any);
    
    const syncUserPromise = authApi.verify().then((res) => {
      if (res.success && res.data?.user) {
        dispatch(updateUser(res.data.user));
      }
    }).catch(err => console.log('Sync user verification error:', err));

    await Promise.all([
      refetchRate(),
      refetchPayments(),
      refetchDocuments(),
      syncUserPromise,
    ]);
    setRefreshing(false);
  }, [dispatch, refetchRate, refetchPayments, refetchDocuments]);

  const exchangeRate = rateData?.usdToNgnRate || null;
  const rateUpdatedAt = rateData?.updatedAt ? new Date(rateData.updatedAt).toLocaleString() : '';

  const paymentsList = useMemo(() => {
    return (paymentsData?.payments || []) as PaymentRequest[];
  }, [paymentsData]);

  const pendingCount = useMemo(() => {
    return paymentsList.filter((p) => p.status === 'pending_admin_approval').length;
  }, [paymentsList]);

  const completedCount = useMemo(() => {
    return paymentsList.filter((p) => p.status === 'completed').length;
  }, [paymentsList]);

  const spendingTrend = useMemo(() => {
    const now = new Date();
    const outflowStatuses = new Set(['approved', 'processing', 'completed']);
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: MONTH_NAMES[date.getMonth()],
        spend: 0,
        outflow: 0,
      };
    });

    paymentsList.forEach((payment) => {
      if (!payment.createdAt) return;
      const createdAt = new Date(payment.createdAt);
      if (isNaN(createdAt.getTime())) return;

      const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = months.find((month) => month.key === monthKey);
      if (!bucket) return;

      const amount = Number(payment.localAmount) || 0;
      bucket.spend += amount;
      if (outflowStatuses.has(payment.status)) {
        bucket.outflow += amount;
      }
    });

    return months;
  }, [paymentsList]);

  const maxTrendValue = useMemo(() => {
    const values = spendingTrend.map((pt) => Math.max(pt.spend, pt.outflow));
    return Math.max(1, ...values);
  }, [spendingTrend]);

  const balance = summary?.balance || 0;
  const totalFunded = summary?.totalFunded || 0;
  const totalUsed = summary?.totalUsed || 0;
  const currency = summary?.currency || 'NGN';

  const formatCurrency = (amount: number, code: string = 'NGN') => {
    const symbol = code === 'NGN' ? '₦' : '$';
    return (
      <Text>
        <Text style={{ fontWeight: '400' }}>{symbol}</Text>
        {amount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </Text>
    );
  };

  const utilizationRate = totalFunded > 0 ? Math.round((totalUsed / totalFunded) * 100) : 0;
  const isApproved = user?.accountStatus === 'approved';

  const totalSpendSum = spendingTrend.reduce((sum, pt) => sum + pt.spend, 0);
  const totalOutflowSum = spendingTrend.reduce((sum, pt) => sum + pt.outflow, 0);

  const isGlobalLoading = isRateLoading || isPaymentsLoading || isDocumentsLoading || walletLoading;

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        className="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1 pr-3">
            <Text className="text-[11px] font-extrabold uppercase mb-0.5" style={{ color: isDark ? '#60A5FA' : '#1E3A8A', letterSpacing: 2 }}>Kenluk Pay</Text>
            <View className="flex-row items-center flex-wrap">
              <Text className={`text-xl font-bold ${textTitle} mr-2`}>
                Welcome, {user?.name || 'Customer'}!
              </Text>
              <View className={`px-2 py-0.5 rounded-full border ${isApproved ? (isDark ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200') : (isDark ? 'bg-amber-950/30 border-amber-800/60' : 'bg-amber-50 border-amber-200')}`}>
                <Text className={`text-[10px] font-bold uppercase ${isApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isApproved ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text className={`text-xs ${textMuted} mt-1`}>
              Manage your international payments and account settings
            </Text>
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
              onPress={() => router.push('/(tabs)/profile')}
              style={{ width: 44, height: 44 }}
              className={`rounded-full items-center justify-center border ${isDark ? 'bg-blue-900/30 border-blue-800/40' : 'bg-blue-50 border-blue-100'}`}
            >
              <Feather name="user" size={18} color={isDark ? "#60A5FA" : "#1E3A8A"} />
            </TouchableOpacity>
          </View>
        </View>

        <View className={`rounded-3xl overflow-hidden border shadow-sm mb-6 ${bgCard} ${borderCard}`}>
          <LinearGradient
            colors={isDark ? ['#1E3A8A', '#0F1E43'] : ['#1E3A8A', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="wallet-outline" size={18} color="#BFDBFE" />
                <Text className="text-blue-200 text-xs font-semibold">Account Balance</Text>
              </View>
              <TouchableOpacity onPress={onRefresh} disabled={isGlobalLoading}>
                <Ionicons name="refresh" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-baseline mb-1">
              <Text className="text-xl text-white mr-0.5" style={{ fontWeight: '500' }}>
                {currency === 'NGN' ? '₦' : '$'}
              </Text>
              <Text className="text-3xl font-bold text-white tracking-tight leading-none">
                {balance.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </Text>
            </View>
            <Text className="text-blue-300 text-[10px]">Available for vendor payments</Text>
          </LinearGradient>
          <View className="p-5">
            <View className="flex-row space-x-3 mb-4">
              <View className={`flex-1 rounded-2xl p-4 border ${isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'}`}>
                <View className="flex-row items-center mb-1">
                  <Feather name="trending-up" size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Total Funded</Text>
                </View>
                <Text className={`text-sm font-bold leading-tight ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                  {formatCurrency(totalFunded, currency)}
                </Text>
                <Text className={`text-[9px] mt-0.5 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>Total deposited</Text>
              </View>

              <View className={`flex-1 rounded-2xl p-4 border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <View className="flex-row items-center mb-1">
                  <Feather name="trending-down" size={12} color={isDark ? '#94A3B8' : '#475569'} style={{ marginRight: 4 }} />
                  <Text className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Used</Text>
                </View>
                <Text className={`text-sm font-bold leading-tight ${textTitle}`}>
                  {formatCurrency(totalUsed, currency)}
                </Text>
                <Text className={`text-[9px] mt-0.5 ${textMuted}`}>Total spent</Text>
              </View>
            </View>

            {totalFunded > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className={`text-xs ${textMuted}`}>Utilization</Text>
                  <Text className={`text-xs font-semibold ${textTitle}`}>{utilizationRate}%</Text>
                </View>
                <View className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <View
                    className={`h-full rounded-full ${
                      utilizationRate > 80
                        ? 'bg-red-500'
                        : utilizationRate > 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.push('/modals/funding')}
              style={{ minHeight: 44 }}
              className="bg-blue-600 rounded-xl items-center justify-center flex-row"
            >
              <Feather name="plus" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text className="text-white font-bold text-sm">Fund Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className={`rounded-2xl p-5 border shadow-sm mb-6 ${bgCard} ${borderCard}`}>
          <View className="flex-row items-center mb-3">
            <Feather name="trending-up" size={16} color="#10B981" style={{ marginRight: 6 }} />
            <Text className={`text-xs font-bold ${textTitle} uppercase tracking-wider`}>USDC to NGN Exchange Rate</Text>
          </View>
          {isRateLoading ? (
            <View className="h-10 justify-center">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : isRateError ? (
            <Text className="text-red-500 text-xs">{(rateError as any)?.message || 'Unable to load exchange rate'}</Text>
          ) : (
            <View>
              <Text className={`text-2xl font-bold ${textTitle}`}>
                1 USDC = NGN {exchangeRate?.toLocaleString() || '---'}
              </Text>
              <Text className={`text-[10px] ${textMuted} mt-1`}>
                Official rate set by admin.{rateUpdatedAt ? ` Last Updated: ${rateUpdatedAt}` : ''}
              </Text>
            </View>
          )}
        </View>

        {!isApproved && (
          <TouchableOpacity
            onPress={() => router.push('/modals/kyc' as any)}
            style={{ minHeight: 64 }}
            className={`border rounded-2xl p-4 flex-row items-center justify-between mb-6 shadow-sm ${isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-200'}`}
          >
            <View className="flex-1 pr-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="alert-circle" size={16} color="#D97706" style={{ marginRight: 4 }} />
                <Text className={`${isDark ? 'text-amber-400' : 'text-amber-800'} text-[10px] font-bold uppercase tracking-wider`}>Action Required</Text>
              </View>
              <Text className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>Complete KYC Verification</Text>
              <Text className={`text-[10px] ${isDark ? 'text-amber-400/80' : 'text-amber-700'} mt-0.5`}>Upload required company documents to activate payments.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </TouchableOpacity>
        )}

        <View className={`rounded-2xl p-5 border shadow-sm mb-6 ${bgCard} ${borderCard}`}>
          <Text className={`text-xs font-bold ${textTitle} uppercase tracking-wider mb-4`}>Quick Stats</Text>
          <View className="flex-row">
            <View className={`flex-1 border-r ${isDark ? 'border-blue-950' : 'border-slate-100'} py-1 items-center`}>
              <Text className={`text-xl font-bold ${textTitle}`}>{isPaymentsLoading ? '...' : pendingCount}</Text>
              <Text className={`text-[9px] ${textMuted} uppercase font-bold tracking-wider mt-1 text-center`}>Pending Payments</Text>
            </View>
            <View className={`flex-1 border-r ${isDark ? 'border-blue-950' : 'border-slate-100'} py-1 items-center`}>
              <Text className={`text-xl font-bold ${textTitle}`}>{isPaymentsLoading ? '...' : completedCount}</Text>
              <Text className={`text-[9px] ${textMuted} uppercase font-bold tracking-wider mt-1 text-center`}>Completed Txns</Text>
            </View>
            <View className="flex-1 py-1 items-center">
              <View className={`px-2 py-0.5 rounded-full ${isApproved ? (isDark ? 'bg-emerald-950/30 border border-emerald-900/40' : 'bg-emerald-100') : (isDark ? 'bg-amber-950/30 border border-amber-900/40' : 'bg-amber-100')}`}>
                <Text className={`text-[9px] font-bold uppercase ${isApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isApproved ? 'Approved' : 'Pending'}
                </Text>
              </View>
              <Text className={`text-[9px] ${textMuted} uppercase font-bold tracking-wider mt-1.5 text-center`}>Status</Text>
            </View>
          </View>
        </View>

        <View className={`rounded-2xl p-5 border shadow-sm mb-6 ${bgCard} ${borderCard}`}>
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-2">
              <Text className={`text-sm font-bold ${textTitle}`}>Spending Over Time</Text>
              <Text className={`text-[10px] ${textMuted} mt-0.5`}>Track submitted spend versus outflow (Last 6 Months)</Text>
            </View>
            <View className="items-end space-y-1">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-1.5" />
                <Text className={`text-[9px] ${textMuted}`}>Spend</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
                <Text className={`text-[9px] ${textMuted}`}>Outflow</Text>
              </View>
            </View>
          </View>

          {isPaymentsLoading ? (
            <View className="h-32 justify-center">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : (
            <View>
              <View className={`flex-row items-end justify-between h-36 border-b ${isDark ? 'border-blue-950/60' : 'border-slate-100'} pb-2`}>
                {spendingTrend.map((point) => {
                  const spendHeight = (point.spend / maxTrendValue) * 100;
                  const outflowHeight = (point.outflow / maxTrendValue) * 100;

                  return (
                    <View key={point.key} className="flex-1 items-center mx-1">
                      <View className="flex-row items-end justify-center w-full h-28 space-x-1.5">
                        <View style={{ height: `${spendHeight}%` }} className="w-2.5 rounded-t bg-blue-600" />
                        <View style={{ height: `${outflowHeight}%` }} className="w-2.5 rounded-t bg-emerald-500" />
                      </View>
                      <Text className={`text-[9px] font-semibold ${textLight} mt-2`}>{point.label}</Text>
                    </View>
                  );
                })}
              </View>

              <View className="flex-row space-x-3 mt-4">
                <View className={`flex-1 border rounded-xl p-3 ${bgMuted} ${borderMuted}`}>
                  <Text className={`text-[9px] ${textMuted} font-bold uppercase tracking-wider`}>Total Submitted</Text>
                  <Text className={`text-xs font-bold ${textTitle} mt-0.5`}>{formatCurrency(totalSpendSum, 'NGN')}</Text>
                </View>
                <View className={`flex-1 border rounded-xl p-3 ${bgMuted} ${borderMuted}`}>
                  <Text className={`text-[9px] ${textMuted} font-bold uppercase tracking-wider`}>Total Outflow</Text>
                  <Text className={`text-xs font-bold ${textTitle} mt-0.5`}>{formatCurrency(totalOutflowSum, 'NGN')}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Recent Wallet Transactions */}
        <View className={`rounded-2xl p-5 border shadow-sm mb-6 ${bgCard} ${borderCard}`}>
          <Text className={`text-xs font-bold ${textTitle} uppercase tracking-wider mb-4`}>
            Recent Wallet Transactions
          </Text>
          {(!summary?.recentTransactions || summary.recentTransactions.length === 0) ? (
            <Text className={`text-xs ${textMuted} text-center py-4`}>No recent wallet activity.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {summary.recentTransactions.map((tx: any, idx: number) => {
                const isCredit = tx.type === 'credit';
                const sign = isCredit ? '+' : '-';
                const txColor = isCredit ? 'text-emerald-500' : 'text-rose-500';
                const iconName = isCredit ? 'arrow-down-left' : 'arrow-up-right';
                const iconColor = isCredit ? '#10B981' : '#EF4444';
                const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

                return (
                  <View
                    key={idx}
                    className={`flex-row items-center justify-between pb-3 ${
                      idx !== summary.recentTransactions.length - 1 ? `border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}` : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                        <Feather name={iconName} size={14} color={iconColor} />
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className={`text-xs font-bold ${textTitle}`}>
                          {tx.description || (isCredit ? 'Wallet Funding' : 'Payment Debit')}
                        </Text>
                        <Text className={`text-[10px] ${textMuted} mt-0.5`}>{date}</Text>
                      </View>
                    </View>
                    <Text className={`text-xs font-extrabold ${txColor}`}>
                      {sign}{formatCurrency(tx.amount, currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Text className={`text-xs font-bold ${textTitle} uppercase tracking-wider mb-3`}>Quick Navigation</Text>
        <View className="flex-row flex-wrap justify-between">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/payments')}
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-blue-950' : 'bg-blue-50'}`}>
              <Feather name="send" size={14} color={isDark ? '#60A5FA' : '#3B82F6'} />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>Make Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/history')}
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
              <Feather name="file-text" size={14} color="#10B981" />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>My Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/modals/kyc' as any)}
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-amber-950/30' : 'bg-amber-50'}`}>
              <Feather name="shield" size={14} color="#D97706" />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>KYC Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-purple-950/30' : 'bg-purple-50'}`}>
              <Feather name="settings" size={14} color="#8B5CF6" />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>Security Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
