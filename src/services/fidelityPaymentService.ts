import api from './api';

export interface PaymentData {
  amount: number;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerMobile?: string;
  description?: string;
}

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}

export interface PaymentResponse {
  success: boolean;
  fundingType?: string;
  paymentId?: string;
  status?: string;
  amount?: number;
  virtualAccount?: VirtualAccount;
  message?: string;
  error?: string;
}

class FidelityPaymentService {
  static async createVirtualAccount(paymentData: PaymentData): Promise<PaymentResponse> {
    try {
      const response = await api.post<PaymentResponse>(
        `/payments/fidelity/create-virtual-account`,
        paymentData
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  static async getPaymentStatus(transactionRef: string): Promise<any> {
    try {
      const response = await api.get(`/payments/fidelity/${transactionRef}/status`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  static async getPaymentHistory(options: { status?: string; page?: number; limit?: number } = {}): Promise<any> {
    try {
      const response = await api.get('/payments/fidelity/history', { params: options });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  static async retryPayment(paymentId: string): Promise<any> {
    try {
      const response = await api.post(`/payments/fidelity/${paymentId}/retry`, {});
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

export default FidelityPaymentService;
