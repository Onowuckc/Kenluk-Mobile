import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';
import { createVirtualAccount, setModalStep, resetCurrentPayment } from '../../src/redux/slices/fidelityPaymentSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function FundingModal() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { modalStep, initializeLoading, currentPayment } = useSelector(
    (state: RootState) => state.fidelityPayment || { modalStep: 'amount', initializeLoading: false, currentPayment: null }
  );

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Account Funding');

  const handleCreateFunding = () => {
    if (!amount) {
      alert('Please enter a funding amount');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val < 100) {
      alert('Minimum funding amount is NGN 100');
      return;
    }
    dispatch(setModalStep('processing'));
    dispatch(createVirtualAccount({
      amount: val,
      customerEmail: user?.email || '',
      customerFirstName: user?.name ? user.name.split(' ')[0] : '',
      customerLastName: user?.name ? user.name.split(' ').slice(1).join(' ') : '',
      customerMobile: user?.phoneNumber || '',
      description
    }) as any);
  };

  const handleClose = () => {
    dispatch(resetCurrentPayment());
    dispatch(setModalStep('amount'));
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-6 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="justify-center">
        <View className="flex-row justify-between items-center pb-4 border-b border-fintech-border mb-6">
          <Text className="text-lg font-bold text-fintech-primary">Fund Wallet</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {modalStep === 'amount' && (
          <View className="space-y-4">
            <Text className="text-xs text-fintech-textMuted mb-2">
              Generate a unique virtual bank account to credit your wallet.
            </Text>

            <View>
              <Text className="text-xs font-semibold text-fintech-text mb-1">Deposit Amount (NGN)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Minimum 100"
                keyboardType="numeric"
                className="bg-fintech-background border border-fintech-border px-4 py-3 rounded-xl text-fintech-text text-sm font-semibold"
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateFunding}
              className="bg-fintech-primary py-3.5 rounded-xl items-center mt-6"
            >
              <Text className="text-white font-bold text-sm">Generate Virtual Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {modalStep === 'processing' && (
          <View className="items-center justify-center space-y-4 py-10">
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text className="text-sm font-bold text-fintech-primary">Generating transfer details...</Text>
          </View>
        )}

        {modalStep === 'result' && (
          <View className="space-y-4">
            {currentPayment?.success ? (
              <View className="space-y-4">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-2">
                    <Ionicons name="checkmark-circle" size={30} color="#10B981" />
                  </View>
                  <Text className="text-base font-bold text-emerald-800 text-center">Account Generated</Text>
                </View>

                <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Bank Name:</Text>
                    <Text className="text-xs font-bold text-fintech-text">{currentPayment.virtualAccount?.bankName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Account Number:</Text>
                    <Text className="text-xs font-bold text-fintech-primary select-all">{currentPayment.virtualAccount?.accountNumber}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Account Name:</Text>
                    <Text className="text-xs font-bold text-fintech-text">{currentPayment.virtualAccount?.accountName}</Text>
                  </View>
                </View>

                <Text className="text-[10px] text-center text-fintech-textMuted leading-relaxed">
                  Transfer exactly ₦{parseFloat(amount).toLocaleString()} to the details above. Your wallet will credit immediately upon confirmation.
                </Text>

                <TouchableOpacity
                  onPress={handleClose}
                  className="bg-fintech-primary py-3 rounded-xl items-center mt-4"
                >
                  <Text className="text-white font-bold text-sm">Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-4">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-2">
                    <Ionicons name="alert-circle" size={30} color="#EF4444" />
                  </View>
                  <Text className="text-base font-bold text-red-800 text-center">Generation Failed</Text>
                  <Text className="text-xs text-red-600 text-center mt-1">
                    {currentPayment?.message || 'Failed to instantiate virtual account details.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  className="bg-fintech-primary py-3 rounded-xl items-center mt-4"
                >
                  <Text className="text-white font-bold text-sm">Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
