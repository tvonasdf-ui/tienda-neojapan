import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

/**
 * Store en memoria que emula el subconjunto del cliente Prisma que usan los
 * servicios (inventario, catálogo y catálogo admin). Activa con
 * `DATA_STORE=memory` para desarrollo/demo sin base de datos real (decisión
 * Fase 1: sin DB → adaptador en memoria, tests y demo offline). El estado vive
 * en un único proceso; las transacciones retroceden si la operación falla.
 */

// ---------- Filas ----------

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  platform: string;
  status: string;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VariantRow {
  id: string;
  productId: string;
  sku: string;
  condition: string;
  price: number;
  cost: number;
  barcode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StockLevelRow {
  variantId: string;
  location: string;
  onHand: number;
  reserved: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StockMovementRow {
  id: string;
  variantId: string;
  type: string;
  delta: number;
  reason: string;
  location: string;
  refId: string | null;
  userId: string | null;
  createdAt: Date;
}

interface ConsoleModelRow {
  id: string;
  platform: string;
  name: string;
  revision: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CompatibilityRow {
  id: string;
  productId: string;
  consoleModelId: string;
  level: string;
  source: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MediaAssetRow {
  id: string;
  productId: string;
  publicId: string;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GarageItemRow {
  id: string;
  customerId: string;
  consoleModelId: string;
  notes: string | null;
  createdAt: Date;
}

interface SaleRow {
  id: string;
  code: string;
  channel: string;
  status: string;
  customerId: string | null;
  staffUserId: string | null;
  clientSaleId: string | null;
  deliveryMode: string;
  reservationExpiresAt: Date | null;
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  dispatchCommune: string | null;
  customerNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleLineRow {
  id: string;
  saleId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  createdAt: Date;
}

interface PaymentRow {
  id: string;
  saleId: string;
  method: string;
  amount: number;
  reference: string | null;
  status: string;
  recordedByUserId: string | null;
  createdAt: Date;
}

interface CartRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CartItemRow {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RepairTicketRow {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  deviceModel: string | null;
  deviceSerialNumber: string | null;
  faultDescription: string;
  status: string;
  diagnosis: string | null;
  quoteAmount: number | null;
  repairNotes: string | null;
  cancellationReason: string | null;
  createdByUserId: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Store {
  products: ProductRow[];
  variants: VariantRow[];
  stockLevels: StockLevelRow[];
  stockMovements: StockMovementRow[];
  consoleModels: ConsoleModelRow[];
  compatibilities: CompatibilityRow[];
  mediaAssets: MediaAssetRow[];
  customers: CustomerRow[];
  garageItems: GarageItemRow[];
  sales: SaleRow[];
  saleLines: SaleLineRow[];
  payments: PaymentRow[];
  carts: CartRow[];
  cartItems: CartItemRow[];
  users: UserRow[];
  repairTickets: RepairTicketRow[];
}

type Row = Record<string, unknown>;

const now = (): Date => new Date();
const newId = (): string => randomUUID();

// ---------- Helpers de fila ----------

function pushVariant(
  store: Store,
  productId: string,
  sku: string,
  condition: string,
  price: number,
  cost: number,
  at: Date,
): VariantRow {
  const variant: VariantRow = {
    id: newId(),
    productId,
    sku,
    condition,
    price,
    cost,
    barcode: null,
    createdAt: at,
    updatedAt: at,
  };
  store.variants.push(variant);
  return variant;
}

function pushLevel(
  store: Store,
  variantId: string,
  location: string,
  onHand: number,
  reserved: number,
  at: Date,
): void {
  store.stockLevels.push({
    variantId,
    location,
    onHand,
    reserved,
    createdAt: at,
    updatedAt: at,
  });
}

function pushMovement(
  store: Store,
  variantId: string,
  type: string,
  delta: number,
  reason: string,
  location: string,
  at: Date,
): void {
  store.stockMovements.push({
    id: newId(),
    variantId,
    type,
    delta,
    reason,
    location,
    refId: null,
    userId: null,
    createdAt: at,
  });
}

function pushCompatibility(
  store: Store,
  productId: string,
  consoleModelId: string,
  level: string,
  source: string,
  at: Date,
): void {
  store.compatibilities.push({
    id: newId(),
    productId,
    consoleModelId,
    level,
    source,
    notes: null,
    createdAt: at,
    updatedAt: at,
  });
}

// ---------- Seed de demo ----------

function createSeedStore(): Store {
  const store: Store = {
    products: [],
    variants: [],
    stockLevels: [],
    stockMovements: [],
    consoleModels: [],
    compatibilities: [],
    mediaAssets: [],
    garageItems: [],
    customers: [],
    sales: [],
    saleLines: [],
    payments: [],
    carts: [],
    cartItems: [],
    users: [],
    repairTickets: [],
  };
  const at = now();

  const consoleDefs = [
    { platform: 'Nintendo Switch', name: 'Nintendo Switch', revision: 'HAC-001' },
    { platform: 'Nintendo Switch', name: 'Nintendo Switch OLED', revision: 'HEG-001' },
    { platform: 'Nintendo Switch', name: 'Nintendo Switch Lite', revision: 'HDH-001' },
    { platform: 'PlayStation', name: 'PlayStation 5', revision: 'CFI-1000' },
    { platform: 'PlayStation', name: 'PlayStation 5 Pro', revision: 'CFI-7000' },
    { platform: 'PlayStation', name: 'PlayStation 2', revision: 'SCPH-39001' },
    { platform: 'Nintendo', name: 'Super Nintendo', revision: 'SNS-001' },
    { platform: 'Nintendo', name: 'Game Boy Advance SP', revision: 'AGS-001' },
  ];
  for (const m of consoleDefs) {
    store.consoleModels.push({ id: newId(), ...m, createdAt: at, updatedAt: at });
  }

  // Producto 1: repuesto con 3 grados y compatibilidad garantizada.
  const joy: ProductRow = {
    id: newId(),
    slug: 'joystick-repuesto-switch-oled',
    name: 'Joystick de repuesto Switch OLED',
    description:
      'Repuesto para el joy-con del Switch OLED. Fotos propias de la unidad; revisado y probado antes de publicar.',
    category: 'Repuestos',
    platform: 'Nintendo Switch',
    status: 'ACTIVE',
    isFeatured: true,
    createdAt: at,
    updatedAt: at,
  };
  store.products.push(joy);
  const joyA = pushVariant(store, joy.id, 'SW-JOY-A1', 'A', 24990, 12800, at);
  const joyB = pushVariant(store, joy.id, 'SW-JOY-B1', 'B', 19990, 9900, at);
  const switchOled = store.consoleModels.find((c) => c.name === 'Nintendo Switch OLED');
  if (switchOled) {
    pushCompatibility(
      store,
      joy.id,
      switchOled.id,
      'CONFIRMED',
      'Confirmado con equipo propio',
      at,
    );
  }
  pushLevel(store, joyA.id, 'STORE', 2, 1, at);
  pushLevel(store, joyA.id, 'WAREHOUSE', 5, 0, at);
  pushLevel(store, joyB.id, 'STORE', 2, 0, at);
  pushMovement(store, joyA.id, 'RECEIPT', 2, 'Stock inicial de demo', 'STORE', at);
  pushMovement(store, joyA.id, 'RECEIPT', 5, 'Recepción a bodega', 'WAREHOUSE', at);
  pushMovement(store, joyB.id, 'RECEIPT', 2, 'Stock inicial de demo', 'STORE', at);
  pushMovement(store, joyA.id, 'RESERVATION', 1, 'Reserva de pedido WhatsApp', 'STORE', at);
  pushMovement(store, joyA.id, 'RELEASE', -1, 'Reserva cancelada', 'STORE', at);
  store.mediaAssets.push({
    id: 'seed-swjoy-a1-photo',
    productId: joy.id,
    publicId: 'products/sw_joy_repuesto_a1',
    alt: 'Joystick de repuesto Switch OLED (condición A)',
    isPrimary: true,
    sortOrder: 0,
    width: 1200,
    height: 1500,
    createdAt: at,
    updatedAt: at,
  });

  // Producto 2: juego retro con compatibilidad por consola.
  const smw: ProductRow = {
    id: newId(),
    slug: 'super-mario-world-snes',
    name: 'Super Mario World (SNES)',
    description:
      'Clásico completo con caja y manual. Fotos propias de la unidad; funciona probado.',
    category: 'Juegos retro',
    platform: 'Super Nintendo',
    status: 'ACTIVE',
    isFeatured: false,
    createdAt: at,
    updatedAt: at,
  };
  store.products.push(smw);
  const smwV = pushVariant(store, smw.id, 'SNES-SMW-B1', 'B', 28990, 9500, at);
  const snes = store.consoleModels.find((c) => c.name === 'Super Nintendo');
  if (snes) {
    pushCompatibility(
      store,
      smw.id,
      snes.id,
      'CONFIRMED',
      'Compatibilidad nativa (cartucho NTSC)',
      at,
    );
  }
  pushLevel(store, smwV.id, 'STORE', 3, 0, at);
  pushMovement(store, smwV.id, 'RECEIPT', 3, 'Stock inicial de demo', 'STORE', at);
  store.mediaAssets.push({
    id: newId(),
    productId: smw.id,
    publicId: 'products/super_mario_world_snes',
    alt: 'Super Mario World (SNES)',
    isPrimary: true,
    sortOrder: 0,
    width: 1200,
    height: 1500,
    createdAt: at,
    updatedAt: at,
  });

  // Tickets de servicio técnico de demo (plan §4.8).
  store.repairTickets.push({
    id: 'seed-repair-ticket-received',
    code: 'SR-0001',
    customerName: 'María González',
    customerPhone: '+56 9 1234 5678',
    deviceName: 'Nintendo Switch OLED',
    deviceModel: 'HEG-001',
    deviceSerialNumber: null,
    faultDescription: 'El joycon izquierdo presenta drift y no se registra bien la palanca.',
    status: 'RECEIVED',
    diagnosis: null,
    quoteAmount: null,
    repairNotes: null,
    cancellationReason: null,
    createdByUserId: null,
    deliveredAt: null,
    createdAt: at,
    updatedAt: at,
  });
  store.repairTickets.push({
    id: 'seed-repair-ticket-in-progress',
    code: 'SR-0002',
    customerName: 'Pedro Soto',
    customerPhone: '+56 9 8765 4321',
    deviceName: 'PlayStation 5',
    deviceModel: 'CFI-1000',
    deviceSerialNumber: 'F123456789',
    faultDescription: 'No enciende; el LED parpadea y no da imagen por HDMI.',
    status: 'APPROVED',
    diagnosis: 'Fuente de poder dañada; requiere reemplazo.',
    quoteAmount: 45990,
    repairNotes: null,
    cancellationReason: null,
    createdByUserId: null,
    deliveredAt: null,
    createdAt: at,
    updatedAt: at,
  });

  return store;
}

// ---------- Match / proyección / orden ----------

type ModelName = 'product' | 'variant' | 'stockLevel' | 'stockMovement' | 'compatibility' | 'mediaAsset' | 'consoleModel' | 'customer' | 'garageItem' | 'sale' | 'saleLine' | 'payment' | 'cart' | 'cartItem' | 'user' | 'repairTicket';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function relationRows(rel: string, row: Row, store: Store): Row[] {
  if (rel === 'variants') {
    return store.variants.filter((v) => v.productId === row.id) as unknown as Row[];
  }
  if (rel === 'stockLevels') {
    return store.stockLevels.filter((l) => l.variantId === row.id) as unknown as Row[];
  }
  if (rel === 'media') {
    return store.mediaAssets.filter((m) => m.productId === row.id) as unknown as Row[];
  }
  if (rel === 'compatibilities') {
    return store.compatibilities.filter(
      (c) => c.productId === row.id,
    ) as unknown as Row[];
  }
  if (rel === 'product') {
    return store.products.filter((product) => product.id === row.productId) as unknown as Row[];
  }
  if (rel === 'lines' || rel === 'sales') {
    return store.saleLines.filter((line) => line.saleId === row.id) as unknown as Row[];
  }
  if (rel === 'payments') {
    return store.payments.filter((payment) => payment.saleId === row.id) as unknown as Row[];
  }
  return [];
}

function matches(whereValue: unknown, key: string, row: Row, store: Store): boolean {
  if (whereValue === undefined || whereValue === null) {
    return false;
  }
  const value = whereValue as Record<string, unknown>;
  if ('in' in value && Array.isArray(value.in)) {
    return value.in.includes(row[key]);
  }
  if ('contains' in value) {
    const needle = String(value.contains ?? '');
    const hay = row[key] === undefined || row[key] === null ? '' : String(row[key]);
    const insensitive = value.mode === 'insensitive';
    return insensitive
      ? hay.toLowerCase().includes(needle.toLowerCase())
      : hay.includes(needle);
  }
  if ('some' in value) {
    const nested = relationRows(key, row, store);
    return nested.some((rel) => matchWhere(value.some, rel, store));
  }
  if ('equals' in value) {
    return row[key] === value.equals;
  }
  const comparisons: Record<string, (left: number, right: number) => boolean> = {
    gte: (left, right) => left >= right,
    lte: (left, right) => left <= right,
    gt: (left, right) => left > right,
    lt: (left, right) => left < right,
  };
  for (const [operator, compare] of Object.entries(comparisons)) {
    if (operator in value) {
      const left = row[key];
      const right = value[operator];
      return typeof left === 'number' && typeof right === 'number'
        ? compare(left, right)
        : false;
    }
  }
  return false;
}

function matchWhere(where: unknown, row: Row, store: Store): boolean {
  if (where === undefined) return true;
  const w = asRecord(where);
  if (Array.isArray(w.OR)) {
    return w.OR.some((clause) => matchWhere(clause, row, store));
  }
  if (Array.isArray(w.AND)) {
    return w.AND.every((clause) => matchWhere(clause, row, store));
  }
  for (const [key, value] of Object.entries(w)) {
    if (key === 'OR' || key === 'AND' || key === 'NOT') continue;
    if (key === 'variantId_location') {
      const composite = asRecord(value);
      if (row.variantId !== composite.variantId) return false;
      if (row.location !== composite.location) return false;
      continue;
    }
    if (Array.isArray(value)) {
      if (!value.includes(row[key])) return false;
      continue;
    }
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      if (!matches(value, key, row, store)) return false;
      continue;
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function scalarOrNull(row: Row, key: string): unknown {
  const value = row[key];
  return value === undefined ? null : value;
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const spec = asRecord(orderBy);
  const entries = Object.entries(spec);
  if (entries.length === 0) return rows;
  const [field, direction] = entries[0] as [string, string];
  if (direction !== 'desc' && direction !== 'asc') return rows;
  const dir = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    const aN = av === undefined || av === null ? 0 : av;
    const bN = bv === undefined || bv === null ? 0 : bv;
    if (aN < bN) return -1 * dir;
    if (aN > bN) return 1 * dir;
    return 0;
  });
}

const RELATION_KEYS = [
  'variants',
  'stockLevels',
  'media',
  'compatibilities',
  'product',
] as const;

function projectRow(
  row: Row,
  select: unknown,
  include: unknown,
  store: Store,
): Row {
  const out: Row = {};
  const incl = asRecord(include);
  if (Object.keys(incl).length > 0) {
    for (const key of Object.keys(row)) {
      out[key] = scalarOrNull(row, key);
    }
    for (const [rel, relSpec] of Object.entries(incl)) {
      const spec = asRecord(relSpec);
      if (rel === 'consoleModel') {
        const cm = store.consoleModels.find((c) => c.id === row.consoleModelId);
        out.consoleModel = cm
          ? projectRow(cm as unknown as Row, spec.select, spec.include, store)
          : null;
        continue;
      }
      const rels = relationRows(rel, row, store)
        .filter((r) => matchWhere(spec.where, r, store))
        .sort(sortRowsAll(spec.orderBy));
      const takeCount = typeof spec.take === 'number' ? spec.take : undefined;
      const taken = takeCount !== undefined ? rels.slice(0, takeCount) : rels;
      out[rel] = taken.map((r) => projectRow(r, spec.select, spec.include, store));
    }
    return out;
  }

  const sel = asRecord(select);
  if (Object.keys(sel).length === 0) {
    for (const key of Object.keys(row)) {
      out[key] = scalarOrNull(row, key);
    }
    return out;
  }
  for (const [key, value] of Object.entries(sel)) {
    if (value === true) {
      out[key] = scalarOrNull(row, key);
      continue;
    }
    const spec = asRecord(value);
    if (key === '_count') {
      const counts: Record<string, number> = {};
      const countSel = asRecord(spec.select);
      for (const rel of Object.keys(countSel)) {
        if (rel === 'variants') {
          counts.variants = store.variants.filter((v) => v.productId === row.id).length;
        }
      }
      out._count = counts;
      continue;
    }
    if (key === 'product') {
      const related = store.products.find(
        (product) => product.id === row.productId,
      );
      out[key] = related
        ? projectRow(related as unknown as Row, spec.select, spec.include, store)
        : null;
      continue;
    }
    if ((RELATION_KEYS as readonly string[]).includes(key)) {
      const rels = relationRows(key, row, store)
        .filter((r) => matchWhere(spec.where, r, store))
        .sort(sortRowsAll(spec.orderBy));
      const takeCount = typeof spec.take === 'number' ? spec.take : undefined;
      const taken = takeCount !== undefined ? rels.slice(0, takeCount) : rels;
      out[key] = taken.map((r) => projectRow(r, spec.select, spec.include, store));
      continue;
    }
    out[key] = scalarOrNull(row, key);
  }
  return out;
}

function sortRowsAll(orderBy: unknown): (a: Row, b: Row) => number {
  return (a, b) => {
    const spec = asRecord(orderBy);
    const entries = Object.entries(spec);
    if (entries.length === 0) return 0;
    const [field, direction] = entries[0] as [string, string];
    const av = a[field];
    const bv = b[field];
    const aN = av === undefined || av === null ? 0 : av;
    const bN = bv === undefined || bv === null ? 0 : bv;
    if (aN < bN) return direction === 'desc' ? 1 : -1;
    if (aN > bN) return direction === 'desc' ? -1 : 1;
    return 0;
  };
}

// ---------- Errores compatibles con Prisma ----------

function uniqueConflict(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
    meta: { target },
  });
}

// ---------- Cliente ----------

type RowList = Row[];

function rowsByModel(model: ModelName, store: Store): RowList {
  switch (model) {
    case 'product':
      return store.products as unknown as RowList;
    case 'variant':
      return store.variants as unknown as RowList;
    case 'stockLevel':
      return store.stockLevels as unknown as RowList;
    case 'stockMovement':
      return store.stockMovements as unknown as RowList;
    case 'compatibility':
      return store.compatibilities as unknown as RowList;
    case 'mediaAsset':
      return store.mediaAssets as unknown as RowList;
    case 'consoleModel':
      return store.consoleModels as unknown as RowList;
    case 'customer':
      return store.customers as unknown as RowList;
    case 'garageItem':
      return store.garageItems as unknown as RowList;
    case 'sale':
      return store.sales as unknown as RowList;
    case 'saleLine':
      return store.saleLines as unknown as RowList;
    case 'payment':
      return store.payments as unknown as RowList;
    case 'cart':
      return store.carts as unknown as RowList;
    case 'cartItem':
      return store.cartItems as unknown as RowList;
    case 'user':
      return store.users as unknown as RowList;
    case 'repairTicket':
      return store.repairTickets as unknown as RowList;
  }
}

function pushRow(model: ModelName, store: Store, row: Row): Row {
  const list = rowsByModel(model, store);
  list.push({ ...row });
  return row;
}

function createRow(model: ModelName, store: Store, data: unknown): Row {
  const row = asRecord(data);
  const id = (row.id as string) ?? newId();
  const createdAt = (row.createdAt as Date) ?? now();
  const withMeta: Row = {
    id,
    ...row,
    createdAt,
    updatedAt: (row.updatedAt as Date) ?? now(),
  };

  if (model === 'product') {
    const slug = String(withMeta.slug);
    if (store.products.some((p) => p.slug === slug)) {
      throw uniqueConflict(['slug']);
    }
  }
  if (model === 'variant') {
    const sku = String(withMeta.sku);
    if (store.variants.some((v) => v.sku === sku)) {
      throw uniqueConflict(['sku']);
    }
  }
  if (model === 'stockLevel') {
    const duplicate = store.stockLevels.some(
      (l) => l.variantId === withMeta.variantId && l.location === withMeta.location,
    );
    if (duplicate) {
      throw uniqueConflict(['variantId', 'location']);
    }
  }
  if (model === 'sale' && store.sales.some((sale) => sale.code === withMeta.code)) {
    throw uniqueConflict(['code']);
  }
  if (model === 'sale' && withMeta.clientSaleId && store.sales.some((sale) => sale.clientSaleId === withMeta.clientSaleId)) {
    throw uniqueConflict(['clientSaleId']);
  }
  if (model === 'user' && store.users.some((user) => user.email === withMeta.email)) {
    throw uniqueConflict(['email']);
  }
  if (
    model === 'mediaAsset' &&
    store.mediaAssets.some((asset) => asset.publicId === withMeta.publicId)
  ) {
    throw uniqueConflict(['publicId']);
  }
  if (model === 'cartItem' && store.cartItems.some((item) => item.cartId === withMeta.cartId && item.variantId === withMeta.variantId)) {
    throw uniqueConflict(['cartId', 'variantId']);
  }
  if (
    model === 'repairTicket' &&
    store.repairTickets.some((ticket) => ticket.code === withMeta.code)
  ) {
    throw uniqueConflict(['code']);
  }
  return pushRow(model, store, withMeta);
}

function updateRow(
  model: ModelName,
  store: Store,
  where: unknown,
  data: unknown,
): Row {
  const list = rowsByModel(model, store);
  const index = indexOf(list, where, store);
  if (index === -1) {
    throw new Error(`[memory-store] ${model} no encontrado para update`);
  }
  const current = list[index];
  const patch = asRecord(data);
  for (const [key, value] of Object.entries(patch)) {
    const nested = asRecord(value);
    if ('increment' in nested && typeof nested.increment === 'number') {
      const base = typeof current[key] === 'number' ? (current[key] as number) : 0;
      current[key] = base + nested.increment;
    } else {
      current[key] = value;
    }
  }
  if (current.updatedAt !== undefined) {
    current.updatedAt = now();
  }
  return current;
}

function indexOf(list: Row[], where: unknown, store: Store): number {
  return list.findIndex((row) => matchWhere(where, row, store));
}

function findMany(
  model: ModelName,
  store: Store,
  args: Record<string, unknown>,
): Row[] {
  const list = rowsByModel(model, store);
  const filtered = list.filter((row) => matchWhere(args.where, row, store));
  const ordered = sortRows(filtered, args.orderBy);
  const skip = typeof args.skip === 'number' ? args.skip : 0;
  const take = typeof args.take === 'number' ? args.take : ordered.length;
  const page = ordered.slice(skip, skip + take);
  return page.map((row) =>
    projectRow(row, args.select, args.include, store),
  );
}

function findOne(
  model: ModelName,
  store: Store,
  args: Record<string, unknown>,
): Row | null {
  const row = rowsByModel(model, store).find((r) =>
    matchWhere(args.where, r, store),
  );
  if (!row) return null;
  return projectRow(row, args.select, args.include, store);
}

function countRows(model: ModelName, store: Store, where: unknown): number {
  return rowsByModel(model, store).filter((r) => matchWhere(where, r, store)).length;
}

function deleteRows(model: ModelName, store: Store, where: unknown): number {
  const rows = rowsByModel(model, store);
  let count = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (matchWhere(where, rows[index]!, store)) {
      rows.splice(index, 1);
      count += 1;
    }
  }
  return count;
}

export interface StoreClient {
  product: unknown;
  variant: unknown;
  stockLevel: unknown;
  stockMovement: unknown;
  compatibility: unknown;
  mediaAsset: unknown;
  consoleModel: unknown;
  customer: unknown;
  garageItem: unknown;
  sale: unknown;
  saleLine: unknown;
  payment: unknown;
  cart: unknown;
  cartItem: unknown;
  user: unknown;
  repairTicket: unknown;
  $transaction<T>(fn: (tx: StoreClient) => Promise<T>): Promise<T>;
  $queryRaw<T = unknown>(sql: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

function snapshot(store: Store): Store {
  return {
    products: structuredClone(store.products),
    variants: structuredClone(store.variants),
    stockLevels: structuredClone(store.stockLevels),
    stockMovements: structuredClone(store.stockMovements),
    consoleModels: structuredClone(store.consoleModels),
    compatibilities: structuredClone(store.compatibilities),
    mediaAssets: structuredClone(store.mediaAssets),
    customers: structuredClone(store.customers),
    garageItems: structuredClone(store.garageItems),
    sales: structuredClone(store.sales),
    saleLines: structuredClone(store.saleLines),
    payments: structuredClone(store.payments),
    carts: structuredClone(store.carts),
    cartItems: structuredClone(store.cartItems),
    users: structuredClone(store.users),
    repairTickets: structuredClone(store.repairTickets),
  };
}

function restore(store: Store, saved: Store): void {
  store.products = saved.products;
  store.variants = saved.variants;
  store.stockLevels = saved.stockLevels;
  store.stockMovements = saved.stockMovements;
  store.consoleModels = saved.consoleModels;
  store.compatibilities = saved.compatibilities;
  store.mediaAssets = saved.mediaAssets;
  store.customers = saved.customers;
  store.garageItems = saved.garageItems;
  store.sales = saved.sales;
  store.saleLines = saved.saleLines;
  store.payments = saved.payments;
  store.carts = saved.carts;
  store.cartItems = saved.cartItems;
  store.users = saved.users;
  store.repairTickets = saved.repairTickets;
}

function toSql(strings: TemplateStringsArray, values: unknown[]): string {
  let sql = strings[0];
  for (let i = 1; i < strings.length; i += 1) {
    sql += values[i - 1] === null ? 'NULL' : String(values[i - 1]);
    sql += strings[i];
  }
  return sql;
}

/**
 * Implementa `$queryRaw` para las dos únicas formas que emiten los servicios:
 * la guarda atómica de `stock_levels` (ver inventory.service.ts) y el ping de
 * health (`SELECT 1`). Cualquier otro SQL falla con un mensaje claro.
 */
function applyQueryRaw(store: Store, sql: string): Row[] {
  if (/SELECT\s+1/i.test(sql)) {
    return [{ '?column?': 1 }];
  }
  if (!/UPDATE\s+"StockLevel"/i.test(sql)) {
    throw new Error(
      `[memory-store] $queryRaw no soportado por DATA_STORE=memory: ${sql}`,
    );
  }

  const variantMatch = sql.match(/"variantId"\s*=\s*([A-Za-z0-9_-]+)/);
  const locationMatch = sql.match(/"location"\s*=\s*([^\s]+)::"StockLocation"/);
  if (!variantMatch || !locationMatch) {
    throw new Error(
      `[memory-store] $queryRaw StockLevel: faltan claves en ${sql}`,
    );
  }
  const variantId = variantMatch[1];
  const location = locationMatch[1];
  const level = store.stockLevels.find(
    (l) => l.variantId === variantId && l.location === location,
  );
  if (!level) return [];

  const guard = sql.match(/\bWHERE\s+([\s\S]*?)\s+RETURNING\b/i);
  if (guard) {
    const conditions = guard[1].split(/\bAND\b/i).map((c) => c.trim());
    for (const condition of conditions) {
      const nestedCompare = condition.match(
        /^\s*\(\s*"(\w+)"\s*-\s*"(\w+)"\s*\)\s*(>=|<=|>|<|=)\s*(\d+)/i,
      );
      if (nestedCompare) {
        const left = levelValue(level, nestedCompare[1]);
        const right = levelValue(level, nestedCompare[2]);
        if (!compareValues(left - right, nestedCompare[3], Number(nestedCompare[4]))) {
          return [];
        }
        continue;
      }
      const plainCompare = condition.match(
        /^\s*"(onHand|reserved)"\s*(>=|<=|>|<|=)\s*(\d+)\s*$/i,
      );
      if (plainCompare) {
        if (!compareValues(levelValue(level, plainCompare[1]), plainCompare[2], Number(plainCompare[3]))) {
          return [];
        }
      }
    }
  }

  const setClause = sql.match(/SET\s+([\s\S]*?)\s+WHERE/i);
  if (setClause) {
    for (const assignment of setClause[1].split(',')) {
      const increment = assignment.match(
        /^\s*"(\w+)"\s*=\s*"\1"\s*\+\s*(-?\d+)/i,
      );
      if (increment) {
        const field = increment[1];
        const amount = Number(increment[2]);
        if (field === 'onHand' || field === 'reserved') {
          level[field] = level[field] + amount;
        }
      }
    }
    level.updatedAt = now();
  }
  return [{ '?column?': 1 }];
}

function levelValue(level: StockLevelRow, field: string): number {
  if (field === 'onHand' || field === 'reserved') {
    return level[field];
  }
  return 0;
}

function compareValues(left: number, op: string, right: number): boolean {
  switch (op) {
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    default:
      return left === right;
  }
}

export function createMemoryClient(): StoreClient {
  const store = createSeedStore();

  const makeDelegate = (model: ModelName) => ({
    findMany: (args: Record<string, unknown>) =>
      Promise.resolve(findMany(model, store, args)),
    findUnique: (args: Record<string, unknown>) =>
      Promise.resolve(findOne(model, store, args)),
    findUniqueOrThrow: (args: Record<string, unknown>) => {
      const row = findOne(model, store, args);
      if (!row) throw new Error(`[memory-store] ${model} no encontrado`);
      return Promise.resolve(row);
    },
    findFirst: (args: Record<string, unknown>) => {
      const rows = findMany(model, store, args);
      return Promise.resolve(rows[0] ?? null);
    },
    create: (args: Record<string, unknown>) =>
      Promise.resolve(createRow(model, store, asRecord(args).data)),
    createMany: (args: Record<string, unknown>) => {
      const rows = asRecord(asRecord(args).data);
      const dataList = Array.isArray(rows) ? rows : [rows];
      for (const row of dataList) {
        createRow(model, store, row);
      }
      return Promise.resolve({ count: dataList.length });
    },
    update: (args: Record<string, unknown>) =>
      Promise.resolve(
        updateRow(model, store, asRecord(args).where, asRecord(args).data),
      ),
    upsert: (args: Record<string, unknown>) => {
      const where = asRecord(args).where;
      const existing = findOne(model, store, { where });
      return Promise.resolve(
        existing
          ? updateRow(model, store, where, asRecord(args).update)
          : createRow(model, store, asRecord(args).create),
      );
    },
    updateMany: (args: Record<string, unknown>) => {
      let count = 0;
      for (const row of rowsByModel(model, store)) {
        if (matchWhere(asRecord(args).where, row, store)) {
          updateRow(model, store, { id: row.id }, asRecord(args).data);
          count += 1;
        }
      }
      return Promise.resolve({ count });
    },
    count: (args: Record<string, unknown>) =>
      Promise.resolve(countRows(model, store, asRecord(args).where)),
    deleteMany: (args: Record<string, unknown>) =>
      Promise.resolve({ count: deleteRows(model, store, asRecord(args).where) }),
  });

  const client: StoreClient = {
    product: makeDelegate('product'),
    variant: makeDelegate('variant'),
    stockLevel: makeDelegate('stockLevel'),
    stockMovement: makeDelegate('stockMovement'),
    compatibility: makeDelegate('compatibility'),
    mediaAsset: makeDelegate('mediaAsset'),
    consoleModel: makeDelegate('consoleModel'),
    customer: makeDelegate('customer'),
    garageItem: makeDelegate('garageItem'),
    sale: makeDelegate('sale'),
    saleLine: makeDelegate('saleLine'),
    payment: makeDelegate('payment'),
    cart: makeDelegate('cart'),
    cartItem: makeDelegate('cartItem'),
    user: makeDelegate('user'),
    repairTicket: makeDelegate('repairTicket'),
    async $transaction<T>(
      fn: (tx: StoreClient) => Promise<T>,
    ): Promise<T> {
      const saved = snapshot(store);
      try {
        return await fn(client);
      } catch (error) {
        restore(store, saved);
        throw error;
      }
    },
    async $queryRaw<T = unknown>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T> {
      return applyQueryRaw(store, toSql(strings, values)) as T;
    },
    async $queryRawUnsafe<T = unknown>(
      query: string,
      ..._values: unknown[]
    ): Promise<T> {
      return applyQueryRaw(store, query) as T;
    },
    async $connect(): Promise<void> {},
    async $disconnect(): Promise<void> {},
  };
  return client;
}