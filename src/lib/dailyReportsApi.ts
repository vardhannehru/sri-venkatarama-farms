import type { DailyReportRecord } from '../types';
import { apiFetch } from './api';

export type UpsertDailyReportInput = {
  reportDate: string;
  openingBirds: number;
  mortality: number;
  sick: number;
  openingFeedKg: number;
  usedFeedKg: number;
  receivedFeedKg: number;
  totalFeedCost: number;
};

export const dailyReportsApi = {
  async list(): Promise<DailyReportRecord[]> {
    return apiFetch<DailyReportRecord[]>('/daily-reports');
  },
  async upsert(input: UpsertDailyReportInput): Promise<DailyReportRecord> {
    return apiFetch<DailyReportRecord>('/daily-reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
