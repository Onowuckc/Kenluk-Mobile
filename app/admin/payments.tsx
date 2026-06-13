import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

import { paymentsApi } from '../../src/services/api';

interface PaymentRequest {
  _id: string;
  recipientCompany: string;
  recipientBank: string;
  recipientBankSwiftCode: string;
  accountNumber: string;
  recipientBankCountry: string;
  recipientAddress: string;
  recipientBankAddress: string;
  foreignAmount: number;
  foreignCurrency: string;
  localAmount: number;
  exchangeRate: number;
  status: string;
  createdAt: string;
  invoiceUrl?: string;
  reapStatus?: string;
  reapError?: string;
  reapErrorMessage?: string;
}

export default function AdminPaymentsQueueScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Filter tab state: 'pending' | 'actionable' | 'all'
  const [filterTab, setFilterTab] = useState<'pending' | 'actionable' | 'all'>('pending');

  // Review Reject modal
  const [selectedReviewItem, setSelectedReviewItem] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Fetch all requests
  const {
    data: responseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-all-payments-list'],
    queryFn: () => paymentsApi.getAllPayments(),
  });

  const payments = useMemo(() => {
    return (responseData?.payments || []) as PaymentRequest[];
  }, [responseData]);

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      if (filterTab === 'pending') {
        return item.status === 'pending_admin_approval';
      }
      if (filterTab === 'actionable') {
        return item.status === 'approved' || item.status === 'processing';
      }
      return true;
    });
  }, [payments, filterTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.reviewPayment(paymentId, { action: 'approve' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      
      const reapStatus = res.data?.reapStatus;
      const reapError = res.data?.reapError || res.data?.reapErrorMessage;

      if (reapStatus && reapStatus !== 'sent') {
        Alert.alert('Approved (Warning)', `Payment approved, but Reap status is: ${reapStatus}. Error: ${reapError || 'None'}`);
      } else {
        Alert.alert('Success', 'Payment approved and submitted to Reap.');
      }
      setSelectedReviewItem(null);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve payment.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { paymentId: string; reason: string }) =>
      paymentsApi.reviewPayment(data.paymentId, { action: 'reject', rejectionReason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Success', 'Payment request rejected.');
      setSelectedReviewItem(null);
      setRejectionReason('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reject payment.');
    },
  });

  const debitMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.debitWalletForPayment(paymentId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-payments-list'] });
      Alert.alert('Success', 'Wallet debited successfully. Payout moved to processing.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to debit user wallet.');
    },
  });

  const retryReapMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.retryReapSubmission(paymentId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-payments-list'] });
      const reapStatus = res.data?.reapStatus;
      if (reapStatus === 'sent') {
        Alert.alert('Success', 'Reap submission succeeded. Wallet can now be debited.');
      } else {
        Alert.alert('Retry Status', `Reap submission status: ${reapStatus || 'unknown'}`);
      }
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to retry Reap submission.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.completePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-payments-list'] });
      Alert.alert('Success', 'Payment marked as completed.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to complete payment.');
    },
  });

  const handleApprove = (payment: PaymentRequest) => {
    Alert.alert(
      'Approve Request',
      `Approve payment of ${payment.foreignCurrency} ${payment.foreignAmount.toLocaleString()} to ${payment.recipientCompany}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveMutation.mutate(payment._id),
        },
      ]
    );
  };

  const handleRejectAction = () => {
    if (!selectedReviewItem) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Validation Error', 'Please specify a rejection reason.');
      return;
    }
    rejectMutation.mutate({
      paymentId: selectedReviewItem._id,
      reason: rejectionReason.trim(),
    });
  };

  const handleViewInvoice = async (paymentId: string) => {
    try {
      const { invoiceUrl } = await paymentsApi.getPaymentInvoiceUrl(paymentId);
      if (invoiceUrl) {
        const supported = await Linking.canOpenURL(invoiceUrl);
        if (supported) {
          await Linking.openURL(invoiceUrl);
        } else {
          Alert.alert('Error', 'Unable to open invoice URL.');
        }
      } else {
        Alert.alert('Error', 'Invoice file is missing.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve invoice URL.');
    }
  };

  const formatCurrency = (amount: number, code: string = 'USD') => {
    const symbol = code === 'NGN' ? '₦' : code === 'EUR' ? '€' : code === 'GBP' ? '£' : '$';
    return symbol + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_admin_approval':
        return { text: 'Pending', bg: 'bg-amber-50 border-amber-200', textCol: 'text-amber-700' };
      case 'approved':
        return { text: 'Approved', bg: 'bg-blue-50 border-blue-200', textCol: 'text-blue-700' };
      case 'processing':
        return { text: 'Processing', bg: 'bg-purple-50 border-purple-200', textCol: 'text-purple-700' };
      case 'completed':
        return { text: 'Completed', bg: 'bg-emerald-50 border-emerald-200', textCol: 'text-emerald-700' };
      case 'rejected':
        return { text: 'Rejected', bg: 'bg-red-50 border-red-200', textCol: 'text-red-700' };
      default:
        return { text: status, bg: 'bg-slate-100 border-slate-250', textCol: 'text-slate-600' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white">
        <Text className="text-base font-bold text-slate-800">Payment Queue</Text>
        <Text className="text-[10px] text-slate-400 mt-0.5">Manage and execute international payment requests</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-slate-100 p-2 space-x-2">
        {[
          { label: 'Pending Review', value: 'pending' as const },
          { label: 'Action Needed', value: 'actionable' as const },
          { label: 'All Requests', value: 'all' as const },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setFilterTab(tab.value)}
            className={`flex-1 py-2 items-center rounded-xl border ${
              filterTab === tab.value
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-transparent'
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${
                filterTab === tab.value ? 'text-blue-900' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
        ) : filteredPayments.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text className="text-sm font-bold text-slate-800 mt-3">All Clear!</Text>
            <Text className="text-xs text-slate-400 mt-1">No payment requests match this filter.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {filteredPayments.map((payment) => {
              const badge = getStatusBadge(payment.status);

              return (
                <View key={payment._id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                  {/* Top line */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-slate-850">{payment.recipientCompany}</Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">
                        Bank: {payment.recipientBank} ({payment.recipientBankCountry})
                      </Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      <Text className={`text-[9px] font-bold uppercase ${badge.textCol}`}>{badge.text}</Text>
                    </View>
                  </View>

                  {/* Amounts */}
                  <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row justify-between">
                    <View>
                      <Text className="text-[9px] text-slate-400 uppercase font-semibold">Foreign Outflow</Text>
                      <Text className="text-base font-bold text-slate-800 mt-1">
                        {formatCurrency(payment.foreignAmount, payment.foreignCurrency)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[9px] text-slate-400 uppercase font-semibold">Equivalent NGN</Text>
                      <Text className="text-base font-bold text-blue-900 mt-1">
                        {formatCurrency(payment.localAmount, 'NGN')}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata and S3 errors */}
                  <View className="space-y-1 pl-1">
                    <Text className="text-[9px] text-slate-400">
                      Acct Number: {payment.accountNumber} | SWIFT: {payment.recipientBankSwiftCode}
                    </Text>
                    <Text className="text-[9px] text-slate-400">
                      Submitted: {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                    </Text>

                    {payment.reapStatus && (
                      <View className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <Text className="text-[9px] font-bold text-slate-600">Reap Status: {payment.reapStatus}</Text>
                        {(payment.reapError || payment.reapErrorMessage) && (
                          <Text className="text-[9px] text-red-500 font-semibold mt-0.5">
                            {payment.reapError || payment.reapErrorMessage}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Operations Actions */}
                  <View className="flex-row flex-wrap gap-2 pt-2 border-t border-slate-50">
                    <TouchableOpacity
                      onPress={() => handleViewInvoice(payment._id)}
                      className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1"
                    >
                      <Feather name="file-text" size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text className="text-slate-600 font-bold text-[10px]">Invoice</Text>
                    </TouchableOpacity>

                    {payment.status === 'pending_admin_approval' && (
                      <>
                        <TouchableOpacity
                          onPress={() => setSelectedReviewItem(payment)}
                          className="bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1"
                        >
                          <Text className="text-red-600 font-bold text-[10px]">Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleApprove(payment)}
                          className="bg-emerald-600 px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1"
                        >
                          <Text className="text-white font-bold text-[10px]">Approve</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {payment.status === 'approved' && payment.reapStatus === 'sent' && (
                      <TouchableOpacity
                        onPress={() => debitMutation.mutate(payment._id)}
                        disabled={debitMutation.isPending}
                        className="bg-blue-600 px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1"
                      >
                        {debitMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1" />}
                        <Text className="text-white font-bold text-[10px]">Debit Wallet</Text>
                      </TouchableOpacity>
                    )}

                    {payment.status === 'approved' && payment.reapStatus !== 'sent' && (
                      <TouchableOpacity
                        onPress={() => retryReapMutation.mutate(payment._id)}
                        disabled={retryReapMutation.isPending}
                        className="bg-amber-55 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1"
                      >
                        {retryReapMutation.isPending && <ActivityIndicator size="small" color="#B45309" className="mr-1" />}
                        <Text className="text-amber-700 font-bold text-[10px]">Retry Reap</Text>
                      </TouchableOpacity>
                    )}

                    {payment.status === 'processing' && (
                      <TouchableOpacity
                        onPress={() => completeMutation.mutate(payment._id)}
                        disabled={completeMutation.isPending}
                        className="bg-emerald-600 px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1"
                      >
                        {completeMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1" />}
                        <Text className="text-white font-bold text-[10px]">Mark Completed</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Reject Reason Modal */}
      <Modal
        visible={Boolean(selectedReviewItem)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedReviewItem(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 space-y-4">
            <View className="flex-row justify-between items-center border-b border-slate-100 pb-3 mb-1">
              <View>
                <Text className="text-base font-bold text-slate-800">Reject Payment Request</Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  Enter rejection rationale for compliance records
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)} className="p-1">
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="space-y-2">
              <Text className="text-xs font-semibold text-slate-700">Rejection Reason</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="State specific invoice issues, validation errors, or compliance warnings..."
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
                className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 text-xs font-medium h-20"
              />
            </View>

            <View className="flex-row space-x-3 pt-2">
              <TouchableOpacity
                onPress={() => setSelectedReviewItem(null)}
                className="flex-1 bg-slate-100 rounded-xl items-center justify-center py-3"
              >
                <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRejectAction}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-red-65 bg-red-600 rounded-xl items-center justify-center flex-row py-3"
              >
                {rejectMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
                <Text className="text-white font-bold text-xs">Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
