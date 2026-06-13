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
import { Ionicons, Feather } from '@expo/vector-icons';

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

  // Mutation
  const updateRatesMutation = useMutation({
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white flex-row items-center space-x-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">Treasury Rates</Text>
          <Text className="text-[10px] text-slate-400 mt-0.5">Configure exchange rates and conversion margins</Text>
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
            <ActivityIndicator size="large" color="#1E3A8A" />
          </View>
        ) : (
          <View className="space-y-6">
            {/* Rates Card */}
            <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Authoritative Exchange Rates</Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">USD to NGN conversion (₦ per 1 USDC)</Text>
                  <TextInput
                    value={usdToNgn}
                    onChangeText={setUsdToNgn}
                    keyboardType="numeric"
                    placeholder="e.g. 1500"
                    className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
                  />
                </View>

                <View>
                  <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">NGN to USD conversion (USDC per ₦1)</Text>
                  <TextInput
                    value={ngnToUsd}
                    onChangeText={setNgnToUsd}
                    keyboardType="numeric"
                    placeholder="e.g. 0.00067"
                    className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
                  />
                </View>
              </View>
            </View>

            {/* Audit notes */}
            <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0.5">Audit Trail & treasury Notes</Text>
              
              <View>
                <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Compliance Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Specify rate source or reason for treasury adjustment..."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={2}
                  className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 text-xs font-semibold h-16"
                />
              </View>
            </View>

            {/* Last updated summary info */}
            {rates?.updatedAt && (
              <View className="bg-blue-50/40 border border-blue-100 p-4 rounded-2xl space-y-1.5">
                <View className="flex-row justify-between">
                  <Text className="text-[9px] text-slate-400 font-semibold uppercase">Last Updated:</Text>
                  <Text className="text-[9px] font-bold text-slate-700">
                    {new Date(rates.updatedAt).toLocaleString()}
                  </Text>
                </View>
                {rates.lastUpdatedBy && (
                  <View className="flex-row justify-between">
                    <Text className="text-[9px] text-slate-400 font-semibold uppercase">Updated By:</Text>
                    <Text className="text-[9px] font-bold text-slate-700">
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
