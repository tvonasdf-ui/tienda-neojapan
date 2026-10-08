export interface CatalogVariant {
  id: string;
  sku: string;
  condition: 'NEW' | 'A' | 'B' | 'C';
  price: number;
  barcode: string | null;
  available: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  platform: string;
  category: string;
  compatibleConsoleIds: string[];
  compatibilities?: Array<{ consoleModelId: string; level: 'CONFIRMED' | 'PARTIAL' }>;
  media: { publicId: string; alt: string | null; width: number | null; height: number | null } | null;
  variants: CatalogVariant[];
}

export interface ProductDetail extends Omit<ProductSummary, 'media' | 'compatibleConsoleIds' | 'compatibilities'> {
  description: string | null;
  isFeatured: boolean;
  media: Array<{
    publicId: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    isPrimary: boolean;
  }>;
  compatibility: Array<{
    consoleModel: { name: string; platform: string };
    level: 'CONFIRMED' | 'PARTIAL';
    source: string;
    notes: string | null;
  }>;
}

export interface ConsoleModel {
  id: string;
  platform: string;
  name: string;
  revision: string | null;
  identificationNotes: string | null;
}

export function productImage(publicId?: string | null, width = 900): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud || !publicId) return '/product-placeholder.svg';
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width},ar_4:5,c_fill/${publicId}`;
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}
