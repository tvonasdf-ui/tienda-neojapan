import { cacheLife, cacheTag } from 'next/cache';
import type { ConsoleModel, ProductDetail, ProductSummary } from './catalog-shared';
export type { CatalogVariant, ConsoleModel, ProductDetail, ProductSummary } from './catalog-shared';
export { formatCLP, productImage } from './catalog-shared';

function apiBase(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002')
    .replace(/\/$/, '')
    .replace(/\/api\/v1$/, '');
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}/api/v1${path}`, init ?? { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`No se pudo cargar la tienda (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function getProducts(query: string): Promise<ProductSummary[]> {
  const suffix = query ? `?${query}` : '';
  return getJson<ProductSummary[]>(`/products${suffix}`, { cache: 'no-store' });
}

export async function getProductCount(query: string): Promise<number> {
  const suffix = query ? `?${query}` : '';
  const result = await getJson<{ total: number }>(`/products/count${suffix}`, { cache: 'no-store' });
  return result.total;
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const response = await fetch(`${apiBase()}/api/v1/products/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`No se pudo cargar el producto (${response.status})`);
  const product = await response.json() as ProductDetail;
  return product;
}

export async function getConsoles(): Promise<ConsoleModel[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('consoles');
  return getJson<ConsoleModel[]>('/consoles');
}
