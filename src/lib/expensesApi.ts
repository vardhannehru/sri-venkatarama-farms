import type { ExpenseRecord } from '../types';
import { apiFetch } from './api';

export type CreateExpenseInput = {
  category: ExpenseRecord['category'];
  birdType?: ExpenseRecord['birdType'];
  amount: number;
  openingFeedKg?: number;
  feedRatePerKg?: number;
  feedReceivedKg?: number;
  feedUsedKg?: number;
  larvaEggGrams?: string;
  larvaCost?: number;
  ethanolSyrup?: number;
  brokenRiceCake?: number;
  others?: number;
  labourCost?: number;
  quailFeedLarva?: number;
  notes?: string;
};

export const expensesApi = {
  async list(): Promise<ExpenseRecord[]> {
    return apiFetch<ExpenseRecord[]>('/expenses');
  },
  async create(input: CreateExpenseInput): Promise<ExpenseRecord> {
    return apiFetch<ExpenseRecord>('/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
