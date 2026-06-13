"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetWallet = exports.clearSuccess = exports.clearError = exports.validateWalletBalance = exports.fetchFundingHistory = exports.fetchTransactionHistory = exports.fetchWalletSummary = exports.fetchWalletBalance = exports.initializeWallet = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const walletService_1 = require("../../services/walletService");
const initialState = {
    balance: null,
    summary: null,
    transactions: [],
    fundingTransactions: [],
    transactionsPagination: { page: 1, limit: 10, total: 0, pages: 0 },
    fundingPagination: { page: 1, limit: 10, total: 0, pages: 0 },
    loading: false,
    error: null,
    success: null,
    balanceValidation: null
};
exports.initializeWallet = (0, toolkit_1.createAsyncThunk)('wallet/initialize', async (_, { rejectWithValue }) => {
    try {
        return await walletService_1.default.initializeWallet();
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to initialize wallet');
    }
});
exports.fetchWalletBalance = (0, toolkit_1.createAsyncThunk)('wallet/fetchBalance', async (_, { rejectWithValue }) => {
    try {
        return await walletService_1.default.getBalance();
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to fetch balance');
    }
});
exports.fetchWalletSummary = (0, toolkit_1.createAsyncThunk)('wallet/fetchSummary', async (_, { rejectWithValue }) => {
    try {
        return await walletService_1.default.getSummary();
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to fetch summary');
    }
});
exports.fetchTransactionHistory = (0, toolkit_1.createAsyncThunk)('wallet/fetchTransactions', async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
        return await walletService_1.default.getTransactionHistory(page, limit);
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to fetch transactions');
    }
});
exports.fetchFundingHistory = (0, toolkit_1.createAsyncThunk)('wallet/fetchFundingHistory', async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
        return await walletService_1.default.getFundingHistory(page, limit);
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to fetch funding history');
    }
});
exports.validateWalletBalance = (0, toolkit_1.createAsyncThunk)('wallet/validateBalance', async (amount, { rejectWithValue }) => {
    try {
        return await walletService_1.default.validateBalance(amount);
    }
    catch (error) {
        return rejectWithValue(error.message || 'Validation failed');
    }
});
const walletSlice = (0, toolkit_1.createSlice)({
    name: 'wallet',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearSuccess: (state) => {
            state.success = null;
        },
        resetWallet: (state) => {
            state.balance = null;
            state.summary = null;
            state.transactions = [];
            state.fundingTransactions = [];
            state.error = null;
            state.success = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(exports.initializeWallet.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
            .addCase(exports.initializeWallet.fulfilled, (state, action) => {
            state.loading = false;
            state.balance = action.payload;
        })
            .addCase(exports.initializeWallet.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })
            .addCase(exports.fetchWalletSummary.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
            .addCase(exports.fetchWalletSummary.fulfilled, (state, action) => {
            state.loading = false;
            state.summary = action.payload;
        })
            .addCase(exports.fetchWalletSummary.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })
            .addCase(exports.fetchWalletBalance.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
            .addCase(exports.fetchWalletBalance.fulfilled, (state, action) => {
            state.loading = false;
            state.balance = action.payload;
        })
            .addCase(exports.fetchWalletBalance.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })
            .addCase(exports.validateWalletBalance.pending, (state) => {
            state.error = null;
        })
            .addCase(exports.validateWalletBalance.fulfilled, (state, action) => {
            state.error = null;
            state.balanceValidation = action.payload;
        })
            .addCase(exports.validateWalletBalance.rejected, (state, action) => {
            state.error = action.payload;
            state.balanceValidation = null;
        });
    }
});
_a = walletSlice.actions, exports.clearError = _a.clearError, exports.clearSuccess = _a.clearSuccess, exports.resetWallet = _a.resetWallet;
exports.default = walletSlice.reducer;
