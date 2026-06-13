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

import { adminApi } from '../../src/services/api';
import { getDocumentTypeLabel } from '../../src/utils/documentTypeMap';

interface KycDocument {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  documentType: string;
  fileName: string;
  originalFileName: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  fileUrl?: string;
}

export default function KycApprovalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Review modal state
  const [selectedReviewItem, setSelectedReviewItem] = useState<KycDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Fetch individual pending documents
  const {
    data: responseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-pending-documents'],
    queryFn: () => adminApi.getPendingDocuments(),
  });

  const documents = useMemo(() => {
    return (responseData?.data || []) as KycDocument[];
  }, [responseData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (documentId: string) => adminApi.approveDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Success', 'Document approved successfully.');
      setSelectedReviewItem(null);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve document.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { documentId: string; reason: string }) =>
      adminApi.rejectDocument(data.documentId, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Success', 'Document rejected successfully.');
      setSelectedReviewItem(null);
      setRejectionReason('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reject document.');
    },
  });

  const handleApprove = () => {
    if (!selectedReviewItem) return;
    Alert.alert(
      'Approve Document',
      `Are you sure you want to approve this document for ${selectedReviewItem.userId.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveMutation.mutate(selectedReviewItem._id),
        },
      ]
    );
  };

  const handleReject = () => {
    if (!selectedReviewItem) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Validation Error', 'Please specify a rejection reason.');
      return;
    }
    rejectMutation.mutate({
      documentId: selectedReviewItem._id,
      reason: rejectionReason.trim(),
    });
  };

  const handleOpenLink = async (url?: string) => {
    if (!url) {
      Alert.alert('Error', 'Document file url is not available.');
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open file link.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white flex-row items-center space-x-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">Document Approvals</Text>
          <Text className="text-[10px] text-slate-400 mt-0.5">Approve or reject individual KYC files</Text>
        </View>
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
        ) : documents.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text className="text-sm font-bold text-slate-800 mt-3">All Caught Up!</Text>
            <Text className="text-xs text-slate-400 mt-1">No pending documents require review.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {documents.map((doc) => (
              <View key={doc._id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-bold text-slate-850">{doc.userId.name}</Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5">{doc.userId.email}</Text>
                  </View>
                  <View className="bg-amber-55 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <Text className="text-[9px] font-bold text-amber-700 uppercase">{doc.status}</Text>
                  </View>
                </View>

                <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-[10px] text-slate-450">Document Type:</Text>
                    <Text className="text-[10px] font-bold text-slate-700">{getDocumentTypeLabel(doc.documentType)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[10px] text-slate-450">File Name:</Text>
                    <Text numberOfLines={1} className="text-[10px] font-bold text-slate-700 max-w-[150px]">
                      {doc.originalFileName}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[10px] text-slate-450">Submitted:</Text>
                    <Text className="text-[10px] font-bold text-slate-700">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row space-x-3 mt-4">
                  {doc.fileUrl && (
                    <TouchableOpacity
                      onPress={() => handleOpenLink(doc.fileUrl)}
                      style={{ minHeight: 38 }}
                      className="flex-1 bg-white border border-slate-200 rounded-xl items-center justify-center flex-row"
                    >
                      <Feather name="eye" size={13} color="#64748B" style={{ marginRight: 5 }} />
                      <Text className="text-slate-600 font-bold text-xs">View File</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setSelectedReviewItem(doc)}
                    style={{ minHeight: 38 }}
                    className="flex-1 bg-blue-600 rounded-xl items-center justify-center flex-row"
                  >
                    <Feather name="check-square" size={13} color="#ffffff" style={{ marginRight: 5 }} />
                    <Text className="text-white font-bold text-xs">Review File</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
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
                <Text className="text-base font-bold text-slate-800">Review KYC Document</Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  Approve or reject document for {selectedReviewItem?.userId.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)} className="p-1">
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1.5">
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-slate-400">Document Type:</Text>
                <Text className="text-[10px] font-bold text-slate-800">
                  {selectedReviewItem ? getDocumentTypeLabel(selectedReviewItem.documentType) : ''}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-slate-400">File Name:</Text>
                <Text numberOfLines={1} className="text-[10px] font-bold text-slate-800 max-w-[200px]">
                  {selectedReviewItem?.originalFileName}
                </Text>
              </View>
            </View>

            <View className="space-y-2">
              <Text className="text-xs font-semibold text-slate-700">Compliance Notes (Required for rejection)</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Specify what details are missing or fail verification checks..."
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
                className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 text-xs font-medium h-20"
              />
            </View>

            <View className="flex-row space-x-3 pt-2">
              <TouchableOpacity
                onPress={handleReject}
                disabled={rejectMutation.isPending}
                style={{ minHeight: 44 }}
                className="flex-1 bg-red-50 border border-red-200 rounded-xl items-center justify-center flex-row"
              >
                {rejectMutation.isPending && <ActivityIndicator size="small" color="#EF4444" className="mr-1.5" />}
                <Text className="text-red-600 font-bold text-xs">Reject File</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApprove}
                disabled={approveMutation.isPending}
                style={{ minHeight: 44 }}
                className="flex-1 bg-emerald-600 rounded-xl items-center justify-center flex-row"
              >
                {approveMutation.isPending && <ActivityIndicator size="small" color="#ffffff" className="mr-1.5" />}
                <Text className="text-white font-bold text-xs">Approve File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
