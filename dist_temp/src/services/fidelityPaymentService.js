"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
class FidelityPaymentService {
    static async createVirtualAccount(paymentData) {
        try {
            const response = await api_1.default.post(`/payments/fidelity/create-virtual-account`, paymentData);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    static async getPaymentStatus(transactionRef) {
        try {
            const response = await api_1.default.get(`/payments/fidelity/${transactionRef}/status`);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    static async getPaymentHistory(options = {}) {
        try {
            const response = await api_1.default.get('/payments/fidelity/history', { params: options });
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    static async retryPayment(paymentId) {
        try {
            const response = await api_1.default.post(`/payments/fidelity/${paymentId}/retry`, {});
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
}
exports.default = FidelityPaymentService;
