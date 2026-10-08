import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { getConsoles, getProducts } from '@/lib/catalog';
import type { ProductSummary } from '@/lib/catalog-shared';

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = (process.env.STORE_BASE_URL ?? 'https://neojapan.cl').replace(/\/$/, '');
  const [consoles, products] = await Promise.all([
    getConsoles(),
    getAllProducts(),
  ]);
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/catalogo`, changeFrequency: 'daily', priority: 0.9 },
    ...consoles.map((model) => ({ url: `${base}/consola/${slugify(model.name)}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...products.map((product) => ({ url: `${base}/producto/${product.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
  ];
}

async function getAllProducts() {
  const products: ProductSummary[] = [];
  for (let offset = 0; offset < 1200; offset += 48) {
    const page = await getProducts(new URLSearchParams({ limit: '48', offset: String(offset) }).toString());
    products.push(...page);
    if (page.length < 48) break;
  }
  return products;
}
