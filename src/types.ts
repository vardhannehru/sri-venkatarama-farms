export type Product = {
  id: string;
  name: string;
  category?: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
};

export type CartItem = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type UserRole = 'admin' | 'salesman';
export type PaymentGroup = 'Cash' | 'Bank';

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type SaleItem = {
  productId: string;
  name: string;
  category?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleRecord = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  createdByUserId: string;
  createdByUsername: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  paymentGroup: PaymentGroup;
  subtotal: number;
  discount: number;
  total: number;
  received: number;
  balance: number;
  totalQuantity: number;
  items: SaleItem[];
};

export type PurchaseRecord = {
  id: string;
  createdAt: string;
  birdType: string;
  quantity: number;
  unitCost: number;
  sellPrice: number;
  totalCost: number;
  supplier?: string;
  notes?: string;
};

export type MortalityRecord = {
  id: string;
  createdAt: string;
  birdType: string;
  quantity: number;
  sickQuantity?: number;
  notes?: string;
};

export type ExpenseRecord = {
  id: string;
  createdAt: string;
  category: 'Feed' | 'Labour' | 'Electricity';
  amount: number;
  openingFeedKg?: number;
  feedRatePerKg?: number;
  feedReceivedKg?: number;
  feedUsedKg?: number;
  notes?: string;
};

export type DailyReportRecord = {
  id: string;
  reportDate: string;
  openingBirds: number;
  mortality: number;
  sick: number;
  closingBirds: number;
  openingFeedKg: number;
  usedFeedKg: number;
  receivedFeedKg: number;
  closingFeedKg: number;
  perBirdKg: number;
  perBirdFeedCost: number;
  totalFeedCost: number;
};

export type CostingReportRecord = {
  id: string;
  reportDate: string;
  birdCount: number;
  perBirdCost: number;
  totalCost: number;
  feedPerKg: number;
  perBirdFeedGrams: number;
  totalFeedKg: number;
  totalFeedCost: number;
  otherExpenses: number;
  gas: number;
  dailyLabour: number;
  totalCostInDay: number;
};
