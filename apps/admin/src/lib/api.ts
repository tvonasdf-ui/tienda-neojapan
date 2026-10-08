import {
  createSupabaseBrowserClient,
} from './supabase';

export type StockLocation = 'STORE' | 'WAREHOUSE';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type Condition = 'NEW' | 'A' | 'B' | 'C';
export type StockMovementType =
  | 'RECEIPT'
  | 'SALE'
  | 'RESERVATION'
  | 'RELEASE'
  | 'ADJUSTMENT'
  | 'LOSS'
  | 'RETURN';

export interface AdminStockSummary {
  onHand: number;
  reserved: number;
}

export interface AdminVariantView {
  id: string;
  sku: string;
  condition: Condition;
  price: number;
  cost: number;
  barcode: string | null;
  stock: Partial<Record<StockLocation, AdminStockSummary>>;
}

export interface AdminMediaSummary {
  publicId: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  platform: string;
  status: ProductStatus;
  isFeatured: boolean;
  variants: AdminVariantView[];
  primaryMedia: AdminMediaSummary | null;
}

export interface AdminProductListResponse {
  items: AdminProductListItem[];
  total: number;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  platform: string;
  status: ProductStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  variants: AdminVariantView[];
  compatibility: {
    consoleModelId: string;
    level: 'CONFIRMED' | 'PARTIAL';
    source: string;
    notes: string | null;
  }[];
  media: {
    publicId: string;
    alt: string | null;
    isPrimary: boolean;
  }[];
}

export interface StockLevelView {
  variantId: string;
  location: StockLocation;
  onHand: number;
  reserved: number;
  available: number;
}

export interface StockMovementView {
  id: string;
  variantId: string;
  delta: number;
  type: StockMovementType;
  reason: string;
  location: StockLocation;
  refId: string | null;
  userId: string | null;
  createdAt: string;
}

export interface MovementPageResponse {
  items: StockMovementView[];
  total: number;
  limit: number;
  offset: number;
}

export interface LedgerResult {
  movement: StockMovementView;
  stock: StockLevelView;
}

export interface CsvImportSummary {
  createdProducts: number;
  totalRows: number;
  detail: string;
  errors: { row: number; slug: string; message: string }[];
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'
).replace(/\/$/, '');

/** Modo demo (válido solo en desarrollo): no exige JWT de Supabase. */
export const DEMO_BYPASS = process.env.NEXT_PUBLIC_DEMO_BYPASS === 'true';

export const DEMO_COOKIE_NAME = 'neojapan_demo';

export function apiUrl(path: string): string {
  return `${API_BASE}/api/v1${path}`;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Llamada autenticada desde componentes cliente a la API. */
export async function clientApi<T>(path: string, init?: RequestInit): Promise<T> {
  let accessToken: string | undefined;
  if (!DEMO_BYPASS) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new ApiError(401, `No se pudo leer la sesión: ${error.message}`);
    }
    accessToken = data.session?.access_token;
  }
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await apiErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

/** Upload multipart desde componentes cliente, autenticado contra la API. */
export async function clientFormApi<T>(path: string, body: FormData): Promise<T> {
  let accessToken: string | undefined;
  if (!DEMO_BYPASS) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new ApiError(401, `No se pudo leer la sesión: ${error.message}`);
    }
    accessToken = data.session?.access_token;
  }
  const headers = new Headers();
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  const response = await fetch(apiUrl(path), { method: 'POST', body, headers });

  if (!response.ok) {
    throw new ApiError(response.status, await apiErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      detail?: string;
    };
    if (typeof body.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body.message)) {
      return body.message.join('; ');
    }
    if (body.detail) {
      return body.detail;
    }
  } catch {
    // cuerpo no JSON
  }
  return `Error ${response.status}`;
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function formatCLP(amount: number): string {
  return clpFormatter.format(amount);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  RECEIPT: 'Ingreso',
  SALE: 'Venta',
  RESERVATION: 'Reserva',
  RELEASE: 'Liberación',
  ADJUSTMENT: 'Ajuste',
  LOSS: 'Merma',
  RETURN: 'Devolución',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
};

export const CONDITION_LABELS: Record<Condition, string> = {
  NEW: 'Nuevo',
  A: 'A',
  B: 'B',
  C: 'C',
};

export const LOCATION_LABELS: Record<StockLocation, string> = {
  STORE: 'Tienda',
  WAREHOUSE: 'Bodega',
};

export type RepairStatus =
  | 'RECEIVED'
  | 'DIAGNOSED'
  | 'QUOTED'
  | 'APPROVED'
  | 'IN_REPAIR'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'UNCLAIMED';

export interface RepairTicket {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  deviceModel: string | null;
  deviceSerialNumber: string | null;
  faultDescription: string;
  status: RepairStatus;
  diagnosis: string | null;
  quoteAmount: number | null;
  repairNotes: string | null;
  cancellationReason: string | null;
  createdByUserId: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairTicketPage {
  items: RepairTicket[];
  total: number;
  limit: number;
  offset: number;
}

/** Espejo de repairs-rules.ts del API (transiciones contiguas de la máquina de estados). */
export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED'],
  DIAGNOSED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_REPAIR', 'CANCELLED'],
  IN_REPAIR: ['READY'],
  READY: ['DELIVERED', 'UNCLAIMED'],
  DELIVERED: [],
  CANCELLED: [],
  UNCLAIMED: [],
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECEIVED: 'Recibido',
  DIAGNOSED: 'Diagnosticado',
  QUOTED: 'Cotizado',
  APPROVED: 'Cotización aprobada',
  IN_REPAIR: 'En reparación',
  READY: 'Listo para retirar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  UNCLAIMED: 'No retirado',
};

export const ACTIVE_REPAIR_STATUSES: RepairStatus[] = [
  'RECEIVED',
  'DIAGNOSED',
  'QUOTED',
  'APPROVED',
  'IN_REPAIR',
  'READY',
];