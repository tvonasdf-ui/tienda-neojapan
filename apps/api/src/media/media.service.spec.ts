import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogCacheInvalidationService } from '../catalog/catalog-cache-invalidation.service';
import { CloudinaryImageStorage } from './cloudinary-image-storage';
import { MediaService } from './media.service';

const product = {
  id: 'e8f7aaf3-ec08-4e70-a5a4-99bfbd407889',
  slug: 'switch-joystick',
};
const publicId = `neojapan/products/${product.id}/d9a2bc1f-7c03-49f6-a56a-73d97a3cce31`;

interface FakePrisma {
  product: { findUnique: Mock };
  mediaAsset: { findFirst: Mock; findUnique: Mock };
  $transaction: Mock;
}

const tx = {
  mediaAsset: {
    updateMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
};
const prisma: FakePrisma = {
  product: { findUnique: vi.fn() },
  mediaAsset: { findFirst: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn((operation) => operation(tx)),
};
const storage = {
  createUploadSignature: vi.fn(),
  getImageResource: vi.fn(),
};
const cacheInvalidation = { invalidateProduct: vi.fn() };

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryImageStorage, useValue: storage },
        { provide: CatalogCacheInvalidationService, useValue: cacheInvalidation },
      ],
    }).compile();
    service = moduleRef.get(MediaService);
  });

  it('rejects signing uploads for products that do not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.signProductUpload(product.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.createUploadSignature).not.toHaveBeenCalled();
  });

  it('creates a product-scoped upload signature', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: product.id });
    storage.createUploadSignature.mockImplementation((id: string) => ({ publicId: id }));

    const result = await service.signProductUpload(product.id);

    expect(result.publicId).toMatch(new RegExp(`^neojapan/products/${product.id}/`));
  });

  it('rejects assets outside the signed product folder before calling Cloudinary', async () => {
    await expect(
      service.confirmProductUpload({
        productId: product.id,
        publicId: 'neojapan/products/another-product/other-id',
        isPrimary: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.getImageResource).not.toHaveBeenCalled();
  });

  it('persists only verified image resources and marks the selected primary atomically', async () => {
    const resource = {
      publicId,
      resourceType: 'image',
      format: 'webp',
      bytes: 1024,
      width: 1200,
      height: 1500,
    };
    const media = { id: 'asset-1', productId: product.id, publicId, isPrimary: true };
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.mediaAsset.findFirst.mockResolvedValue(null);
    storage.getImageResource.mockResolvedValue(resource);
    tx.mediaAsset.count.mockResolvedValue(0);
    tx.mediaAsset.create.mockResolvedValue(media);

    const result = await service.confirmProductUpload({
      productId: product.id,
      publicId,
      alt: 'Joystick Switch',
      isPrimary: true,
    });

    expect(tx.mediaAsset.updateMany).toHaveBeenCalledWith({
      where: { productId: product.id, isPrimary: true },
      data: { isPrimary: false },
    });
    expect(tx.mediaAsset.create).toHaveBeenCalledWith({
      data: {
        productId: product.id,
        publicId,
        alt: 'Joystick Switch',
        isPrimary: true,
        sortOrder: 0,
        width: 1200,
        height: 1500,
      },
    });
    expect(cacheInvalidation.invalidateProduct).toHaveBeenCalledWith(
      product.id,
      product.slug,
    );
    expect(result).toEqual(media);
  });

  it('rejects unsupported formats before persisting an asset', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    storage.getImageResource.mockResolvedValue({
      publicId,
      resourceType: 'image',
      format: 'svg',
      bytes: 1024,
      width: 1200,
      height: 1500,
    });

    await expect(
      service.confirmProductUpload({ productId: product.id, publicId, isPrimary: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mediaAsset.findFirst).not.toHaveBeenCalled();
  });
});
