import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { RootState } from '../../src/redux/store';
import { fetchWalletSummary } from '../../src/redux/slices/walletSlice';
import { ratesApi, paymentsApi, beneficiaryApi } from '../../src/services/api';
import walletService from '../../src/services/walletService';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

const getCompanyPaymentEmails = () => {
  return ['payments@kenluk.com'];
};

export default function PaymentsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { user } = useSelector((state: RootState) => state.auth);
  const { summary } = useSelector((state: RootState) => state.wallet || { summary: null });

  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-150';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-50';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';

  const isCompanyPaymentAccount = useMemo(() => {
    return (
      (user as any)?.accountType === 'company' ||
      getCompanyPaymentEmails().includes(user?.email?.toLowerCase() || '')
    );
  }, [user]);

  // Form Step: 'recipient' | 'amount' | 'payer' | 'upload' | 'success'
  const [step, setStep] = useState<'recipient' | 'amount' | 'payer' | 'upload' | 'success'>('recipient');

  // Step 1: Recipient Bank Details
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientBankSwiftCode, setRecipientBankSwiftCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientBankCountry, setRecipientBankCountry] = useState('');
  const [recipientBankAddress, setRecipientBankAddress] = useState('');

  // Step 2: Transfer Details
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('USD');

  // Step 3: Invoice Payer Details
  const [originalPayerName, setOriginalPayerName] = useState(
    user ? user.name : ''
  );
  const [payerStreet, setPayerStreet] = useState('');
  const [payerCity, setPayerCity] = useState('');
  const [payerState, setPayerState] = useState('');
  const [payerCountry, setPayerCountry] = useState('');
  const [payerPostalCode, setPayerPostalCode] = useState('');

  // Step 4: Invoice Document
  const [invoiceFile, setInvoiceFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
  } | null>(null);

  // Modals overlays
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [activeUploading, setActiveUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // Wallet Validation State from Backend check
  const [isValidatingBalance, setIsValidatingBalance] = useState(false);
  const [balanceValidationMsg, setBalanceValidationMsg] = useState<string | null>(null);
  const [isBalanceValid, setIsBalanceValid] = useState<boolean | null>(null);

  // Queries
  // 1. Live Exchange Rate
  const { data: rateData } = useQuery({
    queryKey: ['usd-ngn-rate'],
    queryFn: () => ratesApi.getUsdNgnRate(),
    refetchInterval: 300000,
    staleTime: 60000,
  });

  const exchangeRate = rateData?.usdToNgnRate || 1500;

  // 2. Saved Beneficiaries
  const { data: beneficiariesData } = useQuery({
    queryKey: ['my-beneficiaries'],
    queryFn: () => beneficiaryApi.getMyBeneficiaries(),
  });

  const beneficiaries = beneficiariesData?.beneficiaries || [];

  // Calculate local NGN Amount
  const localAmount = useMemo(() => {
    const amountVal = parseFloat(foreignAmount);
    if (isNaN(amountVal) || amountVal <= 0) return 0;
    return amountVal * exchangeRate;
  }, [foreignAmount, exchangeRate]);

  // Sync wallet balance summary on mount and when loading amount step
  useEffect(() => {
    dispatch(fetchWalletSummary() as any);
  }, [dispatch, step]);

  // Handle beneficiary selection
  const handleSelectBeneficiary = (beneficiary: any) => {
    setRecipientCompany(beneficiary.recipientCompany || '');
    setRecipientAddress(beneficiary.recipientAddress || '');
    setRecipientBank(beneficiary.recipientBank || '');
    setRecipientBankSwiftCode(beneficiary.recipientBankSwiftCode || '');
    setAccountNumber(beneficiary.accountNumber || '');
    setRecipientBankCountry(beneficiary.recipientBankCountry || '');
    setRecipientBankAddress(beneficiary.recipientBankAddress || '');
    setShowBeneficiaryModal(false);
  };

  // Validations & Steps Flow
  const handleNextToAmount = () => {
    if (
      !recipientCompany.trim() ||
      !recipientAddress.trim() ||
      !recipientBank.trim() ||
      !recipientBankSwiftCode.trim() ||
      !accountNumber.trim() ||
      !recipientBankCountry.trim() ||
      !recipientBankAddress.trim()
    ) {
      Alert.alert('Error', 'Please fill in all recipient bank fields.');
      return;
    }

    // SWIFT Code format validation (8-11 alphanumerics)
    const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    if (!swiftRegex.test(recipientBankSwiftCode.trim().toUpperCase())) {
      Alert.alert(
        'Validation Error',
        'Invalid SWIFT code format. Should be 8 to 11 characters (e.g. ABCDEFGH or ABCDGH2AXXX).'
      );
      return;
    }

    setStep('amount');
  };

  const handleNextToPayer = async () => {
    const val = parseFloat(foreignAmount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Error', 'Please enter a valid positive foreign amount.');
      return;
    }

    // Perform wallet balance check
    if (!isCompanyPaymentAccount) {
      setIsValidatingBalance(true);
      setBalanceValidationMsg(null);
      setIsBalanceValid(null);
      try {
        const result = await walletService.validateBalance(localAmount);
        setIsBalanceValid(result.isValid);
        setBalanceValidationMsg(result.message);
        if (!result.isValid) {
          Alert.alert('Insufficient Funds', result.message);
          setIsValidatingBalance(false);
          return;
        }
      } catch (err: any) {
        Alert.alert('Validation Error', err?.message || 'Failed to check account balance.');
        setIsValidatingBalance(false);
        return;
      }
      setIsValidatingBalance(false);
    }

    setStep('payer');
  };

  const handleNextToUpload = () => {
    if (
      !originalPayerName.trim() ||
      !payerStreet.trim() ||
      !payerCity.trim() ||
      !payerState.trim() ||
      !payerCountry.trim() ||
      !payerPostalCode.trim()
    ) {
      Alert.alert('Error', 'Please fill in all payer address details.');
      return;
    }

    if (payerCountry.trim().length !== 2) {
      Alert.alert('Validation Error', 'Country Code must be a 2-letter ISO code (e.g. HK, NG, US).');
      return;
    }

    setStep('upload');
  };

  // Document Picking
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setInvoiceFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'application/pdf',
          size: file.size,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick document.');
    }
  };

  const handleCapturePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is required to snap invoices.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = `invoice_upload_${Date.now()}.jpg`;
        setInvoiceFile({
          uri: file.uri,
          name: fileName,
          mimeType: 'image/jpeg',
          size: 0, // Will be fetched from blob size
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  // Submit international payment request
  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceFile) throw new Error('Invoice file is required.');

      setActiveUploading(true);
      setUploadProgressMsg('Reading file data...');

      // A. Transform local file uri into Blob binary
      const fileResponse = await fetch(invoiceFile.uri);
      const fileBlob = await fileResponse.blob();
      const fileSize = fileBlob.size;

      // B. Get pre-signed URL from API
      setUploadProgressMsg('Creating pre-signed upload credentials...');
      const { uploadUrl, s3Key, bucketName } = await paymentsApi.getUploadInvoiceUrl({
        fileName: invoiceFile.name,
        fileSize,
        mimeType: invoiceFile.mimeType,
      });

      // C. PUT upload directly to S3
      setUploadProgressMsg('Uploading invoice to secure storage...');
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: {
          'Content-Type': invoiceFile.mimeType,
        },
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.statusText}`);
      }

      // D. Finalize invoice payment upload request with DB
      setUploadProgressMsg('Finalizing payment request submission...');
      const submitPayload = {
        recipientCompany: recipientCompany.trim(),
        recipientBank: recipientBank.trim(),
        recipientBankSwiftCode: recipientBankSwiftCode.trim().toUpperCase(),
        accountNumber: accountNumber.trim(),
        recipientBankCountry: recipientBankCountry.trim(),
        recipientAddress: recipientAddress.trim(),
        recipientBankAddress: recipientBankAddress.trim(),
        foreignAmount: parseFloat(foreignAmount),
        foreignCurrency,
        localAmount,
        exchangeRate,
        invoiceS3Key: s3Key,
        invoiceBucketName: bucketName,
        invoiceFileName: invoiceFile.name,
        invoiceFileSize: fileSize,
        invoiceMimeType: invoiceFile.mimeType,
        invoiceDetails: {
          originalPayerName: originalPayerName.trim(),
          originalPayerAddress: {
            streetAddress: payerStreet.trim(),
            city: payerCity.trim(),
            state: payerState.trim().toUpperCase(),
            country: payerCountry.trim().toUpperCase(),
            postalCode: payerPostalCode.trim(),
          },
        },
      };

      return await paymentsApi.submitPayment(submitPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      dispatch(fetchWalletSummary() as any);
      setStep('success');
    },
    onError: (error: any) => {
      Alert.alert('Payment Submission Failed', error?.message || 'An error occurred during submission.');
    },
    onSettled: () => {
      setActiveUploading(false);
      setUploadProgressMsg('');
    },
  });

  const handleResetForm = () => {
    setRecipientCompany('');
    setRecipientAddress('');
    setRecipientBank('');
    setRecipientBankSwiftCode('');
    setAccountNumber('');
    setRecipientBankCountry('');
    setRecipientBankAddress('');
    setForeignAmount('');
    setForeignCurrency('USD');
    setOriginalPayerName(user ? user.name : '');
    setPayerStreet('');
    setPayerCity('');
    setPayerState('');
    setPayerCountry('');
    setPayerPostalCode('');
    setInvoiceFile(null);
    setBalanceValidationMsg(null);
    setIsBalanceValid(null);
    setStep('recipient');
  };

  const getCurrencySymbol = (code: string) => {
    return currencies.find((c) => c.code === code)?.symbol || '$';
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Top Header */}
        <View className={`px-4 py-3.5 border-b ${borderCard} ${bgCard} flex-row justify-between items-center`}>
          <View>
            <Text className={`text-lg font-bold ${textTitle}`}>Make Payment</Text>
            <Text className={`text-[10px] ${textMuted} mt-0.5`}>
              Submit international transfer requests for approval
            </Text>
          </View>
          {step !== 'recipient' && step !== 'success' && (
            <TouchableOpacity
              onPress={() => {
                if (step === 'amount') setStep('recipient');
                if (step === 'payer') setStep('amount');
                if (step === 'upload') setStep('payer');
              }}
              style={{ minWidth: 44, minHeight: 44 }}
              className={`items-center justify-center rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'} px-3`}
            >
              <Text className="text-xs font-bold text-blue-500">Back</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Progress Indicators */}
        {step !== 'success' && (
          <View className={`${bgCard} px-4 py-2 border-b ${borderCard} flex-row items-center justify-between`}>
            {[
              { label: 'Recipient', num: 1, active: step === 'recipient', done: ['amount', 'payer', 'upload'].includes(step) },
              { label: 'Amount', num: 2, active: step === 'amount', done: ['payer', 'upload'].includes(step) },
              { label: 'Payer', num: 3, active: step === 'payer', done: ['upload'].includes(step) },
              { label: 'Invoice', num: 4, active: step === 'upload', done: false },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <View style={{ gap: 4 }} className="flex-row items-center">
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center border ${
                      s.active
                        ? 'bg-blue-600 border-blue-600'
                        : s.done
                        ? 'bg-emerald-600 border-emerald-600'
                        : isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-white border-slate-300'
                    }`}
                  >
                    {s.done ? (
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    ) : (
                      <Text
                        className={`text-[10px] font-bold ${
                          s.active ? 'text-white' : textMuted
                        }`}
                      >
                        {s.num}
                      </Text>
                    )}
                  </View>
                  <Text
                    className={`text-[10px] font-bold ${
                      s.active ? 'text-blue-500' : s.done ? 'text-emerald-500' : textMuted
                    }`}
                  >
                    {s.label}
                  </Text>
                </View>
                {idx < 3 && <View className={`flex-1 h-[1px] ${isDark ? 'bg-[#1E356A]' : 'bg-slate-200'} mx-2`} />}
              </React.Fragment>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
          {step === 'recipient' && (
            <View className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm`}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-sm font-bold text-blue-500">Recipient Info</Text>
                <TouchableOpacity
                  onPress={() => setShowBeneficiaryModal(true)}
                  style={{ minHeight: 44 }}
                  className={`px-3 border ${isDark ? 'border-blue-900/60' : 'border-fintech-secondary/30'} rounded-xl justify-center ${isDark ? 'bg-blue-950/20' : 'bg-blue-50/40'}`}
                >
                  <Text className="text-[11px] font-bold text-blue-500">Select Beneficiary</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Recipient Company Name *</Text>
                  <TextInput
                    value={recipientCompany}
                    onChangeText={setRecipientCompany}
                    placeholder="e.g. Acme Corporation Ltd"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>

                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Recipient Address *</Text>
                  <TextInput
                    value={recipientAddress}
                    onChangeText={setRecipientAddress}
                    placeholder="e.g. Suite 4B, Central Business District"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>

                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Recipient Bank Name *</Text>
                  <TextInput
                    value={recipientBank}
                    onChangeText={setRecipientBank}
                    placeholder="e.g. Standard Chartered Bank"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>

                <View style={{ gap: 12 }} className="flex-row">
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold ${textTitle} mb-1`}>SWIFT Code *</Text>
                    <TextInput
                      value={recipientBankSwiftCode}
                      onChangeText={(val) => setRecipientBankSwiftCode(val.toUpperCase())}
                      placeholder="8 or 11 chars"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      autoCapitalize="characters"
                      className={`${inputBg} border ${inputBorder} px-3 py-2.5 rounded-xl ${textInputColor} text-sm font-semibold`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Account Number *</Text>
                    <TextInput
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      placeholder="IBAN or Acct No"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      className={`${inputBg} border ${inputBorder} px-3 py-2.5 rounded-xl ${textInputColor} text-sm font-semibold`}
                    />
                  </View>
                </View>

                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Recipient Bank Country *</Text>
                  <TextInput
                    value={recipientBankCountry}
                    onChangeText={setRecipientBankCountry}
                    placeholder="e.g. United Kingdom"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>

                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Recipient Bank Address *</Text>
                  <TextInput
                    value={recipientBankAddress}
                    onChangeText={setRecipientBankAddress}
                    placeholder="e.g. 10 Basinghall St, London"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleNextToAmount}
                style={{ minHeight: 44 }}
                className="bg-blue-600 py-3 rounded-xl items-center mt-6 justify-center"
              >
                <Text className="text-white font-bold text-sm">Next: Payment Details</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'amount' && (
            <View style={{ gap: 16 }} className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm`}>
              <Text className="text-sm font-bold text-blue-500 mb-1">Payment Amount</Text>

              <View style={{ gap: 12 }} className="flex-row items-end">
                <View className="flex-1">
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Foreign Amount *</Text>
                  <TextInput
                    value={foreignAmount}
                    onChangeText={setForeignAmount}
                    placeholder="0.00"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    keyboardType="numeric"
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setShowCurrencyModal(true)}
                  style={{ minHeight: 44, gap: 8 }}
                  className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl flex-row items-center justify-between w-28`}
                >
                  <Text className={`${textTitle} font-bold text-sm`}>{foreignCurrency}</Text>
                  <Feather name="chevron-down" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Rate & NGN Info Card */}
              <View style={{ gap: 10 }} className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} rounded-2xl p-4`}>
                <View className="flex-row justify-between items-center">
                  <Text className={`text-[11px] ${textMuted}`}>Exchange Rate:</Text>
                  <Text className={`text-xs font-bold ${textTitle}`}>
                    1 {foreignCurrency} = ₦{exchangeRate.toLocaleString()}
                  </Text>
                </View>
                <View className={`flex-row justify-between items-center border-t ${borderCard} pt-2.5`}>
                  <Text className={`text-[11px] ${textMuted}`}>Amount in NGN:</Text>
                  <Text className="text-sm font-bold text-blue-500">
                    ₦{localAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <Text className={`text-[9px] ${textMuted} leading-normal`}>
                  * Live platform rate determined by administrator. Outflow local equivalent is calculated based on this exchange rate.
                </Text>
              </View>

              {/* Wallet Validation Widget */}
              {!isCompanyPaymentAccount && localAmount > 0 && (
                <View className={`${isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/40 border border-blue-100'} rounded-2xl p-4`}>
                  <Text className={`text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-900'} mb-1.5 uppercase tracking-wider`}>
                    Balance Check
                  </Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className={`text-[10px] ${textMuted}`}>Available Wallet Balance:</Text>
                    <Text className={`text-[10px] font-bold ${textTitle}`}>
                      ₦{(summary?.balance || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View className={`flex-row justify-between border-t ${borderCard} pt-1 mt-1`}>
                    <Text className={`text-[10px] ${textMuted}`}>Local Outflow Required:</Text>
                    <Text className={`text-[10px] font-bold ${textTitle}`}>
                      ₦{localAmount.toLocaleString()}
                    </Text>
                  </View>

                  {(summary?.balance || 0) < localAmount ? (
                    <View className={`${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border border-red-100'} p-2.5 rounded-xl flex-row items-center mt-3`}>
                      <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text className="text-red-650 text-[10px] font-semibold flex-1">
                        Insufficient balance. You need an additional ₦{(localAmount - (summary?.balance || 0)).toLocaleString()} to process this payment.
                      </Text>
                    </View>
                  ) : (
                    <View className={`${isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border border-emerald-100'} p-2.5 rounded-xl flex-row items-center mt-3`}>
                      <Feather name="check-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
                      <Text className="text-emerald-600 text-[10px] font-semibold flex-1">
                        Sufficient NGN balance available to fund this transfer.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={handleNextToPayer}
                disabled={isValidatingBalance}
                style={{ minHeight: 44 }}
                className="bg-blue-600 py-3 rounded-xl items-center mt-4 justify-center flex-row"
              >
                {isValidatingBalance && <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />}
                <Text className="text-white font-bold text-sm">
                  {isValidatingBalance ? 'Checking balance...' : 'Next: Payer Details'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'payer' && (
            <View style={{ gap: 16 }} className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm`}>
              <Text className="text-sm font-bold text-blue-500 mb-1">Invoice Payer Details</Text>

              <View style={{ gap: 12 }}>
                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Original Payer Name *</Text>
                  <TextInput
                    value={originalPayerName}
                    onChangeText={setOriginalPayerName}
                    placeholder="Individual or Company Name on Invoice"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>

                <View>
                  <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Street Address *</Text>
                  <TextInput
                    value={payerStreet}
                    onChangeText={setPayerStreet}
                    placeholder="Payer Street Address"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-xl ${textInputColor} text-sm font-semibold`}
                  />
                </View>

                <View style={{ gap: 12 }} className="flex-row">
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold ${textTitle} mb-1`}>City *</Text>
                    <TextInput
                      value={payerCity}
                      onChangeText={setPayerCity}
                      placeholder="Hong Kong"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      className={`${inputBg} border ${inputBorder} px-3 py-2.5 rounded-xl ${textInputColor} text-sm font-semibold`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold ${textTitle} mb-1`}>State/Region *</Text>
                    <TextInput
                      value={payerState}
                      onChangeText={setPayerState}
                      placeholder="HK"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      className={`${inputBg} border ${inputBorder} px-3 py-2.5 rounded-xl ${textInputColor} text-sm font-semibold`}
                    />
                  </View>
                </View>

                <View style={{ gap: 12 }} className="flex-row">
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Country ISO Code *</Text>
                    <TextInput
                      value={payerCountry}
                      onChangeText={(val) => setPayerCountry(val.toUpperCase())}
                      placeholder="e.g. HK"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      maxLength={2}
                      autoCapitalize="characters"
                      className={`${inputBg} border ${inputBorder} px-3 py-2.5 rounded-xl ${textInputColor} text-sm font-semibold`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold ${textTitle} mb-1`}>Postal Code *</Text>
                    <TextInput
                      value={payerPostalCode}
                      onChangeText={setPayerPostalCode}
                      placeholder="000000"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      className={`${inputBg} border ${inputBorder} px-3 py-2.5 rounded-xl ${textInputColor} text-sm font-semibold`}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleNextToUpload}
                style={{ minHeight: 44 }}
                className="bg-blue-600 py-3 rounded-xl items-center mt-6"
              >
                <Text className="text-white font-bold text-sm">Next: Upload Invoice</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'upload' && (
            <View style={{ gap: 16 }} className={`${bgCard} rounded-3xl p-5 border ${borderCard} shadow-sm`}>
              <Text className="text-sm font-bold text-blue-500 mb-1">Invoice Document</Text>
              <Text className={`text-xs ${textMuted} leading-relaxed`}>
                Provide a valid vendor invoice matching your payment request. Acceptable formats are PDF, JPG, and PNG up to 10MB.
              </Text>

              {activeUploading ? (
                <View style={{ gap: 12 }} className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} p-6 rounded-2xl items-center`}>
                  <ActivityIndicator size="large" color="#1E3A8A" />
                  <Text className="text-xs text-blue-500 font-bold">{uploadProgressMsg}</Text>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {invoiceFile ? (
                    <View className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} p-4 rounded-2xl flex-row items-center justify-between`}>
                      <View style={{ gap: 10 }} className="flex-row items-center flex-1 pr-3">
                        <Feather name="file-text" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                        <View className="flex-1">
                          <Text numberOfLines={1} className={`text-xs font-bold ${textTitle}`}>
                            {invoiceFile.name}
                          </Text>
                          <Text className={`text-[10px] ${textMuted}`}>
                            {invoiceFile.mimeType}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setInvoiceFile(null)}
                        style={{ minWidth: 44, minHeight: 44 }}
                        className={`${isDark ? 'bg-red-950/20' : 'bg-red-50'} rounded-full w-10 h-10 items-center justify-center`}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }} className="flex-row">
                      <TouchableOpacity
                        onPress={handlePickDocument}
                        style={{ minHeight: 48, gap: 6 }}
                        className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border border-dashed ${isDark ? 'border-blue-900/60' : 'border-slate-300'} rounded-2xl items-center justify-center flex-row flex-1`}
                      >
                        <Feather name="file-plus" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-bold text-xs`}>Upload File</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleCapturePhoto}
                        style={{ minHeight: 48, gap: 6 }}
                        className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border border-dashed ${isDark ? 'border-blue-900/60' : 'border-slate-300'} rounded-2xl items-center justify-center flex-row flex-1`}
                      >
                        <Feather name="camera" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-bold text-xs`}>Snap Photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Summary of Transaction */}
                  <View className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} rounded-2xl p-4 mt-2`}>
                    <Text className={`text-[10px] font-bold ${textTitle} uppercase mb-2`}>Review Outflow Details</Text>
                    <View style={{ gap: 6 }}>
                      <View className="flex-row justify-between">
                        <Text className={`text-[10px] ${textMuted}`}>Recipient:</Text>
                        <Text className={`text-[10px] font-bold ${textTitle}`}>{recipientCompany}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className={`text-[10px] ${textMuted}`}>Amount:</Text>
                        <Text className={`text-[10px] font-bold ${textTitle}`}>
                          {getCurrencySymbol(foreignCurrency)}
                          {parseFloat(foreignAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({foreignCurrency})
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className={`text-[10px] ${textMuted}`}>Local Equiv:</Text>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>₦{localAmount.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => submitPaymentMutation.mutate()}
                    disabled={!invoiceFile}
                    style={{ minHeight: 44 }}
                    className={`py-3.5 rounded-xl items-center mt-6 ${
                      invoiceFile ? 'bg-blue-600' : isDark ? 'bg-slate-800' : 'bg-slate-350'
                    }`}
                  >
                    <Text className="text-white font-bold text-sm">Submit Payment Request</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {step === 'success' && (
            <View style={{ gap: 24 }} className={`${bgCard} rounded-3xl p-6 border ${borderCard} shadow-sm items-center py-10`}>
              <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center">
                <Ionicons name="checkmark-circle" size={44} color="#10B981" />
              </View>

              <View style={{ gap: 8 }}>
                <Text className={`text-lg font-bold ${textTitle} text-center`}>Payment Submitted!</Text>
                <Text className={`text-xs ${textMuted} text-center px-4 leading-relaxed`}>
                  Your international vendor transfer request has been successfully submitted and is waiting for administrator approval.
                </Text>
              </View>

              <View style={{ gap: 8 }} className={`w-full ${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} rounded-2xl p-4`}>
                <View className="flex-row justify-between">
                  <Text className={`text-[10px] ${textMuted}`}>Status:</Text>
                  <Text className={`text-[10px] font-bold text-amber-700 uppercase ${isDark ? 'bg-amber-950/30' : 'bg-amber-50'} px-2 py-0.5 rounded border border-amber-200`}>
                    Waiting Admin Approval
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`text-[10px] ${textMuted}`}>Recipient:</Text>
                  <Text className={`text-[10px] font-bold ${textTitle}`}>{recipientCompany}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`text-[10px] ${textMuted}`}>Amount:</Text>
                  <Text className={`text-[10px] font-bold ${textTitle}`}>
                    {getCurrencySymbol(foreignCurrency)}{parseFloat(foreignAmount).toLocaleString()} ({foreignCurrency})
                  </Text>
                </View>
              </View>

              <View style={{ gap: 12 }} className="w-full">
                <TouchableOpacity
                  onPress={() => {
                    // Navigate to history tab using router
                    router.push('/(tabs)/history' as any);
                  }}
                  style={{ minHeight: 44 }}
                  className="bg-blue-600 py-3 rounded-xl items-center justify-center w-full"
                >
                  <Text className="text-white font-bold text-sm">View Request History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResetForm}
                  style={{ minHeight: 44 }}
                  className={`py-3 rounded-xl items-center justify-center w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                >
                  <Text className={`${isDark ? 'text-slate-300' : 'text-slate-700'} font-bold text-sm`}>Submit New Transfer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL 1: Beneficiary Bottom-Sheet List */}
      <Modal
        visible={showBeneficiaryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBeneficiaryModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className={`${bgCard} rounded-t-3xl p-5 max-h-[80%] min-h-[40%]`}>
            <View className={`flex-row justify-between items-center pb-3 border-b ${borderCard} mb-4`}>
              <Text className={`text-base font-bold ${textTitle}`}>Select Beneficiary</Text>
              <TouchableOpacity
                onPress={() => setShowBeneficiaryModal(false)}
                style={{ minWidth: 44, minHeight: 44 }}
                className={`items-center justify-center rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-8 h-8`}
              >
                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {beneficiaries.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Feather name="users" size={40} color="#94A3B8" />
                <Text className={`text-slate-800 text-xs font-bold mt-2 ${textTitle}`}>No saved beneficiaries</Text>
                <Text className={`text-slate-400 text-[10px] text-center mt-1 px-4 leading-normal ${textMuted}`}>
                  Beneficiaries are automatically saved to your callbook once you submit your first international transfer.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={{ gap: 8 }}>
                  {beneficiaries.map((b: any) => (
                    <TouchableOpacity
                      key={b._id}
                      onPress={() => handleSelectBeneficiary(b)}
                      className={`p-3.5 border ${borderCard} rounded-2xl ${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} flex-row items-center justify-between`}
                    >
                      <View className="flex-1 pr-2">
                        <Text className={`text-xs font-bold ${textTitle}`}>{b.recipientCompany}</Text>
                        <Text className={`text-[10px] ${textMuted} mt-1`}>
                          {b.recipientBank} • {b.accountNumber}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Currency Bottom-Sheet List */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className={`${bgCard} rounded-t-3xl p-5 min-h-[30%]`}>
            <View className={`flex-row justify-between items-center pb-3 border-b ${borderCard} mb-4`}>
              <Text className={`text-base font-bold ${textTitle}`}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={{ minWidth: 44, minHeight: 44 }}
                className={`items-center justify-center rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-8 h-8`}
              >
                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={{ gap: 8 }}>
                {currencies.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => {
                      setForeignCurrency(c.code);
                      setShowCurrencyModal(false);
                    }}
                    className={`p-3.5 rounded-2xl flex-row items-center justify-between border ${
                      foreignCurrency === c.code
                        ? isDark ? 'bg-blue-950/40 border-blue-800/60' : 'bg-blue-50 border-blue-200'
                        : isDark ? 'bg-[#121E42] border-transparent' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <View>
                      <Text className={`text-xs font-bold ${textTitle}`}>
                        {c.code} - {c.name}
                      </Text>
                    </View>
                    {foreignCurrency === c.code && (
                      <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
