---
name: frontend-design
description: Guía metodológica de dirección visual del proyecto actual — úsala siempre que la tarea implique tipografía, paleta de color, layout, jerarquía visual o estilo de interfaz, o cuando el usuario pida que algo "se vea profesional", "no genérico" o "con dirección propia". También aplica al revisar si un componente nuevo respeta la identidad visual ya establecida (los valores de marca viven en los Parámetros del proyecto y `/context`) antes de introducir un patrón visual distinto.
---

# Dirección visual — identidad y sistema de diseño del proyecto actual

Guía metodológica para que cualquier pantalla o componente nuevo se sienta parte del mismo producto, no una plantilla genérica resuelta pantalla por pantalla. Esta skill conserva el *cuándo y por qué* de cada decisión; los **valores concretos de identidad** (colores, tipografías, superficies, contexto del producto) viven en los **Parámetros del proyecto** y en los archivos de `/context` que referencian. Complementa a `ui-design-system`, que define los tokens exactos.

Principio rector: **cada decisión visual tiene una razón funcional (jerarquía, legibilidad, consistencia), nunca "porque se ve bien" sin más**. Si no puedes explicar por qué un elemento es más grande, más oscuro o está más separado que otro, probablemente esa decisión todavía no está tomada.

## Parámetros del proyecto — neojapan-tienda (a editar al adaptar)

> Los únicos valores específicos de esta skill. Al adaptar a otro proyecto se editan estos parámetros (y los archivos de `/context` que referencian), no el cuerpo de la skill.

| Parámetro | Valor actual (`neojapan-tienda`) |
|---|---|
| Contexto del producto | Tienda de videojuegos, piezas de consolas y accesorios (Neojapan, Chile). Audiencia: coleccionistas, reparadores/modders, jugadores casuales, compradores de regalo. Fichas de producto con galería 4:5, chips de condición (`NEW`/`A`/`B`/`C`), badges de compatibilidad y etiquetas técnicas en mono (SKU, `NJ-1042`). Plan completo en el plan de negocio del repo |
| Acento decorativo | Único: `cyan` — cian eléctrico (`cyan-400` dark / `cyan-700` light); rojo reservado a errores (decisión `[2026-10-06]`, `/context/project-context.md` §5) |
| Colores semánticos | `green` (éxito/completado/"Compatible"), `red` (error/"No compatible"), `amber` (advertencia/"Requiere revisar") — solo para estado, no como decoración |
| Tipografía | `Space Grotesk` display/títulos (geométrica); `Inter` cuerpo; `JetBrains Mono` técnico/código (SKU, IDs, revisiones de consola). Sin cuarta familia sin razón |
| Fondos/superficies | Oscuro por defecto (`gray-950` base, `gray-900`/`gray-800` superficies), light opcional; escala `gray` fría, nunca subtono cálido |
| Tokens y stack | Valores exactos en `/context/design-tokens.md` y `ui-design-system`; viabilidad de implementación vía la skill del stack (`nextjs-2026-best-practices`) |

## 1. Identidad de marca — no negociable

Todos los valores de identidad (acento, colores semánticos, tipografías, superficies) están en los **Parámetros del proyecto**. Reglas invariantes sobre cómo se aplican:

- **Un solo acento decorativo**: ningún ícono destacado, borde activo o CTA nuevo usa un matiz distinto del de marca sin una decisión explícita previa — los alternativos ya se descartaron (ver Parámetros).
- **Colores semánticos aparte**: los que comunican estado (éxito/error/aviso) no son "acentos decorativos" ni se reemplazan por el color de marca.
- **Familia tipográfica por categoría**: display/títulos y técnico/código (ver Parámetros). No introduzcas una tercera familia sin razón — cada fuente nueva es una decisión de identidad, no un ajuste de gusto puntual.
- **Fondos y superficies**: la escala definida en Parámetros, sin subtonos cálidos que rompan la coherencia con la marca.

## 2. Jerarquía visual antes que decoración

- Tamaño, peso, color y espaciado comunican importancia relativa de forma deliberada. Si dos elementos compiten por la misma atención (dos títulos del mismo tamaño en la misma vista, tres CTAs igual de destacados), la jerarquía todavía no está resuelta.
- Un componente nuevo primero pregunta "¿ya existe una variante de esto en `ui-design-system`?" antes de crear un patrón visual paralelo — dos formas de resolver lo mismo (dos estilos de card, dos formas de botón primario) es una regresión, no una opción más.
- Escala tipográfica limitada (no más de 5-7 tamaños activos) — si hace falta un tamaño nuevo, primero revisa si un tamaño existente ya resuelve el caso antes de agregar uno.

## 3. Layout y densidad

- El producto (ver Parámetros) se consume de formas y por audiencias distintas — el layout de una sección nueva se piensa para todos sus modos/audiencias, no solo el que el autor tuvo en mente al escribirla.
- Espaciado en escala consistente (múltiplos de 4/8px vía las utilidades de Tailwind) — nunca un valor arbitrario (`mt-[13px]`) que rompe el ritmo vertical del resto de la página.
- Diseña para el rango completo de viewports relevante (mobile-first, breakpoints de Tailwind), no solo para el ancho de escritorio en el que se probó primero — la navegación responsive existente (header/drawer del shell) ya establece el patrón a seguir para nuevas secciones.
- Elementos decorativos (microinteracciones, animaciones sutiles) refuerzan la jerarquía, nunca compiten con el contenido real (fotografía de producto, precio, compatibilidad) por atención — si una animación hace más difícil leer el contenido, la animación pierde.

## 4. Evitar el look genérico de plantilla

- Sin paletas ni tipografías "default de librería" sin dirección propia — el objetivo declarado del proyecto es una tienda con dirección visual propia (etiquetas técnicas y serigrafía de PCB, plan §3.1), no un template de Tailwind UI sin adaptar.
- Los elementos diferenciadores del producto (chips de condición, badges de compatibilidad, etiquetas mono de SKU, bloques de revisión de consola) son parte de su narrativa — su estilo visual debe sentirse curado, no un componente de ejemplo de una librería de UI pegado sin ajuste.
- Antes de aceptar un ícono, imagen o layout "porque fue lo primero que apareció", pregúntate si refuerza la identidad del producto o es intercambiable con cualquier otro sitio — si es intercambiable, probablemente no está terminado.

## 5. Relación con la implementación real

- Antes de proponer un patrón visual que termine en código, revisa la skill del stack del proyecto (ver Parámetros) para confirmar viabilidad en su arquitectura (p. ej. qué se puede renderizar en servidor vs. en cliente) y `ui-design-system` para los valores exactos de token que corresponde usar.
- Si una dirección visual implica un estado (hover, error, vacío) no contemplado, se especifica ahí mismo — un mockup o descripción que solo cubre el happy path no es una especificación completa (ver la skill de testing correspondiente al stack para los casos que van a testear ese estado).

## 6. Checklist rápido al proponer una dirección visual

- [ ] ¿El acento decorativo es el único definido en Parámetros? ¿Los colores semánticos (estado) no se usan como decoración?
- [ ] ¿La tipografía usa solo las familias/roles definidos en Parámetros, sin una familia nueva sin justificar?
- [ ] ¿Hay una jerarquía clara (no dos elementos del mismo peso compitiendo por atención)?
- [ ] ¿Ya existe una variante de este componente en el sistema de diseño antes de crear una nueva?
- [ ] ¿El layout funciona en todos los viewports relevantes, no solo en el que se diseñó primero?
- [ ] ¿Una animación o elemento 3D refuerza el contenido en vez de competir con él?
- [ ] ¿Esto se ve como parte de este producto específico (Parámetros), o sería intercambiable con cualquier plantilla genérica?
