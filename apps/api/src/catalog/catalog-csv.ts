import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import {
  CompatibilityLevel,
  Condition,
  ProductStatus,
  money,
  quantity,
  sku as skuSchema,
  slug as slugSchema,
} from '@neojapan/schemas';

/**
 * Columnas del CSV de catálogo (plan §4.5). Una fila = una variante; si el
 * `slug` se repite se acumulan variantes del MISMO producto. `publicId` y
 * `consoleModelId` (con su nivel/source) son opcionales en la primera fila.
 */
type CanonicalColumn =
  | 'slug'
  | 'name'
  | 'description'
  | 'category'
  | 'platform'
  | 'status'
  | 'sku'
  | 'condition'
  | 'price'
  | 'cost'
  | 'barcode'
  | 'initialSTORE'
  | 'initialWAREHOUSE'
  | 'consoleModelId'
  | 'compatibilityLevel'
  | 'compatibilitySource'
  | 'publicId';

const REQUIRED_CELLS: readonly CanonicalColumn[] = [
  'slug',
  'name',
  'category',
  'platform',
  'sku',
  'condition',
  'price',
  'cost',
];

const HEADER_ALIASES: Record<string, CanonicalColumn> = {
  slug: 'slug',
  name: 'name',
  description: 'description',
  category: 'category',
  platform: 'platform',
  status: 'status',
  sku: 'sku',
  condition: 'condition',
  price: 'price',
  cost: 'cost',
  barcode: 'barcode',
  initialstore: 'initialSTORE',
  initialwarehouse: 'initialWAREHOUSE',
  consolemodelid: 'consoleModelId',
  compatibilitylevel: 'compatibilityLevel',
  compatibilitysource: 'compatibilitySource',
  publicid: 'publicId',
};

export interface ParsedCsvRow {
  rowNumber: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  platform: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  sku: string;
  condition: 'NEW' | 'A' | 'B' | 'C';
  price: number;
  cost: number;
  barcode: string | null;
  initialSTORE: number;
  initialWAREHOUSE: number;
  compatibility?: { consoleModelId: string; level: 'CONFIRMED' | 'PARTIAL'; source: string };
  media?: { publicId: string };
}

export interface CsvRowError {
  row: number;
  message: string;
}

export interface CsvParseResult {
  rows: ParsedCsvRow[];
  errors: CsvRowError[];
}

const csvRowSchema = z
  .object({
    slug: slugSchema,
    name: z.string().trim().min(1).max(200),
    description: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    category: z.string().trim().min(1).max(80),
    platform: z.string().trim().min(1).max(80),
    status: ProductStatus.default('DRAFT'),
    sku: skuSchema,
    condition: Condition,
    price: money,
    cost: money,
    barcode: z
      .string()
      .trim()
      .max(64)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    initialSTORE: quantity.default(0),
    initialWAREHOUSE: quantity.default(0),
    consoleModelId: z.string().uuid().optional(),
    compatibilityLevel: CompatibilityLevel.optional(),
    compatibilitySource: z.string().trim().min(1).max(160).optional(),
    publicId: z.string().trim().max(300).optional(),
  })
  .superRefine((row, ctx) => {
    if (
      row.consoleModelId !== undefined &&
      (row.compatibilityLevel === undefined || row.compatibilitySource === undefined)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'consoleModelId requiere compatibilityLevel y compatibilitySource',
      });
    }
  });

export type CsvRowInput = z.input<typeof csvRowSchema>;

export function parseCatalogCsv(raw: string): CsvParseResult {
  const errors: CsvRowError[] = [];

  let records: Record<string, string>[] = [];
  try {
    records = parse(raw, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      columns: (header: string[]) => header.map((cell) => normalizeHeader(cell)),
    }) as Record<string, string>[];
  } catch {
    return {
      rows: [],
      errors: [{ row: 1, message: 'El archivo no es un CSV válido' }],
    };
  }

  const rows: ParsedCsvRow[] = [];
  records.forEach((record, index) => {
    const rowNumber = index + 2;

    const missing = REQUIRED_CELLS.filter((cell) => {
      const value = record[cell];
      return value === undefined || value.trim() === '';
    });
    if (missing.length > 0) {
      errors.push({
        row: rowNumber,
        message: `Faltan campos obligatorios: ${missing.join(', ')}`,
      });
      return;
    }

    const recordForSchema = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, value === '' ? undefined : value]),
    );

    const result = csvRowSchema.safeParse(recordForSchema);
    if (!result.success) {
      const flat = z.flattenError(result.error);
      const fieldDetails = Object.entries(flat.fieldErrors)
        .map(([field, messages]) =>
          messages && messages.length > 0 ? `${field}: ${messages.join('; ')}` : null,
        )
        .filter((entry): entry is string => entry !== null)
        .join(' | ');
      errors.push({
        row: rowNumber,
        message: fieldDetails || flat.formErrors[0] || 'Fila inválida',
      });
      return;
    }

    const parsed = result.data;
    rows.push({
      rowNumber,
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      platform: parsed.platform,
      status: parsed.status,
      sku: parsed.sku,
      condition: parsed.condition,
      price: parsed.price,
      cost: parsed.cost,
      barcode: parsed.barcode,
      initialSTORE: parsed.initialSTORE,
      initialWAREHOUSE: parsed.initialWAREHOUSE,
      ...(parsed.publicId ? { media: { publicId: parsed.publicId } } : {}),
      ...(parsed.consoleModelId
        ? {
            compatibility: {
              consoleModelId: parsed.consoleModelId,
              level: parsed.compatibilityLevel as 'CONFIRMED' | 'PARTIAL',
              source: parsed.compatibilitySource as string,
            },
          }
        : {}),
    });
  });

  return { rows, errors };
}

function normalizeHeader(cell: string): string {
  const key = cell.toLowerCase().replace(/[^a-z0-9]/g, '');
  return HEADER_ALIASES[key] ?? key;
}