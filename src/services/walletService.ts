import api from './api';

export interface WalletBalance {
  walletId: string;
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface WalletSummary {
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

export interface Transaction {
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  previousBalance: number;
  newBalance: number;
  createdAt: string;
}

export interface FundingTransaction {
  transactionId: string;
  amount: number;
  description: string;
  previousBalance: number;
  newBalance: number;
  status: string;
  createdAt: string;
}

export interface BalanceValidation {
  isValid: boolean;
  requiredAmount: number;
  currentBalance: number;
  message: string;
}

class WalletService {
  async initializeWallet(): Promise<WalletBalance> {
    const response = await api.get<{ data: WalletBalance }>('/wallet/initialize');
    return response.data.data;
  }

  async getBalance(): Promise<WalletBalance> {
    const response = await api.get<{ data: WalletBalance }>('/wallet/balance');
    return response.data.data;
  }

  async getSummary(): Promise<WalletSummary> {
    const response = await api.get<{ data: WalletSummary }>('/wallet/summary');
    return response.data.data;
  }

  async getTransactionHistory(page: number = 1, limit: number = 10): Promise<{ data: Transaction[]; pagination: any }> {
    const response = await api.get('/wallet/transactions', { params: { page, limit } });
    return response.data;
  }

  async getFundingHistory(page: number = 1, limit: number = 10): Promise<{ data: FundingTransaction[]; pagination: any }> {
    const response = await api.get('/wallet/funding-history', { params: { page, limit } });
    return response.data;
  }

  async validateBalance(amount: number): Promise<BalanceValidation> {
    const response = await api.post<{ data: BalanceValidation }>('/wallet/validate-balance', { amount });
    return response.data.data;
  }

  async processFidelityPayment(fidelityPaymentId: string): Promise<any> {
    const response = await api.post('/wallet/process-fidelity-payment', { fidelityPaymentId });
    return response.data.data;
  }
}

const walletService = new WalletService();
export default walletService;
