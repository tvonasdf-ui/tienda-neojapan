import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogCacheInvalidationService } from '../catalog/catalog-cache-invalidation.service';
import type { ConfirmUploadInput } from './media.dtos';
import { CloudinaryImageStorage } from './cloudinary-image-storage';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp']);

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CloudinaryImageStorage,
    private readonly cacheInvalidation: CatalogCacheInvalidationService,
  ) {}

  async signProductUpload(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const publicId = `neojapan/products/${productId}/${randomUUID()}`;
    return this.storage.createUploadSignature(publicId);
  }

  async confirmProductUpload(input: ConfirmUploadInput) {
    const publicIdPattern = new RegExp(
      `^neojapan/products/${input.productId}/[0-9a-f-]{36}$`,
    );
    if (!publicIdPattern.test(input.publicId)) {
      throw new BadRequestException('La imagen no pertenece a la carpeta del producto');
    }

    const [product, resource] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: input.productId },
        select: { id: true, slug: true },
      }),
      this.storage.getImageResource(input.publicId),
    ]);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (resource.publicId !== input.publicId || resource.resourceType !== 'image') {
      throw new BadRequestException('El recurso de Cloudinary no es una imagen válida');
    }
    if (!ALLOWED_IMAGE_FORMATS.has(resource.format.toLowerCase())) {
      throw new BadRequestException('Formato no permitido; usa JPG, PNG o WebP');
    }
    if (resource.bytes > MAX_IMAGE_BYTES) {
      throw new BadRequestException('La imagen no puede superar 10 MB');
    }

    const existing = await this.prisma.mediaAsset.findFirst({
      where: { publicId: input.publicId },
    });
    if (existing) {
      if (existing.productId !== input.productId) {
        throw new ConflictException('La imagen ya está asociada a otro producto');
      }
      return existing;
    }

    let media: Awaited<ReturnType<typeof this.prisma.mediaAsset.create>>;
    try {
      media = await this.prisma.$transaction(async (tx) => {
        if (input.isPrimary) {
          await tx.mediaAsset.updateMany({
            where: { productId: input.productId, isPrimary: true },
            data: { isPrimary: false },
          });
        }
        const sortOrder = await tx.mediaAsset.count({
          where: { productId: input.productId },
        });
        return tx.mediaAsset.create({
          data: {
            productId: input.productId,
            publicId: input.publicId,
            alt: input.alt,
            isPrimary: input.isPrimary,
            sortOrder,
            width: resource.width,
            height: resource.height,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.mediaAsset.findUnique({
          where: { publicId: input.publicId },
        });
        if (duplicate?.productId === input.productId) {
          return duplicate;
        }
        if (duplicate) {
          throw new ConflictException('La imagen ya está asociada a otro producto');
        }
      }
      throw error;
    }

    await this.cacheInvalidation.invalidateProduct(product.id, product.slug);
    return media;
  }
}
