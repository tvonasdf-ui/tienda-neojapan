# Agentes de Neojapan Tienda

> Equipo de agentes de IA especializados para desarrollar la tienda **`neojapan-tienda`**: proyecto full-stack — monorepo pnpm + Turborepo con tienda y panel/POS en **Next.js 16** (App Router, React 19.2, TypeScript estricto) y **API NestJS** con PostgreSQL/Prisma + Redis, contratos Zod en `packages/schemas`. No es una plantilla genérica — cada agente, skill y documento de contexto está adaptado a este proyecto.

---

## Contenido

1. [Vista general](#vista-general)
2. [El equipo](#el-equipo)
3. [Estructura del repositorio](#estructura-del-repositorio)
4. [Cómo se relacionan las piezas](#cómo-se-relacionan-las-piezas)
5. [Empezar a usar los agentes](#empezar-a-usar-los-agentes)
6. [Al adaptar este repo a otro proyecto](#al-adaptar-este-repo-a-otro-proyecto)
7. [Integridad del repositorio](#integridad-del-repositorio)
8. [Licencia y autor](#licencia-y-autor)

---

## Vista general

Este repositorio define cómo trabaja un **equipo de agentes de IA** sobre `neojapan-tienda`: quién hace qué, qué conocimiento especializado usa cada uno, qué reglas respetar y cómo se pasa el trabajo entre agentes.

| | |
|---|---|
| Agentes | 5 (`orchestrator`, `frontend`, `backend`, `designer`, `qa-tester`) |
| Skills | 14 en `/skills` (8 activas + 5 de stack ampliado a pedido + 1 workflow de revisión) |
| Documentos de contexto | 5 en `/context` |
| Especificaciones | 2 plantillas en `/specs` (+ 3 ejemplos archivados en `/specs/examples`) |
| Licencia | MIT |

La navegación completa de los archivos `.md` (mapa de conexiones, orden de lectura y reglas) vive en [`AGENTS.md`](./AGENTS.md) — es el punto de entrada para cualquier cliente de agentes.

## El equipo

| Agente | Archivo | Dominio |
|---|---|---|
| **Orquestador** | [`orchestration/orchestrator.md`](./orchestration/orchestrator.md) | Clasifica solicitudes, secuencia el flujo entre agentes, gestiona handoffs y mantiene `/context` coherente |
| **Frontend Senior** | [`agents/frontend.md`](./agents/frontend.md) | Next.js 16 / React 19, rutas y Server Components, estado cliente, consumo de la API propia, visualización de datos |
| **Backend Senior** | [`agents/backend.md`](./agents/backend.md) | NestJS, API propia, DTOs/validación, auth, PostgreSQL/Prisma, Redis/BullMQ, infraestructura/despliegue |
| **Diseñador UX/UI** | [`agents/designer.md`](./agents/designer.md) | Flujo de usuario, sistema de diseño de acento `cyan`, especificación de estados, accesibilidad |
| **QA Engineer** | [`agents/qa-tester.md`](./agents/qa-tester.md) | Estrategia y automatización de testing full-stack (Vitest/MSW/Jest/Playwright), casos límite, gates de calidad |

Para saber a qué agente corresponde cada tipo de solicitud, ver la [matriz de roles](./roles/roles-matrix.md).

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| [`/agents`](./agents/agents-README.md) | Identidad, tono, dominio técnico y autonomía de cada agente (`frontend`, `backend`, `designer`, `qa-tester`) + el índice del equipo |
| [`/orchestration`](./orchestration/orchestrator.md) | El `orchestrator` (clasifica y coordina el flujo) y el [runbook de incidentes](./orchestration/incident-runbook.md) |
| [`/roles`](./roles/roles-matrix.md) | Matriz de responsabilidades — qué agente resuelve qué tipo de solicitud |
| [`/skills`](./skills/skills-README.md) | Conocimiento especializado por dominio — carpetas `skills/<nombre>/SKILL.md` (formato que carga opencode) que los agentes consultan de forma autónoma — stack full-stack + librerías alternativas |
| [`/context`](./context/project-context.md) | Contexto vivo del proyecto: `project-context.md`, `design-tokens.md`, `handoff-protocol.md`, `definition-of-done.md`, `pr-convention.md` |
| [`/specs`](./specs/feature-spec-template.md) | Plantillas de features y de contratos de API para el proyecto Neojapan (los ejemplos del repo origen viven en [`/specs/examples`](./specs/examples)) |

## Cómo se relacionan las piezas

```
El usuario pide algo
        │
        ▼
orchestrator.md ───────────────────► clasifica la solicitud
        │
        ├──► roles-matrix.md            qué agente(s) corresponden
        ├──► context/project-context.md reglas a respetar (prioridad máxima)
        │
        ▼
agents/*.md (frontend | backend | designer | qa-tester)
        │
        ├──► skills/<nombre>/SKILL.md       conocimiento que ACTIVA la tarea
        ├──► context/handoff-protocol   al pasar trabajo al siguiente agente
        │
        ▼
specs/[feature].md ──► definition-of-done.md → "feature completa"
```

1. El usuario le pide algo a `orchestrator`, quien clasifica la solicitud y decide qué agente(s) la resuelven y en qué secuencia.
2. Cada agente consulta de forma autónoma las skills de `/skills` que su tarea activa y siempre revisa `/context` antes de empezar — el contexto del proyecto tiene prioridad sobre cualquier guía genérica.
3. El trabajo entre agentes se pasa con un **handoff explícito** ([`context/handoff-protocol.md`](./context/handoff-protocol.md)), nunca de forma implícita o resumida.
4. Una feature se marca `completa` en `/specs` solo cuando cumple el checklist de [`context/definition-of-done.md`](./context/definition-of-done.md).
5. Un incidente en producción suspende el flujo normal y sigue [`orchestration/incident-runbook.md`](./orchestration/incident-runbook.md).

## Empezar a usar los agentes

Este repositorio se consume desde un cliente/orquestador de agentes de IA (ej. Claude Code, opencode) que apunte al proyecto objetivo:

1. Ubica este repositorio junto al proyecto (`neojapan-tienda`) que va a trabajar.
2. Configura tu cliente para que cargue los archivos de `/agents` como definiciones de agente y conceda acceso de lectura a `/skills`, `/context` y `/specs`.
3. Dirige las solicitudes a `orchestrator.md` cuando no estén claramente acotadas a un solo dominio; invoca un agente de `/agents` directamente cuando el dominio es obvio (ver la [tabla del índice](./agents/agents-README.md)).

## Al adaptar este repo a otro proyecto

Este equipo está fuertemente acoplado a `neojapan-tienda` (stack, acento `cyan`, backend propio). Si lo vas a usar con **otro proyecto**, la adaptación es obligatoria y está documentada en un solo lugar:

➡️ **[`ADAPTING.md`](./ADAPTING.md)** — mapa archivo por archivo (qué editar y qué se rompe si lo saltas), 3 perfiles de proyecto (full-stack / frontend-only / otro stack de backend), orden de edición y checklist de verificación pre-uso.

## Integridad del repositorio

Este repo se mantiene por consistencia: si una tabla menciona un archivo que no existe, o una skill está listada pero no está en `/skills`, es un error a corregir, no un archivo implícito. Antes de cerrar un PR, verifica que:

- Los enlaces internos entre los `.md` apunten a archivos reales.
- Toda skill referenciada en una tabla de activación exista físicamente en `/skills` — y toda skill presente tenga un agente que la consuma (o esté listada como "disponible" en `skills-README.md`).
- Las skills de stack alternativo (Vite/TanStack SPA, Nivo, Plotly, Leaflet) se usen solo a pedido explícito — no se activan como default en el frontend Next.js/recharts de `neojapan-tienda`.

## Licencia y autor

Todos los archivos de este repositorio están bajo la [licencia MIT](https://opensource.org/licenses/MIT).

Autor: [Pedro Araya Gálvez](https://github.com/peteraraya).