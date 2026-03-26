export type Product = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
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
