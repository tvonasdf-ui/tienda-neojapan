'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@neojapan/ui';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { DEMO_COOKIE_NAME } from '@/lib/api';

interface LoginFormProps {
  nextPath: string;
  configured: boolean;
  demoEnabled: boolean;
}

function safeNextPath(nextPath: string): string {
  return nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
}

export function LoginForm({ nextPath, configured, demoEnabled }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const role = data.user.app_metadata.role;
      if (role !== 'ADMIN' && role !== 'STAFF') {
        const { error: signOutError } = await supabase.auth.signOut();
        setError(
          signOutError
            ? `La cuenta no tiene acceso al panel y no se pudo cerrar la sesión: ${signOutError.message}`
            : 'La cuenta no tiene un rol habilitado para el panel.',
        );
        return;
      }

      router.replace(safeNextPath(nextPath));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  async function enterDemo() {
    setSubmitting(true);
    setError(null);
    document.cookie = `${DEMO_COOKIE_NAME}=1; path=/; max-age=43200; samesite=lax`;
    router.replace(safeNextPath(nextPath));
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-gray-100">Iniciar sesión</h1>
        <p className="text-sm text-gray-400">Acceso exclusivo para el equipo Neojapan.</p>
      </div>

      {!configured ? (
        <p role="alert" className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
          Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar el acceso.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" loading={submitting} fullWidth disabled={!configured}>
          Entrar al panel
        </Button>
      </form>

      {demoEnabled ? (
        <div className="space-y-3 border-t border-white/[0.07] pt-4">
          <p className="text-center text-xs text-gray-500">
            Modo desarrollo: entra sin cuenta de Supabase.
          </p>
          <Button type="button" variant="secondary" onClick={enterDemo} loading={submitting} fullWidth>
            Entrar en modo demo
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
