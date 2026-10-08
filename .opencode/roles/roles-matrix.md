# Matriz de Roles y Responsabilidades

Referencia rápida de quién hace qué dentro del equipo de agentes. Complementa a `/orchestration/orchestrator.md` (que define el *flujo*) describiendo el *alcance* de cada rol con más detalle — útil para que el orquestador y el usuario resuelvan rápido a quién corresponde una tarea ambigua.

## Roles

| Rol | Archivo | Responsable de | No responsable de |
|---|---|---|---|
| **Frontend Senior** | `/agents/frontend.md` | Páginas/rutas Next.js (App Router, RSC, `use cache`), estado cliente (TanStack Query/Zustand), consumo de la API propia, visualización de datos, rendimiento de carga/render y SEO de fichas | Definir el contrato de la API propia (lo expone `backend`), decisiones de identidad visual de marca |
| **Backend Senior** | `/agents/backend.md` | API propia (NestJS), DTOs/validación, autenticación/autorización, base de datos (PostgreSQL/Prisma), contratos de datos de la API propia, integración con APIs externas (Cloudinary), infraestructura y despliegue (Docker/CI) | Implementación de UI, decisiones de identidad visual, consumo cliente de las APIs |
| **Diseñador UX/UI** | `/agents/designer.md` | Flujo de usuario, jerarquía visual, sistema de diseño, especificación de estados e interacción, accesibilidad de la interfaz | Implementación de código, decisiones de arquitectura técnica, viabilidad final de performance (la señala `frontend`) |
| **QA Engineer** | `/agents/qa-tester.md` | Estrategia y automatización de testing (frontend y backend), identificación de casos límite, reportes de bugs reproducibles, gates de calidad en CI | Corregir el bug que encuentra (lo reporta al agente responsable), decisiones de producto sobre qué comportamiento es "correcto" cuando no está definido |
| **Orquestador** | `/orchestration/orchestrator.md` | Clasificar solicitudes, secuenciar el flujo entre agentes, gestionar handoffs, mantener `/context` coherente, escalar conflictos al usuario | Ejecutar trabajo especializado de cualquier agente directamente |

## Matriz de decisión rápida — "¿a quién le corresponde esto?"

| Tipo de solicitud | Agente(s) principal(es) | Secuencia sugerida |
|---|---|---|
| Nueva feature de punta a punta (UI + datos) | `designer` → `frontend` → `qa-tester` | Completa, ver `orchestrator.md` |
| Feature full-stack con API propia (endpoints nuevos) | `designer` → `backend` (contrato) → `frontend` (consumo) → `qa-tester` | Completa con backend |
| Endpoint nuevo / módulo de backend (sin UI) | `backend` → `qa-tester` | Corta backend |
| Contrato de API nueva / cambio de contrato | `backend` (define el contrato) → `frontend` (consume) → `qa-tester` | Contract primero |
| Integración con API externa (Cloudinary, courier, pasarela futura) | `backend` (puerto/adaptador) o `frontend` (directo) según cómo se consuma | Según arquitectura |
| Infraestructura / despliegue (Docker, CI/CD, entornos) | `backend` (con `devops-docker-kubernetes`) → `qa-tester` (smoke) | Técnica, sin `designer` |
| Nuevo componente visual sin datos nuevos | `designer` → `frontend` | Corta |
| Bug reportado en producción | `qa-tester` (reproduce y diagnostica) → agente dueño del artefacto (fix) → `qa-tester` (test de regresión) | Cíclica |
| Definir estrategia de testing antes de implementar | `qa-tester` (criterios de aceptación) → luego el flujo normal | QA adelantado |
| Revisión de código existente | El agente dueño del dominio del código revisado | Directa |
| Dashboard / reportes con gráficos | `designer` (layout) → `frontend` (con `recharts-charts`) → `qa-tester` | Completa |
| POS / venta en mostrador | `designer` (flujo) → `backend` (Sale/pagos/caja) → `frontend` (pantalla) → `qa-tester` | Completa |
| Refactor interno sin cambio de contrato ni UI | `frontend` (dueño del código) → `qa-tester` (regresión) | Corta |
| Pipeline CI/CD o infraestructura de deploy | `backend` o `orchestrator` directamente, con `cicd-expert-pipelines` / `devops-docker-kubernetes` | Técnica, sin `designer` |
| Decisión de negocio/producto sin especificación previa | Ninguno — se escala al usuario antes de asignar | Bloqueante |

## Incidentes en producción

Un incidente (SEV1/SEV2) suspende temporalmente esta matriz de asignación normal — sigue el procedimiento dedicado en `/orchestration/incident-runbook.md`, donde la prioridad es mitigar antes de investigar causa raíz, y la asignación al agente dueño del dominio ocurre después de restaurar el servicio, no antes.

## Principio de resolución de ambigüedad

Cuando una tarea no encaja claramente en una fila de la tabla, el criterio de desempate es: **¿qué artefacto se está modificando?**
- Se modifica UI/interacción → `frontend` (y `designer` si cambia el diseño, no solo la implementación).
- Se modifica o crea cobertura de pruebas → `qa-tester`.
- Si toca más de uno, es multi-agente — el orquestador arma la secuencia.
