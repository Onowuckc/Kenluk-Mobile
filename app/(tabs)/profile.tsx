import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../src/redux/slices/authSlice';
import { RootState } from '../../src/redux/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        Alert.alert('Upload Document', `Proceed with uploading ${file.name}?`, [
          { text: 'Cancel' },
          {
            text: 'Upload',
            onPress: () => uploadDoc(file.uri, file.name, file.mimeType || 'application/pdf'),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick document');
    }
  };

  const handleImagePick = async () => {
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
        const fileName = file.uri.split('/').pop() || 'document.jpg';
        Alert.alert('Upload Photo', 'Proceed with uploading this photo?', [
          { text: 'Cancel' },
          {
            text: 'Upload',
            onPress: () => uploadDoc(file.uri, fileName, 'image/jpeg'),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to capture photo');
    }
  };

  const uploadDoc = async (uri: string, name: string, type: string) => {
    setUploading(true);
    // Simulate upload delay and show alert (API hook up happens in documentUploadSlice)
    setTimeout(() => {
      setUploading(false);
      Alert.alert('Success', 'Document uploaded successfully! Under review.');
    }, 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-fintech-background" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        {/* User Card */}
        <View className="bg-white rounded-3xl p-6 border border-fintech-border shadow-sm items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-fintech-primary/10 items-center justify-center mb-3">
            <Ionicons name="person" size={32} color="#1E3A8A" />
          </View>
          <Text className="text-lg font-bold text-fintech-text">
            {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Customer'}
          </Text>
          <Text className="text-xs text-fintech-textMuted mt-1">{user?.email}</Text>

          <View className="flex-row items-center space-x-1 mt-3 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
            <View className={`w-2 h-2 rounded-full ${user?.verificationStatus === 'verified' ? 'bg-green-500' : 'bg-amber-500'}`} />
            <Text className="text-[10px] font-bold text-fintech-text uppercase">
              {user?.verificationStatus || 'Pending KYC'}
            </Text>
          </View>
        </View>

        {/* KYC Document Upload section */}
        {user?.verificationStatus !== 'verified' && (
          <View className="bg-white rounded-3xl p-6 border border-fintech-border shadow-sm mb-6 space-y-4">
            <Text className="text-sm font-bold text-fintech-text">KYC Verification Uploads</Text>
            <Text className="text-xs text-fintech-textMuted leading-relaxed">
              Upload a clear PDF document or snapshot of your ID (Passport, National ID, or Driver's License) to lift payment limits.
            </Text>

            <View className="flex-row space-x-3 mt-2">
              <TouchableOpacity
                onPress={handleDocumentPick}
                disabled={uploading}
                className="flex-1 border-2 border-dashed border-fintech-border rounded-2xl py-4 items-center justify-center"
              >
                <Ionicons name="document-text" size={24} color="#64748B" />
                <Text className="text-[10px] font-bold text-fintech-textMuted mt-1">Pick PDF File</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleImagePick}
                disabled={uploading}
                className="flex-1 border-2 border-dashed border-fintech-border rounded-2xl py-4 items-center justify-center"
              >
                <Ionicons name="camera" size={24} color="#64748B" />
                <Text className="text-[10px] font-bold text-fintech-textMuted mt-1">Take Snapshot</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Profile Details List */}
        <View className="bg-white rounded-3xl border border-fintech-border shadow-sm overflow-hidden mb-6">
          <View className="px-6 py-4 border-b border-fintech-border bg-slate-50">
            <Text className="text-xs font-bold text-fintech-textMuted uppercase tracking-wider">Account Details</Text>
          </View>

          <View className="divide-y divide-fintech-border">
            <View className="flex-row justify-between items-center px-6 py-3.5">
              <Text className="text-xs text-fintech-textMuted">Phone Number</Text>
              <Text className="text-xs font-semibold text-fintech-text">{user?.phoneNumber || '—'}</Text>
            </View>

            <View className="flex-row justify-between items-center px-6 py-3.5">
              <Text className="text-xs text-fintech-textMuted">Role Type</Text>
              <Text className="text-xs font-semibold text-fintech-text uppercase">{user?.role || 'Customer'}</Text>
            </View>

            <View className="flex-row justify-between items-center px-6 py-3.5">
              <Text className="text-xs text-fintech-textMuted">Account Level</Text>
              <Text className="text-xs font-semibold text-fintech-text">Tier 1 (Standard)</Text>
            </View>
          </View>
        </View>

        {/* Log out option */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 border border-red-200 py-3.5 rounded-2xl items-center justify-center flex-row space-x-1.5"
        >
          <Ionicons name="log-out-outline" size={16} color="#DC2626" />
          <Text className="text-red-600 font-bold text-sm">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
