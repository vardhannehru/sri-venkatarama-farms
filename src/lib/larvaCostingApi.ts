import type { LarvaCostingRecord } from '../types';
import { apiFetch } from './api';

export const larvaCostingApi = {
  async list(): Promise<LarvaCostingRecord[]> {
    return apiFetch<LarvaCostingRecord[]>('/larva-costing');
  },
};
