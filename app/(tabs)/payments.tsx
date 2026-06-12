import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';
import { createVirtualAccount, setModalStep, resetCurrentPayment } from '../../src/redux/slices/fidelityPaymentSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentsScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { modalStep, initializeLoading, initializeError, currentPayment } = useSelector(
    (state: RootState) => state.fidelityPayment || { modalStep: 'amount', initializeLoading: false, initializeError: null, currentPayment: null }
  );

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.phoneNumber || '');

  const handleAmountSubmit = () => {
    if (!amount || !description) {
      alert('Please fill in all fields');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert('Enter a valid positive amount');
      return;
    }
    dispatch(setModalStep('customer'));
  };

  const handleCustomerSubmit = () => {
    if (!firstName || !lastName || !email || !mobile) {
      alert('Please fill in all fields');
      return;
    }
    dispatch(setModalStep('review'));
  };

  const handleConfirmPayment = () => {
    dispatch(setModalStep('processing'));
    dispatch(createVirtualAccount({
      amount: parseFloat(amount),
      customerEmail: email,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerMobile: mobile,
      description
    }) as any);
  };

  const handleReset = () => {
    setAmount('');
    setDescription('');
    dispatch(resetCurrentPayment());
    dispatch(setModalStep('amount'));
  };

  return (
    <SafeAreaView className="flex-1 bg-fintech-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4 justify-center">
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-fintech-border min-h-[400px]">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-fintech-border mb-6">
              <Text className="text-lg font-bold text-fintech-primary">Initiate Payment</Text>
              {modalStep !== 'amount' && modalStep !== 'processing' && modalStep !== 'result' && (
                <TouchableOpacity onPress={() => {
                  if (modalStep === 'customer') dispatch(setModalStep('amount'));
                  if (modalStep === 'review') dispatch(setModalStep('customer'));
                }}>
                  <Text className="text-xs text-fintech-secondary font-semibold">Back</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Step 1: Amount & Desc */}
            {modalStep === 'amount' && (
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-semibold text-fintech-text mb-1">Payment Amount (NGN)</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="e.g. 5000"
                    keyboardType="numeric"
                    className="bg-fintech-background border border-fintech-border px-4 py-3 rounded-xl text-fintech-text text-sm font-semibold"
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-fintech-text mb-1">Description</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What is this payment for?"
                    multiline
                    numberOfLines={3}
                    className="bg-fintech-background border border-fintech-border px-4 py-3 rounded-xl text-fintech-text text-sm h-24"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleAmountSubmit}
                  className="bg-fintech-primary py-3.5 rounded-xl items-center mt-6"
                >
                  <Text className="text-white font-bold text-sm">Next</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Customer Details */}
            {modalStep === 'customer' && (
              <View className="space-y-3">
                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-fintech-text mb-1">First Name</Text>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First Name"
                      className="bg-fintech-background border border-fintech-border px-3 py-2.5 rounded-xl text-fintech-text text-sm"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-fintech-text mb-1">Last Name</Text>
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last Name"
                      className="bg-fintech-background border border-fintech-border px-3 py-2.5 rounded-xl text-fintech-text text-sm"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-fintech-text mb-1">Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email Address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-fintech-background border border-fintech-border px-4 py-2.5 rounded-xl text-fintech-text text-sm"
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-fintech-text mb-1">Mobile Number</Text>
                  <TextInput
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                    className="bg-fintech-background border border-fintech-border px-4 py-2.5 rounded-xl text-fintech-text text-sm"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleCustomerSubmit}
                  className="bg-fintech-primary py-3.5 rounded-xl items-center mt-6"
                >
                  <Text className="text-white font-bold text-sm">Review Payment</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Review */}
            {modalStep === 'review' && (
              <View className="space-y-4">
                <Text className="text-sm font-semibold text-fintech-textMuted mb-2">Review Details:</Text>
                <View className="bg-fintech-background p-4 rounded-2xl border border-fintech-border space-y-2.5">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Amount:</Text>
                    <Text className="text-xs font-bold text-fintech-text">₦{parseFloat(amount).toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Description:</Text>
                    <Text className="text-xs font-bold text-fintech-text">{description}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Recipient:</Text>
                    <Text className="text-xs font-bold text-fintech-text">{firstName} {lastName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Email:</Text>
                    <Text className="text-xs font-bold text-fintech-text">{email}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-fintech-textMuted">Phone:</Text>
                    <Text className="text-xs font-bold text-fintech-text">{mobile}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmPayment}
                  disabled={initializeLoading}
                  className="bg-fintech-primary py-3.5 rounded-xl items-center mt-6 justify-center flex-row"
                >
                  {initializeLoading && <ActivityIndicator size="small" color="#ffffff" className="mr-2" />}
                  <Text className="text-white font-bold text-sm">Confirm & Pay</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Processing */}
            {modalStep === 'processing' && (
              <View className="flex-1 items-center justify-center space-y-4 py-10">
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text className="text-sm font-bold text-fintech-primary">Processing Payment...</Text>
                <Text className="text-xs text-fintech-textMuted text-center">Please wait while we set up your transfer details</Text>
              </View>
            )}

            {/* Step 5: Result */}
            {modalStep === 'result' && (
              <View className="space-y-4">
                {currentPayment?.success ? (
                  <View className="space-y-4">
                    <View className="items-center">
                      <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-2">
                        <Ionicons name="checkmark-circle" size={30} color="#10B981" />
                      </View>
                      <Text className="text-base font-bold text-emerald-800 text-center">Virtual Account Ready</Text>
                    </View>

                    <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <Text className="text-[10px] font-bold text-fintech-textMuted uppercase tracking-wider">Transfer Details:</Text>
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
                    
                    <Text className="text-[10px] text-center text-fintech-textMuted mt-2 leading-relaxed">
                      Please transfer exactly ₦{parseFloat(amount).toLocaleString()} to the details above. The account will credit automatically on receipt.
                    </Text>

                    <TouchableOpacity
                      onPress={handleReset}
                      className="bg-fintech-primary py-3 rounded-xl items-center mt-4"
                    >
                      <Text className="text-white font-bold text-sm">Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="space-y-4">
                    <View className="items-center">
                      <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-2">
                        <Ionicons name="alert-circle" size={30} color="#EF4444" />
                      </View>
                      <Text className="text-base font-bold text-red-800 text-center">Payment Failed</Text>
                      <Text className="text-xs text-red-600 text-center mt-1">
                        {currentPayment?.message || initializeError || 'An error occurred during account creation'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={handleReset}
                      className="bg-fintech-primary py-3 rounded-xl items-center mt-4"
                    >
                      <Text className="text-white font-bold text-sm">Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
