import { ApiError, apiErrorMessage, apiUrl } from './api';
import { createSupabaseServerClient } from './supabase-server';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new ApiError(401, `No se pudo leer la sesión: ${error.message}`);
  }

  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  if (data.session) {
    headers.set('authorization', `Bearer ${data.session.access_token}`);
  }

  const response = await fetch(apiUrl(path), {
    cache: 'no-store',
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await apiErrorMessage(response));
  }
  return response.json() as Promise<T>;
}
