# Contexto del Proyecto

Este archivo es la **fuente única de verdad** que todos los agentes (`/agents`) consultan antes de trabajar, y donde el orquestador (`/orchestration`) registra decisiones reutilizables. Se actualiza a medida que el proyecto evoluciona — no es un documento estático de kickoff.

> Plan de referencia completo: [`Neojapan — Plan de negocio y técnico.md`](../Neojapan — Plan de negocio y técnico.md) (versión 1.0, octubre 2026). Cuando este contexto y el plan discrepen sobre un detalle operativo, manda este archivo; sobre visión de producto/alcance, manda el plan.

## 1. Visión general del producto

- **Nombre del producto**: Neojapan — tienda especializada en videojuegos, piezas de consolas y accesorios.
- **Descripción en una línea**: tienda (online + panel/POS) donde coleccionistas y reparadores encuentran la pieza exacta para su consola, con compatibilidad garantizada, stock único real entre local y web, y grado de condición estandarizado.
- **Usuario objetivo**: coleccionistas, reparadores/modders, jugadores casuales y compradores de regalo (Chile).
- **Problema que resuelve**: fichas pobres con compatibilidades dudosas, stock desincronizado entre tienda física y web, y fotos de catálogo sin estado real en productos usados.
- **Operación inicial**: Chile (CLP, despacho nacional, pedidos cerrados por WhatsApp sin pasarela de pago), un solo local/bodega, equipo de 1–2 personas, catálogo de 300–800 SKUs.
- **Diferenciadores clave (no negociables en el diseño)**: matriz de compatibilidad producto ↔ modelo/revisión de consola; libro de movimientos de inventario; Console Garage; Builder de kits; cierre de pedido por WhatsApp con reserva temporal de stock.

## 2. Stack técnico confirmado

Monorepo **pnpm + Turborepo** con tres apps y paquetes compartidos:

| Capa | Tecnología | Notas |
|---|---|---|
| Monorepo | pnpm + Turborepo | `apps/web`, `apps/admin`, `apps/api`, `packages/*` |
| Tienda | Next.js 16 (App Router) + React 19.2 + TS estricto | `cacheComponents: true`, `'use cache'` + `cacheTag`, PPR; ver skill `nextjs-2026-best-practices` |
| Panel + POS | Next.js 16 (PWA, rol staff) | misma base que la tienda |
| Estilos | Tailwind CSS | tokens en `app/globals.css` y fuente de verdad en `/context/design-tokens.md` |
| Estado cliente | Zustand v5 (solo UI) + TanStack Query v5 (datos servidor) | servidor es la fuente de verdad del carrito |
| Formularios | TanStack Form + Zod | validación compartida cliente/servidor |
| API | NestJS + TS estricto | módulos por dominio (`catalog`, `compatibility`, `inventory`, `sales`, `cart`, `media`, `customers`, `auth`, `reports`); ver skill `nestjs-secure-backend` |
| Base de datos | PostgreSQL (Supabase u otro gestionado) + Prisma | transacciones atómicas, `pg_trgm` para búsqueda tolerante a errores |
| Caché/colas | Redis + BullMQ | reservas con TTL, jobs (borrado diferido de medios, alertas) |
| Imágenes | Cloudinary | uploads firmados directos desde el navegador; URLs derivadas de `publicId` |
| Auth | Auth.js o Supabase Auth | roles `ADMIN`, `STAFF`, `CUSTOMER`; verificación de rol SIEMPRE en la API |
| Pagos | Sin pasarela en MVP | pedido se cierra por enlace `wa.me`; `PaymentProvider` es un puerto preparado para fase posterior |
| Testing | Vitest + RTL + MSW (frontend), Jest + Supertest (Nest), Playwright (E2E acotado) | ver skills `qa-qc-react-nestjs`, `qa-qc-react-vite` |
| CI/CD | GitHub Actions | lint → typecheck → tests → build; ver skill `cicd-expert-pipelines` |
| Hosting | Vercel (web/admin), Fly.io/Railway/Render (API), DB gestionada | ver skill `devops-docker-kubernetes` |
| Observabilidad | Sentry + pino (logs estructurados) | |

## 3. Convenciones del equipo

- **Nomenclatura de ramas**: `main` protegida; `feature/<slug>`, `fix/<slug>`, `chore/<slug>`. Ver `/context/pr-convention.md`.
- **Formato de commits**: Conventional Commits. Ver `/context/pr-convention.md`.
- **Definition of Done**: checklist de cierre por tarea. Ver `/context/definition-of-done.md`.
- **Estructura del monorepo** (plan §5.1):
  - `apps/web/` — tienda: `app/(shop)/`, `app/(account)/`, `app/pedido/`, `components/`, `proxy.ts`
  - `apps/admin/` — panel + POS: `app/inventario/`, `app/pos/`, `app/pedidos/`, `app/reportes/`
  - `apps/api/` — NestJS: `src/<módulo>/`, `src/common/`
  - `packages/schemas/` — Zod, fuente única de verdad de contratos
  - `packages/pricing/` — funciones puras (totales, cupones, envío, mensaje de WhatsApp)
  - `packages/ui/` — componentes compartidos
- **Idioma**: código y commits en inglés; comunicación con el usuario, documentación de negocio y textos de UI en español (tienda Chile).
- **Zod como fuente única de verdad**: los esquemas viven en `packages/schemas`; de ellos se derivan tipos, DTOs de la API y formularios. Nunca duplicar un shape a mano.

## 4. Restricciones de negocio conocidas

- **Un solo acento de color**: `cyan` (cian eléctrico) sobre fondo oscuro por defecto — ver `/context/design-tokens.md`. Colores semánticos solo para estado: `green` (éxito), `red` (error/peligro), `amber` (advertencia). No hay segundo color decorativo.
- **Backend propio (NestJS)** define la API que la tienda y el panel consumen; el contrato lo documenta `backend` con `/specs/api-contract-template.md` y `frontend` lo consume sin reinterpretarlo.
- **El servidor es la fuente de verdad** de precios, stock y totales del carrito/mensajes: el cliente solo muestra; el mensaje de WhatsApp lo arma el servidor con función pura `buildWhatsAppOrderMessage`.
- **El stock nunca se edita directo**: solo se modifica mediante `stock_movements` (libro inmutable) con `stock_levels` actualizado en la misma transacción y descuento atómico — ver plan §4.3.
- **Compatibilidad es matriz curada** (`Compatibility` con nivel y fuente), no inferida ni generada por IA en MVP.
- **Imágenes**: se guarda `publicId` de Cloudinary, nunca URLs completas; subida firmada directa (el binario no pasa por la API).
- **Sin pasarela de pago en MVP**; el flujo termina en solicitud de pedido `REQUESTED` + enlace `wa.me`. Cuando se active un proveedor de pago, se agrega tras el puerto `PaymentProvider` sin rehacer carrito ni solicitudes.
- Todo endpoint con datos sensibles o mutaciones lleva auth/autorización explícita y validación estricta (Zod/DTO) — sin excepciones.

## 5. Decisiones de arquitectura registradas

El orquestador agrega una entrada aquí cada vez que una tarea produce una decisión reutilizable (patrón adoptado, convención nueva, restricción técnica descubierta). Formato:

```
### [Fecha] Título de la decisión
**Contexto**: por qué surgió
**Decisión**: qué se resolvió
**Agentes afectados**: cuáles deben respetarla
```

### [2026-10-06] Adaptación del equipo de agentes a Neojapan (Perfil A)
**Contexto**: este repositorio de agentes fue copiado desde el equipo de `react-base-app` (SPA Vite + NestJS con API de GitHub) sin adaptar; faltaba la carpeta `/agents` y todo el contexto describía el proyecto anterior.
**Decisión**: perfil A de `/ADAPTING.md` — mismo backend NestJS, frontend Vite→Next.js 16. Se restauró `/agents` desde el HEAD del repo fuente y se reescribieron `project-context`, `design-tokens`, `skills-README`, tablas de activación de los agentes, `roles-matrix`, `handoff-protocol`, `definition-of-done`, `pr-convention`, `README` y `AGENTS`. Se archivaron las specs del portafolio.
**Agentes afectados**: todos.

### [2026-10-06] Acento de marca: cian eléctrico
**Contexto**: el plan §3.1 exige un único color de acento sobre fondo oscuro y §9.1 lo dejaba pendiente de elegir.
**Decisión**: acento único `cyan` (cian eléctrico) — coherente con la inspiración de serigrafía de PCB/etiquetas técnicas y sin conflicto con el rojo semántico de errores. El rojo queda reservado a estados de error. Detalle de tokens en `/context/design-tokens.md`.
**Agentes afectados**: designer, frontend, qa-tester.

### [2026-10-06] Monorepo pnpm + Turborepo con tres apps
**Contexto**: plan §5 — tienda, panel/POS y API comparten contratos Zod y lógica pura de pricing.
**Decisión**: estructura `apps/web`, `apps/admin`, `apps/api` + `packages/schemas`, `packages/pricing`, `packages/ui`. El conocimiento de negocio compartido (Zod, pricing) vive en `packages/`, nunca duplicado entre apps.
**Agentes afectados**: frontend, backend, qa-tester.

### [2026-10-07] Fase 0 fundacional construida (scaffold verificado en verde)
**Contexto**: plan §5.2 Fase 0 — arrancar el monorepo con herramienta de builds, CI/entornos, tokens y Prisma del mínimo viable, sin features.
**Decisión**: quedó operativo y verificado (typecheck 8/8, tests 30/30, lint 3/3, build 5/5 en CI):
- `apps/web` (Next 16, puerto 3000), `apps/admin` (Next 16 PWA, puerto 3001), `apps/api` (NestJS 12, prefijo `api/v1`, puerto 3002), `packages/schemas` (Zod), `packages/pricing`, `packages/ui`. En dev, web/admin reescriben `/api/*` → `http://localhost:3002/api/*`.
- **Pines estratégicos** (no actualizar a vNext sin revisión): TS `~5.9`, eslint `^9`, Prisma `^6.19`, Next `^16.4`, React `^19.3`, Nest `^12.1`, Zod `^4`, turbo `^2`, Vitest `^5`, Node 22, pnpm 11. Web/admin llevan `cacheComponents` + `partialPrefetching` + React Compiler (`babel-plugin-react-compiler`).
- **Prisma**: modelo completo del plan §4.4 en `apps/api/prisma/schema.prisma`; migración inicial generada offline (`0001_init`) con `CREATE EXTENSION IF NOT EXISTS pg_trgm` al inicio (sin `previewFeatures`); seed de plataformas y productos demo con `prisma db seed`.
- El "gate" que corre CI (`ci.yml`) es `prisma generate` → `lint` → `typecheck` → `test` → `build` + `git diff --exit-code`.
- Nota en Windows: si `pnpm install` falla con `EPERM` al renombrar `next` en `.pnpm` (un handle de escaneo lo bloquea), borrar `node_modules\.pnpm\next@16.4.0*` y reintentar; `.npmrc` usa `package-import-method=copy` para mitigarlo.
**Agentes afectados**: frontend, backend, qa-tester.

### [2026-10-07] Fase 1 · Núcleo de inventario, CRUD admin y panel (M1–M4)
**Contexto**: plan §5.2 Fase 1 — el inventario es el corazón del negocio (libro §4.3) y el panel tiene que poder darlo de alta/editar sin exponer `cost`. Decisión de alcance del usuario: backend primero con Prisma mockeado (sin DB real) y unit tests.
**Decisión**: M1/M2/M4 backend en `apps/api` + M3 panel en `apps/admin`, gate verde (typecheck 8/8, tests 71, lint 3/3, build 5/5):
- **M1 inventario**: `InventoryService` transaccional; el libro `stock_movements` es inmutable con `reason` obligatorio. Las salidas/reservas usan guarda atómica por SQL (comparación de dos columnas que Prisma no expresa en `where`), `409` si no hay capacidad, `404` si la variante no existe. Endpoints bajo `/inventory/variants/:id` (stock, movimientos, receipt, adjust, reservas, release, commit).
- **M2 CRUD admin**: `/admin/products` (list, detail, POST create, PATCH update). El alta crea producto+variantes+compat+media Y el stock inicial como `RECEIPT` en la **misma transacción** vía `receiptIn(tx, ...)` (nuevo método componible de `InventoryService`). Upsert de variantes por id; `409` en colisión slug/SKU.
- **M4 CSV**: `POST /admin/products/import-csv` (multipart, 1 MB). Parser puro `catalog-csv.ts` con `csv-parse/sync`: una fila = una variante, se agrupa por `slug` (crea el producto una vez con N variantes). Errores por fila/producto no abortan el archivo. Deps nuevas en api: `csv-parse` (runtime) y `@types/multer` (dev).
- **Config**: `apps/api/tsconfig.json` migró a `module/moduleResolution: nodenext` (sigue emitiendo CJS porque el paquete no es `"type": "module"`) para resolver el `exports` de `csv-parse`.
- **M3 panel** (`apps/admin`): `/inventario` (tabla productos+stock por sucursal), `/inventario/[variantId]/movimientos` (libro + acciones ingreso/ajuste en cliente con `router.refresh()`), `/inventario/nuevo` (alta con variantes/stock inicial), `/inventario/importar` (carga CSV con reporte). Cliente de API en `src/lib/api.ts` (server `apiFetch` + client `clientApi`/`clientFormApi` sobre el proxy `/api`). En Cache Components de Next 16 la ruta dinámica se declara con `export const instant = false` (no con `dynamic`).
**Agentes afectados**: frontend, backend, qa-tester.

## 6. Glosario del dominio

Términos específicos del negocio/producto que no son obvios desde el código. Evita que cada agente interprete un concepto de forma distinta.

- **Variante (`Variant`)**: presentación comprable de un producto (SKU único) — puede diferir por condición (`NEW`, `A`, `B`, `C`), color u otra atribución; precio y costo viven por variante.
- **Grado de condición**: estandarización para usados/coleccionables (`NEW` nuevo, `A`/`B`/`C` usados en distinto grado); siempre acompañado de fotos propias de la unidad.
- **ConsoleModel**: modelo + revisión de una consola (ej. `SCP H-70001`), con notas de identificación; unidad mínima de la matriz de compatibilidad.
- **Compatibilidad (`Compatibility`)**: vínculo producto ↔ ConsoleModel con nivel (`CONFIRMED`/`PARTIAL`) y campo de fuente — matriz curada, nunca inferida.
- **Garage**: consolas registradas por el usuario en su cuenta; habilita badges de compatibilidad y sugerencias.
- **Builder**: configurador de kits (reparación por falla / mod custom) que agrega un set de variantes al carrito como plantilla reutilizable.
- **Solicitud de pedido**: registro `Sale` con estado `REQUESTED`, código corto tipo `NJ-1042` y canal `ONLINE`; nace al pulsar «Enviar por WhatsApp» con stock reservado.
- **Libro de movimientos (`StockMovement`)**: fila inmutable por cada cambio de stock; `StockLevel` es la suma materializada (onHand/reserved) — nunca se edita un campo `stock` a mano.
- **POS**: pantalla de venta en mostrador (código de barras como teclado); comparte modelo `Sale` con canal `POS`.
- **Retiro en tienda / despacho**: modalidades de entrega; el retiro es el gancho online→físico desde el día 1.

## 7. Proyectos activos

- `neojapan-tienda` — este proyecto (repo actual): monorepo de la tienda Neojapan + `.opencode/` (equipo de agentes).
