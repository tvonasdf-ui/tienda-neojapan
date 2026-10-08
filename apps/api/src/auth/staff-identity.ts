import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@neojapan/schemas';
import { z } from 'zod';
import type { JWTPayload } from 'jose';

export type StaffRole = Exclude<z.infer<typeof UserRole>, 'CUSTOMER'>;

export interface StaffIdentity {
  id: string;
  email: string;
  role: StaffRole;
}

export function staffIdentityFromClaims(claims: JWTPayload): StaffIdentity {
  const id = z.string().uuid().safeParse(claims.sub);
  if (!id.success) {
    throw new UnauthorizedException('El token no contiene un identificador válido');
  }

  const email = z.string().trim().min(1).max(254).safeParse(claims.email);
  if (!email.success) {
    throw new UnauthorizedException('El token no contiene un correo válido');
  }

  const metadata = z.record(z.string(), z.unknown()).safeParse(claims.app_metadata);
  const role = metadata.success ? UserRole.safeParse(metadata.data.role) : null;
  if (!role?.success || role.data === 'CUSTOMER') {
    throw new ForbiddenException('La cuenta no tiene un rol habilitado para el panel');
  }

  return { id: id.data, email: email.data, role: role.data };
}
