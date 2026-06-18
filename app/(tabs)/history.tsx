import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

import { paymentsApi } from '../../src/services/api';
import { getPaymentStatusLabel, getPaymentStatusStyles } from '../../src/utils/statusMap';

interface PaymentRequest {
  _id: string;
  recipientCompany: string;
  recipientBank: string;
  accountNumber: string;
  recipientBankSwiftCode: string;
  recipientBankCountry: string;
  recipientBankAddress: string;
  recipientAddress: string;
  foreignAmount: number;
  foreignCurrency: string;
  localAmount: number;
  exchangeRate: number;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  invoiceFileName?: string;
  invoiceOriginalFileName?: string;
  invoiceMimeType?: string;
  invoiceFileSize?: number;
}

export default function HistoryScreen() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'summary' | 'audit' | 'receipt'>('summary');

  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-50'; // bg-fintech-background
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100'; // border-fintech-border
  const textTitle = isDark ? 'text-white' : 'text-slate-800'; // text-fintech-text
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500'; // text-fintech-textMuted
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-50';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';

  // 1. Fetch international payments using TanStack Query
  const {
    data: paymentsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.getMyPayments(),
    staleTime: 30000,
  });

  const payments = (paymentsResponse?.payments || []) as PaymentRequest[];

  // 2. Fetch specific payment details when selected
  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ['payment-detail', selectedPaymentId],
    queryFn: () => paymentsApi.getPaymentById(selectedPaymentId!),
    enabled: !!selectedPaymentId,
  });

  const currentPayment = detailResponse?.payment || null;

  // 3. Fetch receipt when completed
  const isCompleted =
    currentPayment?.status === 'completed' || currentPayment?.status === 'successful';

  const { data: receiptResponse, isLoading: isReceiptLoading } = useQuery({
    queryKey: ['payment-receipt', selectedPaymentId],
    queryFn: () => paymentsApi.getPaymentReceipt(selectedPaymentId!),
    enabled: !!selectedPaymentId && isCompleted && activeModalTab === 'receipt',
  });

  const receipt = receiptResponse?.data || null;

  // Filter list
  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') return payments;
    return payments.filter((p) => {
      const status = p.status.toLowerCase();
      if (statusFilter === 'pending') return status === 'pending_admin_approval';
      if (statusFilter === 'processing') return status === 'processing' || status === 'submitted_to_reap';
      if (statusFilter === 'completed') return status === 'completed' || status === 'successful';
      if (statusFilter === 'failed') return status === 'failed' || status === 'rejected';
      return true;
    });
  }, [payments, statusFilter]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
    };
    return symbols[code] || '$';
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleOpenInvoice = async () => {
    try {
      if (!selectedPaymentId) return;
      const { invoiceUrl } = await paymentsApi.getPaymentInvoiceUrl(selectedPaymentId);
      if (invoiceUrl) {
        await Linking.openURL(invoiceUrl);
      } else {
        Alert.alert('Error', 'Unable to retrieve invoice link.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load invoice.');
    }
  };

  const renderItem = ({ item }: { item: PaymentRequest }) => {
    const styles = getPaymentStatusStyles(item.status);
    const symbol = getCurrencySymbol(item.foreignCurrency);

    // Apply custom dark styling to standard status badge colors if needed
    const customBg = isDark
      ? styles.bg === 'bg-amber-50' ? 'bg-amber-950/20 border-amber-900/40'
        : styles.bg === 'bg-blue-50' ? 'bg-blue-950/20 border-blue-900/40'
        : styles.bg === 'bg-purple-50' ? 'bg-purple-950/20 border-purple-900/40'
        : styles.bg === 'bg-emerald-50' ? 'bg-emerald-950/20 border-emerald-900/40'
        : styles.bg === 'bg-red-50' ? 'bg-red-950/20 border-red-900/40'
        : 'bg-slate-900/20 border-slate-800/40'
      : styles.bg;

    const customText = isDark
      ? styles.text === 'text-amber-700' ? 'text-amber-400'
        : styles.text === 'text-blue-700' ? 'text-blue-400'
        : styles.text === 'text-purple-700' ? 'text-purple-400'
        : styles.text === 'text-emerald-700' ? 'text-emerald-400'
        : styles.text === 'text-red-700' ? 'text-red-400'
        : 'text-slate-400'
      : styles.text;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedPaymentId(item._id);
          setActiveModalTab('summary');
        }}
        style={{ minHeight: 70 }}
        className={`${bgCard} p-4 rounded-2xl border ${borderCard} flex-row items-center justify-between mb-3 shadow-sm`}
      >
        <View className="flex-1 pr-3">
          <View style={{ gap: 6 }} className="flex-row items-center flex-wrap">
            <Text className={`font-bold ${textTitle} text-xs`}>{item.recipientCompany}</Text>
            <View className={`px-2 py-0.5 rounded-full border ${customBg}`}>
              <Text className={`text-[9px] font-bold uppercase ${customText}`}>
                {getPaymentStatusLabel(item.status)}
              </Text>
            </View>
          </View>
          <Text className={`text-[10px] ${textMuted} mt-1`}>
            Submitted {formatDate(item.createdAt)}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-xs font-bold ${textTitle}`}>
            {symbol}
            {item.foreignAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>
            ₦{item.localAmount.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      <View className="p-4 flex-1">
        {/* Header Section */}
        <View className="mb-4">
          <Text className={`text-lg font-bold ${textTitle}`}>Payment Requests</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>
            Track and audit international vendor outbox history
          </Text>
        </View>

        {/* Filter Chips */}
        <View className="mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 2 }}
          >
            {[
              { label: 'All', value: 'all' },
              { label: 'Waiting Approval', value: 'pending' },
              { label: 'Processing', value: 'processing' },
              { label: 'Completed', value: 'completed' },
              { label: 'Failed', value: 'failed' },
            ].map((chip) => {
              const isSelected = statusFilter === chip.value;
              return (
                <TouchableOpacity
                  key={chip.value}
                  onPress={() => setStatusFilter(chip.value)}
                  style={{ minWidth: 44, minHeight: 36 }}
                  className={`px-4 py-2 rounded-full border mr-2 items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : `${bgCard} ${borderCard}`
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-white' : textMuted
                    }`}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Loading / Error list */}
        {isLoading && payments.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text className={`text-[10px] ${textMuted} mt-2 font-semibold`}>
              Loading requests...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPayments}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#1E3A8A']} />
            }
            ListEmptyComponent={
              <View className={`flex-1 justify-center items-center py-20 ${bgCard} border ${borderCard} rounded-2xl`}>
                <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
                <Text className={`${textTitle} font-bold text-xs mt-3`}>No payments found</Text>
                <Text className={`${textMuted} text-[10px] mt-1 text-center px-4 leading-normal`}>
                  Your submitted international payment transactions will appear here.
                </Text>
              </View>
            }
            className="flex-1"
          />
        )}
      </View>
      {/* DETAILS SLIDE MODAL */}
      <Modal
        visible={selectedPaymentId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPaymentId(null)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className={`${bgCard} rounded-t-3xl p-5 max-h-[90%] min-h-[50%]`}>
            {/* Modal Header */}
            <View className={`flex-row justify-between items-center pb-3 border-b ${borderCard} mb-4`}>
              <View>
                <Text className={`text-base font-bold ${textTitle}`}>Payment Details</Text>
                {currentPayment && (
                  <Text className={`text-[9px] font-mono ${textMuted} mt-0.5`}>
                    ID: {currentPayment._id}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPaymentId(null)}
                style={{ minWidth: 44, minHeight: 44 }}
                className={`items-center justify-center rounded-full ${inputBg} w-8 h-8`}
              >
                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {isDetailLoading || !currentPayment ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text className={`text-[10px] ${textMuted} font-bold mt-2`}>
                  Retrieving complete audit details...
                </Text>
              </View>
            ) : (
              <View className="flex-1">
                {/* Modal Tab Switchers */}
                <View style={{ gap: 4 }} className={`flex-row border-b ${borderCard} pb-3 mb-4`}>
                  {[
                    { key: 'summary', label: 'Summary' },
                    { key: 'audit', label: 'Audit Trail' },
                    { key: 'receipt', label: 'Receipt', disabled: !isCompleted },
                  ].map((tab) => {
                    if (tab.disabled) return null;
                    const isSelected = activeModalTab === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveModalTab(tab.key as any)}
                        style={{ minWidth: 44, minHeight: 36 }}
                        className={`px-4 py-2 rounded-xl border mr-1.5 items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : `${inputBg} ${inputBorder}`
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isSelected ? 'text-white' : textMuted
                          }`}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Tab 1: Summary */}
                {activeModalTab === 'summary' && (
                  <ScrollView className="flex-1 pr-1">
                    <View style={{ gap: 16 }}>
                      {/* Status Feedback Banner */}
                      {currentPayment.status === 'rejected' && currentPayment.rejectionReason && (
                        <View className={`${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border border-red-100'} p-3.5 rounded-xl flex-row items-start`} style={{ gap: 8 }}>
                          <Feather name="alert-triangle" size={14} color="#EF4444" style={{ marginTop: 2 }} />
                          <View className="flex-1">
                            <Text className={`${isDark ? 'text-red-300' : 'text-red-900'} font-bold text-[10px]`}>Rejection Reason:</Text>
                            <Text className={`${isDark ? 'text-red-400' : 'text-red-700'} text-[10px] leading-relaxed mt-0.5`}>
                              {currentPayment.rejectionReason}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Recipient Box */}
                      <View className={`${inputBg} border ${inputBorder} p-4 rounded-2xl`}>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase mb-2`}>Recipient Bank Details</Text>
                        <View style={{ gap: 6 }}>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Company Name:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>{currentPayment.recipientCompany}</Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Address:</Text>
                            <Text numberOfLines={1} className={`text-[10px] font-bold ${textTitle} flex-1 text-right pl-4`}>
                              {currentPayment.recipientAddress}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Bank Name:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>{currentPayment.recipientBank}</Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>SWIFT / Account:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>
                              {currentPayment.recipientBankSwiftCode} • {currentPayment.accountNumber}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Country:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>{currentPayment.recipientBankCountry}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Financial Amount Box */}
                      <View className={`${inputBg} border ${inputBorder} p-4 rounded-2xl`}>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase mb-2`}>Transfer Amounts</Text>
                        <View style={{ gap: 6 }}>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Foreign Amount:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>
                              {getCurrencySymbol(currentPayment.foreignCurrency)}
                              {currentPayment.foreignAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({currentPayment.foreignCurrency})
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Exchange Rate:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>
                              1 {currentPayment.foreignCurrency} = ₦{currentPayment.exchangeRate.toLocaleString()}
                            </Text>
                          </View>
                          <View className={`flex-row justify-between border-t ${isDark ? 'border-slate-800' : 'border-slate-200/50'} pt-2 mt-1`}>
                            <Text className={`text-[10px] ${textMuted}`}>Local Equivalency (NGN):</Text>
                            <Text className="text-xs font-bold text-blue-600">
                              ₦{currentPayment.localAmount.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Document Box */}
                      <View className={`${inputBg} border ${inputBorder} p-4 rounded-2xl`}>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase mb-2`}>Invoice Document Details</Text>
                        <View className="flex-row items-center justify-between mt-1">
                          <View className="flex-1 pr-2">
                            <Text numberOfLines={1} className={`text-[10px] font-bold ${textTitle}`}>
                              {currentPayment.invoiceOriginalFileName || currentPayment.invoiceFileName || 'Invoice Document'}
                            </Text>
                            <Text className={`text-[9px] ${textMuted} mt-0.5`}>
                              {currentPayment.invoiceMimeType || 'Document'} • {formatBytes(currentPayment.invoiceFileSize)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={handleOpenInvoice}
                            style={{ minHeight: 36 }}
                            className="px-3 bg-blue-600 rounded-xl justify-center"
                          >
                            <Text className="text-white font-bold text-[10px]">Open File</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Timing Box */}
                      <View className={`${inputBg} border ${inputBorder} p-4 rounded-2xl mb-4`}>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase mb-2`}>Timing</Text>
                        <View style={{ gap: 6 }}>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Submitted Date:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>{formatDateTime(currentPayment.createdAt)}</Text>
                          </View>
                          {currentPayment.updatedAt && (
                            <View className="flex-row justify-between">
                              <Text className={`text-[10px] ${textMuted}`}>Last Updated:</Text>
                              <Text className={`text-[10px] font-bold ${textTitle}`}>{formatDateTime(currentPayment.updatedAt)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                )}

                {/* Tab 2: Audit Trail */}
                {activeModalTab === 'audit' && (
                  <ScrollView className="flex-1">
                    <View style={{ gap: 16 }}>
                      <View className={`${inputBg} border ${inputBorder} p-4 rounded-2xl`} style={{ gap: 12 }}>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase`}>Approval Path</Text>
                        
                        <View style={{ gap: 10 }}>
                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Audit Status:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle} uppercase`}>
                              {currentPayment.status}
                            </Text>
                          </View>

                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Approved By:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>
                              {currentPayment.approvedBy?.name || currentPayment.approvedBy || 'N/A'}
                            </Text>
                          </View>

                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Approved At:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle}`}>
                              {formatDateTime(currentPayment.approvedAt)}
                            </Text>
                          </View>

                          <View className={`flex-row justify-between border-t ${isDark ? 'border-slate-800' : 'border-slate-200/50'} pt-2.5 mt-1`}>
                            <Text className={`text-[10px] ${textMuted}`}>Platform ID:</Text>
                            <Text className={`text-[9px] font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {currentPayment.reapPaymentId || 'N/A'}
                            </Text>
                          </View>

                          <View className="flex-row justify-between">
                            <Text className={`text-[10px] ${textMuted}`}>Processor Status:</Text>
                            <Text className={`text-[10px] font-bold ${textTitle} uppercase`}>
                              {currentPayment.reapStatus || 'N/A'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Admin Notes */}
                      <View className={`${inputBg} border ${inputBorder} p-4 rounded-2xl`}>
                        <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase mb-2`}>Audit Notes</Text>
                        <Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-[10px] leading-relaxed`}>
                          {currentPayment.approvalNotes || 'No administrative notes submitted for this request.'}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>
                )}

                {/* Tab 3: Receipt */}
                {activeModalTab === 'receipt' && (
                  <View className="flex-1">
                    {isReceiptLoading ? (
                      <View className="py-20 justify-center items-center">
                        <ActivityIndicator size="small" color="#1E3A8A" />
                        <Text className={`text-[10px] ${textMuted} mt-2 font-bold`}>
                          Fetching secure receipt data...
                        </Text>
                      </View>
                    ) : receipt ? (
                      <ScrollView className={`flex-1 ${inputBg} border ${inputBorder} rounded-2xl p-4 mb-4`}>
                        <View style={{ gap: 12 }}>
                          <View className={`items-center border-b border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'} pb-3 mb-4`}>
                            <Text className={`text-xs font-bold ${textTitle} tracking-widest uppercase`}>
                              Kenluk Outflow Receipt
                            </Text>
                            <Text className={`text-[9px] ${textMuted} mt-1`}>
                              Thank you for using Kenluk
                            </Text>
                          </View>

                          <View className="pb-6" style={{ gap: 12 }}>
                            <View style={{ gap: 6 }}>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Receipt ID:</Text>
                                <Text className={`text-[9px] font-mono ${textTitle}`}>{receipt.receiptId}</Text>
                              </View>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Settled Date:</Text>
                                <Text className={`text-[9px] ${textTitle}`}>{formatDateTime(receipt.date)}</Text>
                              </View>
                              <View className="flex-row justify-between">
                                <Text className="text-[9px] font-bold text-emerald-500 uppercase">
                                  {receipt.status}
                                </Text>
                              </View>
                            </View>

                            <View className={`border-t border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'} pt-3`} style={{ gap: 6 }}>
                              <Text className={`text-[9px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                                Sender info
                              </Text>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Sender Name:</Text>
                                <Text className={`text-[9px] ${textTitle}`}>{receipt.user?.name}</Text>
                              </View>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Sender Email:</Text>
                                <Text className={`text-[9px] ${textTitle}`}>{receipt.user?.email}</Text>
                              </View>
                            </View>

                            <View className={`border-t border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'} pt-3`} style={{ gap: 6 }}>
                              <Text className={`text-[9px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                                Recipient Info
                              </Text>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Company Name:</Text>
                                <Text className={`text-[9px] ${textTitle}`}>{receipt.recipientCompany}</Text>
                              </View>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Bank / Acct No:</Text>
                                <Text className={`text-[9px] ${textTitle}`}>
                                  {receipt.bankName} • {receipt.accountNumber}
                                </Text>
                              </View>
                            </View>

                            <View className={`border-t border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'} pt-3 pb-3`} style={{ gap: 6 }}>
                              <Text className={`text-[9px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                                Outflow breakdown
                              </Text>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Sent Amount:</Text>
                                <Text className={`text-[9px] font-bold ${textTitle}`}>
                                  {getCurrencySymbol(receipt.foreignCurrency)}
                                  {receipt.foreignAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({receipt.foreignCurrency})
                                </Text>
                              </View>
                              <View className="flex-row justify-between">
                                <Text className={`text-[9px] ${textMuted}`}>Exchange Rate:</Text>
                                <Text className={`text-[9px] ${textTitle}`}>
                                  1 {receipt.foreignCurrency} = ₦{receipt.exchangeRate.toLocaleString()}
                                </Text>
                              </View>
                              <View className={`flex-row justify-between border-t border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'} pt-2 mt-2`}>
                                <Text className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Total Outflow NGN:</Text>
                                <Text className="text-xs font-bold text-blue-600">
                                  ₦{receipt.localAmount.toLocaleString()}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </ScrollView>
                    ) : (
                      <View className="py-20 items-center">
                        <Feather name="alert-circle" size={24} color="#EF4444" />
                        <Text className={`text-[10px] ${textMuted} font-bold mt-2`}>
                          Unable to retrieve receipt payload.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
