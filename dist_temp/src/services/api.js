"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminApi = exports.simulationApi = exports.adminRatesApi = exports.ratesApi = exports.beneficiaryApi = exports.paymentsApi = exports.kycApi = exports.authApi = exports.normalizeApiError = void 0;
const axios_1 = require("axios");
const store_1 = require("../redux/store");
const authSlice_1 = require("../redux/slices/authSlice");
// Shared backend API URL mapping
const API_BASE_URL = 'https://kenluk-backend-production.up.railway.app/api';
const api = axios_1.default.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
const normalizeApiError = (error) => {
    const statusCode = error?.response?.status || 0;
    const responseData = error?.response?.data || {};
    const message = responseData?.message || error?.message || 'An unexpected error occurred.';
    return { statusCode, message };
};
exports.normalizeApiError = normalizeApiError;
// Request interceptor to append authorization bearer token from Redux state
api.interceptors.request.use((config) => {
    const state = store_1.store.getState();
    const token = state.auth?.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// Response interceptor to force clean-ups on credential expiry
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        store_1.store.dispatch((0, authSlice_1.logout)());
    }
    return Promise.reject(error);
});
exports.authApi = {
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },
    adminLogin: async (credentials) => {
        const response = await api.post('/auth/admin/login', credentials);
        return response.data;
    },
    signup: async (data) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },
    verifyEmail: async (data) => {
        const response = await api.post('/auth/verify-email', data);
        return response.data;
    },
    verifyTwoFactor: async (data) => {
        const response = await api.post('/auth/verify-2fa', data);
        return response.data;
    },
    resendTwoFactorCode: async (data) => {
        const response = await api.post('/auth/resend-2fa', data);
        return response.data;
    },
    resendVerificationCode: async (data) => {
        const response = await api.post('/auth/resend-verification', data);
        return response.data;
    },
    forgotPassword: async (data) => {
        const response = await api.post('/auth/forgot-password', data);
        return response.data;
    },
    resetPassword: async (data) => {
        const response = await api.post(`/auth/reset-password/${data.token}`, { password: data.password });
        return response.data;
    },
    verify: async () => {
        const response = await api.get('/auth/verify');
        return response.data;
    },
};
exports.kycApi = {
    getUploadUrl: async (data) => {
        const response = await api.post('/kyc/upload-url', data);
        return response.data.data;
    },
    confirmUpload: async (data) => {
        const response = await api.post('/kyc/confirm-upload', data);
        return response.data;
    },
    getMyDocuments: async () => {
        const response = await api.get('/kyc/my-documents');
        return { documents: response.data.data };
    },
};
exports.paymentsApi = {
    getUploadInvoiceUrl: async (data) => {
        const response = await api.post('/payments/upload-invoice-url', data);
        return response.data.data;
    },
    submitPayment: async (request) => {
        const response = await api.post('/payments/submit-request', request);
        return response.data;
    },
    getMyPayments: async () => {
        const response = await api.get('/payments/my-requests');
        return { payments: response.data.data };
    },
    getPaymentById: async (paymentId) => {
        const response = await api.get(`/payments/${paymentId}`);
        return { payment: response.data.data };
    },
    getPaymentInvoiceUrl: async (paymentId) => {
        const response = await api.get(`/payments/${paymentId}/invoice-url`);
        return response.data.data;
    },
    getPaymentReceipt: async (paymentId) => {
        const response = await api.get(`/payments/${paymentId}/receipt`);
        return response.data;
    },
    getAllPayments: async () => {
        const response = await api.get('/payments/all');
        return { payments: response.data.data };
    },
    reviewPayment: async (paymentId, data) => {
        const response = await api.put(`/payments/${paymentId}/review`, data);
        return response.data;
    },
    debitWalletForPayment: async (paymentId) => {
        const response = await api.post(`/wallet/approve-payment/${paymentId}`);
        return response.data;
    },
    retryReapSubmission: async (paymentId) => {
        const response = await api.put(`/payments/${paymentId}/retry-reap`, {});
        return response.data;
    },
    completePayment: async (paymentId) => {
        const response = await api.put(`/payments/${paymentId}/complete`, {});
        return response.data;
    },
};
exports.beneficiaryApi = {
    getMyBeneficiaries: async () => {
        const response = await api.get('/beneficiaries/my');
        return { beneficiaries: response.data.data };
    },
    saveBeneficiary: async (data) => {
        const response = await api.post('/beneficiaries', data);
        return response.data;
    },
    deleteBeneficiary: async (beneficiaryId) => {
        const response = await api.delete(`/beneficiaries/${beneficiaryId}`);
        return response.data;
    },
};
exports.ratesApi = {
    getUsdNgnRate: async () => {
        const response = await api.get('/rates/usd-ngn-rate');
        return response.data.data;
    },
};
exports.adminRatesApi = {
    getRates: async () => {
        const response = await api.get('/rates/admin/rates');
        return response.data.data;
    },
    updateRates: async (data) => {
        const response = await api.put('/rates/admin/rates', data);
        return response.data;
    },
};
exports.simulationApi = {
    simulateFundAccount: async (data) => {
        const response = await api.post('/simulations/fund-account', data);
        return response.data;
    },
    simulatePaymentLifecycle: async (paymentId, data) => {
        const response = await api.post(`/simulations/payments/${paymentId}/lifecycle`, data);
        return response.data;
    },
    simulateTrackingLifecycle: async (paymentId, data) => {
        const response = await api.post(`/simulations/payments/${paymentId}/tracking`, data);
        return response.data;
    },
};
exports.adminApi = {
    getPendingUsers: async () => {
        const response = await api.get('/admin/pending-users');
        return response.data;
    },
    getPendingKycSubmissions: async () => {
        const response = await api.get('/admin/pending-kyc-submissions');
        return response.data;
    },
    approveUser: async (userId) => {
        const response = await api.put(`/admin/users/${userId}/approve`);
        return response.data;
    },
    rejectUser: async (userId) => {
        const response = await api.put(`/admin/users/${userId}/reject`);
        return response.data;
    },
    getPendingDocuments: async () => {
        const response = await api.get('/kyc/pending');
        return { data: response.data.data, pagination: response.data.pagination };
    },
    approveDocument: async (documentId) => {
        const response = await api.put(`/kyc/${documentId}/review`, { action: 'approve' });
        return response.data;
    },
    rejectDocument: async (documentId, rejectionReason) => {
        const response = await api.put(`/kyc/${documentId}/review`, { action: 'reject', rejectionReason });
        return response.data;
    },
    deleteUnverifiedUsers: async () => {
        const response = await api.delete('/admin/delete-unverified-users');
        return response.data;
    },
    getDashboard: async () => {
        const response = await api.get('/admin/dashboard');
        return response.data;
    },
    getAllUsers: async () => {
        const response = await api.get('/admin/users');
        return response.data.data;
    },
    getUserById: async (userId) => {
        const response = await api.get(`/admin/users/${userId}`);
        return response.data;
    },
    deleteUser: async (userId) => {
        const response = await api.delete(`/admin/users/${userId}`);
        return response.data;
    },
    updateUser: async (userId, userData) => {
        const response = await api.put(`/admin/users/${userId}`, userData);
        return response.data;
    },
    approveAccount: async (userId) => {
        const response = await api.put(`/admin/users/${userId}/approve`);
        return response.data;
    },
    rejectAccount: async (userId, reason) => {
        const response = await api.put(`/admin/users/${userId}/reject`, { reason });
        return response.data;
    },
    getVirtualAccounts: async (queryParams) => {
        const response = await api.get(`/admin/virtual-accounts${queryParams || ''}`);
        return response.data;
    },
    cleanupVirtualAccounts: async () => {
        const response = await api.post('/admin/virtual-accounts/cleanup-stale');
        return response.data;
    },
    completeVirtualAccount: async (paymentId) => {
        const response = await api.post(`/admin/virtual-accounts/${paymentId}/complete`);
        return response.data;
    },
};
exports.default = api;
