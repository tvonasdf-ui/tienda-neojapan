import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

loadEnvFile(resolve(process.cwd(), '.env'));

type Role = 'ADMIN' | 'STAFF';

interface UserArgs {
  email: string;
  password: string;
  role: Role;
}

function parseEnvironment(): UserArgs {
  const email = process.env.STAFF_USER_EMAIL;
  const password = process.env.STAFF_USER_PASSWORD;
  const role = process.env.STAFF_USER_ROLE;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Define STAFF_USER_EMAIL con un correo válido.');
  }
  if (!password || password.length < 8) {
    throw new Error('Define STAFF_USER_PASSWORD con al menos 8 caracteres.');
  }
  if (role !== 'ADMIN' && role !== 'STAFF') {
    throw new Error('Define STAFF_USER_ROLE como ADMIN o STAFF.');
  }

  return { email, password, role };
}

function normalizeSupabaseBase(url: string): string {
  return url
    .trim()
    .replace(/\/$/, '')
    .replace(/\/rest\/v1$/, '')
    .replace(/\/auth\/v1\/(?:\.well-known\/jwks\.json)?$/, '')
    .replace(/\/auth\/v1$/, '');
}

async function createStaffUser(args: UserArgs): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de crear el usuario.',
    );
  }

  const baseUrl = normalizeSupabaseBase(supabaseUrl);
  const endpoint = `${baseUrl}/auth/v1/admin/users`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      email: args.email,
      password: args.password,
      email_confirm: true,
      role: 'authenticated',
      app_metadata: { role: args.role },
    }),
  });

  const rawBody = await response.text();
  let body: {
    user?: { id: string; email: string };
    error?: { message?: string };
    message?: string;
    error_code?: string;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    body = { message: rawBody || 'Sin respuesta de Supabase.' };
  }

  if (response.status === 422 && body.error_code === 'email_exists') {
    const listResponse = await fetch(
      `${endpoint}?email=${encodeURIComponent(args.email)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );
    const listRaw = await listResponse.text();
    const listPayload = JSON.parse(listRaw) as unknown;
    let listBody: Array<{ id: string; email: string }> = [];
    if (Array.isArray(listPayload)) {
      listBody = listPayload as Array<{ id: string; email: string }>;
    } else if (listPayload && typeof listPayload === 'object') {
      const candidate = listPayload as {
        data?: unknown;
        users?: unknown;
      };
      listBody = Array.isArray(candidate.data)
        ? candidate.data as Array<{ id: string; email: string }>
        : Array.isArray(candidate.users)
          ? candidate.users as Array<{ id: string; email: string }>
          : [];
    }
    const existingUser = listBody.find((user) => user.email === args.email);
    if (!listResponse.ok || !existingUser) {
      throw new Error(
        `El correo ya existe, pero no se pudo identificar el usuario de Supabase (HTTP ${listResponse.status}): ${listRaw}`,
      );
    }

    const confirmationResponse = await fetch(`${endpoint}/${existingUser.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ email_confirm: true }),
    });
    if (!confirmationResponse.ok) {
      const confirmationBody = await confirmationResponse.text();
      throw new Error(
        `No se pudo confirmar el correo electrónico (HTTP ${confirmationResponse.status}): ${confirmationBody}`,
      );
    }

    console.log(`Usuario existente confirmado: ${existingUser.email}`);
    console.log(`ID Supabase: ${existingUser.id}`);
    console.log(`Rol: ${args.role}`);
    return;
  }

  if (!response.ok || !body.user) {
    const diagnostic = body.error?.message ?? body.message;
    const responseMessage = diagnostic
      ? `${diagnostic}`
      : rawBody || 'Sin respuesta de Supabase.';
    throw new Error(
      `Supabase rechazó la creación del usuario (HTTP ${response.status}): ${responseMessage}`,
    );
  }

  console.log(`Usuario creado: ${body.user.email}`);
  console.log(`ID Supabase: ${body.user.id}`);
  console.log(`Rol: ${args.role}`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    console.log(
      'Crear un usuario STAFF o ADMIN en Supabase.\n\n' +
        'Uso: pnpm --filter @neojapan/api create:staff-user\n\n' +
        'Configura STAFF_USER_EMAIL, STAFF_USER_PASSWORD y STAFF_USER_ROLE en el entorno de trabajo.',
    );
    return;
  }

  await createStaffUser(parseEnvironment());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No se pudo crear el usuario: ${message}`);
  process.exitCode = 1;
});
