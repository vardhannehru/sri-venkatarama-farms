import type { SaleRecord } from '../types';
import { apiFetch } from './api';

export type CreateSaleInput = {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  received: number;
  balance: number;
  totalQuantity: number;
  items: SaleRecord['items'];
};

export const salesApi = {
  async list(): Promise<SaleRecord[]> {
    return apiFetch<SaleRecord[]>('/sales');
  },
  async create(input: CreateSaleInput): Promise<SaleRecord> {
    return apiFetch<SaleRecord>('/sales', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async receiveDue(id: string, amount: number): Promise<SaleRecord> {
    return apiFetch<SaleRecord>(`/sales/${id}/receive-due`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  },
  async remove(id: string): Promise<void> {
    await apiFetch<{ ok: boolean }>(`/sales/${id}`, {
      method: 'DELETE',
    });
  },
};
