import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCatalogService } from './catalog-admin.service';
import type { CreateProductInput } from './catalog-admin.dtos';
import { CatalogImportService } from './catalog-import.service';
import type { ParsedCsvRow } from './catalog-csv';

const admin = { create: vi.fn() };

function row(overrides: Partial<ParsedCsvRow> & { slug: string; sku: string }): ParsedCsvRow {
  return {
    rowNumber: 2,
    name: 'Mario Kart 8 Deluxe',
    description: null,
    category: 'Videojuego',
    platform: 'Nintendo Switch',
    status: 'DRAFT',
    condition: 'A',
    price: 34990,
    cost: 18990,
    barcode: null,
    initialSTORE: 0,
    initialWAREHOUSE: 0,
    ...overrides,
  };
}

describe('CatalogImportService', () => {
  let service: CatalogImportService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogImportService,
        { provide: AdminCatalogService, useValue: admin },
      ],
    }).compile();

    service = moduleRef.get(CatalogImportService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('agrupa filas por slug en un solo alta con varias variantes', async () => {
    const rows = [
      row({ slug: 'mario-kart-8', sku: 'MK8-A', rowNumber: 2 }),
      row({ slug: 'mario-kart-8', sku: 'MK8-B', condition: 'B', rowNumber: 3, initialSTORE: 2 }),
      row({ slug: 'zelda', sku: 'ZELDA-C', condition: 'C', rowNumber: 4 }),
    ];
    admin.create.mockResolvedValue({});

    const summary = await service.importRows(rows);

    expect(admin.create).toHaveBeenCalledTimes(2);
    const marioCall = admin.create.mock.calls[0][0] as CreateProductInput;
    const zeldaCall = admin.create.mock.calls[1][0] as CreateProductInput;
    expect(marioCall.slug).toBe('mario-kart-8');
    expect(marioCall.variants).toHaveLength(2);
    expect(marioCall.variants[1]).toMatchObject({
      sku: 'MK8-B',
      condition: 'B',
      initialStock: { STORE: 2, WAREHOUSE: 0 },
    });
    expect(zeldaCall.variants).toHaveLength(1);
    expect(summary).toEqual({ createdProducts: 2, totalRows: 3, errors: [] });
  });

  it('acumula errores por producto sin abortar el resto', async () => {
    const rows = [
      row({ slug: 'mario-kart-8', sku: 'MK8-A', rowNumber: 2 }),
      row({ slug: 'zelda', sku: 'ZELDA-C', condition: 'C', rowNumber: 3 }),
    ];
    admin.create
      .mockRejectedValueOnce(new ConflictException('El slug o SKU ya existe'))
      .mockResolvedValueOnce({});

    const summary = await service.importRows(rows);

    expect(summary.createdProducts).toBe(1);
    expect(summary.totalRows).toBe(2);
    expect(summary.errors).toEqual([
      {
        row: 2,
        slug: 'mario-kart-8',
        message: 'El slug o SKU ya existe',
      },
    ]);
  });

  it('rechaza SKU duplicado dentro del archivo sin llamar al alta', async () => {
    const rows = [
      row({ slug: 'mario-kart-8', sku: 'MK8-A', rowNumber: 2 }),
      row({ slug: 'zelda', sku: 'MK8-A', condition: 'C', rowNumber: 3 }),
    ];

    const summary = await service.importRows(rows);

    expect(admin.create).toHaveBeenCalledTimes(1);
    expect(summary.createdProducts).toBe(1);
    expect(summary.errors).toEqual([
      { row: 3, slug: 'zelda', message: 'SKU duplicado en el archivo: MK8-A' },
    ]);
  });
});