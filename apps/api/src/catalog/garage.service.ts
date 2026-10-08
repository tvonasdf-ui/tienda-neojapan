import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GarageSaveInput } from './garage.dtos';

@Injectable()
export class GarageService {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: GarageSaveInput) {
    const consoleModel = await this.prisma.consoleModel.findUnique({
      where: { id: input.consoleModelId },
      select: { id: true },
    });
    if (!consoleModel) {
      throw new NotFoundException('Modelo de consola no encontrado');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { phone: input.customerPhone },
    });
    const resolvedCustomer = customer
      ? customer
      : await this.prisma.customer.create({
          data: { name: input.customerName, phone: input.customerPhone },
          select: { id: true, name: true, phone: true },
        });

    const existing = await this.prisma.garageItem.findFirst({
      where: {
        customerId: resolvedCustomer.id,
        consoleModelId: input.consoleModelId,
      },
    });
    if (existing) return existing;

    return this.prisma.garageItem.create({
      data: {
        customerId: resolvedCustomer.id,
        consoleModelId: input.consoleModelId,
        notes: input.notes,
      },
    });
  }

  async list(phone: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (!customer) return [];

    return this.prisma.garageItem.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        consoleModel: {
          select: {
            id: true,
            platform: true,
            name: true,
            revision: true,
            identificationNotes: true,
          },
        },
      },
    });
  }
}
