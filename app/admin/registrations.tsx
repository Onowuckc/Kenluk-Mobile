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
  documentType: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  fileUrl: string;
}

interface PendingSubmission {
  user: {
    _id: string;
    name: string;
    email: string;
    companyName: string;
  };
  documents: KycDocument[];
  submittedAt: string;
}

export default function PendingRegistrationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Review modal state
  const [selectedReviewItem, setSelectedReviewItem] = useState<{
    document: KycDocument;
    userId: string;
    userName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // 1. Fetch grouped pending submissions
  const {
    data: responseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-pending-registrations'],
    queryFn: () => adminApi.getPendingKycSubmissions(),
  });

  const submissions = useMemo(() => {
    return (responseData?.data || []) as PendingSubmission[];
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
      queryClient.invalidateQueries({ queryKey: ['admin-pending-registrations'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-pending-registrations'] });
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
      `Are you sure you want to approve this document for ${selectedReviewItem.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveMutation.mutate(selectedReviewItem.document._id),
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
      documentId: selectedReviewItem.document._id,
      reason: rejectionReason.trim(),
    });
  };

  const handleOpenLink = async (url: string) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open file link.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white">
        <Text className="text-base font-bold text-slate-800">Pending Registrations</Text>
        <Text className="text-[10px] text-slate-400 mt-0.5">Review users onboarding document lists</Text>
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
        ) : submissions.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text className="text-sm font-bold text-slate-800 mt-3">All Caught Up!</Text>
            <Text className="text-xs text-slate-400 mt-1">No registration queues pending approval.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {submissions.map((submission) => (
              <View key={submission.user._id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                {/* User Box */}
                <View className="border-b border-slate-100 pb-4 mb-4">
                  <Text className="text-base font-bold text-slate-800">{submission.user.name}</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">{submission.user.email}</Text>
                  <View className="flex-row items-center justify-between mt-2.5">
                    <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[9px] font-bold text-slate-600">{submission.user.companyName || 'No Company'}</Text>
                    </View>
                    <Text className="text-[9px] text-slate-400">
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Documents List */}
                <View className="space-y-3">
                  <Text className="text-xs font-bold text-slate-500 mb-1">Uploaded Documents ({submission.documents.length})</Text>
                  {submission.documents.map((doc) => (
                    <View key={doc._id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-xs font-bold text-slate-800">{getDocumentTypeLabel(doc.documentType)}</Text>
                        <Text className="text-[9px] text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                      </View>
                      <Text numberOfLines={1} className="text-[9px] text-slate-400 mb-3">
                        File: {doc.originalFileName} ({formatFileSize(doc.fileSize)})
                      </Text>

                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          onPress={() => handleOpenLink(doc.fileUrl)}
                          style={{ minHeight: 32 }}
                          className="flex-1 bg-white border border-slate-200 rounded-xl items-center justify-center flex-row"
                        >
                          <Feather name="eye" size={12} color="#64748B" style={{ marginRight: 4 }} />
                          <Text className="text-slate-600 font-bold text-[10px]">View File</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            setSelectedReviewItem({
                              document: doc,
                              userId: submission.user._id,
                              userName: submission.user.name,
                            })
                          }
                          style={{ minHeight: 32 }}
                          className="flex-1 bg-blue-600 rounded-xl items-center justify-center flex-row"
                        >
                          <Feather name="check-square" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text className="text-white font-bold text-[10px]">Review</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Review Modal Form */}
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
                <Text className="text-base font-bold text-slate-800">Review Registration File</Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  Approve or reject document for {selectedReviewItem?.userName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)} className="p-1">
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1.5">
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-slate-400">Document type:</Text>
                <Text className="text-[10px] font-bold text-slate-800">
                  {selectedReviewItem ? getDocumentTypeLabel(selectedReviewItem.document.documentType) : ''}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-slate-400">Filename:</Text>
                <Text numberOfLines={1} className="text-[10px] font-bold text-slate-850 max-w-[200px]">
                  {selectedReviewItem?.document.originalFileName}
                </Text>
              </View>
            </View>

            <View className="space-y-2">
              <Text className="text-xs font-semibold text-slate-700">Rejection Notes (Only required for rejection)</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Specify compliance issue or missing verification details..."
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
