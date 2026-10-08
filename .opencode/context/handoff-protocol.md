# Protocolo de Handoff entre Agentes

Este documento define **cómo se pasa trabajo de un agente a otro** dentro de un flujo coordinado por el orquestador (`/orchestration/orchestrator.md`). Un handoff mal definido es la causa más común de que dos agentes produzcan resultados incompatibles. Todo handoff sigue este formato — no se pasa trabajo de forma implícita o resumida en prosa.

> Adaptado a `neojapan-tienda`: proyecto **full-stack** — el backend NestJS define la API propia (handoff `backend → frontend`) y los contratos compartidos viven en `packages/schemas`. Donde una feature toca datos nuevos, el flujo es `designer → backend → frontend → qa-tester`.

## Estructura de un handoff

```markdown
### Handoff: [Agente origen] → [Agente destino]

**Artefacto entregado**: (qué se produjo — spec, schema de datos, contrato de API, componente, suite de tests)

**Contenido**:
(el artefacto completo o la referencia exacta a él — nunca un resumen que omita detalles accionables)

**Restricciones que el agente destino debe respetar**:
- (ej. "el contrato de la API lo define backend en /specs — no debe reinterpretarse sin actualizarlo primero")
- (ej. "el estado de error diseñado incluye estos 3 casos, todos deben cubrirse en la UI")

**Pendiente de confirmar** (si aplica):
- (cualquier ambigüedad que el agente destino debe resolver o escalar, no asumir en silencio)
```

## Handoffs típicos del flujo estándar

### 1. `designer` → `frontend`

**Entrega**: especificación de UX/UI — flujo de usuario, wireframe/mockup (o descripción visual detallada si no hay render), estados completos del componente (default/hover/focus/loading/error/vacío), valores exactos de diseño (espaciado, color del acento `cyan`, tipografía).

**Restricción clave**: `frontend` no reinterpreta ni simplifica los estados definidos por `designer` sin señalarlo — si un estado es técnicamente costoso de implementar, se reporta como conflicto al orquestador, no se omite silenciosamente.

### 2. `designer` → `backend` (cuando la feature implica datos de negocio propios)

**Entrega**: qué datos necesita la interfaz (entidades, campos, relaciones), cómo se muestran, y qué pasa visualmente si el dato no está disponible.

**Restricción clave**: `backend` es quien traduce esto a un contrato de API real (DTOs, validación, endpoints) — el diseño informa *qué* datos hacen falta, pero la especificación técnica del contrato (rutas, métodos, shapes, códigos de estado) la define `backend`, no `designer`.

### 3. `backend` → `frontend` (contrato de la API propia)

**Entrega**: el contrato exacto de la API propia que `frontend` va a consumir — endpoints, métodos, request/response con tipos, códigos de estado posibles, y documentado en `/specs/api-contract-template.md`.

**Restricción clave**: este contrato es la fuente de verdad para el consumo — `frontend` no inventa un shape distinto al que `backend` realmente expone, ni `backend` cambia el contrato sin actualizar `/specs` y avisar a `frontend`. El schema Zod del lado cliente se deriva del contrato, no al revés.

### 4. `frontend` o `backend` → `qa-tester` (implementación + contrato)

**Entrega (frontend)**: componentes/hooks de TanStack Query implementados, más los casos límite ya identificados durante la implementación.

**Entrega (backend)**: endpoints/servicios implementados con su contrato, más los casos de fallo conocidos (validación, auth, dependencias externas, casos de borde de la BD).

**Restricción clave**: `qa-tester` no se limita a los casos que el agente señaló — los toma como punto de partida, no como el universo completo de casos a cubrir. Para la API propia, verifica el contrato real publicado (e2e con Supertest), no el shape "que le parezca".

### 5. Contrato de un recurso externo (Cloudinary, courier, pasarela futura)

**Aplica cuando**: el recurso lo consume el backend (p. ej. upload/firma de Cloudinary) o, excepcionalmente, el frontend.

**Entrega**: el schema Zod exacto que valida la respuesta del recurso externo para el caso en cuestión (definido por quien consuma el recurso y registrado en `packages/schemas`), más los casos de fallo conocidos (rate limit, 404, timeouts, campos ocasionalmente ausentes en la respuesta real).

**Restricción clave**: ese schema es la fuente de verdad para los mocks de MSW que `qa-tester` escribe — no se inventa un shape de respuesta distinto al que el código realmente valida en runtime, o los tests certifican un contrato que el código no respeta.

### 6. `qa-tester` → `frontend`, `backend` o `designer` (hallazgo de bug o gap)

**Entrega**: reporte estructurado (pasos para reproducir, esperado vs. actual, severidad) dirigido específicamente al agente responsable del artefacto donde está el gap — `frontend`/`backend` si es de implementación, `designer` si el gap es que un estado nunca fue especificado.

**Restricción clave**: el hallazgo no se cierra hasta que el agente responsable confirma el fix y `qa-tester` valida con un test de regresión — no se da por resuelto solo porque se corrigió el código.

## Reglas generales

- **El artefacto de un handoff es siempre concreto y completo** — contrato de API real, código real, schema real, especificación real. Nunca "el componente debería tener algo como..." sin la definición exacta.
- **Toda restricción no respetada se reporta como conflicto al orquestador**, no se resuelve unilateralmente entre dos agentes sin que quede registrado.
- **Un handoff que introduce una convención reutilizable** (ej. un patrón de manejo de errores de la API propia o de un recurso externo adoptado en el proceso) se registra en `/context/project-context.md`, sección "Decisiones de arquitectura registradas" — para que el próximo flujo no tenga que redescubrirlo.
- Si el contrato de la API propia cambia, `backend` actualiza `/specs/api-contract-template.md` en el mismo PR que el código — un contrato desactualizado es peor que no tener contrato, porque genera falsa confianza.