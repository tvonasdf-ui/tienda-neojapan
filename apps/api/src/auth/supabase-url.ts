export function normalizeSupabaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/$/, '')
    .replace(/\/rest\/v1(?:\/.*)?$/, '')
    .replace(/\/auth\/v1(?:\/.*)?$/, '');
}
