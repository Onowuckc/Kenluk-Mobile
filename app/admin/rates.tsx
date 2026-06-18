import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { RootState } from '../../src/redux/store';
import { adminRatesApi } from '../../src/services/api';

interface RatesResponse {
  usdToNgnRate: number;
  ngnToUsdRate: number;
  lastUpdatedBy?: {
    name: string;
    email: string;
  };
  updatedAt?: string;
  notes?: string;
}

export default function AdminRatesScreen() {
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

  // Form states
  const [usdToNgn, setUsdToNgn] = useState('');
  const [ngnToUsd, setNgnToUsd] = useState('');
  const [notes, setNotes] = useState('');

  // 1. Fetch current rates
  const {
    data: rates,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-exchange-rates'],
    queryFn: () => adminRatesApi.getRates(),
  });

  useEffect(() => {
    if (rates) {
      setUsdToNgn(String(rates.usdToNgnRate || ''));
      setNgnToUsd(String(rates.ngnToUsdRate || ''));
      setNotes(rates.notes || '');
    }
  }, [rates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateRatesMutation = useMutation<any, any, { usdToNgnRate: number; ngnToUsdRate: number; notes: string }>({
    mutationFn: (data: { usdToNgnRate: number; ngnToUsdRate: number; notes: string }) =>
      adminRatesApi.updateRates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['usd-ngn-rate'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Success', 'Treasury rates updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update exchange rates.');
    },
  });

  const handleUpdate = () => {
    const usdVal = parseFloat(usdToNgn);
    const ngnVal = parseFloat(ngnToUsd);

    if (isNaN(usdVal) || usdVal <= 0 || isNaN(ngnVal) || ngnVal <= 0) {
      Alert.alert('Validation Error', 'Please enter valid positive numbers for exchange rates.');
      return;
    }

    updateRatesMutation.mutate({
      usdToNgnRate: usdVal,
      ngnToUsdRate: ngnVal,
      notes: notes.trim(),
    });
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View
        className={`px-4 py-3.5 border-b flex-row items-center`}
        style={{ gap: 12, borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff' }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color={isDark ? '#60A5FA' : '#1E3A8A'} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className={`text-base font-bold ${textTitle}`}>Treasury Rates</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>Configure exchange rates and conversion margins</Text>
        </View>
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
            <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#1E3A8A'} />
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {/* Rates Card */}
            <View className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
              <Text className={`text-xs font-bold uppercase tracking-wider pl-0.5 ${textMuted}`}>Authoritative Exchange Rates</Text>

              <View style={{ gap: 12 }}>
                <View>
                  <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>USD to NGN conversion (₦ per 1 USDC)</Text>
                  <TextInput
                    value={usdToNgn}
                    onChangeText={setUsdToNgn}
                    keyboardType="numeric"
                    placeholder="e.g. 1500"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    className={`border px-4 py-2.5 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                  />
                </View>

                <View>
                  <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>NGN to USD conversion (USDC per ₦1)</Text>
                  <TextInput
                    value={ngnToUsd}
                    onChangeText={setNgnToUsd}
                    keyboardType="numeric"
                    placeholder="e.g. 0.00067"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    className={`border px-4 py-2.5 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                  />
                </View>
              </View>
            </View>

            {/* Audit notes */}
            <View className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
              <Text className={`text-xs font-bold uppercase tracking-wider pl-0.5 ${textMuted}`}>Audit Trail & treasury Notes</Text>
              
              <View>
                <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Compliance Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Specify rate source or reason for treasury adjustment..."
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  multiline={true}
                  numberOfLines={2}
                  className={`border px-4 py-3 rounded-2xl text-xs font-semibold h-16 ${inputBg} ${inputBorder} ${textInputColor}`}
                />
              </View>
            </View>

            {/* Last updated summary info */}
            {rates?.updatedAt && (
              <View
                className={`border p-4 rounded-2xl ${isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/40 border-blue-100'}`}
                style={{ gap: 6 }}
              >
                <View className="flex-row justify-between">
                  <Text className={`text-[9px] font-semibold uppercase ${textMuted}`}>Last Updated:</Text>
                  <Text className={`text-[9px] font-bold ${isDark ? 'text-blue-300' : 'text-slate-700'}`}>
                    {new Date(rates.updatedAt).toLocaleString()}
                  </Text>
                </View>
                {rates.lastUpdatedBy && (
                  <View className="flex-row justify-between">
                    <Text className={`text-[9px] font-semibold uppercase ${textMuted}`}>Updated By:</Text>
                    <Text className={`text-[9px] font-bold ${isDark ? 'text-blue-300' : 'text-slate-700'}`}>
                      {rates.lastUpdatedBy.name} ({rates.lastUpdatedBy.email})
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={updateRatesMutation.isPending}
              style={{ minHeight: 44 }}
              className="bg-blue-600 rounded-xl items-center justify-center flex-row"
            >
              {updateRatesMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
              <Text className="text-white font-bold text-xs">Save Rates Adjustment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

