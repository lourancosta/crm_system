import * as repo from './product.repository';
import type { ProductTypeFilter } from './product.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateProductInput, UpdateProductInput } from './product.types';

function notFound() {
  const err = new Error('Product not found');
  (err as any).statusCode = 404;
  return err;
}

export const listProducts = (
  page: number,
  limit: number,
  search?: string,
  scope?: RecordAccessScope,
  type?: ProductTypeFilter,
) => repo.findAll(page, limit, search, scope, type);

export async function getProductById(id: string, scope?: RecordAccessScope) {
  const p = await repo.findById(id, scope);
  if (!p) throw notFound();
  return p;
}

export async function createProduct(input: CreateProductInput) {
  return repo.create(input);
}

export async function updateProduct(id: string, input: UpdateProductInput, scope?: RecordAccessScope) {
  const existing = await repo.findById(id, scope);
  if (!existing) throw notFound();
  return repo.update(id, input, scope);
}

export async function deleteProduct(id: string, scope?: RecordAccessScope) {
  const existing = await repo.findById(id, scope);
  if (!existing) throw notFound();
  await repo.remove(id, scope);
}
