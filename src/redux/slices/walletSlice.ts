import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import walletService from '../../services/walletService';

interface WalletBalance {
  walletId: string;
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

interface Transaction {
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  previousBalance: number;
  newBalance: number;
  createdAt: string;
}

interface FundingTransaction {
  transactionId: string;
  amount: number;
  description: string;
  previousBalance: number;
  newBalance: number;
  status: string;
  createdAt: string;
}

interface WalletSummary {
  balance: number;
  currency: string;
  totalFunded: number;
  totalUsed: number;
  transactionCount: number;
  recentTransactions: Array<{
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

interface WalletState {
  balance: WalletBalance | null;
  summary: WalletSummary | null;
  transactions: Transaction[];
  fundingTransactions: FundingTransaction[];
  transactionsPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fundingPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  loading: boolean;
  error: string | null;
  success: string | null;
  balanceValidation: {
    isValid: boolean | null;
    requiredAmount: number;
    currentBalance: number;
    message: string;
  } | null;
}

const initialState: WalletState = {
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

export const initializeWallet = createAsyncThunk(
  'wallet/initialize',
  async (_, { rejectWithValue }) => {
    try {
      return await walletService.initializeWallet();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initialize wallet');
    }
  }
);

export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      return await walletService.getBalance();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch balance');
    }
  }
);

export const fetchWalletSummary = createAsyncThunk(
  'wallet/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      return await walletService.getSummary();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch summary');
    }
  }
);

export const fetchTransactionHistory = createAsyncThunk(
  'wallet/fetchTransactions',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      return await walletService.getTransactionHistory(page, limit);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchFundingHistory = createAsyncThunk(
  'wallet/fetchFundingHistory',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      return await walletService.getFundingHistory(page, limit);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch funding history');
    }
  }
);

export const validateWalletBalance = createAsyncThunk(
  'wallet/validateBalance',
  async (amount: number, { rejectWithValue }) => {
    try {
      return await walletService.validateBalance(amount);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Validation failed');
    }
  }
);

const walletSlice = createSlice({
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
      .addCase(initializeWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload;
      })
      .addCase(initializeWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchWalletSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchWalletSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, clearSuccess, resetWallet } = walletSlice.actions;
export default walletSlice.reducer;
