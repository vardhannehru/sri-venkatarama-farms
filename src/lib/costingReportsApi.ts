import type { CostingReportRecord } from '../types';
import { apiFetch } from './api';

export const costingReportsApi = {
  async list(): Promise<CostingReportRecord[]> {
    return apiFetch<CostingReportRecord[]>('/costing-reports');
  },
};
