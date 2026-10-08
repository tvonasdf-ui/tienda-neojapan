import { ApiError, apiErrorMessage, apiUrl } from './api';
import { createSupabaseServerClient } from './supabase-server';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let accessToken: string | undefined;
  if (process.env.AUTH_DEMO_BYPASS !== 'true') {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new ApiError(401, `No se pudo leer la sesión: ${error.message}`);
    }
    accessToken = data.session?.access_token;
  }

  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
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
