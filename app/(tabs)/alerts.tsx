import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

import { paymentsApi, kycApi } from '../../src/services/api';
import { getDocumentTypeLabel } from '../../src/utils/documentTypeMap';

interface PaymentRequest {
  _id?: string;
  recipientCompany: string;
  localAmount: number;
  status: string;
  rejectionReason?: string;
  createdAt?: string;
}

interface KycDocument {
  _id: string;
  type: string;
  status: string;
  rejectionReason?: string;
}

export default function AlertsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch payments
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.getMyPayments(),
    staleTime: 30000,
  });

  // 2. Fetch KYC documents
  const {
    data: documentsData,
    isLoading: isDocumentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => kycApi.getMyDocuments(),
    staleTime: 30000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPayments(), refetchDocuments()]);
    setRefreshing(false);
  }, [refetchPayments, refetchDocuments]);

  const paymentsList = useMemo(() => {
    return (paymentsData?.payments || []) as PaymentRequest[];
  }, [paymentsData]);

  const documentsList = useMemo(() => {
    return (documentsData?.documents || []) as KycDocument[];
  }, [documentsData]);

  // Extract rejected items with feedback
  const rejectedPayments = useMemo(() => {
    return paymentsList.filter(
      (p) => p.status === 'rejected' && Boolean(p.rejectionReason?.trim())
    );
  }, [paymentsList]);

  const rejectedDocuments = useMemo(() => {
    return documentsList.filter(
      (d) => d.status === 'rejected' && Boolean(d.rejectionReason?.trim())
    );
  }, [documentsList]);

  const totalIssuesCount = rejectedPayments.length + rejectedDocuments.length;
  const isLoading = isPaymentsLoading || isDocumentsLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        className="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xl font-bold text-slate-900 font-sans">Feedback & Alerts</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Manage administrative flags and document feedback</Text>
          </View>
          <View className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center border border-blue-100 relative">
            <Feather name="bell" size={18} color="#1E3A8A" />
            {totalIssuesCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                <Text className="text-[9px] text-white font-extrabold">{totalIssuesCount}</Text>
              </View>
            )}
          </View>
        </View>

        {isLoading && !refreshing ? (
          <View className="flex-1 justify-center py-20">
            <ActivityIndicator size="large" color="#1E3A8A" />
          </View>
        ) : totalIssuesCount === 0 ? (
          /* Empty / Fully Clean State */
          <View className="flex-1 justify-center items-center px-6 py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4 border border-emerald-100">
              <Ionicons name="checkmark-circle-outline" size={36} color="#10B981" />
            </View>
            <Text className="text-base font-bold text-slate-800">All Systems Clear</Text>
            <Text className="text-xs text-slate-400 text-center mt-2 leading-relaxed max-w-xs">
              No outstanding issues or document rejections have been flagged on your account. We'll notify you if anything changes.
            </Text>
          </View>
        ) : (
          /* List of alerts/issues */
          <View className="space-y-6">
            
            {/* Warning summary banner */}
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-start space-x-3">
              <Ionicons name="warning" size={20} color="#EF4444" style={{ marginTop: 2, marginRight: 6 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-red-900">Action Required ({totalIssuesCount} issue{totalIssuesCount > 1 ? 's' : ''})</Text>
                <Text className="text-[10px] text-red-700 mt-1 leading-relaxed">
                  One or more verification steps or transactions have failed validation by our compliance desk. Please review the details below.
                </Text>
              </View>
            </View>

            {/* Rejected Payments */}
            {rejectedPayments.length > 0 && (
              <View className="space-y-3">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Payment Requests Rejected</Text>
                {rejectedPayments.map((payment) => (
                  <View key={payment._id} className="bg-white border border-red-100 rounded-2xl p-5 shadow-xs">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-bold text-slate-800">{payment.recipientCompany}</Text>
                        {payment.createdAt && (
                          <Text className="text-[9px] text-slate-400 mt-0.5">
                            Created: {new Date(payment.createdAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <View className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <Text className="text-[9px] font-bold text-red-700 uppercase">Rejected</Text>
                      </View>
                    </View>

                    <View className="bg-red-50/40 border border-red-100 rounded-xl p-3.5 mt-2">
                      <Text className="text-[10px] font-bold text-red-900">Compliance Reason:</Text>
                      <Text className="text-[10px] text-red-700 mt-1 leading-relaxed">{payment.rejectionReason}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/history')}
                      style={{ minHeight: 36 }}
                      className="mt-4 border border-red-200 bg-red-50/10 active:bg-red-50 rounded-xl items-center justify-center flex-row"
                    >
                      <Text className="text-xs font-bold text-red-800 mr-1.5">View in Transaction History</Text>
                      <Ionicons name="arrow-forward" size={12} color="#991B1B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Rejected Documents */}
            {rejectedDocuments.length > 0 && (
              <View className="space-y-3">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">KYC Documents Flagged</Text>
                {rejectedDocuments.map((doc) => (
                  <View key={doc._id} className="bg-white border border-red-100 rounded-2xl p-5 shadow-xs">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-bold text-slate-800">{getDocumentTypeLabel(doc.type)}</Text>
                      </View>
                      <View className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <Text className="text-[9px] font-bold text-red-700 uppercase">Flagged</Text>
                      </View>
                    </View>

                    <View className="bg-red-50/40 border border-red-100 rounded-xl p-3.5 mt-2">
                      <Text className="text-[10px] font-bold text-red-900">Rejection Feedback:</Text>
                      <Text className="text-[10px] text-red-700 mt-1 leading-relaxed">{doc.rejectionReason}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => router.push('/modals/kyc' as any)}
                      style={{ minHeight: 36 }}
                      className="mt-4 border border-red-200 bg-red-50/10 active:bg-red-50 rounded-xl items-center justify-center flex-row"
                    >
                      <Text className="text-xs font-bold text-red-800 mr-1.5">Reupload Document</Text>
                      <Ionicons name="arrow-forward" size={12} color="#991B1B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
