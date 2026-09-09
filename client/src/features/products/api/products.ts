import type { CreateProductInput, Product, UpdateProductInput } from '../../../shared/types/index';
import { del, get, post, put } from '../../../shared/api/client';

export type ProductTypeFilter = 'single' | 'bundle';

export const productsApi = {
  list: (page = 1, limit = 50, search = '', type?: ProductTypeFilter) =>
    get<{ data: Product[]; total: number; page: number; limit: number }>(
      `/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${type ? `&type=${type}` : ''}`,
    ),

  getById: (id: string) => get<Product>(`/products/${id}`),

  create: (input: CreateProductInput) => post<Product>('/products', input),

  update: (id: string, input: UpdateProductInput) => put<Product>(`/products/${id}`, input),

  delete: (id: string) => del(`/products/${id}`),
};
