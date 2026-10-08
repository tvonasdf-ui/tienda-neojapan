import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { RepairStatus, RepairTicket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdvanceRepairTicketBody,
  CreateRepairTicketBody,
  RepairTicketListQuery,
} from './repairs.dtos';
import { repairAdvanceError } from './repairs-rules';

export interface RepairTicketView {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  deviceModel: string | null;
  deviceSerialNumber: string | null;
  faultDescription: string;
  status: RepairStatus;
  diagnosis: string | null;
  quoteAmount: number | null;
  repairNotes: string | null;
  cancellationReason: string | null;
  createdByUserId: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairTicketPage {
  items: RepairTicketView[];
  total: number;
  limit: number;
  offset: number;
}

function toRepairTicketView(ticket: RepairTicket): RepairTicketView {
  return {
    id: ticket.id,
    code: ticket.code,
    customerName: ticket.customerName,
    customerPhone: ticket.customerPhone,
    deviceName: ticket.deviceName,
    deviceModel: ticket.deviceModel,
    deviceSerialNumber: ticket.deviceSerialNumber,
    faultDescription: ticket.faultDescription,
    status: ticket.status,
    diagnosis: ticket.diagnosis,
    quoteAmount: ticket.quoteAmount,
    repairNotes: ticket.repairNotes,
    cancellationReason: ticket.cancellationReason,
    createdByUserId: ticket.createdByUserId,
    deliveredAt: ticket.deliveredAt ? ticket.deliveredAt.toISOString() : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

@Injectable()
export class RepairsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    body: CreateRepairTicketBody,
    staffUserId: string,
  ): Promise<RepairTicketView> {
    const code = await this.generateCode();
    const ticket = await this.prisma.repairTicket.create({
      data: {
        ...body,
        code,
        status: 'RECEIVED',
        createdByUserId: staffUserId,
      },
    });
    return toRepairTicketView(ticket);
  }

  async list(query: RepairTicketListQuery): Promise<RepairTicketPage> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.repairTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.repairTicket.count({ where }),
    ]);
    return {
      items: items.map(toRepairTicketView),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async detail(repairId: string): Promise<RepairTicketView> {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: repairId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket de reparación no encontrado');
    }
    return toRepairTicketView(ticket);
  }

  async advance(
    repairId: string,
    body: AdvanceRepairTicketBody,
  ): Promise<RepairTicketView> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.repairTicket.findUnique({
        where: { id: repairId },
      });
      if (!current) {
        throw new NotFoundException('Ticket de reparación no encontrado');
      }
      const error = repairAdvanceError(current.status, body.status, body);
      if (error) {
        throw new ConflictException(error);
      }
      const updated = await tx.repairTicket.update({
        where: { id: repairId },
        data: {
          status: body.status,
          ...(body.status === 'DIAGNOSED'
            ? { diagnosis: body.diagnosis }
            : {}),
          ...(body.status === 'QUOTED'
            ? { quoteAmount: body.quoteAmount }
            : {}),
          ...(body.repairNotes ? { repairNotes: body.repairNotes } : {}),
          ...(body.status === 'CANCELLED' || body.status === 'UNCLAIMED'
            ? { cancellationReason: body.cancellationReason }
            : {}),
          ...(body.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });
      return toRepairTicketView(updated);
    });
  }

  private async generateCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `SR-${randomInt(1000, 1_000_000)}`;
      const existing = await this.prisma.repairTicket.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new ConflictException(
      'No se pudo generar un código único para el ticket',
    );
  }
}