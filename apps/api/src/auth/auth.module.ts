import { Module } from '@nestjs/common';
import { SupabaseStaffGuard } from './supabase-staff.guard';

@Module({
  providers: [SupabaseStaffGuard],
  exports: [SupabaseStaffGuard],
})
export class AuthModule {}
