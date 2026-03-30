export type DailyTargetConfig = {
  quantity: number;
};

import { apiFetch } from './api';

export const dailyTargetDb = {
  async getTarget(): Promise<DailyTargetConfig> {
    return apiFetch<DailyTargetConfig>('/daily-target');
  },
  async setTarget(quantity: number): Promise<DailyTargetConfig> {
    return apiFetch<DailyTargetConfig>('/daily-target', {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },
  async getTodayQuantity(): Promise<number> {
    const result = await apiFetch<{ quantity: number }>('/daily-sales/today');
    return result.quantity;
  },
  async addSale(quantity: number): Promise<number> {
    const result = await apiFetch<{ quantity: number }>('/daily-sales', {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
    return result.quantity;
  },
};
