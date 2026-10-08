import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Condition } from '@neojapan/schemas';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductListQuery } from './catalog.dtos';

export interface CatalogVariantSummary {
  id: string;
  sku: string;
  condition: Condition;
  price: number;
  barcode: string | null;
  available: number;
}

export interface CatalogMediaSummary {
  publicId: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface CatalogMediaDetail extends CatalogMediaSummary {
  isPrimary: boolean;
}

export interface CatalogCompatibility {
  consoleModel: { name: string; platform: string };
  level: string;
  source: string;
  notes: string | null;
}

export interface CatalogListItem {
  id: string;
  slug: string;
  name: string;
  platform: string;
  category: string;
  compatibleConsoleIds: string[];
  compatibilities: Array<{ consoleModelId: string; level: string }>;
  media: CatalogMediaSummary | null;
  variants: CatalogVariantSummary[];
}

export interface CatalogDetail extends Omit<CatalogListItem, 'media' | 'compatibleConsoleIds' | 'compatibilities'> {
  description: string | null;
  isFeatured: boolean;
  media: CatalogMediaDetail[];
  compatibility: CatalogCompatibility[];
}

function toPublicVariant(variant: {
  id: string;
  sku: string;
  condition: Condition;
  price: number;
  barcode: string | null;
  stockLevels?: Array<{ onHand: number; reserved: number }>;
}): CatalogVariantSummary {
  // Nunca exponer `cost` ni `costReal` a clientes (margen es interno).
  return {
    id: variant.id,
    sku: variant.sku,
    condition: variant.condition,
    price: variant.price,
    barcode: variant.barcode,
    available: (variant.stockLevels ?? []).reduce(
      (total, level) => total + level.onHand - level.reserved,
      0,
    ),
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de productos activos con variante pública y foto principal. */
  async list(query: ProductListQuery): Promise<CatalogListItem[]> {
    const { condition, minPrice, maxPrice, limit, offset } = query;
    const where = await this.productWhere(query);
    if (!where) return [];
    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        platform: true,
        category: true,
        variants: {
          orderBy: { sku: 'asc' },
          select: {
            id: true,
            sku: true,
            condition: true,
            price: true,
            barcode: true,
            stockLevels: { select: { onHand: true, reserved: true } },
          },
        },
        media: {
          where: { isPrimary: true },
          take: 1,
          select: { publicId: true, alt: true, width: true, height: true },
        },
        compatibilities: { select: { consoleModelId: true, level: true } },
        _count: { select: { variants: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      platform: product.platform,
      category: product.category,
      compatibleConsoleIds: product.compatibilities.map((entry) => entry.consoleModelId),
      compatibilities: product.compatibilities.map((entry) => ({
        consoleModelId: entry.consoleModelId,
        level: entry.level,
      })),
      media: product.media[0] ?? null,
      variants: product.variants
        .map(toPublicVariant)
        .filter((variant) => !condition || variant.condition === condition)
        .filter((variant) => minPrice === undefined || variant.price >= minPrice)
        .filter((variant) => maxPrice === undefined || variant.price <= maxPrice),
    }));
  }

  async count(query: ProductListQuery): Promise<{ total: number }> {
    const where = await this.productWhere(query);
    return { total: where ? await this.prisma.product.count({ where }) : 0 };
  }

  private async productWhere(query: ProductListQuery): Promise<Prisma.ProductWhereInput | null> {
    const { platform, category, condition, minPrice, maxPrice, compatibleConsoleId, q } = query;
    const searchTerm = normalizeSearch(q);
    let matchedIds: string[] | undefined;
    if (searchTerm && !this.prisma.memoryClient) {
      const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Product"
        WHERE "status" = 'ACTIVE'
          AND (
            "name" % ${searchTerm}
            OR "slug" % ${searchTerm}
            OR "platform" % ${searchTerm}
            OR "category" % ${searchTerm}
          )
        ORDER BY GREATEST(
          similarity("name", ${searchTerm}),
          similarity("slug", ${searchTerm}),
          similarity("platform", ${searchTerm})
        ) DESC
      `;
      matchedIds = matches.map(({ id }) => id);
      if (matchedIds.length === 0) return null;
    }
    const variantFilters = {
      ...(condition ? { condition } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
        : {}),
    };
    return {
      status: 'ACTIVE',
      ...(platform ? { platform } : {}),
      ...(category ? { category } : {}),
      ...(matchedIds ? { id: { in: matchedIds } } : {}),
      ...(Object.keys(variantFilters).length ? { variants: { some: variantFilters } } : {}),
      ...(compatibleConsoleId ? { compatibilities: { some: { consoleModelId: compatibleConsoleId } } } : {}),
      ...(searchTerm && !matchedIds
        ? { OR: ['name', 'slug', 'platform', 'category'].map((field) => ({ [field]: { contains: searchTerm, mode: 'insensitive' } })) }
        : {}),
    };
  }

  async consoles() {
    return this.prisma.consoleModel.findMany({
      select: { id: true, platform: true, name: true, revision: true, identificationNotes: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Ficha de producto con compatibilidad por consola (garage). */
  async detail(slug: string): Promise<CatalogDetail> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        platform: true,
        category: true,
        isFeatured: true,
        variants: {
          orderBy: { sku: 'asc' },
          select: {
            id: true,
            sku: true,
            condition: true,
            price: true,
            barcode: true,
            stockLevels: { select: { onHand: true, reserved: true } },
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
          select: {
            publicId: true,
            alt: true,
            isPrimary: true,
            width: true,
            height: true,
          },
        },
        compatibilities: {
          include: {
            consoleModel: {
              select: { name: true, platform: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      platform: product.platform,
      category: product.category,
      isFeatured: product.isFeatured,
      media: product.media,
      variants: product.variants.map(toPublicVariant),
      compatibility: product.compatibilities.map((entry) => ({
        consoleModel: entry.consoleModel,
        level: entry.level,
        source: entry.source,
        notes: entry.notes,
      })),
    };
  }
}

function normalizeSearch(value?: string): string {
  if (!value) return '';
  const normalized = value.trim().toLocaleLowerCase('es-CL');
  const aliases: Record<string, string> = {
    'ps2 slim': 'PlayStation 2',
    'ps2': 'PlayStation 2',
    'switch oled': 'Nintendo Switch OLED',
    'switch lite': 'Nintendo Switch Lite',
    'gba sp': 'Game Boy Advance SP',
    'snes': 'Super Nintendo',
  };
  return aliases[normalized] ?? value.trim();
}