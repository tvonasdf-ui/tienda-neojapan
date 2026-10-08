import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { AdminSalesController } from './admin-sales.controller';
import { AdminSalesService } from './admin-sales.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController, AdminSalesController],
  providers: [OrdersService, AdminSalesService],
})
export class SalesModule {}
