# Portfolio Engagement — Analítica de visitas + Leads de contacto

**Estado**: `en diseño`
**Agentes involucrados**: designer, backend, frontend, qa-tester

## 1. Problema y objetivo

- **Problema que resuelve**: el portafolio no tiene ninguna forma de medir si está cumpliendo su objetivo ni de capturar el interés de los reclutadores — el "contacto" no existe como canal de datos y no hay feedback medible. Como SPA sin backend, no hay visibilidad de quién visita, qué mira ni si el CV genera acciones.
- **Usuario objetivo**: (a) Pedro (admin) — ver en el dashboard qué páginas interesan, de dónde vienen los visitantes y cuántos leads genera; (b) reclutadores — enviar un mensaje o votar "me interesa contratar" con un formulario funcional.
- **Criterio de éxito**: el backend registra cada visita del sitio anónimamente (path, referrer, país, dispositivo) y los mensajes/leads quedan persistidos en BD; el dashboard privado muestra métricas agregadas (series diarias, top páginas, referrers, países, conteo de leads por estado) y una cola de leads editable (new → contacted → done), todo con la paleta blue y con el primer uso real del backend NestJS del proyecto.

## 2. Alcance

**Incluye**:
- Módulo NestJS `engagement` nuevo (`events/` y `leads/` como submódulos o recursos del mismo módulo): entidades `VisitEvent` y `Lead`, migraciones, DTOs con validación estricta (class-validator), guard de admin, throttling (`@nestjs/throttler`), CORS.
- Tracking de página público y anónimo: `POST /api/v1/engagement/events` (pageview) disparado desde la SPA en cada cambio de ruta.
- Formulario de contacto público (página `/contact`): envía `POST /api/v1/leads` con intención (`contact` | `hiring` | `collab`).
- Dashboard privado (`/dashboard`) con dos vistas: **Analytics** (métricas y charts) y **Leads** (cola con cambio de estado).
- i18n es/en para todo texto de UI nuevo (`contact.*`, `dashboard.analytics.*`, `dashboard.leads.*`).
- Estados: loading, error, vacío en formulario, charts y tablas del dashboard.
- Config de deployment: variable `VITE_API_URL` en frontend (Vite) y variables de entorno del backend (`ADMIN_API_KEY`, `PORT`, BD).

**No incluye (fuera de alcance para esta iteración)**:
- Auth real con NestJS (JWT + refresh + roles) — los endpoints privados del dashboard se protegen por ahora con una **API key de admin** (guard `X-Admin-Key`); el auth real es la feature siguiente (ver §7).
- Mapa geográfico (Leaflet) de ubicaciones — el dashboard muestra lista de países; el mapa queda como mejora opcional a pedido explícito.
- Notificaciones de lead (email/Telegram webhook) y de-duplicación avanzada de leads.
- Persistencia/export: exportar métricas a CSV/PDF, retención de eventos agresiva, consenso/opt-out UI completa (solo flag por localStorage, ver §3).
- Analytics de conversión por campaña/UTM ni funnels.
- Los `PageView` de usuario autenticado en el dashboard (se registran igual, sin PII; no es un bloqueo).

## 3. Especificación UX/UI (`designer`)

**Patrón**: dashboard existente (`DashboardLayout`, `DashboardPage`) al que se agrega navegación interna por pestañas; el formulario usa los inputs/cards/buttons del design-system (`src/components/ui/*`). Fondo `bg-gray-50 dark:bg-gray-900`, acentos solo `blue` (tokens de `/context/design-tokens.md`).

- **Flujo de usuario**:
  1. Visitante público navega el sitio → `RootLayout` dispara tracking (silencioso, sin UI).
  2. Visitante entra a `/contact` (link en navegación desktop/mobile) → ve formulario (nombre, email, intención, mensaje) → envía → éxito o error inline.
  3. Pedro loguea y entra a `/dashboard` → pestañas `Analytics` / `Leads`.
  4. En `Leads`, filtra/lee cada lead y lo mueve de estado (`new` → `contacted` → `done`); cambia de estado desde el dashboard.
- **Página `/contact`**: encabezado con título + descripción (patrón de `AboutPage`), tarjeta con el formulario, y a la derecha datos de contacto estáticos. Campos: `name` (requerido, ≤100), `email` (requerido, formato válido), `intent` (radio pills: Contacto | Me interesa contratar | Colaboración, preseleccionado `contact`), `message` (requerido, 1–2000). Botón primario `Enviar` con estado `loading` (spinner + deshabilitado) y `disabled` si hay errores de validación sin tocar.
- **Estados del formulario**: default / focus (ring blue) / error de campo (texto `red` bajo el input con `aria-describedby` + borde `red`) / éxito (sustituye el formulario por card de confirmación con check) / error de red (banner `amber`/`red` reutilizando el patrón de `ToastContainer`, el mensaje se conserva en el form).
- **Dashboard — tab Analytics**: tarjetas KPI arriba (Visitas totales, Visitantes únicos, Leads nuevos, Leads por estado) usando `ImpactMetrics`/card del sistema; luego un `AreaChart` de series diarias (visitas y visitantes, rango `7d`/`30d` toggle pill) con recharts; abajo `BarChart` de top páginas y listas de top referrers y países (con bandera/ISO + count). Estados: loading (skeleton `animate-pulse`), error (mensaje + retry), vacío ("Sin datos en este rango").
- **Dashboard — tab Leads**: tabla/responsive-list de leads (nombre, email, intención, estado, fecha) con filter pills por estado y contador por estado; acción por fila para avanzar estado (menú o botones con `aria-label`); estado vacío ("No hay leads") e ícono. Cambio de estado optimista con rollback (TanStack Query `onMutate`).
- **Accesibilidad**: contraste AA; controles distinguibles sin color (forma de ícono + texto); `aria-pressed` en pills y tabs; teclado operable (tabs con roving focus o `aria-selected`); `prefers-reduced-motion` respetado (charts sin animación brusca).
- **Tracking no intrusivo**: ninguna UI visible; flag de opt-out por `localStorage ('engagement-opt-out')` que detiene el envío; se respeta `sessionStorage` para el `visitorId` (no PII).

**Tokens visuales**: acento `blue-600`/`blue-400`; superficies `gray-50`/`white` y `gray-900`/`gray-800`; bordes `gray-200`/`gray-700`; texto `gray-900`/`gray-100`; éxito `green` solo para el check de confirmación; error `red`; advertencia `amber`. Semánticos nunca fuera de su rol.

**Casos de error a contemplar** (UI):
- Formulario con 429 (rate limit): mensaje "demasiados intentos, espera un momento".
- Dashboard sin sesión (401/403): el router ya redirige a `/login`; el 403 de admin key aparece como error con retry.
- Backend caído (fetch error / timeout): state de error con botón reintentar en ambos panels; el form no pierde el texto.
- Cambio de idioma en mitad de sesión de dashboard: textos refrescan vía `useTranslation`.

## 4. Contrato de datos (`backend`)

API propia NestJS — contrato completo publicado en `/specs/api/portfolio-engagement.md`. Resumen:

```ts
// POST /api/v1/engagement/events        público, throttled 60/min/IP
{ kind: 'pageview'; path: string; referrer?: string | null }

// POST /api/v1/leads                    público, throttled 5/h/IP
{ name: string; email: string; intent: 'contact' | 'hiring' | 'collab';
  message: string }

// GET /api/v1/leads                     admin (X-Admin-Key)
//   query: status?, page?, limit?  →  { items: Lead[]; total; page; limit }
// PATCH /api/v1/leads/:id/status        admin
{ status: 'new' | 'contacted' | 'done' }

// GET /api/v1/engagement/overview       admin, query range?: '7d' | '30d'
{ totalVisits; uniqueVisitors; leadsTotal; leadsByStatus;
  dailySeries: { date; visits; visitors }[];
  topPages: { path; visits }[];
  topReferrers: { referrer; visits }[];
  countries: { code; visits }[] }
```

- **Entidades**: `VisitEvent { id, visitorId, path, referrer?, country?, device?, timestamp }` — `visitorId` es UUID anónimo generado en el servicio y devuelto como cookie `engagement_vid` (HttpOnly, SameSite=Lax); `country` se toma SOLO de header de geolocalización de proxy (`cf-ipcountry`/`x-country-code`, alpha-2) si existe, nunca de IP almacenada. `Lead { id, name, email, intent, message, status, source, createdAt, updatedAt }`.
- **Reglas de negocio/validación**: DTOs con `class-validator` — `path` 1–255 con regex de ruta (`/^\/[a-zA-Z0-9/_-]*$/`), `name` 1–100 (trim), `email` formato válido, `message` 1–2000 (trim, sin HTML), `intent` enum, `status` enum. Antes de persistir leads: normalize email (lowercase), strip de tags/HTML (helpers en backend), length caps en service (defensa extra al DTO).
- **Casos de fallo de la API a contemplar**: 400 validación (forma NestJS de errores), 404 lead inexistente, 401/403 `X-Admin-Key` ausente/incorrecta, 413 body demasiado grande, 429 rate limit, 500/uuid malformado en `PATCH :id`. CORS: métodos `GET,POST,PATCH`, orígenes permitidos desde env.

## 5. Implementación de UI (`frontend`)

- **Ruteo**: nueva ruta `/contact` en `src/app/router.tsx` + `Link` en navegación desktop y mobile (junto a los links existentes en `RootLayout`/nav). Dashboard: tabs internas en `DashboardPage` (estado local) → `AnalyticsPanel` y `LeadsPanel`.
- **Nuevos archivos**:
  - `src/pages/contact/ContactPage.tsx` — página con formulario + contacto estático.
  - `src/components/feedback/ContactForm.tsx` — formulario (TanStack Form + `@tanstack/zod-form-adapter` + schema Zod en `src/lib/validations/contact.ts`).
  - `src/components/dashboard/AnalyticsPanel.tsx` — KPIs, toggle `7d/30d`, `AreaChart` + `BarChart` (recharts, skill `recharts-charts`), listas países/referrers.
  - `src/components/dashboard/LeadsPanel.tsx` — cola de leads con filter pills y cambio de estado optimista.
  - `src/features/engagement/engagementApi.ts` — client de la API propia (`fetch` vía `src/lib/api/client.ts` con `VITE_API_URL`).
  - `src/features/engagement/engagementHooks.ts` — hooks TanStack Query: `useTrackPageview` (fire-and-forget), `useCreateLead`, `useLeads`, `useUpdateLeadStatus`, `useEngagementOverview`.
  - `src/hooks/useRouteAnalytics.ts` — suscripción a cambios de ruta del router (TanStack Router `router.subscribe`/`afterLoad`) que dispara tracking una vez por navegación (debounced, con `navigator.sendBeacon` con Blob `application/json`, fallback a `fetch keepalive`). Montado en `RootLayout`. Respeta `engagement-opt-out` en localStorage y `sessionStorage` para `visitorId`.
- **Estado cliente (Zustand) vs servidor (TanStack Query)**: nada nuevo en Zustand; todo estado de datos vía TanStack Query con `queryClient.invalidateQueries` al mutar un lead (o tras submit del form); rango `7d/30d` como estado local del panel (queryKey incluye el rango).
- **Consumo del contrato**: `frontend` consume los tipos/DTOs que `backend` publica en el contrato (handoff `backend → frontend`); los schemas Zod de validación del form los define `frontend` localmente, el contrato de red está en `/specs/api/portfolio-engagement.md`. No se inventa shape distinto.
- **Dependencias de visualización**: solo `recharts` (ya en stack, no disponible aún en `package.json` — instalar). Leaflet/Nivo/Plotly NO (solo a pedido explícito).

## 6. Criterios de aceptación (`qa-tester`)

Backend (Jest + Supertest, skill `qa-qc-react-nestjs`):
- [ ] `POST /events` con body válido persiste `VisitEvent` y responde 201 con el `visitorId` en cookie.
- [ ] `POST /events` con `path` inválido (sin `/`, con caracteres prohibidos, >255) responde 400.
- [ ] `POST /leads` válido persiste `Lead` con `status='new'`, `email` normalizado (lowercase) y responde 201 (sin exponer campos internos).
- [ ] `POST /leads` con HTML en `message` (ej. `<script>`) se sanitiza antes de persistir.
- [ ] `POST /leads` con `email` malformado o `message` < 1 o > 2000 responde 400.
- [ ] `GET /leads` y `GET /overview` sin `X-Admin-Key` (o incorrecta) responde 401/403.
- [ ] `PATCH /leads/:id/status` cambiado a `contacted` persiste y devuelve el lead actualizado; el `:id` inexistente o uuid inválido responde 404.
- [ ] `GET /overview` agrega correctamente series diarias, top páginas y países (datos sembrados).
- [ ] Throttling activo: exceder el límite de `POST /events` o `POST /leads` responde 429.
- [ ] Migraciones aplican desde cero (fresh DB) sin errores.

Frontend (Vitest + RTL + MSW):
- [ ] `/contact` renderiza el form; submit válido llama a `useCreateLead` y muestra el estado de éxito.
- [ ] Errores de validación del form se muestran por campo (aria-describedby) y bloquean el submit.
- [ ] 429 del backend → mensaje "demasiados intentos" sin perder el texto ingresado.
- [ ] `AnalyticsPanel` con datos mockeados renderiza KPIs + charts; sin datos renderiza vacío; error de fetch → mensaje + retry.
- [ ] `LeadsPanel` lista leads, filtra por estado y mueve de estado con rollback si falla (mutation optimista).
- [ ] El tracking dispara un pageview por cambio de ruta (mock de `navigator.sendBeacon`) y NO dispara si hay `engagement-opt-out` o el visitante es admin (si aplica flag).
- [ ] i18n: cambiar idioma actualiza `contact.*` y `dashboard.*` sin recargar.
- [ ] `npm run build`, `npm run lint`, `npm run type-check` y tests verdes en frontend; `npm run test` + lint verdes en backend.

**Casos negativos/límite a cubrir explícitamente**:
- [ ] `message` exactamente en el límite de 1 y de 2000 caracteres.
- [ ] Email con mayúsculas → duplicado/lookup case-insensitive (decisión documentada §7).
- [ ] `overview` sin ningún evento en el rango → arrays vacíos, no crash.
- [ ] `PATCH :id/status` con status fuera del enum → 400.
- [ ] Rutas de tracking con caracteres especiales (acentos, query strings) se registran sin romper la regex.

## 7. Decisiones registradas

(a revisar al cierre para `/context/project-context.md`)
- **Guard interino `X-Admin-Key`**: los endpoints privados del dashboard usan una API key de administrador en env (`ADMIN_API_KEY`) hasta que aterrice el auth real (JWT + refresh) como feature siguiente — se anota como deuda técnica para no bloquear el primer uso del backend.
- **Endpoints públicos de escritura**: `POST /events` y `POST /leads` son mutaciones públicas por naturaleza (formulario/tracking) → se permiten sin auth pero con validación estricta + sanitización + rate limit + caps de longitud. Esto puede requerir aclarar la redacción de `/context/project-context.md` §4 ("todo endpoint... mutación lleva auth") para distinguir write-público de write-administrativo.
- **Anonimización**: nunca se almacena IP ni PII; `visitorId` es UUID aleatorio por sesión (cookie `engagement_vid` HttpOnly/SameSite=Lax) y `country` proviene solo del header de proxy.
- **Agregación en servidor** (SQL group by), no en cliente.
- **Rango por defecto `30d`** y toggle `7d/30d`; series diarias.
- **Intención del lead** como enum explícito (`contact`/`hiring`/`collab`) para alimentar el objetivo de "generar leads de contratación" medible.
- **Tracking con `sendBeacon`** + fallback `fetch keepalive` para evitar el problema de page-unload.

## 8. Historial de handoffs

| Fecha | De → A | Artefacto | Notas |
|---|---|---|---|
| 2026-09-24 | orchestrator → designer | esta spec | diseñar UX `/contact` + tabs dashboard (analytics/leads), §3, y pasar a backend la lista de requisitos de contrato |
| 2026-09-24 | designer → backend (pendiente) | §3 UX + requisitos | backend define §4/contrato completo en `/specs/api/portfolio-engagement.md`, respetando §6 |
| 2026-09-24 | backend → frontend (pendiente) | contrato publicado + migraciones | frontend implementa §5 consumiendo los DTOs publicados |
| 2026-09-24 | frontend → qa-tester (pendiente) | pages/panels/hooks/api client | QA cubre §6; build/lint/type-check + tests verdes |
| 2026-09-24 | qa-tester → orchestrator (pendiente) | DoD verificado | spec marcada `completa`; registrar decisiones §7 en project-context |