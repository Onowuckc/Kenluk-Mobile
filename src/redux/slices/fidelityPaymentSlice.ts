import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import FidelityPaymentService from '../../services/fidelityPaymentService';

type ModalStep = 'amount' | 'customer' | 'review' | 'processing' | 'result';

interface FidelityPaymentState {
  initializeLoading: boolean;
  initializeError: string | null;
  currentPayment: any;
  statusLoading: boolean;
  statusError: string | null;
  paymentStatus: any;
  historyLoading: boolean;
  historyError: string | null;
  paymentHistory: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  retryLoading: boolean;
  retryError: string | null;
  isModalOpen: boolean;
  modalStep: ModalStep;
}

const initialState: FidelityPaymentState = {
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

export const createVirtualAccount = createAsyncThunk(
  'fidelityPayment/createVirtualAccount',
  async (paymentData: any, { rejectWithValue }) => {
    try {
      const response = await FidelityPaymentService.createVirtualAccount(paymentData);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create virtual account');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

export const getPaymentStatus = createAsyncThunk(
  'fidelityPayment/getStatus',
  async (transactionRef: string, { rejectWithValue }) => {
    try {
      const response = await FidelityPaymentService.getPaymentStatus(transactionRef);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to get status');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

export const getPaymentHistory = createAsyncThunk(
  'fidelityPayment/getHistory',
  async ({ limit = 10, page = 1, status }: { limit?: number; page?: number; status?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await FidelityPaymentService.getPaymentHistory({ limit, page, status });
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch history');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

export const retryPayment = createAsyncThunk(
  'fidelityPayment/retry',
  async (paymentId: string, { rejectWithValue }) => {
    try {
      const response = await FidelityPaymentService.retryPayment(paymentId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to retry payment');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

const fidelityPaymentSlice = createSlice({
  name: 'fidelityPayment',
  initialState,
  reducers: {
    setModalStep: (state, action: PayloadAction<ModalStep>) => {
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
      .addCase(createVirtualAccount.pending, (state) => {
        state.initializeLoading = true;
        state.initializeError = null;
      })
      .addCase(createVirtualAccount.fulfilled, (state, action: PayloadAction<any>) => {
        state.initializeLoading = false;
        state.currentPayment = action.payload;
        state.modalStep = 'result';
      })
      .addCase(createVirtualAccount.rejected, (state, action) => {
        state.initializeLoading = false;
        state.initializeError = action.payload as string;
        state.modalStep = 'result';
      })
      .addCase(getPaymentHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(getPaymentHistory.fulfilled, (state, action: PayloadAction<any>) => {
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
      .addCase(getPaymentHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload as string;
      });
  }
});

export const { setModalStep, clearError, resetCurrentPayment } = fidelityPaymentSlice.actions;
export default fidelityPaymentSlice.reducer;
