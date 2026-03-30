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

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
};
