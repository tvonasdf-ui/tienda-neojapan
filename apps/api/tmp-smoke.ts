import { createMemoryClient } from './src/prisma/memory/memory-db';

async function main(): Promise<void> {
  const client = createMemoryClient();
  const row = (await client.variant.findUnique({
    where: { sku: 'SW-JOY-A1' },
    select: { id: true },
  })) as unknown as { id: string };
  const vid = row.id;

  const before0 = (await client.stockLevel.findUnique({
    where: { variantId_location: { variantId: vid, location: 'STORE' } },
  })) as unknown as { onHand: number; reserved: number };
  console.log('nivel STORE inicial:', JSON.stringify(before0));

  const result1 = (await client.$queryRaw<unknown[]>`UPDATE "StockLevel"
            SET "reserved" = "reserved" + 1, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "variantId" = ${vid}
              AND "location" = ${'STORE'}::"StockLocation"
              AND ("onHand" - "reserved") >= 1
            RETURNING 1`) as unknown[];
  const after1 = (await client.stockLevel.findUnique({
    where: { variantId_location: { variantId: vid, location: 'STORE' } },
  })) as unknown as { onHand: number; reserved: number };
  console.log('reserva 1 (avail 1): rows =', result1.length, '-> reserved', after1.reserved);

  const result2 = (await client.$queryRaw<unknown[]>`UPDATE "StockLevel"
            SET "reserved" = "reserved" + 1, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "variantId" = ${vid}
              AND "location" = ${'STORE'}::"StockLocation"
              AND ("onHand" - "reserved") >= 1
            RETURNING 1`) as unknown[];
  console.log('reserva 1 más (avail 0): rows =', result2.length, '(esperado 0 -> 409)');
}

void main();