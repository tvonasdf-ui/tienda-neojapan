import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errors, createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeSupabaseUrl } from './supabase-url';
import { staffIdentityFromClaims, type StaffIdentity } from './staff-identity';

interface AuthenticatedRequest extends Request {
  staff: StaffIdentity;
}

@Injectable()
export class SupabaseStaffGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
  private issuer: string | undefined;
  private readonly logger = new Logger(SupabaseStaffGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (this.demoEnabled()) {
      request.staff = {
        id: this.config.get<string>('DEMO_STAFF_ID') ?? '10000000-0000-4000-8000-000000000001',
        email: this.config.get<string>('DEMO_STAFF_EMAIL') ?? 'demo@neojapan.cl',
        role: (this.config.get<string>('DEMO_STAFF_ROLE') as StaffIdentity['role']) ?? 'ADMIN',
      };
      await this.ensureStaffUser(request.staff);
      return true;
    }

    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    if (!token) {
      throw new UnauthorizedException('Se requiere un token Bearer de Supabase');
    }

    const configuredUrl = this.config.get<string>('SUPABASE_URL');
    const supabaseUrl = configuredUrl ? normalizeSupabaseUrl(configuredUrl) : '';
    if (!supabaseUrl) {
      throw new ServiceUnavailableException('SUPABASE_URL no está configurada en la API');
    }

    const issuer = `${supabaseUrl}/auth/v1`;
    const jwks = this.getJwks(supabaseUrl, issuer);
    let claims;
    try {
      ({ payload: claims } = await jwtVerify(token, jwks, {
        issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
      }));
    } catch (error) {
      if (error instanceof errors.JWKSTimeout || error instanceof errors.JWKSInvalid) {
        throw new ServiceUnavailableException('No se pudo consultar las claves de Supabase');
      }
      if (error instanceof errors.JOSEError) {
        throw new UnauthorizedException('El token de Supabase es inválido o venció');
      }
      throw new ServiceUnavailableException('No se pudo validar el token con Supabase');
    }

    const staff = staffIdentityFromClaims(claims);
    await this.ensureStaffUser(staff);
    request.staff = staff;
    return true;
  }

  private demoEnabled(): boolean {
    const enabled = this.config.get<boolean>('AUTH_DEMO_BYPASS', false);
    if (enabled) {
      this.logger.warn(
        'AUTH_DEMO_BYPASS activo: autenticación de desarrollo sin Supabase. No usar en producción.',
      );
    }
    return enabled;
  }

  private async ensureStaffUser(staff: StaffIdentity): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: staff.id },
      create: {
        id: staff.id,
        email: staff.email,
        name: staff.email,
        role: staff.role,
      },
      update: {
        email: staff.email,
        role: staff.role,
      },
    });
  }

  private getJwks(
    supabaseUrl: string,
    issuer: string,
  ): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks || this.issuer !== issuer) {
      this.jwks = createRemoteJWKSet(
        new URL(`${issuer}/.well-known/jwks.json`),
      );
      this.issuer = issuer;
    }
    return this.jwks;
  }
}
