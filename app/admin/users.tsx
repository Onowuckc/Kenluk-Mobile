import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { RootState } from '../../src/redux/store';
import { adminApi } from '../../src/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  accountStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  companyName?: string;
  phone?: string;
}

export default function AdminUsersScreen() {
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
  const inputBg = isDark ? 'bg-[#121E42]' : 'bg-slate-100';
  const inputBorder = isDark ? 'border-[#1F3978]' : 'border-slate-200';
  const textInputColor = isDark ? 'text-white' : 'text-slate-900';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'verified' | 'unverified' | 'admin'>('all');

  // 1. Fetch all users
  const {
    data: responseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => adminApi.getAllUsers(),
  });

  const users = useMemo(() => {
    return (responseData?.users || []) as User[];
  }, [responseData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Mutation: Bulk Delete Unverified Users
  const cleanupMutation = useMutation({
    mutationFn: () => adminApi.deleteUnverifiedUsers(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      Alert.alert('Success', res.message || 'Cleanup completed.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete unverified users.');
    },
  });

  const handleCleanupUnverified = () => {
    Alert.alert(
      'Clean Up Unverified Accounts',
      'This will permanently delete ALL users who have not verified their email address. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => cleanupMutation.mutate(),
        },
      ]
    );
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.companyName && u.companyName.toLowerCase().includes(term))
      );
    }

    if (filterTab === 'verified') {
      result = result.filter((u) => u.isVerified);
    } else if (filterTab === 'unverified') {
      result = result.filter((u) => !u.isVerified);
    } else if (filterTab === 'admin') {
      result = result.filter((u) => u.isAdmin);
    }

    return result;
  }, [users, searchTerm, filterTab]);

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Header with cleanup button */}
      <View
        className="px-4 py-3.5 border-b flex-row items-center justify-between"
        style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff' }}
      >
        <View>
          <Text className={`text-base font-bold ${textTitle}`}>Registered Users</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>Onboarded clients and admins list</Text>
        </View>

        <TouchableOpacity
          onPress={handleCleanupUnverified}
          disabled={cleanupMutation.isPending}
          className={`border px-3 py-1.5 rounded-xl flex-row items-center`}
          style={{
            borderColor: isDark ? '#5C1D24' : '#FECDD3',
            backgroundColor: isDark ? '#311016' : '#FFF1F2',
            gap: 6,
          }}
        >
          {cleanupMutation.isPending ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Feather name="trash-2" size={12} color="#EF4444" />
          )}
          <Text className="text-red-600 font-bold text-[10px]">Cleanup</Text>
        </TouchableOpacity>
      </View>

      {/* Search and filter controls */}
      <View
        className="px-4 py-3 border-b"
        style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff', gap: 12 }}
      >
        {/* Search */}
        <View
          className="flex-row items-center rounded-xl px-3 py-0.5"
          style={{ backgroundColor: isDark ? '#121E42' : '#F1F5F9', borderWidth: isDark ? 1 : 0, borderColor: '#1F3978' }}
        >
          <Feather name="search" size={14} color={isDark ? '#60A5FA' : '#94A3B8'} style={{ marginRight: 8 }} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by name or email..."
            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
            className={`flex-1 text-xs py-2 ${textInputColor}`}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={isDark ? '#60A5FA' : '#94A3B8'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            {[
              { label: 'All Users', value: 'all' as const, count: users.length },
              { label: 'Verified', value: 'verified' as const, count: users.filter((u) => u.isVerified).length },
              { label: 'Unverified', value: 'unverified' as const, count: users.filter((u) => !u.isVerified).length },
              { label: 'Admins', value: 'admin' as const, count: users.filter((u) => u.isAdmin).length },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setFilterTab(tab.value)}
                className={`px-3 py-2 rounded-xl border ${
                  filterTab === tab.value
                    ? (isDark ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-200')
                    : (isDark ? 'bg-[#121E42] border-[#1F3978]' : 'bg-slate-50 border-slate-200')
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    filterTab === tab.value ? (isDark ? 'text-blue-300' : 'text-blue-900') : 'text-slate-500'
                  }`}
                >
                  {tab.label} ({isLoading ? '...' : tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
        ) : filteredUsers.length === 0 ? (
          <View className={`flex-1 justify-center items-center py-20 rounded-3xl border shadow-sm mt-4 ${bgCard} ${borderCard}`}>
            <Feather name="users" size={48} color={isDark ? '#60A5FA' : '#94A3B8'} />
            <Text className={`text-sm font-bold mt-3 ${textTitle}`}>No Users Found</Text>
            <Text className={`text-xs mt-1 ${textMuted}`}>No profiles match the search/filter criteria.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {filteredUsers.map((userItem) => (
              <TouchableOpacity
                key={userItem._id}
                onPress={() =>
                  router.push({
                    pathname: '/admin/user-details',
                    params: { userId: userItem._id },
                  })
                }
                className={`border rounded-3xl p-5 shadow-sm flex-row justify-between items-center ${bgCard} ${borderCard}`}
              >
                <View className="flex-1 pr-3" style={{ gap: 8 }}>
                  <View>
                    <View className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
                      <Text className={`text-sm font-bold ${textTitle}`}>{userItem.name}</Text>
                      {userItem.isAdmin && (
                        <View className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-950/40 border border-purple-900/30' : 'bg-purple-100'}`}>
                          <Text className={`text-[7.5px] font-bold uppercase ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text className={`text-[10px] mt-0.5 ${textMuted}`}>{userItem.email}</Text>
                  </View>

                  <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                    <View className={`px-2 py-0.5 rounded-full ${userItem.isVerified ? (isDark ? 'bg-emerald-950/30 border border-emerald-900/40' : 'bg-emerald-50') : (isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100')}`}>
                      <Text className={`text-[8.5px] font-bold uppercase ${userItem.isVerified ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {userItem.isVerified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>

                    <View className={`px-2 py-0.5 rounded-full ${
                      userItem.accountStatus === 'approved'
                        ? (isDark ? 'bg-blue-950/30 border border-blue-900/40' : 'bg-blue-50')
                        : userItem.accountStatus === 'rejected'
                        ? (isDark ? 'bg-red-950/20 border border-red-900/40' : 'bg-red-50')
                        : (isDark ? 'bg-amber-950/20 border border-amber-900/40' : 'bg-amber-50')
                    }`}>
                      <Text className={`text-[8.5px] font-bold uppercase ${
                        userItem.accountStatus === 'approved'
                          ? 'text-blue-500'
                          : userItem.accountStatus === 'rejected'
                          ? 'text-red-500'
                          : 'text-amber-500'
                      }`}>
                        {userItem.accountStatus}
                      </Text>
                    </View>

                    {userItem.companyName && (
                      <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
                        <Text className={`text-[8.5px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{userItem.companyName}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color={isDark ? '#60A5FA' : '#94A3B8'} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
