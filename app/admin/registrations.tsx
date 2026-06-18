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

  // Review modal state
  const [selectedReviewItem, setSelectedReviewItem] = useState<{
    document: KycDocument;
    userId: string;
    userName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const rejectMutation = useMutation<any, any, { documentId: string; reason: string }>({
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
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View
        className="px-4 py-3.5 border-b"
        style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff' }}
      >
        <Text className={`text-base font-bold ${textTitle}`}>Pending Registrations</Text>
        <Text className={`text-[10px] ${textMuted} mt-0.5`}>Review users onboarding document lists</Text>
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
            <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#1E3A8A'} />
          </View>
        ) : submissions.length === 0 ? (
          <View className={`flex-1 justify-center items-center py-20 rounded-3xl border shadow-sm mt-4 ${bgCard} ${borderCard}`}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text className={`text-sm font-bold mt-3 ${textTitle}`}>All Caught Up!</Text>
            <Text className={`text-xs mt-1 ${textMuted}`}>No registration queues pending approval.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {submissions.map((submission) => (
              <View key={submission.user._id} className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`}>
                {/* User Box */}
                <View className="border-b pb-4 mb-4" style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9' }}>
                  <Text className={`text-base font-bold ${textTitle}`}>{submission.user.name}</Text>
                  <Text className={`text-xs mt-0.5 ${textMuted}`}>{submission.user.email}</Text>
                  <View className="flex-row items-center justify-between mt-2.5">
                    <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-950/40 border border-blue-900/30' : 'bg-slate-100'}`}>
                      <Text className={`text-[9px] font-bold ${isDark ? 'text-blue-300' : 'text-slate-600'}`}>{submission.user.companyName || 'No Company'}</Text>
                    </View>
                    <Text className={`text-[9px] ${textMuted}`}>
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Documents List */}
                <View style={{ gap: 12 }}>
                  <Text className={`text-xs font-bold mb-1 ${textTitle}`}>Uploaded Documents ({submission.documents.length})</Text>
                  {submission.documents.map((doc) => (
                    <View key={doc._id} className={`border rounded-2xl p-4 ${isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50/50 border-slate-100'}`}>
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className={`text-xs font-bold ${textTitle}`}>{getDocumentTypeLabel(doc.documentType)}</Text>
                        <Text className={`text-[9px] ${textMuted}`}>{new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                      </View>
                      <Text numberOfLines={1} className={`text-[9px] mb-3 ${textMuted}`}>
                        File: {doc.originalFileName} ({formatFileSize(doc.fileSize)})
                      </Text>

                      <View className="flex-row" style={{ gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => handleOpenLink(doc.fileUrl)}
                          style={{ minHeight: 32 }}
                          className={`flex-1 border rounded-xl items-center justify-center flex-row ${bgCard} ${borderCard}`}
                        >
                          <Feather name="eye" size={12} color={isDark ? '#60A5FA' : '#64748B'} style={{ marginRight: 4 }} />
                          <Text className={`font-bold text-[10px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>View File</Text>
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
          <View className={`rounded-t-3xl p-6 ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
            <View
              className="flex-row justify-between items-center border-b pb-3 mb-1"
              style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9' }}
            >
              <View>
                <Text className={`text-base font-bold ${textTitle}`}>Review Registration File</Text>
                <Text className={`text-[10px] ${textMuted} mt-0.5`}>
                  Approve or reject document for {selectedReviewItem?.userName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)} className="p-1">
                <Ionicons name="close" size={24} color={isDark ? '#60A5FA' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View className={`border rounded-2xl p-4 ${isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50 border-slate-150'}`} style={{ gap: 6 }}>
              <View className="flex-row justify-between">
                <Text className={`text-[10px] ${textMuted}`}>Document type:</Text>
                <Text className={`text-[10px] font-bold ${textTitle}`}>
                  {selectedReviewItem ? getDocumentTypeLabel(selectedReviewItem.document.documentType) : ''}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className={`text-[10px] ${textMuted}`}>Filename:</Text>
                <Text numberOfLines={1} className={`text-[10px] font-bold max-w-[200px] ${textTitle}`}>
                  {selectedReviewItem?.document.originalFileName}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text className={`text-xs font-semibold ${textTitle}`}>Rejection Notes (Only required for rejection)</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Specify compliance issue or missing verification details..."
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                multiline={true}
                numberOfLines={3}
                className={`border px-4 py-3 rounded-2xl text-xs font-medium h-20 ${inputBg} ${inputBorder} ${textInputColor}`}
              />
            </View>

            <View className="flex-row pt-2" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleReject}
                disabled={rejectMutation.isPending}
                style={{ minHeight: 44 }}
                className={`flex-1 border rounded-xl items-center justify-center flex-row ${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border border-red-200'}`}
              >
                {rejectMutation.isPending && <ActivityIndicator size="small" color="#EF4444" className="mr-1.5" />}
                <Text className={`font-bold text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>Reject File</Text>
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
