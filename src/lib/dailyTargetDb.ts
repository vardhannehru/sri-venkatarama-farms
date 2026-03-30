export type DailyTargetConfig = {
  amount: number;
};

export type DailySalesRecord = {
  [date: string]: number;
};

const TARGET_KEY = 'shopapp.dailyTarget';
const SALES_KEY = 'shopapp.dailySales';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const dailyTargetDb = {
  getTarget(): DailyTargetConfig {
    return readJson<DailyTargetConfig>(TARGET_KEY, { amount: 0 });
  },
  setTarget(amount: number) {
    writeJson(TARGET_KEY, { amount: Math.max(0, Number(amount) || 0) });
  },
  getTodaySales(): number {
    const sales = readJson<DailySalesRecord>(SALES_KEY, {});
    return Number(sales[todayKey()] ?? 0);
  },
  addSale(amount: number) {
    const sales = readJson<DailySalesRecord>(SALES_KEY, {});
    const key = todayKey();
    sales[key] = Number(sales[key] ?? 0) + Math.max(0, Number(amount) || 0);
    writeJson(SALES_KEY, sales);
  },
};
