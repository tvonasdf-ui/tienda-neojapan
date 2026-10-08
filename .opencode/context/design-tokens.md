# Design Tokens — Neojapan

Fuente de verdad de valores exactos de color, tipografía, espaciado y estados para todo el equipo (`designer`, `frontend`, `qa-tester`). Referenciado desde `/context/project-context.md` §2 y §4, y desde las skills `frontend-design`, `ui-design-system` y `recharts-charts`. Cualquier valor nuevo de color/tipografía/espaciado que se use en el producto se agrega acá primero — nunca se elige "a ojo" en un componente y se documenta después.

Dirección visual (plan §3.1): **moderna, minimalista y tecnológica** — fondo oscuro neutro, **un único acento `cyan` (cian eléctrico)**, tipografía geométrica, aire, tarjetas sin ruido, microinteracciones sutiles. Inspiración: etiquetas técnicas y serigrafía de placas de circuito.

## 1. Color de marca — escala `cyan`

Única escala usada para acentos decorativos (botón primario, links, foco, bordes activos, ícono destacado, badge de compatibilidad, serie principal de gráficos). Corresponde a la escala `cyan` estándar de Tailwind, sin variantes custom.

| Token | Uso principal (dark — modo por defecto) | Uso principal (light — opcional) |
|---|---|---|
| `cyan-300` | Detalles de hover en superficies oscuras cuando `cyan-400` ya está en reposo | — |
| `cyan-400` | **Acento primario** — botón primario (fondo), link, borde activo, foco, texto de acento | Acento gráfico no textual (borde, ícono grande) sobre superficies claras |
| `cyan-500` | Iconografía decorativa secundaria | — |
| `cyan-600` | — | Ring de foco (3:1 sobre `white`), bordes de énfasis |
| `cyan-700` | — | **Acento primario** — botón primario (fondo, con texto `white`), texto de acento/link (AA sobre claro) |
| `cyan-800`/`cyan-900` | Estado `active`/`pressed` de superficies `cyan` | Estado `active`/`pressed` |

Regla: `cyan-400` en dark y `cyan-700` (texto/fondo de botón) en light son los pares por defecto del acento — no se mezclan indistintamente dentro del mismo modo. **El rojo queda reservado a estados de error/peligro** (decisión `[2026-10-06]` en `project-context.md` §5) — nunca un acento decorativo rojo.

## 2. Fondos y superficies — neutros fríos

Modo **oscuro por defecto**, claro opcional. Neutros fríos: escala `gray` de Tailwind (sin `stone`/`neutral`/`zinc`, sin subtonos cálidos).

| Token | Uso (dark, por defecto) | Uso (light, opcional) |
|---|---|---|
| `gray-950` | Fondo base de la página | — |
| `gray-900` | Fondo de secciones, superficie de tarjeta | — |
| `gray-800` | Superficie elevada (cards, drawer, inputs), bordes sutiles sobre `gray-900` | — |
| `gray-700` | Bordes y divisores, controles inactivos | — |
| `gray-400` | Texto secundario | Texto secundario en superficies oscuras |
| `gray-200` / `gray-100` | Texto principal / titulares | Bordes, divisores, fondo de controles inactivos |
| `white` / `gray-50` | — | Fondo base, superficies elevadas |

## 3. Colores semánticos — solo para estado, nunca decorativos

| Token | Significado | Notas |
|---|---|---|
| `green-500`/`green-600` | Éxito, online, completado, "Compatible con tu consola" | — |
| `red-500`/`red-600` | Error, peligro, destructivo, "No compatible" | Todo estado de error va acompañado de texto/ícono, nunca solo el color |
| `amber-500`/`orange-500` | Advertencia, stock bajo, "Requiere revisar" | Distinguible de `red` también por ícono, no solo por tono |

Los bloques de código/sintaxis conservan su resaltado nativo — no se fuerzan a la paleta `cyan`.

## 4. Tipografía

| Token | Familia | Uso |
|---|---|---|
| `font-display` | Space Grotesk (geométrica) | Títulos, headings, hero, precios destacados |
| `font-sans` (base) | Inter | Cuerpo de texto, controles, UI general |
| `font-mono` | JetBrains Mono | IDs de producto, SKU, códigos de pedido (`NJ-1042`), etiquetas técnicas estilo serigrafía, tablas de revisiones |

### Escala tipográfica (máximo 6 tamaños activos)

| Token | Tamaño | Uso |
|---|---|---|
| `text-xs` | 12px | Metadatos, labels auxiliares, chips de condición |
| `text-sm` | 14px | Texto secundario, controles, filtros |
| `text-base` | 16px | Cuerpo de texto |
| `text-lg` | 18px | Subtítulos, precio en ficha |
| `text-2xl` | 24px | Títulos de sección |
| `text-4xl`/`text-5xl` | 36px/48px | Título principal (hero) |

## 5. Espaciado

Escala de Tailwind en múltiplos de 4px (`p-1` = 4px … `p-16` = 64px). Ningún valor arbitrario (`p-[13px]`) sin que primero se descarte que un token de la escala ya resuelve el caso. "Mucho aire" (plan §3.1): preferir un paso de escala más antes que apretar.

## 6. Radios y sombras

| Token | Uso |
|---|---|
| `rounded-lg` (8px) | Cards, inputs, botones — radio por defecto del sistema |
| `rounded-full` | Chips, badges de estado, avatares |
| `shadow-sm` | Elevación sutil (cards en reposo) |
| `shadow-md` | Elevación en hover/foco de elementos interactivos |

## 7. Estados de componentes interactivos

Todo componente interactivo (botón, input, card clicable, filtro) define explícitamente:

| Estado | Regla |
|---|---|
| `default` | Color base según §1/§2 |
| `hover` | Un paso más oscuro/claro en la escala del color base (ej. `cyan-400` → `cyan-300` en dark) |
| `focus` | Ring visible en `cyan-400` (dark) / `cyan-600` (light), 2px mínimo, nunca `outline: none` sin reemplazo |
| `active` | Un paso adicional `pressed` respecto a `hover` |
| `disabled` | `gray-700`/`gray-300` con opacidad reducida (~50%), cursor `not-allowed` |
| `loading` | Skeleton (`animate-pulse` sobre `gray-800`/`gray-100`) del tamaño real del contenido, nunca un spinner que colapsa el layout |
| `error` | Borde/texto `red-500`/`red-600` + ícono/mensaje — nunca solo el color |
| `vacío` (empty) | Ícono + texto explicando qué pasó y qué puede hacer el usuario a continuación |

## 8. Imágenes de producto (plan §3.1)

- Proporción fija **4:5** (`c_fill,ar_4:5` en el loader de Cloudinary) para toda foto de producto — misma proporción en tarjeta y ficha.
- Fotografía real sobre fondo uniforme; nunca fotos de catálogo para usados.
- El ID/SKU del producto se muestra en `font-mono`.

## 9. Contraste — mínimos verificados

- Texto normal sobre fondo: **4.5:1** (WCAG AA); texto grande (≥18px o ≥14px bold) e iconografía: **3:1**.
- Pares verificados como conformes en este sistema:
  - `cyan-400` sobre `gray-950`/`gray-900`/`gray-800` (acento y texto de acento en dark);
  - `cyan-400` como fondo de botón con texto `gray-950`;
  - `cyan-700` sobre `white`/`gray-50` (acento y botón primario en light);
  - `gray-100`/`gray-200` sobre `gray-950`/`gray-900`/`gray-800`; `gray-900` sobre `white`/`gray-50`;
  - `cyan-600` sobre `white` solo como ring/borde (3:1), **no** como texto normal (no llega a 4.5:1).
- Un tono que no cumpla AA en un fondo específico no se usa para texto en ese fondo — se sube de paso en la escala o se usa solo como acento no textual (borde, ícono grande).

## 10. Cómo se actualiza este archivo

- Cambios de token siguen el mismo flujo que cualquier decisión de arquitectura: se registran también en `/context/project-context.md` §5 ("Decisiones de arquitectura registradas") cuando el cambio afecta a todo el sistema.
- `designer` es quien propone un token nuevo o modificado; `frontend` confirma la implementación real en los tokens de `app/globals.css`/config de Tailwind; ambos deben quedar sincronizados — un token documentado acá que no existe en el código (o viceversa) es una inconsistencia a corregir de inmediato.
