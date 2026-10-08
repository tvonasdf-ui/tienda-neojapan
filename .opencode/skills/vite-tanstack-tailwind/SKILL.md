---
name: vite-tanstack-tailwind
description: Guía técnica del stack Vite + React 19 + TanStack Router/Query/Form + Tailwind CSS para SPA client-side sin Next.js ni SSR (los valores del proyecto objetivo viven en los Parámetros del proyecto). Úsala siempre que la tarea implique ruteo (TanStack Router), estado de datos servidor/cliente (TanStack Query/Zustand/Form), configuración de build (Vite, PWA), o estilos con Tailwind en un proyecto con ese stack. También aplica al revisar restricciones reales de implementación antes de proponer un patrón de interacción o al escribir/depurar código de componentes, hooks o rutas.
---

# Stack de implementación — Vite + React + TanStack + Tailwind (SPA client-side)

Referencia técnica del stack definido en los **Parámetros del proyecto** (abajo): una SPA client-side sin SSR. Todo el cuerpo de la skill asume ese stack; si tu proyecto difiere, edita los Parámetros, **nunca** el workflow de abajo.

## Parámetros del proyecto — no activa en `neojapan-tienda`

> Skill **disponible a pedido** en este proyecto: la tienda y el panel son **Next.js 16** (SSR/RSC) — la skill activa del stack es `nextjs-2026-best-practices` (ver `/skills/skills-README.md`). Si se activa en otro proyecto con stack SPA Vite, rellena esta tabla con los valores de ese proyecto antes de usarla.

| Parámetro | Valor para un proyecto SPA Vite genérico (ejemplo, no default) |
|---|---|
| Arquitectura | SPA estática client-side, sin SSR |
| Deploy | Plataforma estática de ese proyecto; PWA opcional vía `vite-plugin-pwa` |
| Datos de servidor | TanStack Query consumiendo la API que defina ese proyecto, validada con schema Zod propio |
| Estado UI | Zustand solo para UI pura |
| Ruteo | TanStack Router con rutas tipadas (`createRoute`/`createRootRoute`) |
| Estilos | Tokens en `/context/design-tokens.md` del proyecto; dark mode con variantes `dark:` |
| SEO | Mínimo por diseño (SPA sin SSR) |

## 1. Build — Vite 6

- `npm run build` produce `dist/` estático — cualquier feature que asuma un entorno de servidor (cookies httpOnly de servidor, middleware de edge, `getServerSideProps`) no aplica aquí; si algo lo necesita, es una señal de que el proyecto necesitaría un backend propio (no existe hoy, ver `/context/project-context.md` §4).
- PWA vía `vite-plugin-pwa` — cualquier cambio que afecte assets estáticos o rutas nuevas debe verificar que el manifest/service worker generado siga siendo válido (ver `/context/definition-of-done.md`, sección CI/CD).
- **React Compiler** (`babel-plugin-react-compiler`) hace memoización automática — no escribas `useMemo`/`useCallback` manuales "por si acaso"; son redundantes salvo un caso medido de perf real que el compiler no resuelve.
- SEO es mínimo por diseño (SPA sin SSR) — no inviertas esfuerzo en metadata dinámica ni prerendering salvo pedido explícito.

## 2. Ruteo — TanStack Router (`src/app/router.tsx`)

- Rutas tipadas con `createRoute`/`createRootRoute` — una ruta nueva sigue el mismo patrón que las existentes (ver el layout global y los `Link` de navegación desktop/mobile ya definidos).
- Code splitting de rutas pesadas (gráficos, 3D) vía `React.lazy`/`Suspense` o el lazy loading nativo de TanStack Router — no infles el bundle inicial con una ruta que no todos los visitantes van a abrir.
- Nueva ruta = agregar el `Link` correspondiente en **ambos** menús (desktop y mobile) siguiendo el estilo ya existente — olvidar uno de los dos es el error más común al agregar una página.
- El idioma activo (`i18n.language`) determina qué fuente de texto se muestra para el contenido internacionalizado (ver Parámetros) — una ruta nueva que muestra contenido en varios idiomas sigue ese mismo patrón, no inventa su propia fuente de datos.

## 3. Datos servidor — TanStack Query (API externa — ver Parámetros)

- Todo fetch pasa por TanStack Query (hooks tipados), nunca un `useEffect` con `fetch` a pelo — caché, invalidación y reintentos configurados de forma centralizada.
- Toda respuesta de la API se valida con un **schema Zod propio** antes de usarse en la UI — la API externa (Parámetros) es la fuente de verdad en runtime, pero su forma real (campos ausentes en ciertos perfiles, límites de paginación) no es 100% la documentada; el schema es lo que realmente protege al componente.
- Casos de fallo a contemplar siempre: `404` (recurso inexistente), `403` (rate limit de la API externa sin autenticar, donde aplique), timeout, respuesta malformada — un hook nuevo que consume la API externa (ver Parámetros) sin manejar estos casos no está completo (ver `qa-qc-react-vite` para cómo se testean).
- No hay contrato de API propio que coordinar entre agentes: `frontend` define el schema Zod directamente a partir de la respuesta real de la API externa (ver `/context/handoff-protocol.md`, handoff 2).

## 4. Estado UI — Zustand

- Zustand es **solo** para estado de UI puro (ej. un store de tema, modales, toggles de modo de visualización). Si un dato viene de TanStack Query, no se duplica en Zustand "para tenerlo más a mano" — la caché de Query ya es la fuente de verdad para datos de servidor.
- Antes de agregar un store nuevo, confirma que realmente es estado de interacción (no derivable de props/datos existentes) — un valor que se puede calcular a partir de algo que ya existe no necesita su propio store.

## 5. Formularios — TanStack Form + Zod

- Validación de formularios con Zod vía `@tanstack/zod-form-adapter` — el schema es la única fuente de las reglas de validación, no dupliques la regla en el JSX (ej. un `required` HTML además del schema, que puede desincronizarse).
- Errores de validación se muestran en el momento oportuno (no todo al final, no en cada tecla) — ver `frontend-design`/`ui-design-system` para el patrón de estado de error.

## 6. Estilos — Tailwind CSS 3

- Tokens de color/tipografía/espaciado en `/context/design-tokens.md` — no elijas un valor de color o espaciado "a ojo" cuando el token ya existe.
- Sin clases utilitarias repetidas sin abstraer: si el mismo combo de 6+ clases se repite en 3+ lugares, es un componente o una clase compuesta con `@apply`, no copy-paste indefinido.
- Dark mode vía las variantes `dark:` de Tailwind en cada componente nuevo — no se agrega como un paso posterior; se piensa junto con el estilo light.

## 7. Arquitectura por capas — dónde va cada cosa

```
Ruteo tipado (TanStack Router)
  → hook TanStack Query (datos servidor, API externa (Parámetros))
    → store Zustand (estado UI puro, si aplica)
      → schema Zod (contrato de validación de datos/formularios)
        → componente de presentación ("tonto", recibe props/hooks)
```

- La obtención de datos vive en hooks de TanStack Query, no dispersa en `useEffect` dentro de componentes de UI.
- Componentes de presentación separados del hook/contenedor que trae los datos — permite testear cada capa por separado (ver `qa-qc-react-vite`).

## 8. Checklist rápido al escribir código de este stack

- [ ] ¿El fetch usa un hook de TanStack Query, nunca un `useEffect` con fetch directo?
- [ ] ¿La respuesta de la API externa (ver Parámetros) se valida con un schema Zod antes de usarse?
- [ ] ¿Están cubiertos los estados loading/error/vacío/éxito, no solo el happy path?
- [ ] ¿Zustand se usa solo para estado de UI puro, no para duplicar datos de servidor?
- [ ] ¿La ruta nueva está registrada en `router.tsx` y enlazada en ambos menús (desktop y mobile)?
- [ ] ¿Rutas o componentes pesados (gráficos, 3D) usan code splitting?
- [ ] ¿Los estilos usan los tokens de `/context/design-tokens.md`, con variantes `dark:` desde el inicio?
- [ ] ¿Hay algún supuesto de servidor/SSR que no aplica a esta SPA?
