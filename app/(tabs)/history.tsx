import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getPaymentHistory, retryPayment } from '../../src/redux/slices/fidelityPaymentSlice';
import { RootState } from '../../src/redux/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Payment {
  paymentId: string;
  transactionRef: string;
  amount: number;
  status: 'Successful' | 'Failed' | 'Processing' | 'Pending';
  createdAt: string;
  completedAt?: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Successful: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
  Failed: { bg: 'bg-red-50 border-red-100', text: 'text-red-700' },
  Processing: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
  Pending: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
};

export default function HistoryScreen() {
  const dispatch = useDispatch();
  const { paymentHistory = [], historyLoading = false, historyError = null } = useSelector(
    (state: RootState) => state.fidelityPayment || {}
  );

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadData = () => {
    dispatch(getPaymentHistory({
      page: 1,
      limit: 50,
      status: statusFilter || undefined,
    }) as any);
  };

  useEffect(() => {
    loadData();
  }, [dispatch, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Payment }) => {
    const statusColor = statusColors[item.status] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600' };

    return (
      <TouchableOpacity
        onPress={() => setSelectedPayment(item)}
        className="bg-white p-4 rounded-2xl border border-fintech-border flex-row items-center justify-between mb-3 shadow-sm"
      >
        <View className="flex-1 pr-3">
          <View className="flex-row items-center space-x-2">
            <Text className="font-mono text-xs text-fintech-textMuted bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {item.transactionRef}
            </Text>
            <View className={`${statusColor.bg} border px-2 py-0.5 rounded-full`}>
              <Text className={`${statusColor.text} text-[10px] font-bold`}>{item.status}</Text>
            </View>
          </View>
          <Text className="text-[10px] text-fintech-textMuted mt-1.5">{formatDate(item.createdAt)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-fintech-text">₦{item.amount.toLocaleString()}</Text>
          <Text className="text-[10px] text-fintech-secondary mt-1">Details &gt;</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-fintech-background" edges={['top', 'left', 'right']}>
      <View className="p-4 flex-1">
        {/* Header section */}
        <View className="mb-4">
          <Text className="text-xl font-bold text-fintech-text">Transaction History</Text>
          <Text className="text-xs text-fintech-textMuted mt-0.5">Check statements and status updates</Text>
        </View>

        {/* Filter chips */}
        <View className="flex-row space-x-2 mb-4 overflow-x-scroll py-1">
          {[
            { label: 'All', value: '' },
            { label: 'Successful', value: 'Successful' },
            { label: 'Pending', value: 'Pending' },
            { label: 'Failed', value: 'Failed' },
          ].map((chip) => {
            const isSelected = statusFilter === chip.value;
            return (
              <TouchableOpacity
                key={chip.label}
                onPress={() => setStatusFilter(chip.value)}
                className={`px-4 py-2 rounded-full border ${
                  isSelected ? 'bg-fintech-primary border-fintech-primary' : 'bg-white border-fintech-border'
                }`}
              >
                <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-fintech-textMuted'}`}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error message */}
        {historyError && (
          <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
            <Text className="text-red-600 text-xs text-center">{historyError}</Text>
          </View>
        )}

        {/* Transaction list */}
        {historyLoading && paymentHistory.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text className="text-xs text-fintech-textMuted mt-2">Loading transactions...</Text>
          </View>
        ) : (
          <FlatList
            data={paymentHistory}
            keyExtractor={(item: Payment) => item.paymentId}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={historyLoading} onRefresh={loadData} colors={['#1E3A8A']} />
            }
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Ionicons name="receipt-outline" size={48} color="#64748B" />
                <Text className="text-sm font-bold text-fintech-text mt-3">No payments found</Text>
                <Text className="text-xs text-fintech-textMuted mt-1">Your transactions will appear here.</Text>
              </View>
            }
            className="flex-1"
          />
        )}
      </View>

      {/* Details modal overlay */}
      <Modal
        visible={selectedPayment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPayment(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[300px]">
            <View className="flex-row justify-between items-center pb-4 border-b border-fintech-border mb-4">
              <Text className="text-base font-bold text-fintech-text">Transaction Details</Text>
              <TouchableOpacity onPress={() => setSelectedPayment(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <View className="space-y-4">
                <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
                  <Text className="text-xs text-fintech-textMuted">Transaction Ref</Text>
                  <Text className="text-xs font-mono text-fintech-text">{selectedPayment.transactionRef}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
                  <Text className="text-xs text-fintech-textMuted">Amount</Text>
                  <Text className="text-sm font-bold text-fintech-text">₦{selectedPayment.amount.toLocaleString()}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
                  <Text className="text-xs text-fintech-textMuted">Status</Text>
                  <View className={`${statusColors[selectedPayment.status]?.bg || 'bg-slate-50'} border px-2 py-0.5 rounded-full`}>
                    <Text className={`${statusColors[selectedPayment.status]?.text || 'text-slate-600'} text-[10px] font-bold`}>
                      {selectedPayment.status}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
                  <Text className="text-xs text-fintech-textMuted">Date Created</Text>
                  <Text className="text-xs text-fintech-text">{formatDateTime(selectedPayment.createdAt)}</Text>
                </View>

                {selectedPayment.completedAt && (
                  <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
                    <Text className="text-xs text-fintech-textMuted">Completed At</Text>
                    <Text className="text-xs text-fintech-text">{formatDateTime(selectedPayment.completedAt)}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setSelectedPayment(null)}
                  className="bg-fintech-primary py-3 rounded-xl items-center mt-6"
                >
                  <Text className="text-white font-bold text-sm">Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
