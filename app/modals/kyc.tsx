import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/redux/store';

import { kycApi } from '../../src/services/api';
import { getDocumentTypeLabel, getBackendDocumentType } from '../../src/utils/documentTypeMap';
import { getDocumentStatusLabel } from '../../src/utils/statusMap';

interface KycDocument {
  _id: string;
  type: string; // backend type (bvn, cac, tin, passport, proofOfAddress)
  status: string; // pending, approved, rejected
  rejectionReason?: string;
  uploadedAt: string;
}

// Map frontend slots to backend documentTypes
const KYC_SLOTS = [
  { key: 'nin', backendType: 'bvn', label: 'National Identity Number (NIN)' },
  { key: 'cac', backendType: 'cac', label: 'Corporate Affairs Commission (CAC)' },
  { key: 'tin', backendType: 'tin', label: 'Tax Identification Number (TIN)' },
  { key: 'passport', backendType: 'passport', label: 'International Passport' },
  { key: 'utility', backendType: 'proofOfAddress', label: 'Utility Bill (Proof of Address)' },
];

export default function KycModal() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-white';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-50';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  
  // Track which slot is currently uploading
  const [activeUploadingSlot, setActiveUploadingSlot] = useState<string | null>(null);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // 1. Fetch user documents with TanStack Query
  const { data: documentsResponse, isLoading, refetch } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => kycApi.getMyDocuments(),
  });

  const documentsList = (documentsResponse?.documents || []) as KycDocument[];

  // Helper to find document by backend type
  const getDocumentForSlot = (backendType: string) => {
    return documentsList.find((doc) => doc.type === backendType);
  };

  // 2. S3 Document Upload Mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({
      uri,
      name,
      mimeType,
      backendType,
    }: {
      uri: string;
      name: string;
      mimeType: string;
      backendType: string;
    }) => {
      // Step A: Read file as a Blob to get exact size and binary content
      setUploadProgressMsg('Reading file data...');
      const fileResponse = await fetch(uri);
      const fileBlob = await fileResponse.blob();
      const fileSize = fileBlob.size;

      // Step B: Request S3 pre-signed upload URL from backend
      setUploadProgressMsg('Requesting upload credentials...');
      const { uploadUrl, s3Key, bucketName } = await kycApi.getUploadUrl({
        documentType: backendType,
        fileName: name,
        fileSize,
        mimeType,
      });

      // Step C: Upload binary to S3
      setUploadProgressMsg('Uploading to S3...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: {
          'Content-Type': mimeType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      // Step D: Confirm upload with backend
      setUploadProgressMsg('Finalizing verification...');
      return await kycApi.confirmUpload({
        s3Key,
        bucketName,
        documentType: backendType,
        fileName: name,
        fileSize,
        mimeType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-documents'] });
      Alert.alert('Success', 'Document uploaded successfully! Under review.');
    },
    onError: (error: any) => {
      Alert.alert('Upload Failed', error?.message || 'Failed to complete document verification.');
    },
    onSettled: () => {
      setActiveUploadingSlot(null);
      setUploadProgressMsg('');
    },
  });

  // Pick PDF File
  const handlePickDocument = async (slotKey: string, backendType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setActiveUploadingSlot(slotKey);
        uploadDocMutation.mutate({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'application/pdf',
          backendType,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to select document.');
    }
  };

  // Capture photo from Camera
  const handleCapturePhoto = async (slotKey: string, backendType: string) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is required to take photos of documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = `${slotKey}_upload_${Date.now()}.jpg`;
        setActiveUploadingSlot(slotKey);
        uploadDocMutation.mutate({
          uri: file.uri,
          name: fileName,
          mimeType: 'image/jpeg',
          backendType,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const getStatusColorClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'verified':
        return {
          bg: isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border border-emerald-200',
          text: isDark ? 'text-emerald-400' : 'text-emerald-700'
        };
      case 'pending':
        return {
          bg: isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border border-amber-200',
          text: isDark ? 'text-amber-400' : 'text-amber-700'
        };
      case 'rejected':
        return {
          bg: isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border border-red-200',
          text: isDark ? 'text-red-400' : 'text-red-700'
        };
      default:
        return {
          bg: isDark ? 'bg-slate-900/20 border-slate-800/40' : 'bg-slate-50 border border-slate-200',
          text: isDark ? 'text-slate-400' : 'text-slate-500'
        };
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className={`flex-row justify-between items-center px-4 py-3.5 border-b ${borderCard}`}>
        <View>
          <Text className={`text-lg font-bold ${textTitle}`}>KYC Verification</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>Upload official documents to activate payments</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36 }}
          className={`items-center justify-center rounded-full ${inputBg}`}
        >
          <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} className="p-4">
          
          {/* Main Info Box */}
          <View className={`${isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/50 border border-blue-100'} rounded-2xl p-4 mb-6`}>
            <View className="flex-row items-center mb-1">
              <Feather name="info" size={14} color={isDark ? '#3B82F6' : '#2563EB'} style={{ marginRight: 6 }} />
              <Text className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Compliance Information</Text>
            </View>
            <Text className={`text-[10px] ${isDark ? 'text-blue-400' : 'text-blue-800'} leading-relaxed`}>
              Required by financial regulations. Please upload clear documents (PDF, JPG, or PNG) up to 5MB. Unverified accounts cannot process international vendor transfers.
            </Text>
          </View>

          {/* Slots List */}
          <View style={{ gap: 16 }}>
            {KYC_SLOTS.map((slot) => {
              const doc = getDocumentForSlot(slot.backendType);
              const status = doc?.status || 'not_uploaded';
              const statusInfo = getStatusColorClasses(status);
              const isUploadingThisSlot = activeUploadingSlot === slot.key;

              return (
                <View key={slot.key} className={`${bgCard} border ${borderCard} rounded-2xl p-4 shadow-sm`}>
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className={`text-xs font-bold ${textTitle} flex-1 pr-2`}>{slot.label}</Text>
                    <View className={`px-2 py-0.5 rounded-full border ${statusInfo.bg}`}>
                      <Text className={`text-[9px] font-bold uppercase ${statusInfo.text}`}>
                        {doc ? getDocumentStatusLabel(status) : 'Not Uploaded'}
                      </Text>
                    </View>
                  </View>

                  {/* Rejection Feedback alert */}
                  {status === 'rejected' && doc?.rejectionReason ? (
                    <View className={`${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50/50 border border-red-100'} p-3 rounded-xl mb-3 flex-row items-start`} style={{ gap: 8 }}>
                      <Feather name="alert-triangle" size={12} color="#EF4444" style={{ marginTop: 2 }} />
                      <Text className={`${isDark ? 'text-red-400' : 'text-red-700'} text-[10px] flex-1 leading-relaxed`}>
                        Reason: {doc.rejectionReason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Upload Controls */}
                  {isUploadingThisSlot ? (
                    <View className={`${inputBg} border ${inputBorder} p-4 rounded-xl items-center`} style={{ gap: 8 }}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text className={`text-[10px] ${textMuted} font-semibold`}>{uploadProgressMsg}</Text>
                    </View>
                  ) : (
                    <View>
                      {status !== 'approved' && status !== 'verified' ? (
                        <View className="flex-row mt-1" style={{ gap: 12 }}>
                          <TouchableOpacity
                            onPress={() => handlePickDocument(slot.key, slot.backendType)}
                            disabled={activeUploadingSlot !== null}
                            style={{ minHeight: 40 }}
                            className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl items-center justify-center flex-row`}
                          >
                            <Feather name="file-text" size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 6 }} />
                            <Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-bold text-xs`}>Pick File</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleCapturePhoto(slot.key, slot.backendType)}
                            disabled={activeUploadingSlot !== null}
                            style={{ minHeight: 40 }}
                            className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl items-center justify-center flex-row`}
                          >
                            <Feather name="camera" size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 6 }} />
                            <Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-bold text-xs`}>Camera</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className={`${isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/20 border border-emerald-100'} p-3 rounded-xl flex-row items-center`}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                          <Text className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} text-[10px] font-semibold`}>
                            Verification completed. Document is verified.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
