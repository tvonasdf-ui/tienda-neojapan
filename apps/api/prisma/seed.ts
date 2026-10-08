import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONSOLE_MODELS = [
  { platform: 'Nintendo Switch', name: 'Nintendo Switch', revision: 'HAC-001' },
  { platform: 'Nintendo Switch', name: 'Nintendo Switch OLED', revision: 'HEG-001' },
  { platform: 'Nintendo Switch', name: 'Nintendo Switch Lite', revision: 'HDH-001' },
  { platform: 'PlayStation', name: 'PlayStation 5', revision: 'CFI-1000' },
  { platform: 'PlayStation', name: 'PlayStation 5 Pro', revision: 'CFI-7000' },
  { platform: 'PlayStation', name: 'PlayStation 2', revision: 'SCPH-39001' },
  { platform: 'Nintendo', name: 'Super Nintendo', revision: 'SNS-001' },
  { platform: 'Nintendo', name: 'Game Boy Advance SP', revision: 'AGS-001' },
] as const;

async function seed(): Promise<void> {
  // Plataformas/consolas soportadas.
  for (const model of CONSOLE_MODELS) {
    await prisma.consoleModel.upsert({
      where: { platform_name: { platform: model.platform, name: model.name } },
      update: { revision: model.revision },
      create: model,
    });
  }

  const switchOled = await prisma.consoleModel.findUniqueOrThrow({
    where: { platform_name: { platform: 'Nintendo Switch', name: 'Nintendo Switch OLED' } },
  });
  const snes = await prisma.consoleModel.findUniqueOrThrow({
    where: { platform_name: { platform: 'Nintendo', name: 'Super Nintendo' } },
  });

  // Producto 1: repuesto, con compatibilidad garantizada y 3 grados.
  const joystick = await prisma.product.upsert({
    where: { slug: 'joystick-repuesto-switch-oled' },
    update: {},
    create: {
      slug: 'joystick-repuesto-switch-oled',
      name: 'Joystick de repuesto Switch OLED',
      description:
        'Repuesto para el joy-con del Switch OLED. Fotos propias de la unidad; revisado y probado antes de publicar.',
      category: 'Repuestos',
      platform: 'Nintendo Switch',
      status: 'ACTIVE',
      isFeatured: true,
    },
  });

  const joystickVariants = [
    { sku: 'SW-JOY-A1', condition: 'A' as const, price: 24990, cost: 12800 },
    { sku: 'SW-JOY-B1', condition: 'B' as const, price: 19990, cost: 9900 },
  ];

  for (const variant of joystickVariants) {
    await prisma.variant.upsert({
      where: { sku: variant.sku },
      update: { price: variant.price, cost: variant.cost },
      create: { productId: joystick.id, ...variant },
    });
  }

  const joyA1 = await prisma.variant.findUniqueOrThrow({ where: { sku: 'SW-JOY-A1' } });
  const joyB1 = await prisma.variant.findUniqueOrThrow({ where: { sku: 'SW-JOY-B1' } });

  await prisma.compatibility.upsert({
    where: {
      productId_consoleModelId: {
        productId: joystick.id,
        consoleModelId: switchOled.id,
      },
    },
    update: {},
    create: {
      productId: joystick.id,
      consoleModelId: switchOled.id,
      level: 'CONFIRMED',
      source: 'Confirmado con equipo propio',
    },
  });

  // Nivel de stock inicial una sola vez (idempotente por upsert).
  for (const variant of [joyA1, joyB1]) {
    await prisma.stockLevel.upsert({
      where: { variantId_location: { variantId: variant.id, location: 'STORE' } },
      update: {},
      create: { variantId: variant.id, location: 'STORE', onHand: 2 },
    });
  }

  await prisma.mediaAsset.upsert({
    where: { id: 'seed-swjoy-a1-photo' },
    update: {},
    create: {
      id: 'seed-swjoy-a1-photo',
      productId: joystick.id,
      publicId: 'products/sw_joy_repuesto_a1',
      alt: 'Joystick de repuesto Switch OLED (condición A)',
      isPrimary: true,
      sortOrder: 0,
      width: 1200,
      height: 1500, // 4:5 — plan §3.1
    },
  });

  // Producto 2: juego retro con compatibilidad por consola.
  const smw = await prisma.product.upsert({
    where: { slug: 'super-mario-world-snes' },
    update: {},
    create: {
      slug: 'super-mario-world-snes',
      name: 'Super Mario World (SNES)',
      description:
        'Clásico completo con caja y manual. Fotos propias de la unidad; funciona probado.',
      category: 'Juegos retro',
      platform: 'Super Nintendo',
      status: 'ACTIVE',
      isFeatured: false,
    },
  });

  await prisma.variant.upsert({
    where: { sku: 'SNES-SMW-B1' },
    update: { price: 28990, cost: 9500 },
    create: {
      productId: smw.id,
      sku: 'SNES-SMW-B1',
      condition: 'B',
      price: 28990,
      cost: 9500,
    },
  });

  await prisma.compatibility.upsert({
    where: {
      productId_consoleModelId: {
        productId: smw.id,
        consoleModelId: snes.id,
      },
    },
    update: {},
    create: {
      productId: smw.id,
      consoleModelId: snes.id,
      level: 'CONFIRMED',
      source: 'Compatibilidad nativa (cartucho NTSC)',
    },
  });

  console.log('Seed Neojapan listo.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());