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

  const rejectMutation = useMutation<any, any, { documentId: string; reason: string }>({
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
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View
        className="px-4 py-3.5 border-b flex-row items-center"
        style={{ gap: 12, borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff' }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={20} color={isDark ? '#60A5FA' : '#1E3A8A'} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className={`text-base font-bold ${textTitle}`}>Document Approvals</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>Approve or reject individual KYC files</Text>
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
            <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#1E3A8A'} />
          </View>
        ) : documents.length === 0 ? (
          <View className={`flex-1 justify-center items-center py-20 rounded-3xl border shadow-sm mt-4 ${bgCard} ${borderCard}`}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text className={`text-sm font-bold mt-3 ${textTitle}`}>All Caught Up!</Text>
            <Text className={`text-xs mt-1 ${textMuted}`}>No pending documents require review.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {documents.map((doc) => (
              <View key={doc._id} className={`border rounded-3xl p-5 shadow-sm ${bgCard} ${borderCard}`}>
                <View className="flex-row justify-between items-start mb-3" style={{ gap: 8 }}>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold ${textTitle}`}>{doc.userId.name}</Text>
                    <Text className={`text-[10px] mt-0.5 ${textMuted}`}>{doc.userId.email}</Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded-full border ${isDark ? 'bg-amber-955 bg-amber-950/20 border-amber-900/60' : 'bg-amber-50 border-amber-100'}`}>
                    <Text className={`text-[9px] font-bold uppercase ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{doc.status}</Text>
                  </View>
                </View>

                <View className={`border rounded-2xl p-4 ${isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50 border-slate-100'}`} style={{ gap: 8 }}>
                  <View className="flex-row justify-between">
                    <Text className={`text-[10px] ${textMuted}`}>Document Type:</Text>
                    <Text className={`text-[10px] font-bold ${textTitle}`}>{getDocumentTypeLabel(doc.documentType)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className={`text-[10px] ${textMuted}`}>File Name:</Text>
                    <Text numberOfLines={1} className={`text-[10px] font-bold max-w-[150px] ${textTitle}`}>
                      {doc.originalFileName}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className={`text-[10px] ${textMuted}`}>Submitted:</Text>
                    <Text className={`text-[10px] font-bold ${textTitle}`}>
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row mt-4" style={{ gap: 12 }}>
                  {doc.fileUrl && (
                    <TouchableOpacity
                      onPress={() => handleOpenLink(doc.fileUrl)}
                      style={{ minHeight: 38 }}
                      className={`flex-1 border rounded-xl items-center justify-center flex-row ${bgCard} ${borderCard}`}
                    >
                      <Feather name="eye" size={13} color={isDark ? '#60A5FA' : '#64748B'} style={{ marginRight: 5 }} />
                      <Text className={`font-bold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>View File</Text>
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
          <View className={`rounded-t-3xl p-6 ${bgCard} ${borderCard}`} style={{ gap: 16 }}>
            <View
              className="flex-row justify-between items-center border-b pb-3 mb-1"
              style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9' }}
            >
              <View>
                <Text className={`text-base font-bold ${textTitle}`}>Review KYC Document</Text>
                <Text className={`text-[10px] ${textMuted} mt-0.5`}>
                  Approve or reject document for {selectedReviewItem?.userId.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReviewItem(null)} className="p-1">
                <Ionicons name="close" size={24} color={isDark ? '#60A5FA' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View className={`border rounded-2xl p-4 ${isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50 border-slate-150'}`} style={{ gap: 6 }}>
              <View className="flex-row justify-between">
                <Text className={`text-[10px] ${textMuted}`}>Document Type:</Text>
                <Text className={`text-[10px] font-bold ${textTitle}`}>
                  {selectedReviewItem ? getDocumentTypeLabel(selectedReviewItem.documentType) : ''}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className={`text-[10px] ${textMuted}`}>File Name:</Text>
                <Text numberOfLines={1} className={`text-[10px] font-bold max-w-[200px] ${textTitle}`}>
                  {selectedReviewItem?.originalFileName}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text className={`text-xs font-semibold ${textTitle}`}>Compliance Notes (Required for rejection)</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Specify what details are missing or fail verification checks..."
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

