import { describe, expect, it } from 'vitest';
import { normalizeSupabaseUrl } from './supabase-url';

describe('normalizeSupabaseUrl', () => {
  it('normaliza una URL base de proyecto', () => {
    expect(normalizeSupabaseUrl('https://example.supabase.co')).toBe(
      'https://example.supabase.co',
    );
  });

  it('normaliza una URL de endpoint Supabase', () => {
    expect(normalizeSupabaseUrl('https://example.supabase.co/auth/v1/')).toBe(
      'https://example.supabase.co',
    );
  });

  it('normaliza una URL REST', () => {
    expect(normalizeSupabaseUrl('https://example.supabase.co/rest/v1')).toBe(
      'https://example.supabase.co',
    );
  });
});
