import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { CreateProductInput } from './catalog-admin.dtos';
import { AdminCatalogService } from './catalog-admin.service';
import type { ParsedCsvRow } from './catalog-csv';

export interface CatalogImportError {
  row: number;
  slug: string;
  message: string;
}

export interface CatalogImportSummary {
  createdProducts: number;
  totalRows: number;
  errors: CatalogImportError[];
}

/**
 * Importación CSV del catálogo (plan §4.5): agrupa filas por `slug` (una fila
 * = una variante) y crea cada producto de forma ATÓMICA reutilizando el alta
 * de catálogo del panel. Los errores por producto se acumulan y no abortan el
 * resto del archivo.
 */
@Injectable()
export class CatalogImportService {
  constructor(
    @Inject(AdminCatalogService)
    private readonly adminCatalogService: AdminCatalogService,
  ) {}

  async importRows(rows: ParsedCsvRow[]): Promise<CatalogImportSummary> {
    const errors: CatalogImportError[] = [];
    const seenSkus = new Set<string>();

    const groups = new Map<
      string,
      { rowNumber: number; input: CreateProductInput }
    >();

    for (const row of rows) {
      if (seenSkus.has(row.sku)) {
        errors.push({
          row: row.rowNumber,
          slug: row.slug,
          message: `SKU duplicado en el archivo: ${row.sku}`,
        });
        continue;
      }
      seenSkus.add(row.sku);

      const existing = groups.get(row.slug);
      if (existing) {
        existing.input.variants.push({
          sku: row.sku,
          condition: row.condition,
          price: row.price,
          cost: row.cost,
          barcode: row.barcode ?? undefined,
          initialStock: { STORE: row.initialSTORE, WAREHOUSE: row.initialWAREHOUSE },
        });
        if (row.compatibility) {
          existing.input.compatibility.push(row.compatibility);
        }
        if (row.media) {
          existing.input.media.push({ ...row.media, isPrimary: false });
        }
        continue;
      }

      groups.set(row.slug, {
        rowNumber: row.rowNumber,
        input: {
          slug: row.slug,
          name: row.name,
          description: row.description ?? undefined,
          category: row.category,
          platform: row.platform,
          status: row.status,
          isFeatured: false,
          variants: [
            {
              sku: row.sku,
              condition: row.condition,
              price: row.price,
              cost: row.cost,
              barcode: row.barcode ?? undefined,
              initialStock: { STORE: row.initialSTORE, WAREHOUSE: row.initialWAREHOUSE },
            },
          ],
          compatibility: row.compatibility ? [row.compatibility] : [],
          media: row.media ? [{ ...row.media, isPrimary: false }] : [],
        },
      });
    }

    let createdProducts = 0;
    for (const group of groups.values()) {
      try {
        await this.adminCatalogService.create(group.input);
        createdProducts += 1;
      } catch (error) {
        errors.push({
          row: group.rowNumber,
          slug: group.input.slug,
          message: importErrorMessage(error),
        });
      }
    }

    return { createdProducts, totalRows: rows.length, errors };
  }
}

function importErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (
      response &&
      typeof response === 'object' &&
      'message' in response &&
      typeof (response as { message: unknown }).message === 'string'
    ) {
      return (response as { message: string }).message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error desconocido';
}

/** Guard para que el parser no acepte una fila sin variante (sólo CSV). */
export function ensureImportRows(rows: ParsedCsvRow[]): ParsedCsvRow[] {
  if (rows.length === 0) {
    throw new BadRequestException('El archivo no contiene filas de datos');
  }
  return rows;
}