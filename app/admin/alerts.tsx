import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { RootState } from '../../src/redux/store';
import { adminApi, paymentsApi } from '../../src/services/api';
import { getDocumentTypeLabel } from '../../src/utils/documentTypeMap';

interface Payment {
  _id?: string;
  recipientCompany?: string;
  localAmount?: number;
  status: string;
  rejectionReason?: string;
  createdAt?: string;
  user?: { name?: string; email?: string };
}

interface KycDocument {
  _id: string;
  documentType?: string;
  type?: string;
  status: string;
  rejectionReason?: string;
  uploadedAt?: string;
  user?: { name?: string; email?: string };
}

interface PendingSubmission {
  user: { _id: string; name: string; email: string; companyName?: string };
  documents: KycDocument[];
  submittedAt: string;
}

type AlertSeverity = 'critical' | 'warning' | 'info';

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  subtitle: string;
  detail?: string;
  timestamp?: string;
  route?: string;
  routeLabel?: string;
}

export default function AdminAlertsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | AlertSeverity>('all');

  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';

  const bgMain = isDark ? 'bg-[#080F26]' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-[#0F1E43]' : 'bg-white';
  const borderCard = isDark ? 'border-[#1E356A]' : 'border-slate-100';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const getSeverityConfig = (severity: AlertSeverity) => {
    const configs: Record<
      AlertSeverity,
      {
        bg: string;
        border: string;
        iconBg: string;
        badgeBg: string;
        badgeText: string;
        badgeLabel: string;
        icon: string;
        iconColor: string;
      }
    > = {
      critical: {
        bg: isDark ? '#2A1215' : '#FFF1F2',
        border: isDark ? '#5C272E' : '#FECDD3',
        iconBg: isDark ? '#441B20' : '#FEE2E2',
        badgeBg: isDark ? '#441B20' : '#FEE2E2',
        badgeText: isDark ? '#FCA5A5' : '#B91C1C',
        badgeLabel: 'Critical',
        icon: 'alert-circle',
        iconColor: '#EF4444',
      },
      warning: {
        bg: isDark ? '#271B0B' : '#FFFBEB',
        border: isDark ? '#5A3E16' : '#FDE68A',
        iconBg: isDark ? '#402B10' : '#FEF3C7',
        badgeBg: isDark ? '#402B10' : '#FEF3C7',
        badgeText: isDark ? '#FDE047' : '#92400E',
        badgeLabel: 'Warning',
        icon: 'warning',
        iconColor: '#F59E0B',
      },
      info: {
        bg: isDark ? '#0C1C2F' : '#F0F9FF',
        border: isDark ? '#1A395C' : '#BAE6FD',
        iconBg: isDark ? '#122A47' : '#E0F2FE',
        badgeBg: isDark ? '#122A47' : '#E0F2FE',
        badgeText: isDark ? '#7DD3FC' : '#075985',
        badgeLabel: 'Info',
        icon: 'information-circle',
        iconColor: '#0EA5E9',
      },
    };
    return configs[severity];
  };

  // 1. All payments (to find rejected)
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['admin-all-payments'],
    queryFn: () => paymentsApi.getAllPayments(),
    staleTime: 30000,
  });

  // 2. Pending KYC submissions (to surface overdue docs)
  const {
    data: kycData,
    isLoading: isKycLoading,
    refetch: refetchKyc,
  } = useQuery({
    queryKey: ['admin-pending-registrations'],
    queryFn: () => adminApi.getPendingKycSubmissions(),
    staleTime: 30000,
  });

  // 3. Dashboard stats (for context)
  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminApi.getDashboard(),
    staleTime: 30000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPayments(), refetchKyc(), refetchStats()]);
    setRefreshing(false);
  }, [refetchPayments, refetchKyc, refetchStats]);

  const isLoading = isPaymentsLoading || isKycLoading || isStatsLoading;

  const paymentsList = useMemo(() => (paymentsData?.payments || []) as Payment[], [paymentsData]);
  const pendingSubmissions = useMemo(() => (kycData?.data || []) as PendingSubmission[], [kycData]);

  // Build unified alert feed
  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    // Rejected payments → critical
    paymentsList
      .filter((p) => p.status === 'rejected' && p.rejectionReason)
      .forEach((p) => {
        items.push({
          id: `pay-rej-${p._id}`,
          severity: 'critical',
          category: 'Payment Rejected',
          title: p.recipientCompany || 'Unknown vendor',
          subtitle: `₦${(p.localAmount || 0).toLocaleString()} payment was rejected`,
          detail: p.rejectionReason,
          timestamp: p.createdAt,
          route: '/admin/payments',
          routeLabel: 'View Payments',
        });
      });

    // Failed payments → critical
    paymentsList
      .filter((p) => p.status === 'failed')
      .forEach((p) => {
        items.push({
          id: `pay-fail-${p._id}`,
          severity: 'critical',
          category: 'Payment Failed',
          title: p.recipientCompany || 'Unknown vendor',
          subtitle: `₦${(p.localAmount || 0).toLocaleString()} payment failed processing`,
          detail: p.rejectionReason || 'No additional details available.',
          timestamp: p.createdAt,
          route: '/admin/payments',
          routeLabel: 'View Payments',
        });
      });

    // Overdue KYC (pending > 3 days) → warning
    const now = new Date();
    pendingSubmissions.forEach((sub) => {
      const submitted = new Date(sub.submittedAt);
      const daysPending = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPending >= 3) {
        items.push({
          id: `kyc-overdue-${sub.user._id}`,
          severity: 'warning',
          category: 'KYC Overdue',
          title: sub.user.name,
          subtitle: `${sub.documents.length} document${sub.documents.length > 1 ? 's' : ''} pending for ${daysPending} days`,
          detail: `${sub.user.email}${sub.user.companyName ? ` · ${sub.user.companyName}` : ''}`,
          timestamp: sub.submittedAt,
          route: '/admin/registrations',
          routeLabel: 'Review KYC',
        });
      }
    });

    // Pending KYC < 3 days → info
    pendingSubmissions.forEach((sub) => {
      const submitted = new Date(sub.submittedAt);
      const daysPending = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPending < 3) {
        items.push({
          id: `kyc-new-${sub.user._id}`,
          severity: 'info',
          category: 'New KYC Submission',
          title: sub.user.name,
          subtitle: `${sub.documents.length} document${sub.documents.length > 1 ? 's' : ''} awaiting review`,
          detail: `${sub.user.email}${sub.user.companyName ? ` · ${sub.user.companyName}` : ''}`,
          timestamp: sub.submittedAt,
          route: '/admin/registrations',
          routeLabel: 'Review KYC',
        });
      }
    });

    // Pending payments → warning
    const pendingPayments = paymentsList.filter((p) => p.status === 'pending_admin_approval');
    if (pendingPayments.length > 0) {
      items.push({
        id: 'pending-payments-summary',
        severity: 'warning',
        category: 'Payment Queue',
        title: `${pendingPayments.length} Payment${pendingPayments.length > 1 ? 's' : ''} Awaiting Approval`,
        subtitle: 'Vendor payment requests need your review',
        route: '/admin/payments',
        routeLabel: 'Review Payments',
      });
    }

    // Sort: critical first, then warning, then info; newest first within group
    const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => {
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    return items;
  }, [paymentsList, pendingSubmissions]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'all') return alerts;
    return alerts.filter((a) => a.severity === activeFilter);
  }, [alerts, activeFilter]);

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;

  const FILTERS: { key: 'all' | AlertSeverity; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: alerts.length },
    { key: 'critical', label: 'Critical', count: criticalCount },
    { key: 'warning', label: 'Warning', count: warningCount },
    { key: 'info', label: 'Info', count: infoCount },
  ];

  return (
    <SafeAreaView className={`flex-1 ${bgMain}`} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        className="px-4 py-3.5 border-b flex-row items-center justify-between"
        style={{ borderBottomColor: isDark ? '#1E356A' : '#F1F5F9', backgroundColor: isDark ? '#0F1E43' : '#ffffff' }}
      >
        <View>
          <Text className={`text-base font-bold ${textTitle}`}>Platform Alerts</Text>
          <Text className={`text-[10px] ${textMuted} mt-0.5`}>Live compliance and system issue feed</Text>
        </View>
        <View style={{ position: 'relative', width: 40, height: 40 }}>
          <View
            className={`w-10 h-10 rounded-full items-center justify-center border ${
              isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-100'
            }`}
          >
            <Feather name="bell" size={16} color="#EF4444" />
          </View>
          {alerts.length > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: '#EF4444',
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: isDark ? '#0F1E43' : '#ffffff',
                paddingHorizontal: 2,
              }}
            >
              <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: '800' }}>
                {alerts.length > 99 ? '99+' : alerts.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
        className="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        {/* Summary Strip */}
        <View className="flex-row mb-5" style={{ gap: 12 }}>
          {[
            {
              label: 'Critical',
              count: criticalCount,
              color: '#EF4444',
              bg: isDark ? '#2A1215' : '#FFF1F2',
              border: isDark ? '#5C272E' : '#FECDD3',
            },
            {
              label: 'Warnings',
              count: warningCount,
              color: '#F59E0B',
              bg: isDark ? '#271B0B' : '#FFFBEB',
              border: isDark ? '#5A3E16' : '#FDE68A',
            },
            {
              label: 'Info',
              count: infoCount,
              color: '#0EA5E9',
              bg: isDark ? '#0C1C2F' : '#F0F9FF',
              border: isDark ? '#1A395C' : '#BAE6FD',
            },
          ].map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: s.bg,
                borderWidth: 1,
                borderColor: s.border,
                borderRadius: 16,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: s.color }}>{isLoading ? '—' : s.count}</Text>
              <Text
                style={{
                  fontSize: 9,
                  color: s.color,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginTop: 2,
                }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5" style={{ flexGrow: 0 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isActive ? '#2563EB' : isDark ? '#0F1E43' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isActive ? '#2563EB' : isDark ? '#1E356A' : '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#ffffff' : isDark ? '#94A3B8' : '#64748B' }}>
                    {f.label}
                  </Text>
                  {f.count > 0 && (
                    <View
                      style={{
                        marginLeft: 6,
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.25)'
                          : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : '#F1F5F9',
                        borderRadius: 8,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '800', color: isActive ? '#ffffff' : isDark ? '#60A5FA' : '#475569' }}>
                        {f.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Alert Feed */}
        {isLoading && !refreshing ? (
          <View className="flex-1 justify-center py-24">
            <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#1E3A8A'} />
          </View>
        ) : filteredAlerts.length === 0 ? (
          <View
            className={`flex-1 justify-center items-center px-6 py-16 rounded-3xl border shadow-sm ${bgCard} ${borderCard}`}
          >
            <View
              className={`w-16 h-16 rounded-full items-center justify-center mb-4 border ${
                isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'
              }`}
            >
              <Ionicons name="checkmark-circle-outline" size={36} color="#10B981" />
            </View>
            <Text className={`text-base font-bold ${textTitle}`}>All Clear</Text>
            <Text className={`text-xs ${textMuted} text-center mt-2 leading-relaxed max-w-xs`}>
              No alerts match the selected filter. The platform is operating normally.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredAlerts.map((alert) => {
              const cfg = getSeverityConfig(alert.severity);
              return (
                <View
                  key={alert.id}
                  style={{
                    backgroundColor: cfg.bg,
                    borderWidth: 1,
                    borderColor: cfg.border,
                    borderRadius: 20,
                    padding: 16,
                  }}
                >
                  {/* Top row */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: cfg.iconBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons name={cfg.icon as any} size={18} color={cfg.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ backgroundColor: cfg.badgeBg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: '800',
                              color: cfg.badgeText,
                              textTransform: 'uppercase',
                              letterSpacing: 0.7,
                            }}
                          >
                            {alert.category}
                          </Text>
                        </View>
                        {alert.timestamp && (
                          <Text style={{ fontSize: 9, color: isDark ? '#64748B' : '#94A3B8' }}>
                            {new Date(alert.timestamp).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#ffffff' : '#1E293B' }}>
                        {alert.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                        {alert.subtitle}
                      </Text>
                    </View>
                  </View>

                  {/* Detail box */}
                  {alert.detail && (
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 12,
                        padding: 10,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: isDark ? '#CBD5E1' : '#475569', lineHeight: 16 }}>
                        {alert.detail}
                      </Text>
                    </View>
                  )}

                  {/* CTA */}
                  {alert.route && (
                    <TouchableOpacity
                      onPress={() => router.push(alert.route as any)}
                      activeOpacity={0.7}
                      style={{
                        borderWidth: 1,
                        borderColor: cfg.border,
                        borderRadius: 12,
                        paddingVertical: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#60A5FA' : '#1E3A8A', marginRight: 4 }}>
                        {alert.routeLabel}
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color={isDark ? '#60A5FA' : '#1E3A8A'} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

