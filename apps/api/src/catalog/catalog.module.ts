import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { AdminCatalogService } from './catalog-admin.service';
import { AdminCatalogController } from './catalog-admin.controller';
import { CatalogImportService } from './catalog-import.service';
import { CatalogImportController } from './catalog-import.controller';
import { ConsoleController } from './console.controller';
import { GarageController } from './garage.controller';
import { GarageService } from './garage.service';
import { CatalogCacheInvalidationService } from './catalog-cache-invalidation.service';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [InventoryModule, AuthModule],
  controllers: [
    CatalogController,
    ConsoleController,
    GarageController,
    AdminCatalogController,
    CatalogImportController,
  ],
  providers: [CatalogService, GarageService, AdminCatalogService, CatalogImportService, CatalogCacheInvalidationService],
  exports: [CatalogCacheInvalidationService],
})
export class CatalogModule {}