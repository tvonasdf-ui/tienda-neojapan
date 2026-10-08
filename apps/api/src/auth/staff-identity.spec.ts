import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { staffIdentityFromClaims } from './staff-identity';

const validClaims = {
  sub: 'e8f7aaf3-ec08-4e70-a5a4-99bfbd407889',
  email: 'staff@neojapan.cl',
  app_metadata: { role: 'STAFF' },
};

describe('staffIdentityFromClaims', () => {
  it('uses the signed app_metadata role and returns the staff identity', () => {
    expect(staffIdentityFromClaims(validClaims)).toEqual({
      id: validClaims.sub,
      email: validClaims.email,
      role: 'STAFF',
    });
  });

  it('does not grant access from editable user_metadata', () => {
    expect(() =>
      staffIdentityFromClaims({
        sub: validClaims.sub,
        email: validClaims.email,
        user_metadata: { role: 'ADMIN' },
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects customer accounts', () => {
    expect(() =>
      staffIdentityFromClaims({
        ...validClaims,
        app_metadata: { role: 'CUSTOMER' },
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects identities without a valid subject', () => {
    expect(() =>
      staffIdentityFromClaims({ ...validClaims, sub: 'not-a-uuid' }),
    ).toThrow(UnauthorizedException);
  });
});
