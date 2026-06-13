"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCurrentPayment = exports.clearError = exports.setModalStep = exports.retryPayment = exports.getPaymentHistory = exports.getPaymentStatus = exports.createVirtualAccount = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const fidelityPaymentService_1 = require("../../services/fidelityPaymentService");
const initialState = {
    initializeLoading: false,
    initializeError: null,
    currentPayment: null,
    statusLoading: false,
    statusError: null,
    paymentStatus: null,
    historyLoading: false,
    historyError: null,
    paymentHistory: [],
    pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    retryLoading: false,
    retryError: null,
    isModalOpen: false,
    modalStep: 'amount'
};
exports.createVirtualAccount = (0, toolkit_1.createAsyncThunk)('fidelityPayment/createVirtualAccount', async (paymentData, { rejectWithValue }) => {
    try {
        const response = await fidelityPaymentService_1.default.createVirtualAccount(paymentData);
        if (!response.success) {
            return rejectWithValue(response.error || 'Failed to create virtual account');
        }
        return response;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Network error occurred');
    }
});
exports.getPaymentStatus = (0, toolkit_1.createAsyncThunk)('fidelityPayment/getStatus', async (transactionRef, { rejectWithValue }) => {
    try {
        const response = await fidelityPaymentService_1.default.getPaymentStatus(transactionRef);
        if (!response.success) {
            return rejectWithValue(response.error || 'Failed to get status');
        }
        return response;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Network error occurred');
    }
});
exports.getPaymentHistory = (0, toolkit_1.createAsyncThunk)('fidelityPayment/getHistory', async ({ limit = 10, page = 1, status } = {}, { rejectWithValue }) => {
    try {
        const response = await fidelityPaymentService_1.default.getPaymentHistory({ limit, page, status });
        if (!response.success) {
            return rejectWithValue(response.error || 'Failed to fetch history');
        }
        return response;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Network error occurred');
    }
});
exports.retryPayment = (0, toolkit_1.createAsyncThunk)('fidelityPayment/retry', async (paymentId, { rejectWithValue }) => {
    try {
        const response = await fidelityPaymentService_1.default.retryPayment(paymentId);
        if (!response.success) {
            return rejectWithValue(response.error || 'Failed to retry payment');
        }
        return response;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Network error occurred');
    }
});
const fidelityPaymentSlice = (0, toolkit_1.createSlice)({
    name: 'fidelityPayment',
    initialState,
    reducers: {
        setModalStep: (state, action) => {
            state.modalStep = action.payload;
        },
        clearError: (state) => {
            state.initializeError = null;
            state.statusError = null;
            state.historyError = null;
            state.retryError = null;
        },
        resetCurrentPayment: (state) => {
            state.currentPayment = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(exports.createVirtualAccount.pending, (state) => {
            state.initializeLoading = true;
            state.initializeError = null;
        })
            .addCase(exports.createVirtualAccount.fulfilled, (state, action) => {
            state.initializeLoading = false;
            state.currentPayment = action.payload;
            state.modalStep = 'result';
        })
            .addCase(exports.createVirtualAccount.rejected, (state, action) => {
            state.initializeLoading = false;
            state.initializeError = action.payload;
            state.modalStep = 'result';
        })
            .addCase(exports.getPaymentHistory.pending, (state) => {
            state.historyLoading = true;
            state.historyError = null;
        })
            .addCase(exports.getPaymentHistory.fulfilled, (state, action) => {
            state.historyLoading = false;
            if (action.payload.data) {
                state.paymentHistory = action.payload.data.payments;
                state.pagination = {
                    page: action.payload.data.pagination.currentPage || 1,
                    limit: 10,
                    total: action.payload.data.pagination.totalRecords || 0,
                    pages: action.payload.data.pagination.totalPages || 1
                };
            }
        })
            .addCase(exports.getPaymentHistory.rejected, (state, action) => {
            state.historyLoading = false;
            state.historyError = action.payload;
        });
    }
});
_a = fidelityPaymentSlice.actions, exports.setModalStep = _a.setModalStep, exports.clearError = _a.clearError, exports.resetCurrentPayment = _a.resetCurrentPayment;
exports.default = fidelityPaymentSlice.reducer;
