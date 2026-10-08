import { LoginForm } from '@/components/login-form';
import { getSupabasePublicConfig } from '@/lib/supabase';

export const instant = false;

const LOGIN_ERRORS: Record<string, string> = {
  configuration: 'Configura las variables de Supabase para habilitar el panel.',
  verification: 'No se pudo validar la sesión con Supabase. Inténtalo nuevamente.',
  role: 'La cuenta no tiene un rol habilitado para el panel.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next?.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/';
  const config = getSupabasePublicConfig();
  const demoEnabled =
    process.env.AUTH_DEMO_BYPASS === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_BYPASS === 'true';

  return (
    <section className="py-12">
      {params.error && LOGIN_ERRORS[params.error] ? (
        <p role="alert" className="mx-auto mb-4 max-w-md text-sm text-red-400">
          {LOGIN_ERRORS[params.error]}
        </p>
      ) : null}
      <LoginForm nextPath={nextPath} configured={Boolean(config)} demoEnabled={demoEnabled} />
    </section>
  );
}
