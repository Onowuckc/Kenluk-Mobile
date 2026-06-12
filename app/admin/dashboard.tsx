import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../src/redux/slices/authSlice';
import { RootState } from '../../src/redux/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/services/api';

interface PendingRequest {
  id: string;
  userName: string;
  type: string;
  amount?: number;
  details: string;
  date: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'payments' | 'kyc'>('payments');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendingRequest[]>([]);

  const loadPendingItems = async () => {
    setLoading(true);
    try {
      // Mock loading data from backend administration service
      setTimeout(() => {
        if (activeTab === 'payments') {
          setData([
            { id: '1', userName: 'John Doe', type: 'Funding Request', amount: 125000, details: 'Virtual Wallet credit via bank transfer', date: '2026-06-11' },
            { id: '2', userName: 'Alice Smith', type: 'Payout Request', amount: 45000, details: 'Withdrawal to GTBank', date: '2026-06-10' },
          ]);
        } else {
          setData([
            { id: '101', userName: 'Bob Johnson', type: 'KYC Document', details: 'Driver License upload for Tier-2 verification', date: '2026-06-11' },
            { id: '102', userName: 'Clara Oswald', type: 'KYC Document', details: 'National ID upload for verification', date: '2026-06-09' },
          ]);
        }
        setLoading(false);
      }, 1000);
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Failed to retrieve administrative queues.');
    }
  };

  useEffect(() => {
    loadPendingItems();
  }, [activeTab]);

  const handleApprove = (item: PendingRequest) => {
    Alert.alert('Approve Request', `Are you sure you want to approve this request for ${item.userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => {
          Alert.alert('Success', 'Request approved successfully.');
          setData(data.filter((i: PendingRequest) => i.id !== item.id));
        },
      },
    ]);
  };

  const handleReject = (item: PendingRequest) => {
    Alert.alert('Reject Request', `Are you sure you want to reject this request for ${item.userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Rejected', 'Request has been rejected.');
          setData(data.filter((i: PendingRequest) => i.id !== item.id));
        },
      },
    ]);
  };

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/(auth)/login');
  };

  const renderItem = ({ item }: { item: PendingRequest }) => (
    <View className="bg-white p-5 rounded-3xl border border-fintech-border mb-4 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-fintech-text text-sm">{item.userName}</Text>
        <Text className="text-[10px] text-fintech-textMuted">{item.date}</Text>
      </View>
      
      <Text className="text-xs font-semibold text-fintech-primary uppercase tracking-wider mb-1">{item.type}</Text>
      
      {item.amount && (
        <Text className="text-base font-extrabold text-fintech-text mb-2">₦{item.amount.toLocaleString()}</Text>
      )}
      
      <Text className="text-xs text-fintech-textMuted leading-relaxed mb-4">{item.details}</Text>

      <View className="flex-row space-x-3">
        <TouchableOpacity
          onPress={() => handleReject(item)}
          className="flex-1 bg-red-50 border border-red-200 py-2.5 rounded-xl items-center"
        >
          <Text className="text-red-600 font-bold text-xs">Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleApprove(item)}
          className="flex-1 bg-emerald-50 border border-emerald-200 py-2.5 rounded-xl items-center"
        >
          <Text className="text-emerald-700 font-bold text-xs">Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-fintech-background" edges={['top', 'left', 'right']}>
      <View className="p-4 flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs text-fintech-textMuted font-semibold uppercase tracking-wider">Control Panel</Text>
            <Text className="text-xl font-bold text-fintech-text">Admin Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} className="p-2 bg-red-50 rounded-xl border border-red-200">
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View className="flex-row bg-white border border-fintech-border rounded-2xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab('payments')}
            className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'payments' ? 'bg-fintech-primary' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'payments' ? 'text-white' : 'text-fintech-textMuted'}`}>
              Pending Payments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('kyc')}
            className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'kyc' ? 'bg-fintech-primary' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'kyc' ? 'text-white' : 'text-fintech-textMuted'}`}>
              KYC Document Reviews
            </Text>
          </TouchableOpacity>
        </View>

        {/* List items */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text className="text-xs text-fintech-textMuted mt-2">Loading administrative queue...</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item: PendingRequest) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
                <Text className="text-sm font-bold text-fintech-text mt-3">All caught up!</Text>
                <Text className="text-xs text-fintech-textMuted mt-1">No items currently requiring review.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
