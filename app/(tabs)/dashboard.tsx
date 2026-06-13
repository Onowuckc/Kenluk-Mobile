import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '../../src/redux/store';
import { fetchWalletSummary } from '../../src/redux/slices/walletSlice';
import { ratesApi, paymentsApi, kycApi, authApi } from '../../src/services/api';
import { getDocumentTypeLabel } from '../../src/utils/documentTypeMap';
import { updateUser } from '../../src/redux/slices/authSlice';
import { toggleTheme } from '../../src/redux/slices/themeSlice';

// Custom typescript interfaces for dashboard
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

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
              <Feather name="file-text" size={14} color="#10B981" />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>My Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/modals/kyc' as any)}
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-amber-950/30' : 'bg-amber-50'}`}>
              <Feather name="shield" size={14} color="#D97706" />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>KYC Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={{ width: '48%', minHeight: 80 }}
            className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-purple-950/30' : 'bg-purple-50'}`}>
              <Feather name="settings" size={14} color="#8B5CF6" />
            </View>
            <Text className={`text-[10px] font-bold ${textTitle}`}>Security Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
