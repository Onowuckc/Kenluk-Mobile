import api from './api';

export const userApi = {
  getProfile: async (): Promise<{ data: { user: any } }> => {
    const response = await api.get<{ data: { user: any } }>('/users/profile');
    return response.data;
  },

  // TODO: Extend the backend User model and updateProfile controller to save other fields like phone, address, bvn, tin, companyName, and directorInfo.
  updateProfile: async (data: { name?: string; email?: string }): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/users/profile', data);
    return response.data;
  },

  startTwoFactorSetup: async (): Promise<{
    message: string;
    data: {
      qrCodeDataUrl: string;
      manualEntryKey: string;
      otpauthUrl: string;
    };
  }> => {
    const response = await api.post('/users/2fa/setup');
    return response.data;
  },

  confirmTwoFactorSetup: async (data: { twoFactorCode: string }): Promise<{ message: string; data: { user: any } }> => {
    const response = await api.post('/users/2fa/confirm', data);
    return response.data;
  },

  disableTwoFactor: async (data: { twoFactorCode: string }): Promise<{ message: string; data: { user: any } }> => {
    const response = await api.post('/users/2fa/disable', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/users/change-password', data);
    return response.data;
  },

  registerPushToken: async (pushToken: string): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/users/push-token', { pushToken });
    return response.data;
  },
};
