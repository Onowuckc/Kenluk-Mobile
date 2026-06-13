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

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedPaymentId(item._id);
          setActiveModalTab('summary');
        }}
        style={{ minHeight: 70 }}
        className="bg-white p-4 rounded-2xl border border-fintech-border flex-row items-center justify-between mb-3 shadow-sm"
      >
        <View className="flex-1 pr-3">
          <View className="flex-row items-center flex-wrap gap-1.5">
            <Text className="font-bold text-slate-800 text-xs">{item.recipientCompany}</Text>
            <View className={`px-2 py-0.5 rounded-full border ${styles.bg}`}>
              <Text className={`text-[9px] font-bold uppercase ${styles.text}`}>
                {getPaymentStatusLabel(item.status)}
              </Text>
            </View>
          </View>
          <Text className="text-[10px] text-fintech-textMuted mt-1">
            Submitted {formatDate(item.createdAt)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-bold text-slate-800">
            {symbol}
            {item.foreignAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text className="text-[10px] text-fintech-textMuted mt-0.5">
            ₦{item.localAmount.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-fintech-background" edges={['top', 'left', 'right']}>
      <View className="p-4 flex-1">
        {/* Header Section */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-slate-800">Payment Requests</Text>
          <Text className="text-[10px] text-fintech-textMuted mt-0.5">
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
                    isSelected ? 'bg-fintech-primary border-fintech-primary' : 'bg-white border-fintech-border'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-white' : 'text-fintech-textMuted'
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
            <Text className="text-[10px] text-fintech-textMuted mt-2 font-semibold">
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
              <View className="flex-1 justify-center items-center py-20 bg-white border border-fintech-border rounded-2xl">
                <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
                <Text className="text-slate-800 font-bold text-xs mt-3">No payments found</Text>
                <Text className="text-slate-400 text-[10px] mt-1 text-center px-4 leading-normal">
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
          <View className="bg-white rounded-t-3xl p-5 max-h-[90%] min-h-[50%]">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <View>
                <Text className="text-base font-bold text-slate-800">Payment Details</Text>
                {currentPayment && (
                  <Text className="text-[9px] font-mono text-slate-400 mt-0.5">
                    ID: {currentPayment._id}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPaymentId(null)}
                style={{ minWidth: 44, minHeight: 44 }}
                className="items-center justify-center rounded-full bg-slate-100 w-8 h-8"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {isDetailLoading || !currentPayment ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text className="text-[10px] text-slate-400 font-bold mt-2">
                  Retrieving complete audit details...
                </Text>
              </View>
            ) : (
              <View className="flex-1">
                {/* Modal Tab Switchers */}
                <View className="flex-row border-b border-slate-100 pb-3 mb-4 space-x-1">
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
                          isSelected ? 'bg-fintech-primary border-fintech-primary' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isSelected ? 'text-white' : 'text-slate-500'
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
                  <ScrollView className="flex-1 space-y-4 pr-1">
                    {/* Status Feedback Banner */}
                    {currentPayment.status === 'rejected' && currentPayment.rejectionReason && (
                      <View className="bg-red-50 border border-red-100 p-3.5 rounded-xl flex-row items-start space-x-2">
                        <Feather name="alert-triangle" size={14} color="#EF4444" style={{ marginTop: 2, marginRight: 4 }} />
                        <View className="flex-1">
                          <Text className="text-red-900 font-bold text-[10px]">Rejection Reason:</Text>
                          <Text className="text-red-700 text-[10px] leading-relaxed mt-0.5">
                            {currentPayment.rejectionReason}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Recipient Box */}
                    <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                      <Text className="text-[10px] font-bold text-slate-700 uppercase mb-2">Recipient Bank Details</Text>
                      <View className="space-y-1.5">
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Company Name:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">{currentPayment.recipientCompany}</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Address:</Text>
                          <Text numberOfLines={1} className="text-[10px] font-bold text-slate-800 flex-1 text-right pl-4">
                            {currentPayment.recipientAddress}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Bank Name:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">{currentPayment.recipientBank}</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">SWIFT / Account:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">
                            {currentPayment.recipientBankSwiftCode} • {currentPayment.accountNumber}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Country:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">{currentPayment.recipientBankCountry}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Financial Amount Box */}
                    <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                      <Text className="text-[10px] font-bold text-slate-700 uppercase mb-2">Transfer Amounts</Text>
                      <View className="space-y-1.5">
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Foreign Amount:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">
                            {getCurrencySymbol(currentPayment.foreignCurrency)}
                            {currentPayment.foreignAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({currentPayment.foreignCurrency})
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Exchange Rate:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">
                            1 {currentPayment.foreignCurrency} = ₦{currentPayment.exchangeRate.toLocaleString()}
                          </Text>
                        </View>
                        <View className="flex-row justify-between border-t border-slate-200/50 pt-2 mt-1">
                          <Text className="text-[10px] text-slate-400">Local Equivalency (NGN):</Text>
                          <Text className="text-xs font-bold text-fintech-primary">
                            ₦{currentPayment.localAmount.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Document Box */}
                    <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                      <Text className="text-[10px] font-bold text-slate-700 uppercase mb-2">Invoice Document Details</Text>
                      <View className="flex-row items-center justify-between mt-1">
                        <View className="flex-1 pr-2">
                          <Text numberOfLines={1} className="text-[10px] font-bold text-slate-800">
                            {currentPayment.invoiceOriginalFileName || currentPayment.invoiceFileName || 'Invoice Document'}
                          </Text>
                          <Text className="text-[9px] text-slate-400 mt-0.5">
                            {currentPayment.invoiceMimeType || 'Document'} • {formatBytes(currentPayment.invoiceFileSize)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={handleOpenInvoice}
                          style={{ minHeight: 36 }}
                          className="px-3 bg-fintech-primary rounded-xl justify-center"
                        >
                          <Text className="text-white font-bold text-[10px]">Open File</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Timing Box */}
                    <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4">
                      <Text className="text-[10px] font-bold text-slate-700 uppercase mb-2">Timing</Text>
                      <View className="space-y-1.5">
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Submitted Date:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">{formatDateTime(currentPayment.createdAt)}</Text>
                        </View>
                        {currentPayment.updatedAt && (
                          <View className="flex-row justify-between">
                            <Text className="text-[10px] text-slate-400">Last Updated:</Text>
                            <Text className="text-[10px] font-bold text-slate-800">{formatDateTime(currentPayment.updatedAt)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </ScrollView>
                )}

                {/* Tab 2: Audit Trail */}
                {activeModalTab === 'audit' && (
                  <ScrollView className="flex-1 space-y-4">
                    <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                      <Text className="text-[10px] font-bold text-slate-700 uppercase">Approval Path</Text>
                      
                      <View className="space-y-2.5">
                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Audit Status:</Text>
                          <Text className="text-[10px] font-bold text-slate-800 uppercase">
                            {currentPayment.status}
                          </Text>
                        </View>

                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Approved By:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">
                            {currentPayment.approvedBy?.name || currentPayment.approvedBy || 'N/A'}
                          </Text>
                        </View>

                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Approved At:</Text>
                          <Text className="text-[10px] font-bold text-slate-800">
                            {formatDateTime(currentPayment.approvedAt)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between border-t border-slate-200/50 pt-2.5 mt-1">
                          <Text className="text-[10px] text-slate-400">Platform ID:</Text>
                          <Text className="text-[9px] font-mono font-bold text-slate-600">
                            {currentPayment.reapPaymentId || 'N/A'}
                          </Text>
                        </View>

                        <View className="flex-row justify-between">
                          <Text className="text-[10px] text-slate-400">Reap Status:</Text>
                          <Text className="text-[10px] font-bold text-slate-800 uppercase">
                            {currentPayment.reapStatus || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Admin Notes */}
                    <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                      <Text className="text-[10px] font-bold text-slate-700 uppercase mb-2">Audit Notes</Text>
                      <Text className="text-slate-600 text-[10px] leading-relaxed">
                        {currentPayment.approvalNotes || 'No administrative notes submitted for this request.'}
                      </Text>
                    </View>
                  </ScrollView>
                )}

                {/* Tab 3: Receipt */}
                {activeModalTab === 'receipt' && (
                  <View className="flex-1">
                    {isReceiptLoading ? (
                      <View className="py-20 justify-center items-center">
                        <ActivityIndicator size="small" color="#1E3A8A" />
                        <Text className="text-[10px] text-slate-400 mt-2 font-bold">
                          Fetching secure receipt data...
                        </Text>
                      </View>
                    ) : receipt ? (
                      <ScrollView className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
                        <View className="items-center border-b border-dashed border-slate-300 pb-3 mb-4">
                          <Text className="text-xs font-bold text-slate-800 tracking-widest uppercase">
                            Kenluk Outflow Receipt
                          </Text>
                          <Text className="text-[9px] text-slate-400 mt-1">
                            Thank you for using Kenluk
                          </Text>
                        </View>

                        <View className="space-y-3 pb-6">
                          <View className="space-y-1.5">
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Receipt ID:</Text>
                              <Text className="text-[9px] font-mono text-slate-800">{receipt.receiptId}</Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Settled Date:</Text>
                              <Text className="text-[9px] text-slate-800">{formatDateTime(receipt.date)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Outflow Status:</Text>
                              <Text className="text-[9px] font-bold text-emerald-600 uppercase">
                                {receipt.status}
                              </Text>
                            </View>
                          </View>

                          <View className="border-t border-dashed border-slate-300 pt-3 space-y-1.5">
                            <Text className="text-[9px] font-bold text-slate-600 uppercase mb-1">
                              Sender info
                            </Text>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Sender Name:</Text>
                              <Text className="text-[9px] text-slate-800">{receipt.user?.name}</Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Sender Email:</Text>
                              <Text className="text-[9px] text-slate-800">{receipt.user?.email}</Text>
                            </View>
                          </View>

                          <View className="border-t border-dashed border-slate-300 pt-3 space-y-1.5">
                            <Text className="text-[9px] font-bold text-slate-600 uppercase mb-1">
                              Recipient Info
                            </Text>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Company Name:</Text>
                              <Text className="text-[9px] text-slate-800">{receipt.recipientCompany}</Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Bank / Acct No:</Text>
                              <Text className="text-[9px] text-slate-800">
                                {receipt.bankName} • {receipt.accountNumber}
                              </Text>
                            </View>
                          </View>

                          <View className="border-t border-dashed border-slate-300 pt-3 pb-3 space-y-1.5">
                            <Text className="text-[9px] font-bold text-slate-600 uppercase mb-1">
                              Outflow breakdown
                            </Text>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Sent Amount:</Text>
                              <Text className="text-[9px] font-bold text-slate-800">
                                {getCurrencySymbol(receipt.foreignCurrency)}
                                {receipt.foreignAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({receipt.foreignCurrency})
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-[9px] text-slate-400">Exchange Rate:</Text>
                              <Text className="text-[9px] text-slate-800">
                                1 {receipt.foreignCurrency} = ₦{receipt.exchangeRate.toLocaleString()}
                              </Text>
                            </View>
                            <View className="flex-row justify-between border-t border-dashed border-slate-300 pt-2 mt-2">
                              <Text className="text-[10px] font-bold text-slate-700">Total Outflow NGN:</Text>
                              <Text className="text-xs font-bold text-fintech-primary">
                                ₦{receipt.localAmount.toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </ScrollView>
                    ) : (
                      <View className="py-20 items-center">
                        <Feather name="alert-circle" size={24} color="#EF4444" />
                        <Text className="text-[10px] text-slate-500 font-bold mt-2">
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
