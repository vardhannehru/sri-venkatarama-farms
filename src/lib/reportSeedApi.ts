import type { CostingReportRecord, DailyReportRecord, LarvaCostingRecord } from '../types';

type ReportSeed = {
  dailyReports: DailyReportRecord[];
  costingReports: CostingReportRecord[];
  larvaCostingReports: LarvaCostingRecord[];
};

let cachedSeed: Promise<ReportSeed> | null = null;

async function loadSeed(): Promise<ReportSeed> {
  const response = await fetch('/report-seed.json', { cache: 'no-store' });
  if (!response.ok) {
    return {
      dailyReports: [],
      costingReports: [],
      larvaCostingReports: [],
    };
  }

  const data = (await response.json()) as Partial<ReportSeed>;
  return {
    dailyReports: Array.isArray(data.dailyReports) ? data.dailyReports : [],
    costingReports: Array.isArray(data.costingReports) ? data.costingReports : [],
    larvaCostingReports: Array.isArray(data.larvaCostingReports) ? data.larvaCostingReports : [],
  };
}

export const reportSeedApi = {
  async get(): Promise<ReportSeed> {
    cachedSeed ??= loadSeed();
    return cachedSeed;
  },
};
