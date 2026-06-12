import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';
import { fetchWalletSummary } from '../../src/redux/slices/walletSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ratesApi } from '../../src/services/api';

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user } = useSelector((state: RootState) => state.auth);
  const { summary, loading: walletLoading } = useSelector((state: RootState) => state.wallet || { summary: null, loading: false });

  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');

  const fetchRate = useCallback(async () => {
    try {
      setRateLoading(true);
      setRateError('');
      const data = await ratesApi.getUsdNgnRate();
      setRate(data.usdToNgnRate);
    } catch (err) {
      console.error(err);
      setRateError('Unable to load exchange rate');
    } finally {
      setRateLoading(false);
    }
  }, []);

  const loadData = () => {
    dispatch(fetchWalletSummary() as any);
    fetchRate();
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const balance = summary?.balance || 0;
  const totalFunded = summary?.totalFunded || 0;
  const totalUsed = summary?.totalUsed || 0;
  const currency = summary?.currency || 'NGN';

  const formatCurrency = (amount: number) => {
    return (currency === 'NGN' ? '₦' : '$') + amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const utilizationRate = totalFunded > 0 ? Math.round((totalUsed / totalFunded) * 100) : 0;
  const isApproved = user?.verificationStatus === 'verified';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="p-4"
        refreshControl={
          <RefreshControl refreshing={walletLoading || rateLoading} onRefresh={loadData} colors={['#1E3A8A']} />
        }
      >
        {/* Header section */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center space-x-2">
              <Text className="text-xl font-bold text-slate-900">
                Welcome, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Customer'}!
              </Text>
              <View className={`px-2 py-0.5 rounded-full border ${isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <Text className={`text-[10px] font-bold uppercase ${isApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isApproved ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-slate-500 mt-0.5">
              Manage your international payments and account settings
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center border border-blue-100"
          >
            <Feather name="user" size={18} color="#1E3A8A" />
          </TouchableOpacity>
        </View>

        {/* Balance Card Widget using LinearGradient */}
        <View className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm mb-6">
          {/* Top Balance section */}
          <LinearGradient
            colors={['#1E3A8A', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="wallet-outline" size={18} color="#BFDBFE" />
                <Text className="text-blue-200 text-xs font-semibold">Account Balance</Text>
              </View>
              <TouchableOpacity onPress={loadData} disabled={walletLoading || rateLoading}>
                <Ionicons
                  name="refresh"
                  size={16}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            <Text className="text-3xl font-bold text-white tracking-tight leading-none mb-1">
              {formatCurrency(balance)}
            </Text>
            <Text className="text-blue-300 text-[10px]">Available for vendor payments</Text>
          </LinearGradient>

          {/* Stats section */}
          <View className="p-5 space-y-4">
            <View className="flex-row space-x-3">
              <View className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <View className="flex-row items-center space-x-1 mb-1">
                  <Feather name="trending-up" size={12} color="#059669" />
                  <Text className="text-emerald-700 text-[9px] font-bold uppercase tracking-wider">Total Funded</Text>
                </View>
                <Text className="text-sm font-bold text-emerald-800 leading-tight">
                  {formatCurrency(totalFunded)}
                </Text>
                <Text className="text-[9px] text-emerald-600 mt-0.5">Total deposited</Text>
              </View>

              <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <View className="flex-row items-center space-x-1 mb-1">
                  <Feather name="trending-down" size={12} color="#475569" />
                  <Text className="text-slate-600 text-[9px] font-bold uppercase tracking-wider">Total Used</Text>
                </View>
                <Text className="text-sm font-bold text-slate-800 leading-tight">
                  {formatCurrency(totalUsed)}
                </Text>
                <Text className="text-[9px] text-slate-500 mt-0.5">Total spent</Text>
              </View>
            </View>

            {/* Utilization Bar */}
            {totalFunded > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs text-slate-500">Utilization</Text>
                  <Text className="text-xs font-semibold text-slate-800">{utilizationRate}%</Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
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

            {/* Fund Account Action button */}
            <TouchableOpacity
              onPress={() => router.push('/modals/funding')}
              className="bg-blue-600 py-3 rounded-xl items-center justify-center flex-row space-x-1.5 mt-2"
            >
              <Feather name="plus" size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Fund Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live USDC Rate Card (matching web ticker) */}
        <View className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
          <View className="flex-row items-center space-x-2 mb-2">
            <Feather name="trending-up" size={16} color="#10B981" />
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">Exchange Rate Ticker</Text>
          </View>
          {rateLoading ? (
            <ActivityIndicator size="small" color="#1E3A8A" className="py-2" />
          ) : rateError ? (
            <Text className="text-red-500 text-xs">{rateError}</Text>
          ) : (
            <View>
              <Text className="text-xl font-bold text-slate-800">
                1 USDC = NGN {rate?.toLocaleString() || '---'}
              </Text>
              <Text className="text-[10px] text-slate-500 mt-1">
                Official platform rate set by administrator.
              </Text>
            </View>
          )}
        </View>

        {/* Verification / Document Upload Banner */}
        {!isApproved && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center justify-between mb-6 shadow-sm"
          >
            <View className="flex-1 pr-3">
              <View className="flex-row items-center space-x-1.5 mb-1">
                <Ionicons name="alert-circle" size={16} color="#D97706" />
                <Text className="text-amber-800 text-[10px] font-bold uppercase tracking-wider">Action Required</Text>
              </View>
              <Text className="text-xs font-bold text-amber-900 leading-tight">Complete KYC Verification</Text>
              <Text className="text-[10px] text-amber-700 mt-0.5">Upload identification to lift payment limits.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Quick Menu Options */}
        <Text className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Quick Actions</Text>
        <View className="flex-row space-x-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/payments')}
            className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center shadow-xs"
          >
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Feather name="send" size={16} color="#3B82F6" />
            </View>
            <Text className="text-xs font-bold text-slate-800">Send Money</Text>
            <Text className="text-[9px] text-slate-400 mt-0.5 text-center">To Reap / Local Bank</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/history')}
            className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center shadow-xs"
          >
            <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mb-2">
              <Feather name="file-text" size={16} color="#10B981" />
            </View>
            <Text className="text-xs font-bold text-slate-800">History</Text>
            <Text className="text-[9px] text-slate-400 mt-0.5 text-center">Check statements</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
