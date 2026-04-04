import type { MortalityRecord } from '../types';
import { apiFetch } from './api';

export type CreateMortalityInput = {
  birdType: string;
  quantity: number;
  sickQuantity?: number;
  notes?: string;
};

export const mortalitiesApi = {
  async list(): Promise<MortalityRecord[]> {
    return apiFetch<MortalityRecord[]>('/mortalities');
  },
  async create(input: CreateMortalityInput): Promise<MortalityRecord> {
    return apiFetch<MortalityRecord>('/mortalities', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
