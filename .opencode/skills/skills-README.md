# `/skills` — Índice de habilidades especializadas

Cada archivo `SKILL.md` en esta carpeta documenta el estándar del equipo para un dominio técnico específico: cuándo usar qué herramienta, errores comunes reales (no solo "cómo se usa" superficial), y un checklist rápido al generar código. Los agentes en `/agents` las consultan de forma autónoma cuando una tarea las activa — no hace falta pedirlo explícitamente.

Este equipo es **full-stack** (`neojapan-tienda`): tienda y panel/POS en **Next.js 16** + API **NestJS** con PostgreSQL/Prisma (monorepo pnpm + Turborepo). El catálogo de skills cubre ambos lados, más librerías alternativas disponibles a pedido.

## Skills activas en `neojapan-tienda`

| Skill | Dominio | Consumida principalmente por |
|---|---|---|
| `frontend-design` | Dirección visual, tipografía y estilo intencional; acento `cyan` de marca (ver `/context/design-tokens.md`) | `frontend`, `designer` |
| `ui-design-system` | Tokens de color/espaciado, componentes UI base, estados y contraste WCAG AA | `designer`, `frontend`, `qa-tester` |
| `nextjs-2026-best-practices` | Arquitectura Next.js 16 (App Router, RSC, `use cache`, PPR, Turbopack) — stack principal de tienda y panel | `frontend` |
| `nestjs-secure-backend` | Arquitectura, seguridad y testing de la API NestJS; DTOs, guards, módulos por dominio, Prisma | `backend` |
| `qa-qc-react-nestjs` | Estrategia de testing full-stack (React + NestJS): pirámide, contract testing, Vitest/MSW/Playwright, Jest/Supertest | `qa-tester`, `backend`, `frontend` |
| `cicd-expert-pipelines` | Pipelines de CI/CD (GitHub Actions): lint → typecheck → tests → build, secretos, entornos | `frontend`, `backend`, `orchestrator`, `qa-tester` |
| `devops-docker-kubernetes` | Dockerfile de producción, deploy de la API (Fly.io/Railway/Render), orquestación | `backend` |
| `recharts-charts` | Gráficos con recharts — reportes del panel (ventas, márgenes, rotación), tema y accesibilidad | `frontend`, `designer`, `qa-tester` |

## Skills disponibles (se activan a pedido explícito del usuario)

Existen físicamente en `/skills` y las consumen los agentes del equipo, pero **no se activan por defecto en `neojapan-tienda`**:

| Skill | Dominio | Cuándo se activa |
|---|---|---|
| `qa-qc-react-vite` | Setup de testing de una SPA Vite en particular (Vitest, RTL, jsdom, MSW) | a pedido explícito; el frontend de este proyecto es Next.js, no Vite |
| `vite-tanstack-tailwind` | Vite + TanStack Router/Query/Form + Tailwind (SPA client-side sin SSR) | a pedido explícito; no aplica al stack Next.js de este proyecto |
| `nivo-professional-charts` | Gráficos con Nivo (`@nivo/*`) | a pedido explícito (por defecto el panel usa `recharts-charts`) |
| `plotly-expert-charts` | Gráficos interactivos/científicos con react-plotly.js | a pedido explícito |
| `leaflet-maps-integration` | Mapas interactivos con react-leaflet (ej. cobertura de despacho) | a pedido explícito |

## Skills de workflow reutilizable (framework-agnostic)

| Skill | Dominio | Cuándo se activa |
|---|---|---|
| `fullstack-metodico` | Workflow genérico de desarrollo y revisión senior full-stack (entender contexto → planificar → implementar → revisar línea por línea → verificar) | cuando la tarea es escribir o revisar código end-to-end (multi-capa), no una pregunta puntual |

Cada skill es una carpeta `skills/<nombre>/SKILL.md` en esta misma carpeta (formato que exige opencode: el `name` del frontmatter DEBE coincidir con el nombre de la carpeta) — si una tabla de activación en `/agents` menciona una skill que no está en estas tablas, es un error a corregir, no una skill "implícita".

## Estructura de una skill (principio de abstracción)

Toda skill del catálogo sigue dos capas separadas, para que sea reutilizable al adaptar el repo a otro proyecto:

1. **Workflow / guía reutilizable** (el cuerpo): el "cómo" — decisiones, errores comunes, checklists. No contiene valores del proyecto; donde dependa de uno, referencia los parámetros o el `/context`.
2. **Sección `## Parámetros del proyecto`** (al inicio): los únicos valores específicos — stack y versiones, deploy, fuentes de datos, paleta/tipografía, comandos de verificación. Se edita al adaptar a otro proyecto (ver `/ADAPTING.md`), nunca el workflow.

Reglas derivadas:
- Una skill cuyo contenido es conocimiento de un **framework/stack** (ej. `nextjs-2026-best-practices`, `nestjs-secure-backend`) es reutilizable *tal cual* en cualquier proyecto que use ese stack — sus parámetros solo cambian versiones/valores del proyecto actual.
- Una skill cuyo dominio es la **identidad de un proyecto específico** (ej. `ui-design-system`) mantiene su valor en la metodología y mueve los valores (colores, fuentes, tokens) a la sección de parámetros, apuntando a `/context/design-tokens.md`.
- Lo que valga solo para un proyecto no se duplica en la skill: vive en `/context` y la skill lo referencia.

## Cómo se activan

Cada agente en `/agents` tiene su propia tabla de activación que mapea skills a disparadores concretos. Esta tabla es la vista global; para el detalle de activación de cada agente, ver su archivo correspondiente en `/agents`.

## Cómo evoluciona este catálogo

- Si una skill deja de aplicarse a `neojapan-tienda` (ej. por cambio de stack), se mueve a la tabla de "disponibles" o se elimina físicamente — no se deja en "activas" sin uso real.
- Si el proyecto agrega un dominio nuevo (otra base de datos, otra librería de gráficos, etc.), la skill correspondiente se agrega siguiendo la convención de abajo.

## Convención al agregar una nueva skill

1. Formato `SKILL.md` estándar: carpeta `skills/<nombre>/SKILL.md` con frontmatter `name` y `description` (la descripción debe listar disparadores concretos — frases/acciones que activan la skill, no solo el nombre del dominio). El `name` DEBE coincidir con el nombre de la carpeta (lo exige opencode); la carpeta se crea más veces que haga falta, nunca como zip.
2. Estructura de dos capas (ver arriba): workflow reutilizable + sección `## Parámetros del proyecto` con lo específico, apuntando a `/context` cuando aplica.
3. Contenido orientado a decisiones reales y errores comunes, no a documentación genérica de la librería/framework.
4. Cierra siempre con un checklist rápido aplicable al generar código.
5. Agrégala a la tabla correspondiente (activas, disponibles o workflow reutilizable) y a la tabla de activación de cada agente que deba consumirla en `/agents`.
6. Si la skill introduce una convención que otras skills ya cubrían parcialmente, revisa solapamiento antes de publicarla.
