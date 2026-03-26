import type { Product } from '../types';

const KEY = 'shopapp.mock.products';

const seed: Product[] = [
  { id: 'p1', name: 'Rice 25kg', sku: 'RICE25', barcode: '890000000001', category: 'Grocery', costPrice: 980, sellPrice: 1120, stock: 12 },
  { id: 'p2', name: 'Sunflower Oil 1L', sku: 'OIL1', barcode: '890000000002', category: 'Grocery', costPrice: 110, sellPrice: 145, stock: 28 },
  { id: 'p3', name: 'Soap 100g', sku: 'SOAP100', barcode: '890000000003', category: 'Personal Care', costPrice: 18, sellPrice: 28, stock: 150 },
];

function load(): Product[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return seed;
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    return seed;
  }
}

function save(products: Product[]) {
  localStorage.setItem(KEY, JSON.stringify(products));
}

export const mockProductsDb = {
  list(): Product[] {
    return load();
  },
  upsert(p: Product): Product {
    const items = load();
    const idx = items.findIndex((x) => x.id === p.id);
    if (idx >= 0) items[idx] = p;
    else items.unshift(p);
    save(items);
    return p;
  },
  remove(id: string) {
    const items = load().filter((x) => x.id !== id);
    save(items);
  },
};
