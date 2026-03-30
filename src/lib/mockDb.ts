import type { Product } from '../types';
import { apiFetch } from './api';

export const mockProductsDb = {
  async list(): Promise<Product[]> {
    return apiFetch<Product[]>('/products');
  },
  async upsert(p: Product): Promise<Product> {
    return apiFetch<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(p),
    });
  },
  async remove(id: string): Promise<void> {
    await apiFetch<{ ok: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};
