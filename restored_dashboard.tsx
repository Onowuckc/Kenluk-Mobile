Created At: 2026-06-13T18:41:15Z
Completed At: 2026-06-13T18:41:15Z
File Path: `file:///c:/Users/Lenovo/Desktop/Reap%20Payment/reap-payment-mobile/app/%28tabs%29/dashboard.tsx`
Total Lines: 522
Total Bytes: 24354
Showing lines 1 to 522
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: import React, { useEffect, useState, useCallback, useMemo } from 'react';
2: import {
3:   View,
4:   Text,
5:   ScrollView,
6:   TouchableOpacity,
7:   ActivityIndicator,
8:   RefreshControl,
9: } from 'react-native';
10: import { useRouter } from 'expo-router';
11: import { useDispatch, useSelector } from 'react-redux';
12: import { useQuery, useQueryClient } from '@tanstack/react-query';
13: import { SafeAreaView } from 'react-native-safe-area-context';
14: import { Ionicons, Feather } from '@expo/vector-icons';
15: import { LinearGradient } from 'expo-linear-gradient';
16: 
17: import { RootState } from '../../src/redux/store';
18: import { fetchWalletSummary } from '../../src/redux/slices/walletSlice';
19: import { ratesApi, paymentsApi, kycApi, authApi } from '../../src/services/api';
20: import { getDocumentTypeLabel } from '../../src/utils/documentTypeMap';
21: import { updateUser } from '../../src/redux/slices/authSlice';
22: import { toggleTheme } from '../../src/redux/slices/themeSlice';
23: 
24: // Custom typescript interfaces for dashboard
25: interface PaymentRequest {
26:   _id?: string;
27:   recipientCompany: string;
28:   localAmount: number;
29:   status: string;
30:   rejectionReason?: string;
31:   createdAt?: string;
32: }
33: 
34: interface KycDocument {
35:   _id: string;
36:   type: string;
37:   status: string;
38:   rejectionReason?: string;
39: }
40: 
41: export default function DashboardScreen() {
42:   const router = useRouter();
43:   const dispatch = useDispatch();
44:   const queryClient = useQueryClient();
4
<truncated 23321 bytes>
('/(tabs)/history')}
487:             style={{ width: '48%', minHeight: 80 }}
488:             className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
489:           >
490:             <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
491:               <Feather name="file-text" size={14} color="#10B981" />
492:             </View>
493:             <Text className={`text-[10px] font-bold ${textTitle}`}>My Payments</Text>
494:           </TouchableOpacity>
495: 
496:           <TouchableOpacity
497:             onPress={() => router.push('/modals/kyc' as any)}
498:             style={{ width: '48%', minHeight: 80 }}
499:             className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
500:           >
501:             <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-amber-950/30' : 'bg-amber-50'}`}>
502:               <Feather name="shield" size={14} color="#D97706" />
503:             </View>
504:             <Text className={`text-[10px] font-bold ${textTitle}`}>KYC Verification</Text>
505:           </TouchableOpacity>
506: 
507:           <TouchableOpacity
508:             onPress={() => router.push('/(tabs)/profile')}
509:             style={{ width: '48%', minHeight: 80 }}
510:             className={`border rounded-2xl p-4 items-center mb-3 shadow-xs ${bgCard} ${borderCard}`}
511:           >
512:             <View className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-purple-950/30' : 'bg-purple-50'}`}>
513:               <Feather name="settings" size={14} color="#8B5CF6" />
514:             </View>
515:             <Text className={`text-[10px] font-bold ${textTitle}`}>Security Settings</Text>
516:           </TouchableOpacity>
517:         </View>
518:       </ScrollView>
519:     </SafeAreaView>
520:   );
521: }
522: 
The above content shows the entire, complete file contents of the requested file.
