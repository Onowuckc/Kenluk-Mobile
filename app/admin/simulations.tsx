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

import { simulationApi } from '../../src/services/api';

export default function AdminSimulationsScreen() {
  const router = useRouter();

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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white flex-row items-center space-x-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">Simulations Cockpit</Text>
          <Text className="text-[10px] text-slate-400 mt-0.5">Simulate blockchain events, webhook alerts and funding</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} className="p-4 space-y-6">
        
        {/* Sim 1: Fund Wallet */}
        <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <View className="flex-row items-center space-x-2">
            <Feather name="plus-circle" size={16} color="#10B981" />
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulate Account Funding</Text>
          </View>
          <Text className="text-[10px] text-slate-450 leading-normal">
            Credit a mock crypto balance to the platform treasury wallet address. Specify details:
          </Text>

          <View className="space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Currency</Text>
                <TextInput
                  value={fundCurrency}
                  onChangeText={setFundCurrency}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 text-xs font-semibold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Network</Text>
                <TextInput
                  value={fundNetwork}
                  onChangeText={setFundNetwork}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 text-xs font-semibold"
                />
              </View>
            </View>

            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Fund Amount</Text>
              <TextInput
                value={fundAmount}
                onChangeText={setFundAmount}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
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
        <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <View className="flex-row items-center space-x-2">
            <Feather name="activity" size={16} color="#3B82F6" />
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulate Payment Lifecycle</Text>
          </View>
          <Text className="text-[10px] text-slate-450 leading-normal">
            Move a specific transaction request through database status changes:
          </Text>

          <View className="space-y-3">
            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Payment ID</Text>
              <TextInput
                value={payId}
                onChangeText={setPayId}
                placeholder="Enter database payment ID"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
              />
            </View>

            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1 font-sans">Target Status</Text>
              <View className="flex-row space-x-2">
                {['completed', 'failed', 'processing'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setPayStatus(st)}
                    className={`flex-1 py-2 rounded-lg items-center border ${
                      payStatus === st ? 'bg-blue-50 border-blue-250' : 'bg-slate-50 border-slate-150'
                    }`}
                  >
                    <Text className={`text-[10px] font-bold uppercase ${payStatus === st ? 'text-blue-900' : 'text-slate-500'}`}>
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
        <View className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <View className="flex-row items-center space-x-2">
            <Feather name="map-pin" size={16} color="#8B5CF6" />
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulate Webhook Tracking</Text>
          </View>
          <Text className="text-[10px] text-slate-455 leading-normal">
            Simulate Reap API webhook tracking status changes for a transaction request:
          </Text>

          <View className="space-y-3">
            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Payment ID</Text>
              <TextInput
                value={trackId}
                onChangeText={setTrackId}
                placeholder="Enter database payment ID"
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-semibold"
              />
            </View>

            <View>
              <Text className="text-[10px] font-semibold text-slate-500 mb-1 pl-1">Tracking Status</Text>
              <View className="flex-row space-x-2">
                {['cleared', 'processing', 'sent'].map((ts) => (
                  <TouchableOpacity
                    key={ts}
                    onPress={() => setTrackStatus(ts)}
                    className={`flex-1 py-2 rounded-lg items-center border ${
                      trackStatus === ts ? 'bg-purple-50 border-purple-250' : 'bg-slate-50 border-slate-150'
                    }`}
                  >
                    <Text className={`text-[10px] font-bold uppercase ${trackStatus === ts ? 'text-purple-900' : 'text-slate-500'}`}>
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

      </ScrollView>
    </SafeAreaView>
  );
}
