import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { StaffIdentity } from './staff-identity';

interface AuthenticatedRequest extends Request {
  staff: StaffIdentity;
}

export const CurrentStaff = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StaffIdentity =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().staff,
);
