import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { RootState } from '../../src/redux/store';
import { simulationApi } from '../../src/services/api';

export default function AdminSimulationsScreen() {
  const router = useRouter();

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

  // Simulation 1: Fund Wallet
  const [fundCurrency, setFundCurrency] = useState('USDC');
  const [fundAmount, setFundAmount] = useState('');
  const [fundNetwork, setFundNetwork] = useState('Sepolia');

  // Simulation 2: Payment Lifecycle
  const [payId, setPayId] = useState('');
  const [payStatus, setPayStatus] = useState('completed');

  // Simulation 3: Tracking Lifecycle
  const [trackId, setTrackId] = useState('');
  const [trackStatus, setTrackStatus] = useState('cleared');

  // Mutations
  const fundMutation = useMutation({
    mutationFn: (data: { currency: string; amount: number; network: string }) =>
      simulationApi.simulateFundAccount(data),
    onSuccess: (res: any) => {
      Alert.alert('Funding Triggered', res.message || `Wallet credited successfully.`);
      setFundAmount('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to simulate wallet funding.');
    },
  });

  const paymentLifecycleMutation = useMutation({
    mutationFn: (data: { paymentId: string; status: string }) =>
      simulationApi.simulatePaymentLifecycle(data.paymentId, { status: data.status }),
    onSuccess: (res: any) => {
      Alert.alert('Lifecycle Updated', res.message || 'Payment state updated in database.');
      setPayId('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to trigger payment lifecycle simulation.');
    },
  });

  const trackingLifecycleMutation = useMutation({
    mutationFn: (data: { paymentId: string; trackingStatus: string }) =>
      simulationApi.simulateTrackingLifecycle(data.paymentId, { trackingStatus: data.trackingStatus }),
    onSuccess: (res: any) => {
      Alert.alert('Tracking Updated', res.message || 'Tracking state updated.');
      setTrackId('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to trigger tracking simulation.');
    },
  });

  const handleFundSim = () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive number for amount.');
      return;
    }
    fundMutation.mutate({
      currency: fundCurrency.trim().toUpperCase(),
      amount: amt,
      network: fundNetwork.trim(),
    });
  };

  const handlePaymentSim = () => {
    if (!payId.trim()) {
      Alert.alert('Validation Error', 'Payment ID is required.');
      return;
    }
    paymentLifecycleMutation.mutate({
      paymentId: payId.trim(),
      status: payStatus,
    });
  };

  const handleTrackingSim = () => {
    if (!trackId.trim()) {
      Alert.alert('Validation Error', 'Payment ID is required.');
      return;
    }
    trackingLifecycleMutation.mutate({
      paymentId: trackId.trim(),
      trackingStatus: trackStatus,
    });
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View
        className="px-4 py-3.5 border-b flex-row items-center"
        style={{ gap: 12, borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff' }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color={isDark ? '#60A5FA' : '#1E3A8A'} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className={`text-base font-bold ${textTitle}`}>Simulations Cockpit</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>Simulate blockchain events, webhook alerts and funding</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} className="p-4" style={{ flex: 1 }}>
        <View style={{ gap: 24 }}>
          {/* Sim 1: Fund Wallet */}
          <View className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Feather name="plus-circle" size={16} color="#10B981" />
              <Text className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Simulate Account Funding</Text>
            </View>
            <Text className={`text-[10px] leading-normal ${textMuted}`}>
              Credit a mock crypto balance to the platform treasury wallet address. Specify details:
            </Text>

            <View style={{ gap: 12 }}>
              <View className="flex-row" style={{ gap: 12 }}>
                <View className="flex-1">
                  <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Currency</Text>
                  <TextInput
                    value={fundCurrency}
                    onChangeText={setFundCurrency}
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    className={`border px-3 py-2 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Network</Text>
                  <TextInput
                    value={fundNetwork}
                    onChangeText={setFundNetwork}
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    className={`border px-3 py-2 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                  />
                </View>
              </View>

              <View>
                <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Fund Amount</Text>
                <TextInput
                  value={fundAmount}
                  onChangeText={setFundAmount}
                  keyboardType="numeric"
                  placeholder="e.g. 50000"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  className={`border px-4 py-2.5 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                />
              </View>

              <TouchableOpacity
                onPress={handleFundSim}
                disabled={fundMutation.isPending}
                style={{ minHeight: 40 }}
                className="bg-emerald-600 rounded-xl items-center justify-center flex-row mt-1"
              >
                {fundMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
                <Text className="text-white font-bold text-xs">Simulate Funding</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sim 2: Payment Lifecycle */}
          <View className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Feather name="activity" size={16} color="#3B82F6" />
              <Text className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Simulate Payment Lifecycle</Text>
            </View>
            <Text className={`text-[10px] leading-normal ${textMuted}`}>
              Move a specific transaction request through database status changes:
            </Text>

            <View style={{ gap: 12 }}>
              <View>
                <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Payment ID</Text>
                <TextInput
                  value={payId}
                  onChangeText={setPayId}
                  placeholder="Enter database payment ID"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  className={`border px-4 py-2.5 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                />
              </View>

              <View>
                <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Target Status</Text>
                <View className="flex-row" style={{ gap: 8 }}>
                  {['completed', 'failed', 'processing'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setPayStatus(st)}
                      className={`flex-1 py-2 rounded-lg items-center border ${
                        payStatus === st 
                          ? (isDark ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-200') 
                          : (isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50 border-slate-200')
                      }`}
                    >
                      <Text className={`text-[10px] font-bold uppercase ${payStatus === st ? (isDark ? 'text-blue-300' : 'text-blue-900') : 'text-slate-500'}`}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handlePaymentSim}
                disabled={paymentLifecycleMutation.isPending}
                style={{ minHeight: 40 }}
                className="bg-blue-600 rounded-xl items-center justify-center flex-row mt-1"
              >
                {paymentLifecycleMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
                <Text className="text-white font-bold text-xs">Simulate Status Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sim 3: Tracking Lifecycle */}
          <View className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Feather name="map-pin" size={16} color="#8B5CF6" />
              <Text className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Simulate Webhook Tracking</Text>
            </View>
            <Text className={`text-[10px] leading-normal ${textMuted}`}>
              Simulate Reap API webhook tracking status changes for a transaction request:
            </Text>

            <View style={{ gap: 12 }}>
              <View>
                <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Payment ID</Text>
                <TextInput
                  value={trackId}
                  onChangeText={setTrackId}
                  placeholder="Enter database payment ID"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  className={`border px-4 py-2.5 rounded-xl text-xs font-semibold ${inputBg} ${inputBorder} ${textInputColor}`}
                />
              </View>

              <View>
                <Text className={`text-[10px] font-semibold mb-1 pl-1 ${textMuted}`}>Tracking Status</Text>
                <View className="flex-row" style={{ gap: 8 }}>
                  {['cleared', 'processing', 'sent'].map((ts) => (
                    <TouchableOpacity
                      key={ts}
                      onPress={() => setTrackStatus(ts)}
                      className={`flex-1 py-2 rounded-lg items-center border ${
                        trackStatus === ts 
                          ? (isDark ? 'bg-purple-900/30 border-purple-600' : 'bg-purple-50 border-purple-200') 
                          : (isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50 border-slate-200')
                      }`}
                    >
                      <Text className={`text-[10px] font-bold uppercase ${trackStatus === ts ? (isDark ? 'text-purple-300' : 'text-purple-900') : 'text-slate-500'}`}>
                        {ts}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleTrackingSim}
                disabled={trackingLifecycleMutation.isPending}
                style={{ minHeight: 40 }}
                className="bg-purple-600 rounded-xl items-center justify-center flex-row mt-1"
              >
                {trackingLifecycleMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
                <Text className="text-white font-bold text-xs">Simulate Webhook Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

