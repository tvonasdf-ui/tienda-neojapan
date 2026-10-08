import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  TerminusModule,
} from '@nestjs/terminus';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    // Salida estándar de terminus: { status, details, error }.
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
    ]);
  }
}

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}