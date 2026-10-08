# Definition of Done

Checklist único que el `orchestrator` usa para cerrar una feature o tarea como completa. Ninguna feature se marca `completa` en `/specs/[feature].md` si no cumple lo aplicable a su alcance. No todo ítem aplica a toda tarea (un fix puntual no pasa por `designer`), pero cuando aplica, es obligatorio — no una sugerencia.

> Adaptado a `neojapan-tienda`: proyecto **full-stack** monorepo — tienda y panel/POS en Next.js 16 + API NestJS con PostgreSQL/Prisma (ver `/context/project-context.md`). Hay secciones para recursos externos, backend propio, frontend, diseño y testing; aplica la que corresponda al alcance de la tarea.

## Datos externos — recursos externos (Cloudinary, courier, etc.; si la tarea consume o modifica ese consumo)

- [ ] Toda respuesta externa se valida con un schema Zod propio (en `packages/schemas`) antes de usarse — nunca se confía en el shape devuelto sin parsear
- [ ] Casos de fallo contemplados explícitamente: 404 (recurso inexistente), 403/rate limit, timeout, respuesta malformada
- [ ] El fetch pasa por TanStack Query (caché, invalidation, reintentos configurados), nunca un `useEffect` con fetch a pelo
- [ ] Sin llamadas reales a servicios externos en tests — siempre mockeadas con MSW usando el mismo schema Zod como contrato

## Backend propio — API NestJS (si la tarea tocó backend)

- [ ] DTOs con validación estricta de entrada (`whitelist: true`, `forbidNonWhitelisted: true`) — nunca se confía en el shape de entrada sin validar
- [ ] Autenticación y autorización separadas (guards de identidad vs. rol/ownership); rate limiting en endpoints sensibles
- [ ] Manejo de errores que no filtra detalles internos (stack traces, mensajes del motor de DB) al cliente
- [ ] Queries parametrizadas — sin concatenación de strings SQL; transacciones explícitas en operaciones multi-paso atómicas
- [ ] Migraciones versionadas y revisadas; cambios destructivos con plan de reversión
- [ ] Sin `any` implícito ni explícito sin justificación documentada
- [ ] Contrato de la API documentado/actualizado en `/specs/api-contract-template.md` en el mismo PR que el código
- [ ] Tests de integración/e2e con Supertest de los endpoints nuevos, con dependencias externas mockeadas (sin red real)

## Frontend (si la tarea tocó UI)

- [ ] Estados completos implementados: loading, error, vacío, éxito (no solo el happy path)
- [ ] Rutas/componentes pesados cargados de forma diferida (`next/dynamic` o Server Components), no todo el bundle cargado de entrada; `'use cache'`/`cacheTag` donde corresponda
- [ ] Sin `any` implícito ni explícito sin justificación documentada
- [ ] Componentes de gráficos (recharts) con altura de contenedor explícita
- [ ] Textos visibles al usuario en español (tienda Chile); código/identificadores en inglés
- [ ] Estado en Zustand es realmente estado de UI, no datos que ya vienen de TanStack Query

## Diseño (si la tarea tocó UX/UI)

- [ ] Contraste WCAG AA verificado, no asumido
- [ ] Todo elemento interactivo alcanzable por teclado con foco visible
- [ ] Ningún estado/información crítica comunicada solo por color
- [ ] Acentos decorativos usan únicamente el acento `cyan` de marca (colores semánticos — green/red/amber — aparte, ver restricción en `/context/project-context.md` §4)
- [ ] Especificación con valores exactos (no "un poco más de espacio") entregada a `frontend`

## Testing (siempre, salvo excepción explícita del usuario)

- [ ] Casos negativos cubiertos: respuesta malformada/inesperada de la API, rate limit, recurso inexistente, stock insuficiente, sin resultados, timeout, límites de input en formularios
- [ ] Test de regresión si la tarea se originó en un bug reportado
- [ ] Sin tests flaky introducidos (determinismo verificado, sin `setTimeout` real, sin llamadas reales a red)
- [ ] Cobertura de diff razonable en el código nuevo/modificado — no perseguir 100% global
- [ ] E2E (Playwright) solo si la tarea toca uno de los flujos críticos del producto — no se exige por defecto en cada cambio de UI

## CI/CD y build (si la tarea afecta despliegue)

- [ ] Pipeline pasa lint → typecheck → tests → build sin pasos salteados
- [ ] Build de Next.js (`next build`) completa sin errores ni warnings no revisados (incluye los de `apps/web` y `apps/admin` según alcance)
- [ ] Si el cambio afecta la capa PWA del panel (`apps/admin`), se verificó que el manifest/service worker siguen siendo válidos
- [ ] Sin secretos en texto plano en el repo (tokens de API, variables de entorno)
- [ ] Preview deployment de Vercel revisado antes de mergear a `main` en cambios visuales significativos

## Contexto y documentación

- [ ] Decisiones reutilizables registradas en `/context/project-context.md` (sección "Decisiones de arquitectura registradas")
- [ ] Si la tarea introdujo una convención nueva (nomenclatura, patrón adoptado), documentada donde el resto del equipo la va a encontrar, no solo mencionada en la conversación
- [ ] Handoffs entre agentes documentados según `/context/handoff-protocol.md` si la tarea fue multi-agente

## Cierre

- [ ] El `orchestrator` confirma que cada agente involucrado dio su artefacto por completo (no "a medias, se termina después" sin que quede declarado explícitamente como pendiente)
- [ ] Si algún ítem aplicable no se cumplió, se declara explícitamente como deuda técnica conocida — nunca se omite en silencio
