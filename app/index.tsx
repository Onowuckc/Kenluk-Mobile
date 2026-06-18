import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../src/redux/store';
import { authApi } from '../src/services/api';
import { logout, updateUser } from '../src/redux/slices/authSlice';

export default function IndexPage() {
  const { token, user, loading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    let active = true;
    if (token && !user) {
      setIsValidating(true);
      authApi.verify()
        .then((res) => {
          if (active) {
            if (res.success && res.data?.user) {
              dispatch(updateUser(res.data.user));
              if (res.data.user.role === 'admin') {
                router.replace('/admin/dashboard');
              } else {
                router.replace('/(tabs)/dashboard');
              }
            } else {
              dispatch(logout());
              router.replace('/(auth)/login');
            }
          }
        })
        .catch(() => {
          if (active) {
            dispatch(logout());
            router.replace('/(auth)/login');
          }
        })
        .finally(() => {
          if (active) {
            setIsValidating(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [token, user, dispatch, router]);

  if (loading || isValidating) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (token) {
    if (user) {
      if (user.role === 'admin') {
        return <Redirect href="/admin/dashboard" />;
      }
      return <Redirect href="/(tabs)/dashboard" />;
    }
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <Redirect href="/(auth)/login" />;
}

