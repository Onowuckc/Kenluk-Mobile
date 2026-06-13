"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
class WalletService {
    async initializeWallet() {
        const response = await api_1.default.get('/wallet/initialize');
        return response.data.data;
    }
    async getBalance() {
        const response = await api_1.default.get('/wallet/balance');
        return response.data.data;
    }
    async getSummary() {
        const response = await api_1.default.get('/wallet/summary');
        return response.data.data;
    }
    async getTransactionHistory(page = 1, limit = 10) {
        const response = await api_1.default.get('/wallet/transactions', { params: { page, limit } });
        return response.data;
    }
    async getFundingHistory(page = 1, limit = 10) {
        const response = await api_1.default.get('/wallet/funding-history', { params: { page, limit } });
        return response.data;
    }
    async validateBalance(amount) {
        const response = await api_1.default.post('/wallet/validate-balance', { amount });
        return response.data.data;
    }
    async processFidelityPayment(fidelityPaymentId) {
        const response = await api_1.default.post('/wallet/process-fidelity-payment', { fidelityPaymentId });
        return response.data.data;
    }
}
const walletService = new WalletService();
exports.default = walletService;
