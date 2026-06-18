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
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

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
        return {
          text: 'Pending',
          bg: isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200',
          textCol: isDark ? 'text-amber-400' : 'text-amber-700'
        };
      case 'approved':
        return {
          text: 'Approved',
          bg: isDark ? 'bg-blue-950/30 border-blue-900/50' : 'bg-blue-50 border-blue-200',
          textCol: isDark ? 'text-blue-400' : 'text-blue-700'
        };
      case 'processing':
        return {
          text: 'Processing',
          bg: isDark ? 'bg-purple-950/30 border-purple-900/50' : 'bg-purple-50 border-purple-200',
          textCol: isDark ? 'text-purple-400' : 'text-purple-700'
        };
      case 'completed':
        return {
          text: 'Completed',
          bg: isDark ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200',
          textCol: isDark ? 'text-emerald-400' : 'text-emerald-700'
        };
      case 'rejected':
        return {
          text: 'Rejected',
          bg: isDark ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50 border-red-200',
          textCol: isDark ? 'text-red-400' : 'text-red-700'
        };
      default:
        return {
          text: status,
          bg: isDark ? 'bg-slate-900/30 border-slate-800/50' : 'bg-slate-100 border-slate-250',
          textCol: isDark ? 'text-slate-400' : 'text-slate-600'
        };
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className={`px-4 py-3.5 border-b ${borderCard} ${bgCard}`}>
        <Text className={`text-base font-bold ${textTitle}`}>Payment Queue</Text>
        <Text className={`text-[10px] ${textMuted} mt-0.5`}>Manage and execute international payment requests</Text>
      </View>

      {/* Tabs */}
      <View style={{ gap: 8 }} className={`flex-row ${bgCard} border-b ${borderCard} p-2`}>
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
                ? isDark ? 'bg-blue-950/40 border-blue-800/60' : 'bg-blue-50 border-blue-200'
                : isDark ? 'bg-[#121E42] border-transparent' : 'bg-white border-transparent'
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${
                filterTab === tab.value
                  ? isDark ? 'text-blue-400' : 'text-blue-900'
                  : textMuted
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
          <View className={`flex-1 justify-center items-center py-20 ${bgCard} rounded-3xl border ${borderCard} shadow-sm mt-4`}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text className={`text-sm font-bold ${textTitle} mt-3`}>All Clear!</Text>
            <Text className={`text-xs ${textMuted} mt-1`}>No payment requests match this filter.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {filteredPayments.map((payment) => {
              const badge = getStatusBadge(payment.status);

              return (
                <View key={payment._id} style={{ gap: 16 }} className={`${bgCard} border ${borderCard} rounded-3xl p-5 shadow-sm`}>
                  {/* Top line */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className={`text-sm font-bold ${textTitle}`}>{payment.recipientCompany}</Text>
                      <Text className={`text-[10px] ${textMuted} mt-0.5`}>
                        Bank: {payment.recipientBank} ({payment.recipientBankCountry})
                      </Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      <Text className={`text-[9px] font-bold uppercase ${badge.textCol}`}>{badge.text}</Text>
                    </View>
                  </View>

                  {/* Amounts */}
                  <View className={`${isDark ? 'bg-[#121E42]' : 'bg-slate-50'} border ${borderCard} rounded-2xl p-4 flex-row justify-between`}>
                    <View>
                      <Text className={`text-[9px] ${textMuted} uppercase font-semibold`}>Foreign Outflow</Text>
                      <Text className={`text-base font-bold ${textTitle} mt-1`}>
                        {formatCurrency(payment.foreignAmount, payment.foreignCurrency)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-[9px] ${textMuted} uppercase font-semibold`}>Equivalent NGN</Text>
                      <Text className={`text-base font-bold ${isDark ? 'text-blue-400' : 'text-blue-900'} mt-1`}>
                        {formatCurrency(payment.localAmount, 'NGN')}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata and S3 errors */}
                  <View style={{ gap: 4 }} className="pl-1">
                    <Text className={`text-[9px] ${textMuted}`}>
                      Acct Number: {payment.accountNumber} | SWIFT: {payment.recipientBankSwiftCode}
                    </Text>
                    <Text className={`text-[9px] ${textMuted}`}>
                      Submitted: {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                    </Text>

                    {payment.reapStatus && (
                      <View className={`mt-2 ${isDark ? 'bg-[#152757]' : 'bg-slate-50'} p-2 rounded-lg border ${borderCard}`}>
                        <Text className={`text-[9px] font-bold ${textTitle}`}>Reap Status: {payment.reapStatus}</Text>
                        {(payment.reapError || payment.reapErrorMessage) && (
                          <Text className="text-[9px] text-red-500 font-semibold mt-0.5">
                            {payment.reapError || payment.reapErrorMessage}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Operations Actions */}
                  <View className={`flex-row flex-wrap gap-2 pt-2 border-t ${borderCard}`}>
                    <TouchableOpacity
                      onPress={() => handleViewInvoice(payment._id)}
                      className={`${bgCard} border ${inputBorder} px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1`}
                    >
                      <Feather name="file-text" size={12} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 4 }} />
                      <Text className={`${isDark ? 'text-slate-300' : 'text-slate-650'} font-bold text-[10px]`}>Invoice</Text>
                    </TouchableOpacity>

                    {payment.status === 'pending_admin_approval' && (
                      <>
                        <TouchableOpacity
                          onPress={() => setSelectedReviewItem(payment)}
                          className={`${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-200'} px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1`}
                        >
                          <Text className="text-red-650 font-bold text-[10px]">Reject</Text>
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
                        className={`${isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border border-amber-200'} px-3 py-2.5 rounded-xl items-center justify-center flex-row flex-1`}
                      >
                        {retryReapMutation.isPending && <ActivityIndicator size="small" color={isDark ? '#F59E0B' : '#B45309'} className="mr-1" />}
                        <Text className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-bold text-[10px]`}>Retry Reap</Text>
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
          <View style={{ gap: 16 }} className={`${bgCard} rounded-t-3xl p-6`}>
            <View className={`flex-row justify-between items-center border-b ${borderCard} pb-3 mb-1`}>
              <View>
                <Text className={`text-base font-bold ${textTitle}`}>Reject Payment Request</Text>
                <Text className={`text-[10px] ${textMuted} mt-0.5`}>
                  Enter rejection rationale for compliance records
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)} className="p-1">
                <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              <Text className={`text-xs font-semibold ${textTitle}`}>Rejection Reason</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="State specific invoice issues, validation errors, or compliance warnings..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline={true}
                numberOfLines={3}
                className={`${inputBg} border ${inputBorder} px-4 py-3 rounded-2xl ${textInputColor} text-xs font-medium h-20`}
              />
            </View>

            <View className="flex-row space-x-3 pt-2">
              <TouchableOpacity
                onPress={() => setSelectedReviewItem(null)}
                className={`flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-xl items-center justify-center py-3`}
              >
                <Text className={`${isDark ? 'text-slate-350' : 'text-slate-700'} font-bold text-xs`}>Cancel</Text>
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
