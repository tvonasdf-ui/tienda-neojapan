# Portfolio Engagement — Contrato de API (Analítica + Leads)

**Base path**: `/api/v1`
**Agente dueño**: `backend` (API propia NestJS)
**Consumido por**: `frontend` (páginas `/contact` y `/dashboard`), `qa-tester`
**Spec de feature**: `/specs/portfolio-engagement.md`

> Contrato de la feature **Portfolio Engagement**. Autenticación de endpoints privados: header `X-Admin-Key` (guard interino, ver decisión en la spec §7). Formatos de error NestJS: `{ statusCode, message, timestamp }`.

---

## `POST /api/v1/engagement/events`

**Descripción**: registra un evento de página (pageview) del sitio. Público y anónimo.

**Autenticación requerida**: No
**Permisos**: público
**Rate limit**: 60 req/min por IP (throttler global)

**Request body**:
```ts
{
  kind: 'pageview';           // enum, solo 'pageview' en esta iteración
  path: string;              // 1-255, regex ^\/[a-zA-Z0-9/_-]*$
  referrer?: string | null;  // opcional, <=500
}
```

**Behavior**: si el visitante no trae la cookie `engagement_vid` (HttpOnly, SameSite=Lax), el servidor genera un UUID v4 y lo devuelve en `Set-Cookie`. Se derivan `country` (del header `cf-ipcountry`/`x-country-code` si existe, alpha-2) y `device` (del `User-Agent`: desktop/mobile/tablet/unknown). Nunca se persiste la IP.

**Response 201 (éxito)**:
```ts
{ acknowledged: true }
```

**Response 400 (validación fallida)**:
```ts
{ statusCode: 400; message: string[]; timestamp: string }
```

**Response 429 (rate limit)**:
```ts
{ statusCode: 429; message: string; timestamp: string }
```

**Casos límite conocidos**:
- `path` con query string (`/career?x=1`) — se registra el path sin query.
- `path` con acentos o caracteres no ASCII — regex lo rechaza (400) o el cliente los envía codificados.
- Multiple pageviews de la misma sesión — mismo `visitorId` (cookie), no se duplica la identidad.

---

## `POST /api/v1/leads`

**Descripción**: crea un lead de contacto desde el formulario público.

**Autenticación requerida**: No
**Permisos**: público
**Rate limit**: 5 req/h por IP

**Request body**:
```ts
{
  name: string;          // 1-100, trim requerido
  email: string;         // formato email válido, requerido (se normaliza a lowercase)
  intent: 'contact' | 'hiring' | 'collab';   // requerido
  message: string;       // 1-2000, trim requerido, se sanitiza (sin HTML)
}
```

**Response 201 (éxito)** — nunca expone campos internos:
```ts
{
  id: string;            // UUID
  createdAt: string;     // ISO 8601
  // el resto de campos es interno (status, source, updatedAt)
}
```

**Response 400 (validación fallida)**:
```ts
{ statusCode: 400; message: string[]; timestamp: string }
```

**Response 413 (body demasiado grande)**: límite de body configurado en el servidor.

**Response 429 (rate limit)**:
```ts
{ statusCode: 429; message: string; timestamp: string }
```

**Casos límite conocidos**:
- HTML/script en `message` — se sanitiza antes de persistir (nunca se almacena crudo).
- Email con mayúsculas — se normaliza (`Foo@Bar.com` → `foo@bar.com`); duplicados se consideran el mismo email (decisión: sin merge automático en esta iteración, se marcan en el panel).
- `message` exacto en los límites (1 y 2000) — válido en ambos bordes.

---

## `GET /api/v1/leads`

**Descripción**: lista los leads para el dashboard (paginada, filtrable por estado).

**Autenticación requerida**: Sí — `X-Admin-Key` (Bearer-style, guard interino)
**Permisos**: admin
**Rate limit**: default global

**Query params**: `status?: 'new' | 'contacted' | 'done'`, `page?: number (default 1)`, `limit?: number (default 25, max 100)`

**Response 200 (éxito)**:
```ts
{
  items: Array<{
    id: string;            // UUID
    name: string;
    email: string;
    intent: 'contact' | 'hiring' | 'collab';
    message: string;
    status: 'new' | 'contacted' | 'done';
    source: string;        // 'contact-form'
    createdAt: string;     // ISO 8601
    updatedAt: string;     // ISO 8601
  }>;
  total: number;
  page: number;
  limit: number;
}
```

**Response 401/403** (falta o inválida la `X-Admin-Key`):
```ts
{ statusCode: 401; message: string; timestamp: string }  // 403 según guard
```

**Response 400** (query inválida, ej. `limit > 100` o `status` fuera de enum).

---

## `PATCH /api/v1/leads/:id/status`

**Descripción**: actualiza el estado de un lead (cola de atención del dashboard).

**Autenticación requerida**: Sí — `X-Admin-Key`
**Permisos**: admin

**Request body**:
```ts
{ status: 'new' | 'contacted' | 'done' }
```

**Response 200 (éxito)**: lead completo actualizado (misma shape que `GET /leads` item).

**Response 400** (`status` fuera de enum o cuerpo vacío).

**Response 404**: `:id` no existe o UUID malformado:
```ts
{ statusCode: 404; message: string; timestamp: string }
```

**Response 401/403** (sin `X-Admin-Key` válida).

**Casos límite conocidos**:
- Actualizar al mismo estado → 200 idempotente (no error).
- UUID malformado → 404 (no 500).

---

## `GET /api/v1/engagement/overview`

**Descripción**: métricas agregadas del portafolio para el dashboard.

**Autenticación requerida**: Sí — `X-Admin-Key`
**Permisos**: admin
**Rate limit**: default global

**Query params**: `range?: '7d' | '30d'` (default `30d`)

**Response 200 (éxito)**:
```ts
{
  totalVisits: number;          // pageviews en el rango
  uniqueVisitors: number;       // visitorId distintos
  leadsTotal: number;           // leads en el rango (por createdAt)
  leadsByStatus: { 'new': number; 'contacted': number; 'done': number };
  dailySeries: Array<{ date: string; visits: number; visitors: number }>;  // 'YYYY-MM-DD'
  topPages: Array<{ path: string; visits: number }>;        // orden desc, máx 10
  topReferrers: Array<{ referrer: string; visits: number }>; // orden desc, máx 10
  countries: Array<{ code: string; visits: number }>;        // alpha-2, orden desc
}
```

**Response 200 (sin datos)**: arrays vacíos y KPIs en 0 — no es error.

**Response 401/403** (sin `X-Admin-Key` válida).

**Response 400** (`range` fuera de `7d|30d`).

**Casos límite conocidos**:
- Rango con 0 eventos → `dailySeries` con todos los días en 0 o [...] (decisión: devolver solo días con datos; QA cubre ambos con sembrado).
- `visitorId` null/ausente (evento sin cookie) → cuenta como visitante "anon" propio, nunca se suma al `uniqueVisitors` principal.

---

## Convención general (inline de `/specs/api-contract-template.md`)

- Un bloque por endpoint, método + path como encabezado.
- Todos los códigos HTTP posibles documentados.
- Forma exacta del body (TypeScript).
- Casos límite explícitos para alimentar `qa-tester`.
- Cuando el contrato cambie, se actualiza en el mismo PR que el código.

## Relación con OpenAPI/Swagger

`backend` anota los endpoints con `@nestjs/swagger` (`@ApiProperty`, `@ApiResponse`, `@ApiBearerAuth` para los protegidos) siguiendo este archivo como referencia de diseño — no como documentación póstuma. La página `/api/docs` (Swagger UI) queda disponible solo en entornos con `ENABLE_SWAGGER=true` (no en producción por defecto).