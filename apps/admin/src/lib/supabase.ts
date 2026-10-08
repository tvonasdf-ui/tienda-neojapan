import { createBrowserClient } from '@supabase/ssr';

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createBrowserClient(config.url, config.anonKey);
}
