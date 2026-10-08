# Neojapan

Tienda de repuestos, juegos retro y coleccionables para consolas con **stock real único** entre local y web, **compatibilidad garantizada** por consola y **grado de condición estandarizado** (NEW/A/B/C).

Plan de negocio y arquitectura: [`.opencode/Neojapan — Plan de negocio y técnico.md`](.opencode/Neojapan%20%E2%80%94%20Plan%20de%20negocio%20y%20t%C3%A9cnico.md)

## Stack

Monorepo pnpm + Turborepo.

| Área | App/Package | Stack |
|---|---|---|
| Tienda (SSR) | `apps/web` | Next.js 16 (App Router, Cache Components), React 19.3, Tailwind v3 |
| Panel/POS (PWA) | `apps/admin` | Next.js 16, PWA manifest, Tailwind v3 |
| API | `apps/api` | NestJS 12, PostgreSQL + Prisma 6, Zod, Helmet, throttling |
| Contratos | `packages/schemas` | Zod 4 — fuente única de contratos y enums de dominio |
| Pricing | `packages/pricing` | Funciones puras: totales, envío, mensaje WhatsApp |
| UI | `packages/ui` | Componentes base con tokens (`design-tokens.md`) |

## Comandos

```bash
pnpm install          # instala todo el monorepo
pnpm dev              # web :3000 · admin :3001 · api :3002
pnpm build            # turbo build (requiere prisma generate antes)
pnpm test             # vitest (schemas, pricing, api)
pnpm typecheck        # tsc en todos los paquetes
pnpm lint             # eslint (api, web, admin)
pnpm format           # prettier
```

## Flujo Git

- `main` contiene únicamente versiones listas para producción.
- `develop` integra el trabajo aprobado y es la base para nuevos cambios.
- Crea `feature/<nombre>` desde `develop`; al terminar, abre un PR de vuelta a `develop`.
- Para preparar una versión, crea `release/<version>` desde `develop`, valida y fusiona en `main` y `develop`.
- Para una corrección urgente, crea `hotfix/<nombre>` desde `main` y fusiona el resultado en `main` y `develop`.
- Usa commits [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:` o `chore:`.

## Base de datos

```bash
pnpm --filter @neojapan/api prisma:generate   # cliente Prisma
pnpm --filter @neojapan/api prisma:migrate    # migraciones (dev)
pnpm --filter @neojapan/api prisma:seed       # seed inicial
```

Las migraciones de Fase 0 se generan en modo offline (`prisma migrate diff --from-empty`)
y el esquema vive en `apps/api/prisma/schema.prisma`.

## Tienda virtual

La tienda en `apps/web` incluye portada, catálogo con filtros compartibles, hubs por consola, fichas de producto, Console Garage, configurador de kits, carrito persistido por servidor, cuenta de visitante y checkout que crea una solicitud con reserva de stock y prepara el mensaje de WhatsApp. La API ofrece catálogo y compatibilidad, además de carrito y pedidos. Los precios y la disponibilidad del checkout se vuelven a calcular en servidor.

Para desarrollo local, configura `apps/api/.env` a partir de [apps/api/.env.example](apps/api/.env.example) y `apps/web/.env.local` a partir de [apps/web/.env.example](apps/web/.env.example). La API puede ejecutarse con `DATA_STORE=memory` para demo o con PostgreSQL y Prisma para persistencia. El checkout requiere `STORE_WHATSAPP_NUMBER`; usa un número de prueba con prefijo internacional mientras desarrollas. Para invalidación inmediata de caché, `WEB_REVALIDATE_SECRET` y `REVALIDATE_SECRET` deben coincidir. Cloudinary es opcional; sin `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` se muestran imágenes de respaldo.

El panel requiere Supabase Auth: copia `apps/admin/.env.example` a `apps/admin/.env.local` y configura la URL y la clave pública (`anon`/publishable) del proyecto. En `apps/api/.env`, configura la misma URL en `SUPABASE_URL` y usa una clave de firma JWT asimétrica (ES256 o RS256) publicada por el JWKS de Supabase. Crea las cuentas del equipo desde Supabase Auth y asigna `app_metadata.role` a `ADMIN` o `STAFF`; no uses `user_metadata` para permisos. Las rutas administrativas de la API verifican firma, issuer, audience y rol independientemente del proxy del panel. El modo `DATA_STORE=memory` permite probar catálogo público, pero no conserva identidades ni datos entre reinicios.

Para habilitar imágenes, configura en `apps/api/.env` las credenciales de Cloudinary y `CLOUDINARY_UPLOAD_PRESET`. El preset debe ser **firmado**, aceptar solo JPG/PNG/WebP y limitar el archivo a 10 MB; no incluyas secretos de Cloudinary en el panel. La API firma la ruta de cada producto y confirma el recurso en Cloudinary antes de guardarlo.

## Alcance actual y siguientes integraciones

- Garage, preferencias de tema, plantillas del builder y cuenta de visitante se guardan en el navegador. No hay autenticación ni sincronización entre dispositivos.
- El builder ofrece kits según las reglas de compatibilidad y una vista previa de color; recetas de reparación, descuentos y variantes de componentes requieren datos de catálogo configurados.
- Los pedidos se solicitan por WhatsApp; el sistema no procesa pagos. La expiración de reservas se ejecuta al procesar solicitudes y mediante la tarea programada configurada en la API.
- El catálogo puede usar `pg_trgm` al aplicar la migración de storefront. La búsqueda no inventa compatibilidad: solo usa las relaciones registradas.