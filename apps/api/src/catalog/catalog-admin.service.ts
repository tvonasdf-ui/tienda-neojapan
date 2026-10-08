import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CompatibilityLevel, Condition, ProductStatus, StockLocation } from '@neojapan/schemas';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogCacheInvalidationService } from './catalog-cache-invalidation.service';
import type {
  AdminProductListQuery,
  CreateProductInput,
  UpdateProductInput,
} from './catalog-admin.dtos';

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

export interface AdminCompatibilityView {
  consoleModelId: string;
  level: CompatibilityLevel;
  source: string;
  notes: string | null;
}

export interface AdminMediaView {
  publicId: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface AdminProductView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  platform: string;
  status: ProductStatus;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants: AdminVariantView[];
  compatibility: AdminCompatibilityView[];
  media: AdminMediaView[];
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
  primaryMedia: AdminMediaView | null;
}

interface StockLevelRow {
  variantId: string;
  location: StockLocation;
  onHand: number;
  reserved: number;
}

function toStockView(
  stockLevels: StockLevelRow[],
  variantId: string,
): Partial<Record<StockLocation, AdminStockSummary>> {
  return stockLevels
    .filter((level) => level.variantId === variantId)
    .reduce<Partial<Record<StockLocation, AdminStockSummary>>>((acc, level) => {
      acc[level.location] = { onHand: level.onHand, reserved: level.reserved };
      return acc;
    }, {});
}

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    @Optional() private readonly cacheInvalidation?: CatalogCacheInvalidationService,
  ) {}

  /** Catálogo completo (incluye DRAFT/ARCHIVED) para el panel. */
  async list(
    query: AdminProductListQuery,
  ): Promise<{ items: AdminProductListItem[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: query.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          platform: true,
          status: true,
          isFeatured: true,
          variants: {
            orderBy: { sku: 'asc' },
            select: {
              id: true,
              sku: true,
              condition: true,
              price: true,
              cost: true,
              barcode: true,
              stockLevels: {
                select: { variantId: true, location: true, onHand: true, reserved: true },
              },
            },
          },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { publicId: true, alt: true, isPrimary: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        platform: product.platform,
        status: product.status,
        isFeatured: product.isFeatured,
        primaryMedia: product.media[0] ?? null,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          condition: variant.condition,
          price: variant.price,
          cost: variant.cost,
          barcode: variant.barcode,
          stock: toStockView(variant.stockLevels, variant.id),
        })),
      })),
      total,
    };
  }

  async detail(productId: string): Promise<AdminProductView> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        platform: true,
        status: true,
        isFeatured: true,
        createdAt: true,
        updatedAt: true,
        variants: {
          orderBy: { sku: 'asc' },
          select: {
            id: true,
            sku: true,
            condition: true,
            price: true,
            cost: true,
            barcode: true,
            stockLevels: {
              select: { variantId: true, location: true, onHand: true, reserved: true },
            },
          },
        },
        compatibilities: {
          orderBy: { createdAt: 'asc' },
          select: {
            consoleModelId: true,
            level: true,
            source: true,
            notes: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
          select: { publicId: true, alt: true, isPrimary: true },
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
      category: product.category,
      platform: product.platform,
      status: product.status,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        condition: variant.condition,
        price: variant.price,
        cost: variant.cost,
        barcode: variant.barcode,
        stock: toStockView(variant.stockLevels, variant.id),
      })),
      compatibility: product.compatibilities,
      media: product.media,
    };
  }

  /**
   * Alta de producto: crea producto + variantes + compatibilidad + media y,
   * en la MISMA transacción, registra el stock inicial por variante como
   * movimientos del libro (plan §4.5: alta con stock vía el módulo de inventario).
   */
  async create(input: CreateProductInput): Promise<AdminProductView> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            slug: input.slug,
            name: input.name,
            description: input.description ?? null,
            category: input.category,
            platform: input.platform,
            status: input.status,
            isFeatured: input.isFeatured,
          },
        });

        const variantIds: string[] = [];
        for (const variantInput of input.variants) {
          const variant = await tx.variant.create({
            data: {
              productId: product.id,
              sku: variantInput.sku,
              condition: variantInput.condition,
              price: variantInput.price,
              cost: variantInput.cost,
              barcode: variantInput.barcode ?? null,
            },
          });
          variantIds.push(variant.id);

          const stock = variantInput.initialStock ?? { STORE: 0, WAREHOUSE: 0 };
          for (const [location, quantity] of Object.entries(stock) as [
            StockLocation,
            number,
          ][]) {
            if (quantity > 0) {
              await this.inventory.receiptIn(
                tx,
                variant.id,
                location,
                quantity,
                'Stock inicial de alta de catálogo',
              );
            }
          }
        }

        const variantRows = await tx.variant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            condition: true,
            price: true,
            cost: true,
            barcode: true,
          },
        });
        const stockRows = await tx.stockLevel.findMany({
          where: { variantId: { in: variantIds } },
          select: { variantId: true, location: true, onHand: true, reserved: true },
        });

        const mediaRows = input.media ?? [];
        const fallbackPrimary = mediaRows.length > 0 ? mediaRows[0].publicId : null;
        const compatRows = input.compatibility ?? [];

        if (compatRows.length > 0) {
          await tx.compatibility.createMany({
            data: compatRows.map((entry) => ({
              productId: product.id,
              consoleModelId: entry.consoleModelId,
              level: entry.level,
              source: entry.source,
              notes: entry.notes ?? null,
            })),
          });
        }
        if (mediaRows.length > 0) {
          await tx.mediaAsset.createMany({
            data: mediaRows.map((entry, index) => ({
              productId: product.id,
              publicId: entry.publicId,
              alt: entry.alt ?? null,
              isPrimary: entry.isPrimary || entry.publicId === fallbackPrimary,
              sortOrder: index,
            })),
          });
        }

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          category: product.category,
          platform: product.platform,
          status: product.status,
          isFeatured: product.isFeatured,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          variants: variantRows.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            condition: variant.condition,
            price: variant.price,
            cost: variant.cost,
            barcode: variant.barcode,
            stock: toStockView(stockRows, variant.id),
          })),
          compatibility: compatRows.map((entry) => ({
            consoleModelId: entry.consoleModelId,
            level: entry.level,
            source: entry.source,
            notes: entry.notes ?? null,
          })),
          media: mediaRows.map((entry) => ({
            publicId: entry.publicId,
            alt: entry.alt ?? null,
            isPrimary: entry.isPrimary || entry.publicId === fallbackPrimary,
          })),
        };
      });
      await this.cacheInvalidation?.invalidateProduct(created.id, created.slug);
      return created;
    } catch (error) {
      this.assertUniqueOrRethrow(error);
    }
  }

  /**
   * Edición del producto. La actualización de variantes es upsert por id:
   * con `id` actualiza la variante existente del producto; sin `id` crea una
   * nueva. Las bajas de variante/stock se hacen por movimientos (plan §4.3).
   */
  async update(
    productId: string,
    input: UpdateProductInput,
  ): Promise<AdminProductView> {
    const existing = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const patch: Prisma.ProductUpdateInput = {};
        if (input.name !== undefined) patch.name = input.name;
        if (input.description !== undefined) patch.description = input.description;
        if (input.category !== undefined) patch.category = input.category;
        if (input.platform !== undefined) patch.platform = input.platform;
        if (input.status !== undefined) patch.status = input.status;
        if (input.isFeatured !== undefined) patch.isFeatured = input.isFeatured;

        if (Object.keys(patch).length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: patch,
          });
        }

        for (const variant of input.variants ?? []) {
          if (variant.id === undefined) {
            await tx.variant.create({
              data: {
                productId,
                sku: variant.sku,
                condition: variant.condition,
                price: variant.price,
                cost: variant.cost,
                barcode: variant.barcode ?? null,
              },
            });
          } else {
            const owned = await tx.variant.findFirst({
              where: { id: variant.id, productId },
              select: { id: true },
            });
            if (!owned) {
              throw new BadRequestException(
                `La variante ${variant.id} no pertenece al producto`,
              );
            }
            await tx.variant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku,
                condition: variant.condition,
                price: variant.price,
                cost: variant.cost,
                barcode: variant.barcode ?? null,
              },
            });
          }
        }
      });
    } catch (error) {
      this.assertUniqueOrRethrow(error);
    }

    const updated = await this.detail(productId);
    await this.cacheInvalidation?.invalidateProduct(updated.id, updated.slug);
    return updated;
  }

  /** Falla con 409 si es una colisión de unicidad; si no, re-lanza. */
  private assertUniqueOrRethrow(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('El slug o SKU ya existe');
    }
    throw error;
  }
}