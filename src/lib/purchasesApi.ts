import type { PurchaseRecord } from '../types';
import { apiFetch } from './api';

export type CreatePurchaseInput = {
  birdType: string;
  quantity: number;
  unitCost: number;
  sellPrice: number;
  totalCost: number;
  supplier?: string;
  notes?: string;
};

export const purchasesApi = {
  async list(): Promise<PurchaseRecord[]> {
    return apiFetch<PurchaseRecord[]>('/purchases');
  },
  async create(input: CreatePurchaseInput): Promise<PurchaseRecord> {
    return apiFetch<PurchaseRecord>('/purchases', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
