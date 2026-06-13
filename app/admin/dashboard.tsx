import React, { useCallback, useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

import { logout } from '../../src/redux/slices/authSlice';
import { RootState } from '../../src/redux/store';
import { adminApi } from '../../src/services/api';
import { toggleTheme } from '../../src/redux/slices/themeSlice';

export default function AdminDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  // Theme-based inline styling helpers
  const bgMain = isDark ? '#080F26' : '#F8FAFC';
  const bgCard = isDark ? '#0F1E43' : '#ffffff';
  const borderCard = isDark ? '#1E356A' : '#F1F5F9';
  const textTitle = isDark ? '#ffffff' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const textLight = isDark ? '#60A5FA' : '#1E3A8A';
  const bgMuted = isDark ? '#152757' : '#F8FAFC';
  const borderMuted = isDark ? '#1F3978' : '#F8FAFC';
  const shadowColor = isDark ? '#000000' : '#94A3B8';

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: statsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminApi.getDashboard(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const stats = statsData?.data?.stats || {
    totalUsers: 0,
    pendingRegistrations: 0,
    pendingDocuments: 0,
    pendingPayments: 0,
  };

  const recentActivity = statsData?.data?.recentActivity || [];

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/(auth)/login');
  };

  // ── Overview stat cards ──────────────────────────────────────────────────
  const STAT_CARDS = [
    {
      label: 'Pending\nRegistrations',
      value: stats.pendingRegistrations,
      route: '/admin/registrations',
      icon: 'user-check',
      color: '#3B82F6',
    },
    {
      label: 'KYC\nDocuments',
      value: stats.pendingDocuments,
      route: '/admin/kyc',
      icon: 'file-text',
      color: '#10B981',
    },
    {
      label: 'Payment\nQueue',
      value: stats.pendingPayments,
      route: '/admin/payments',
      icon: 'credit-card',
      color: '#F59E0B',
    },
    {
      label: 'Total\nUsers',
      value: stats.totalUsers,
      route: '/admin/users',
      icon: 'users',
      color: '#8B5CF6',
    },
  ];

  // ── Navigation panel entries (all 8 admin features) ──────────────────────
  const NAV_ITEMS = [
    {
      title: 'Registrations',
      desc: 'KYC registration pipelines grouped by applicant',
      route: '/admin/registrations',
      icon: 'user-check',
      color: '#3B82F6',
    },
    {
      title: 'KYC Review',
      desc: 'Individual document approval queues',
      route: '/admin/kyc',
      icon: 'file-text',
      color: '#10B981',
    },
    {
      title: 'Payments',
      desc: 'Payment request approvals & transactional lifecycle actions',
      route: '/admin/payments',
      icon: 'credit-card',
      color: '#F59E0B',
    },
    {
      title: 'Users',
      desc: 'Active user list with filters & quick search',
      route: '/admin/users',
      icon: 'users',
      color: '#8B5CF6',
    },
    {
      title: 'Treasury Rates',
      desc: 'Authoritative platform treasury rate setup panel',
      route: '/admin/rates',
      icon: 'trending-up',
      color: '#0EA5E9',
    },
    {
      title: 'Virtual Accounts',
      desc: 'Fidelity virtual accounts review & manual completions',
      route: '/admin/virtual-accounts',
      icon: 'hash',
      color: '#6366F1',
    },
    {
      title: 'Simulations',
      desc: 'Simulate system inputs and test workflows',
      route: '/admin/simulations',
      icon: 'cpu',
      color: '#EC4899',
    },
    {
      title: 'Platform Alerts',
      desc: 'Compliance flags, rejected payments & KYC issues',
      route: '/admin/alerts',
      icon: 'bell',
      color: '#EF4444',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgMain }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
        style={{ paddingHorizontal: 16, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 12 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#60A5FA' : '#1E3A8A', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 2 }}>
              Kenluk Pay
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: textTitle, letterSpacing: -0.5 }}>
              Admin Console
            </Text>
            <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
              Welcome back, {user?.name || 'Admin'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Theme Toggle Button */}
            <TouchableOpacity
              onPress={() => dispatch(toggleTheme())}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? 'rgba(96, 165, 250, 0.1)' : '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(96, 165, 250, 0.2)' : '#DBEAFE',
                marginRight: 8
              }}
            >
              <Feather name={isDark ? "sun" : "moon"} size={18} color={isDark ? "#60A5FA" : "#1E3A8A"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECACA'
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Overview Stats Grid ── */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
          Overview
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 }}>
          {STAT_CARDS.map((card, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.75}
              style={{
                width: '48%',
                backgroundColor: bgCard,
                borderRadius: 20,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: borderCard,
                shadowColor: shadowColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {/* Icon */}
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: card.color + '15',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <Feather name={card.icon as any} size={16} color={card.color} />
              </View>
              {/* Count */}
              {isLoading ? (
                <ActivityIndicator size="small" color={card.color} style={{ marginBottom: 6, alignSelf: 'flex-start' }} />
              ) : (
                <Text style={{ fontSize: 28, fontWeight: '800', color: textTitle, letterSpacing: -1, lineHeight: 32 }}>
                  {card.value ?? 0}
                </Text>
              )}
              {/* Label */}
              <Text style={{ fontSize: 10, color: textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, lineHeight: 14 }}>
                {card.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick Navigation Panel ── */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
          Quick Navigation
        </Text>
        <View style={{ backgroundColor: bgCard, borderRadius: 24, borderWidth: 1, borderColor: borderCard, overflow: 'hidden', marginBottom: 28 }}>
          {NAV_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 18,
                paddingVertical: 15,
                borderBottomWidth: index < NAV_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: borderCard,
              }}
            >
              {/* Icon */}
              <View style={{
                width: 40, height: 40, borderRadius: 13,
                backgroundColor: item.color + '12',
                alignItems: 'center', justifyContent: 'center',
                marginRight: 14,
                flexShrink: 0,
              }}>
                <Feather name={item.icon as any} size={17} color={item.color} />
              </View>
              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: textTitle }}>{item.title}</Text>
                <Text style={{ fontSize: 10, color: textMuted, marginTop: 2, lineHeight: 14 }}>{item.desc}</Text>
              </View>
              {/* Chevron */}
              <Ionicons name="chevron-forward" size={15} color={isDark ? '#475569' : '#CBD5E1'} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity ── */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
          Latest Activity
        </Text>
        <View style={{ backgroundColor: bgCard, borderRadius: 24, borderWidth: 1, borderColor: borderCard, padding: 18, marginBottom: 8 }}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ paddingVertical: 16 }} />
          ) : recentActivity.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Feather name="clock" size={24} color={isDark ? '#475569' : '#CBD5E1'} />
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 8 }}>No recent activity yet.</Text>
            </View>
          ) : (
            recentActivity.map((activity: any, index: number) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingBottom: index < recentActivity.length - 1 ? 14 : 0,
                  marginBottom: index < recentActivity.length - 1 ? 14 : 0,
                  borderBottomWidth: index < recentActivity.length - 1 ? 1 : 0,
                  borderBottomColor: borderCard,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#1E356A' : '#CBD5E1', marginTop: 4, marginRight: 12, flexShrink: 0 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, lineHeight: 17 }}>
                    {activity.message}
                  </Text>
                  <Text style={{ fontSize: 10, color: textMuted, marginTop: 3 }}>
                    {new Date(activity.time).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
