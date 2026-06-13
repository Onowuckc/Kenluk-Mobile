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
      Alert.alert('Cleanup Complete', res.message || 'Deleted unverified users successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete unverified users.');
    },
  });

  const handleCleanupUnverified = () => {
    Alert.alert(
      'Cleanup Unverified Users',
      'Are you sure you want to delete all unverified accounts? This action cannot be undone.',
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
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterTab === 'all' ||
        (filterTab === 'verified' && user.isVerified) ||
        (filterTab === 'unverified' && !user.isVerified) ||
        (filterTab === 'admin' && user.isAdmin);

      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterTab]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-4 py-3.5 border-b border-slate-100 bg-white flex-row items-center justify-between">
        <View>
          <Text className="text-base font-bold text-slate-800">User Management</Text>
          <Text className="text-[10px] text-slate-400 mt-0.5">Edit, review and moderate platform user profiles</Text>
        </View>

        <TouchableOpacity
          onPress={handleCleanupUnverified}
          disabled={cleanupMutation.isPending}
          className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl flex-row items-center space-x-1.5"
        >
          {cleanupMutation.isPending ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Feather name="trash-2" size={12} color="#EF4444" />
          )}
          <Text className="text-red-650 text-red-600 font-bold text-[10px]">Cleanup</Text>
        </TouchableOpacity>
      </View>

      {/* Search and filter controls */}
      <View className="bg-white px-4 py-3 border-b border-slate-100 space-y-3">
        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-0.5">
          <Feather name="search" size={14} color="#94A3B8" className="mr-2" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by name or email..."
            placeholderTextColor="#94A3B8"
            className="flex-1 text-slate-900 text-xs py-2"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
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
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-150'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  filterTab === tab.value ? 'text-blue-900' : 'text-slate-500'
                }`}
              >
                {tab.label} ({isLoading ? '...' : tab.count})
              </Text>
            </TouchableOpacity>
          ))}
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
            <ActivityIndicator size="large" color="#1E3A8A" />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <Feather name="users" size={48} color="#94A3B8" />
            <Text className="text-sm font-bold text-slate-800 mt-3">No Users Found</Text>
            <Text className="text-xs text-slate-400 mt-1">No profiles match the search/filter criteria.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {filteredUsers.map((userItem) => (
              <TouchableOpacity
                key={userItem._id}
                onPress={() =>
                  router.push({
                    pathname: '/admin/user-details',
                    params: { userId: userItem._id },
                  })
                }
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex-row justify-between items-center"
              >
                <View className="flex-1 pr-3 space-y-2">
                  <View>
                    <View className="flex-row items-center flex-wrap">
                      <Text className="text-sm font-bold text-slate-800 mr-2">{userItem.name}</Text>
                      {userItem.isAdmin && (
                        <View className="bg-purple-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[7.5px] font-bold text-purple-700 uppercase">Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[10px] text-slate-400 mt-0.5">{userItem.email}</Text>
                  </View>

                  <View className="flex-row space-x-2 items-center flex-wrap">
                    <View className={`px-2 py-0.5 rounded-full ${userItem.isVerified ? 'bg-emerald-55 bg-emerald-50' : 'bg-slate-100'}`}>
                      <Text className={`text-[8.5px] font-bold uppercase ${userItem.isVerified ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {userItem.isVerified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>

                    <View className={`px-2 py-0.5 rounded-full ${
                      userItem.accountStatus === 'approved'
                        ? 'bg-blue-50'
                        : userItem.accountStatus === 'rejected'
                        ? 'bg-red-50'
                        : 'bg-amber-50'
                    }`}>
                      <Text className={`text-[8.5px] font-bold uppercase ${
                        userItem.accountStatus === 'approved'
                          ? 'text-blue-75 text-blue-700'
                          : userItem.accountStatus === 'rejected'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}>
                        {userItem.accountStatus}
                      </Text>
                    </View>

                    {userItem.companyName && (
                      <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                        <Text className="text-[8.5px] text-slate-600 font-semibold">{userItem.companyName}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
