import axios from 'axios';
import { store } from '../redux/store';
import { logout } from '../redux/slices/authSlice';

// Shared backend API URL mapping
const API_BASE_URL = 'https://kenluk-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const normalizeApiError = (error: any) => {
  const statusCode = error?.response?.status || 0;
  const responseData = error?.response?.data || {};
  const message = responseData?.message || error?.message || 'An unexpected error occurred.';
  return { statusCode, message };
};

// Request interceptor to append authorization bearer token from Redux state
api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to force clean-ups on credential expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  adminLogin: async (credentials: any) => {
    const response = await api.post('/auth/admin/login', credentials);
    return response.data;
  },
  signup: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  verifyEmail: async (data: any) => {
    const response = await api.post('/auth/verify-email', data);
    return response.data;
  },
  verifyTwoFactor: async (data: any) => {
    const response = await api.post('/auth/verify-2fa', data);
    return response.data;
  },
  resendTwoFactorCode: async (data: any) => {
    const response = await api.post('/auth/resend-2fa', data);
    return response.data;
  },
  resendVerificationCode: async (data: any) => {
    const response = await api.post('/auth/resend-verification', data);
    return response.data;
  },
  forgotPassword: async (data: any) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },
  resetPassword: async (data: any) => {
    const response = await api.post(`/auth/reset-password/${data.token}`, { password: data.password });
    return response.data;
  },
  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

export const kycApi = {
  getUploadUrl: async (data: any) => {
    const response = await api.post('/kyc/upload-url', data);
    return response.data.data;
  },
  confirmUpload: async (data: any) => {
    const response = await api.post('/kyc/confirm-upload', data);
    return response.data;
  },
};

export const paymentsApi = {
  submitPayment: async (request: any) => {
    const response = await api.post('/payments/submit-request', request);
    return response.data;
  },
  getMyPayments: async () => {
    const response = await api.get('/payments/my-requests');
    return { payments: response.data.data };
  },
};

export const ratesApi = {
  getUsdNgnRate: async () => {
    const response = await api.get('/rates/usd-ngn');
    return response.data.data;
  },
};

export const adminApi = {
  getPendingDocuments: async () => {
    const response = await api.get('/kyc/pending');
    return response.data;
  },
  approveDocument: async (documentId: string) => {
    const response = await api.put(`/kyc/${documentId}/review`, { action: 'approve' });
    return response.data;
  },
  rejectDocument: async (documentId: string, rejectionReason: string) => {
    const response = await api.put(`/kyc/${documentId}/review`, { action: 'reject', rejectionReason });
    return response.data;
  },
};

export default api;
