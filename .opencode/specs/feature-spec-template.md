# Plantilla de Especificación de Feature

Usada por el `orchestrator` al iniciar una feature multi-agente, y por `designer`/`frontend` al definir el punto de partida de un handoff (ver `/context/handoff-protocol.md`). Copia esta plantilla a un nuevo archivo por feature dentro de `/specs` (ej. `/specs/cart-checkout.md`) y complétala antes de asignar trabajo a los agentes.

> Adaptado a `neojapan-tienda`: el equipo es `designer`, `frontend`, `backend`, `qa-tester` — proyecto **full-stack** (Next.js 16 + NestJS/Prisma), ver `/context/project-context.md` §2 y §4 y `/agents/agents-README.md`. La sección 4 ("Contrato de datos") la define `backend` (schemas Zod en `packages/schemas` como fuente única de verdad) cuando la feature tiene datos propios, y se documenta en `/specs/api-contract-template.md`; si la feature consume un recurso externo (Cloudinary, etc.), el schema lo define quien consuma el recurso (ver `/context/handoff-protocol.md`, handoff 5). No se deja vacía ni se asigna a un agente que no corresponde.

---

## [Nombre de la feature]

**Estado**: `borrador` / `en diseño` / `en desarrollo` / `en QA` / `completa`
**Agentes involucrados**: (ej. designer, backend, frontend, qa-tester)

### 1. Problema y objetivo

- **Problema que resuelve**:
- **Usuario objetivo**:
- **Criterio de éxito** (¿cómo se sabe que funcionó?):

### 2. Alcance

**Incluye**:
-

**No incluye (fuera de alcance para esta iteración)**:
-

### 3. Especificación UX/UI (`designer`)

- **Flujo de usuario** (pasos, en orden):
- **Estados a diseñar**: default / hover / focus / active / disabled / loading / error / vacío
- **Casos de error a contemplar**:
- **Requisitos de accesibilidad específicos** (si hay algo más allá del estándar base):

### 4. Contrato de datos (`backend`, o quien consuma un recurso externo — ver nota arriba)

```ts
// API propia (backend): schemas Zod en packages/schemas, endpoints, request/response tipados
// (o "no aplica" si la feature no involucra datos propios)
// Documentado completo en /specs/api-contract-template.md

// Response (éxito)
// (schema/type)

// Response (error)
// (forma del error, códigos HTTP reales de la API propia o externa: 404, 403 rate limit, etc.)
```

- **Reglas de negocio/validación**:
- **Casos de fallo de la API (propia o externa) a contemplar** (404, 403/rate limit, timeout, respuesta malformada):

### 5. Implementación de UI (`frontend`)

- **Componentes nuevos o modificados**:
- **Estado cliente necesario** (Zustand) vs. **estado servidor** (TanStack Query):
- **Consumo del contrato**: si la feature usa la API propia, `frontend` consume el contrato que `backend` publicó (handoff `backend → frontend`), no inventa un shape distinto.
- **Dependencias de visualización** (recharts — ver skill `recharts-charts`; Nivo/Plotly/Leaflet solo a pedido explícito), si aplica:

### 6. Criterios de aceptación (`qa-tester`)

Lista de condiciones verificables, no ambiguas — cada una debe poder convertirse directamente en un test:

- [ ]
- [ ]
- [ ]

**Casos negativos/límite a cubrir explícitamente**:
- [ ]
- [ ]

### 7. Decisiones registradas

Cualquier decisión tomada durante esta feature que deba persistir en `/context/project-context.md`:

-

### 8. Historial de handoffs

| Fecha | De → A | Artefacto | Notas |
|---|---|---|---|
| | | | |
