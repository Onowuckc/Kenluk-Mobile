import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
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
  const { modalStep, initializeLoading, currentPayment, initializeError } = useSelector(
    (state: RootState) => state.fidelityPayment || { modalStep: 'amount', initializeLoading: false, currentPayment: null, initializeError: null }
  );

  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-white';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-50';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Account Funding');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  const handleCreateFunding = () => {
    if (!amount) {
      Alert.alert('Validation Error', 'Please enter a funding amount');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val < 100) {
      Alert.alert('Validation Error', 'Minimum funding amount is NGN 100');
      return;
    }
    const mobile = user?.phoneNumber || phoneNumber.trim();
    if (!mobile) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return;
    }
    if (!/^234[0-9]{10}$/.test(mobile)) {
      Alert.alert(
        'Validation Error',
        'Phone number must start with 234 and be 13 digits total (e.g. 2348012345678)'
      );
      return;
    }
    dispatch(setModalStep('processing'));
    dispatch(createVirtualAccount({
      amount: val,
      customerEmail: user?.email || '',
      customerFirstName: user?.name ? user.name.split(' ')[0] : '',
      customerLastName: user?.name ? user.name.split(' ').slice(1).join(' ') : '',
      customerMobile: mobile,
      description
    }) as any);
  };

  const handleClose = () => {
    dispatch(resetCurrentPayment());
    dispatch(setModalStep('amount'));
    router.back();
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain} p-6 justify-center`}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="justify-center">
        <View className={`flex-row justify-between items-center pb-4 border-b ${borderCard} mb-6`}>
          <Text className={`text-lg font-bold ${textTitle}`}>Fund Wallet</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {modalStep === 'amount' && (
          <View style={{ gap: 16 }}>
            <Text className={`text-xs ${textMuted} mb-2`}>
              Generate a unique virtual bank account to credit your wallet.
            </Text>

            <View>
              <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Deposit Amount (NGN)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Minimum 100"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="numeric"
                className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
              />
            </View>

            {!user?.phoneNumber && (
              <View>
                <Text className={`text-xs font-semibold ${textTitle} mb-1`}>
                  Phone Number <Text className="text-red-400">*</Text>
                </Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="e.g. 2348012345678"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="phone-pad"
                  maxLength={13}
                  className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                />
                <Text className={`text-[10px] ${textMuted} mt-1`}>
                  Must start with 234, followed by 10 digits (e.g. 2348012345678)
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreateFunding}
              className="bg-blue-600 py-3.5 rounded-xl items-center mt-6"
            >
              <Text className="text-white font-bold text-sm">Generate Virtual Account</Text>
            </TouchableOpacity>
          </View>
        )}


        {modalStep === 'processing' && (
          <View style={{ gap: 16 }} className="items-center justify-center py-10">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-sm font-bold text-blue-500">Generating transfer details...</Text>
          </View>
        )}

        {modalStep === 'result' && (
          <View style={{ gap: 16 }}>
            {currentPayment?.success ? (
              <View style={{ gap: 16 }}>
                <View className="items-center">
                  <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-emerald-950/20' : 'bg-emerald-100'} items-center justify-center mb-2`}>
                    <Ionicons name="checkmark-circle" size={30} color="#10B981" />
                  </View>
                  <Text className={`text-base font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} text-center`}>Account Generated</Text>
                </View>

                <View className={`${inputBg} border ${inputBorder} rounded-2xl p-4`} style={{ gap: 10 }}>
                  <View className="flex-row justify-between">
                    <Text className={`text-xs ${textMuted}`}>Bank Name:</Text>
                    <Text className={`text-xs font-bold ${textTitle}`}>{currentPayment.virtualAccount?.bankName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className={`text-xs ${textMuted}`}>Account Number:</Text>
                    <Text className="text-xs font-bold text-blue-500 select-all">{currentPayment.virtualAccount?.accountNumber}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className={`text-xs ${textMuted}`}>Account Name:</Text>
                    <Text className={`text-xs font-bold ${textTitle}`}>{currentPayment.virtualAccount?.accountName}</Text>
                  </View>
                </View>

                <Text className={`text-[10px] text-center ${textMuted} leading-relaxed`}>
                  Transfer exactly ₦{parseFloat(amount).toLocaleString()} to the details above. Your wallet will credit immediately upon confirmation.
                </Text>

                <TouchableOpacity
                  onPress={handleClose}
                  className="bg-blue-600 py-3 rounded-xl items-center mt-4"
                >
                  <Text className="text-white font-bold text-sm">Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View className="items-center">
                  <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-red-950/20' : 'bg-red-100'} items-center justify-center mb-2`}>
                    <Ionicons name="alert-circle" size={30} color="#EF4444" />
                  </View>
                  <Text className={`text-base font-bold ${isDark ? 'text-red-400' : 'text-red-800'} text-center`}>Generation Failed</Text>
                  <Text className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'} text-center mt-1`}>
                    {initializeError || currentPayment?.message || 'Failed to instantiate virtual account details.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  className="bg-blue-600 py-3 rounded-xl items-center mt-4"
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
