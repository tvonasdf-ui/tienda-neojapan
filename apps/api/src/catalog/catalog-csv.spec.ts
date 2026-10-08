import { describe, expect, it } from 'vitest';
import { parseCatalogCsv } from './catalog-csv';

type Row = [
  slug: string,
  name: string,
  description: string,
  category: string,
  platform: string,
  status: string,
  sku: string,
  condition: string,
  price: string,
  cost: string,
  barcode: string,
  initialSTORE: string,
  initialWAREHOUSE: string,
  consoleModelId: string,
  compatibilityLevel: string,
  compatibilitySource: string,
  publicId: string,
];

const HEADER =
  'slug,name,description,category,platform,status,sku,condition,price,cost,barcode,initialSTORE,initialWAREHOUSE,consoleModelId,compatibilityLevel,compatibilitySource,publicId';

function csv(rows: Row[]): string {
  return [HEADER, ...rows.map((cells) => cells.join(','))].join('\n');
}

const CONSOLE_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('parseCatalogCsv', () => {
  it('parsea varias filas, agrupables por slug, con coerción de campos', () => {
    const { rows, errors } = parseCatalogCsv(
      csv([
        ['mario-kart-8', 'Mario Kart 8 Deluxe', '', 'Videojuego', 'Nintendo Switch', 'ACTIVE', 'MK8-A', 'A', '34990', '18990', '123456', '3', '7', '', '', '', 'neojapan/mk8'],
        ['mario-kart-8', 'Mario Kart 8 Deluxe', '', 'Videojuego', 'Nintendo Switch', '', 'MK8-B', 'B', '29990', '15000', '', '1', '0', '', '', '', ''],
        ['zelda-botw', 'The Legend of Zelda: BOTW', '', 'Videojuego', 'Nintendo Switch', 'DRAFT', 'ZELDA-C', 'C', '39990', '21000', '', '5', '2', '', '', '', ''],
      ]),
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      slug: 'mario-kart-8',
      name: 'Mario Kart 8 Deluxe',
      sku: 'MK8-A',
      condition: 'A',
      price: 34990,
      cost: 18990,
      barcode: '123456',
      initialSTORE: 3,
      initialWAREHOUSE: 7,
      status: 'ACTIVE',
    });
    expect(rows[0].media).toEqual({ publicId: 'neojapan/mk8' });
    expect(rows[1]).toMatchObject({ sku: 'MK8-B', initialSTORE: 1, initialWAREHOUSE: 0 });
    expect(rows[2]).toMatchObject({ sku: 'ZELDA-C', status: 'DRAFT' });
    expect(rows[2].media).toBeUndefined();
  });

  it('acepta descripción vacía y rellena compatibilidad cuando vienen todos los campos', () => {
    const { rows, errors } = parseCatalogCsv(
      csv([
        ['game-x', 'A Game', '', 'Consola', 'Sega Saturn', 'ACTIVE', 'GAME-A', 'B', '19990', '9000', '', '0', '2', CONSOLE_UUID, 'CONFIRMED', 'Fabricante', 'neojapan/game-x'],
      ]),
    );

    expect(errors).toEqual([]);
    expect(rows[0].description).toBeNull();
    expect(rows[0].compatibility).toEqual({
      consoleModelId: CONSOLE_UUID,
      level: 'CONFIRMED',
      source: 'Fabricante',
    });
  });

  it('marca error cuando faltan campos obligatorios', () => {
    const { rows, errors } = parseCatalogCsv(
      csv([
        ['mario-kart-8', '', '', 'Videojuego', 'Nintendo Switch', '', 'MK8-A', 'A', '34990', '18990', '', '', '', '', '', '', ''],
      ]),
    );

    expect(rows).toHaveLength(0);
    expect(errors[0].row).toBe(2);
    expect(errors[0].message).toContain('name');
  });

  it('marca error en precio inválido', () => {
    const { rows, errors } = parseCatalogCsv(
      csv([
        ['mario-kart-8', 'Mario Kart', '', 'Videojuego', 'Nintendo Switch', '', 'MK8-A', 'A', 'abc', '18990', '', '', '', '', '', '', ''],
      ]),
    );

    expect(rows).toHaveLength(0);
    expect(errors[0].message).toContain('price');
  });

  it('rechaza compatibilidad incompleta (consoleModelId sin level/source)', () => {
    const { rows, errors } = parseCatalogCsv(
      csv([
        ['mario-kart-8', 'Mario Kart', '', 'Videojuego', 'Nintendo Switch', '', 'MK8-A', 'A', '34990', '18990', '', '', '', CONSOLE_UUID, '', '', ''],
      ]),
    );

    expect(rows).toHaveLength(0);
    expect(errors[0].message).toContain(
      'consoleModelId requiere compatibilityLevel y compatibilitySource',
    );
  });

  it('acepta archivo solo con cabecera', () => {
    const { rows, errors } = parseCatalogCsv(HEADER);
    expect(rows).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('detecta CSV malformado', () => {
    const { errors } = parseCatalogCsv('a,b,c\n"unterminated');
    expect(errors.length).toBeGreaterThan(0);
  });
});