# Neojapan: plan de negocio y técnico

Tienda especializada en videojuegos, piezas de consolas y accesorios. Versión 1.0 · octubre 2026

> **Supuestos de partida** (ajustables): operación inicial en Chile (CLP, despacho nacional, pedidos cerrados por WhatsApp y sin pasarela de pago por ahora), una sola bodega/local físico, equipo técnico de 1 a 2 personas y catálogo inicial de 300 a 800 SKUs entre juegos, repuestos y accesorios.

---

## 1. Resumen ejecutivo

Neojapan se posiciona como la tienda donde el coleccionista y el reparador **encuentran la pieza exacta para su consola**, no solo un juego. El mercado de videojuegos retro y de repuestos está lleno de fichas pobres, compatibilidades dudosas y stock que nunca coincide entre la tienda física y la web. Neojapan ataca esos tres dolores:

1. **Compatibilidad garantizada**: cada repuesto y accesorio se vincula a modelos y revisiones concretas de consola.
2. **Stock único y real**: el local físico (POS) y la tienda online descuentan del mismo inventario, en tiempo real.
3. **Estado transparente**: los productos usados llevan grado de condición estandarizado y fotos propias, no fotos de catálogo.

El sistema son dos aplicaciones sobre un mismo núcleo de datos: una **tienda virtual** (Next.js) y un **panel administrativo con POS** (Next.js + API NestJS), con Cloudinary como almacén de imágenes.

---

## 2. Plan de negocio

### 2.1 Propuesta de valor

| Para quién | Problema | Respuesta de Neojapan |
| --- | --- | --- |
| Coleccionista | No sabe si el juego está completo o en qué estado real está | Grado de condición (A/B/C), fotos reales por unidad, contenido incluido (caja, manual) |
| Reparador / modder | Compra una pieza y no encaja con su revisión de placa | Filtro de compatibilidad por consola, modelo y revisión |
| Jugador casual | No sabe qué comprar para su consola | Garage virtual con sugerencias y packs |
| Comprador de regalo | Miedo a equivocarse de modelo | Asistente de "qué consola tiene" y garantía de cambio |

### 2.2 Segmentos y categorías de producto

- **Juegos**: nuevos, usados y coleccionables, por plataforma.
- **Consolas**: reacondicionadas, con grado de condición y garantía.
- **Piezas y repuestos**: carcasas, botones, joysticks, pantallas, ventiladores, fuentes, baterías, cables, lectores.
- **Accesorios**: controles, fundas, cargadores, cables de video, memorias.
- **Servicio (fase posterior)**: kits de reparación y, más adelante, reparación en local.

### 2.3 Modelo de ingresos

1. Venta de productos (online y presencial): fuente principal.
2. **Kits y packs** con margen mayor (kit de reparación por consola, pack de inicio retro).
3. Compra de usados / canje (trade-in) como fuente barata de inventario.
4. Servicio técnico y mano de obra (fase 3).

### 2.4 Precios y márgenes

Definir una **política de precios por categoría** antes del lanzamiento. Estructura sugerida para completar con datos reales de proveedores:

| Categoría | Costo de adquisición | Margen objetivo | Notas |
| --- | --- | --- | --- |
| Juegos nuevos | Distribuidor | Bajo | Sirven de tráfico |
| Juegos usados/retro | Compra a particulares, lotes | Alto | Precio atado al grado de condición |
| Repuestos | Importación directa | Medio-alto | Compatibilidad como valor agregado |
| Accesorios | Importación/mayorista | Medio | Alta rotación |

Regla técnica: el costo y el precio viven **por variante**, y el sistema guarda el costo vigente al momento de cada venta para poder calcular margen real histórico.

### 2.5 Adquisición de clientes

- **SEO por compatibilidad**: una página por combinación consola + pieza ("Joystick de repuesto para Switch OLED") es el activo orgánico más fuerte.
- Contenido corto en video: reparaciones, aperturas de lotes retro, comparativas de revisiones.
- Comunidades de coleccionismo y modding (Instagram, Discord, grupos locales).
- Programa de referidos y de canje de usados.
- Retiro en tienda como gancho para pasar de online a físico.

### 2.6 Operaciones y logística

- Un único flujo de recepción: llegada de mercadería → registro en el sistema → etiqueta con código de barras/QR → fotografía → publicación.
- Las solicitudes enviadas por WhatsApp no reservan ni descuentan inventario. Un miembro del equipo confirma manualmente cada venta desde el panel; esa transición valida disponibilidad y descuenta stock de forma atómica.
- Despacho con courier integrado por API en fase 2; retiro en tienda desde el día 1.
- Política de devolución con revisión técnica para repuestos (evitar fraude de piezas intercambiadas).

### 2.7 Riesgos principales y mitigación

| Riesgo | Mitigación |
| --- | --- |
| Piezas falsificadas o de baja calidad | Proveedores verificados, registro de lote por producto, política de garantía |
| Compatibilidad mal declarada | Matriz de compatibilidad curada manualmente, con campo de fuente y revisión |
| Descuadre de stock entre canales | Libro de movimientos de inventario (sección 4.3) y transacciones atómicas |
| Costos de importación variables | Costo por lote editable, recálculo de margen y alertas de margen bajo |
| Dependencia de un solo desarrollador | Monorepo documentado, tests automatizados, despliegue reproducible |

### 2.8 KPIs de seguimiento

- Exactitud de inventario (conteo físico vs. sistema), meta sobre 98 %.
- Tasa de conversión de ficha de producto → carrito → pedido enviado por WhatsApp.
- Porcentaje de ventas que usan el filtro de compatibilidad o el Garage.
- Margen bruto por categoría y rotación de inventario (días en stock).
- Tasa de devolución por categoría.

---

## 3. Frontend: tienda virtual

### 3.1 Dirección de diseño

Estética **moderna, minimalista y tecnológica**: fondo oscuro neutro con una paleta contenida, un único color de acento (por ejemplo, un rojo carmesí o cian eléctrico, definido como token) y tipografía geométrica. Mucho aire, tarjetas de producto sin ruido, microinteracciones sutiles. Inspiración visual: etiquetas técnicas y serigrafía de placas de circuito, con detalles como ID de producto en tipografía monoespaciada.

Principios:

- Fotografía real sobre fondo uniforme, siempre con la misma proporción (4:5).
- Un solo CTA primario por pantalla.
- Modo oscuro por defecto, claro opcional, con tokens en `app/globals.css`.
- Accesibilidad: contraste AA, foco visible, navegación completa por teclado.

### 3.2 Mapa de páginas

| Ruta | Contenido |
| --- | --- |
| `/` | Hero, categorías, novedades, "Elige tu consola" |
| `/catalogo` | Listado con filtros (plataforma, categoría, condición, precio) |
| `/consola/[slug]` | Hub por consola: juegos, repuestos y accesorios compatibles |
| `/producto/[slug]` | Ficha con galería, variantes, condición, compatibilidad |
| `/garage` | Mis consolas y sugerencias |
| `/builder` | Configurador de kits (sección 3.4) |
| `/carrito` | Resumen editable |
| `/pedido/nuevo` | Resumen del pedido, datos de contacto, despacho o retiro, botón «Enviar por WhatsApp» |
| `/pedido/[id]` | Detalle y estado de la solicitud (el enlace viaja en el mensaje de WhatsApp) |
| `/cuenta` | Pedidos, direcciones, Garage |

### 3.3 Visualización de productos

- **Tarjeta de producto**: imagen, nombre, plataforma, chip de condición, precio, badge "Compatible con tu consola" si aplica.
- **Ficha**: galería con zoom (imágenes optimizadas por Cloudinary), selector de variante (condición/color), bloque de compatibilidad con tabla de modelos y revisiones, contenido incluido, política de garantía.
- **Filtros** reflejados en la URL (`searchParams`) para que las búsquedas sean compartibles e indexables.
- **Búsqueda** con tolerancia a errores y alias ("PS2 slim" → SCPH-7xxxx) usando búsqueda de texto de PostgreSQL con `pg_trgm`.

### 3.4 Funcionalidad diferenciadora: Console Garage + Compatibilidad + Builder

La función estrella es un sistema **determinista de compatibilidad**, no un chatbot. Es verificable, no alucina y construye una ventaja de datos difícil de copiar.

**a) Garage virtual.** El usuario registra sus consolas (modelo y revisión, con ayuda visual para identificarlas). Desde entonces:

- Cada ficha muestra "Compatible / No compatible / Requiere revisar" con su consola.
- El catálogo puede filtrarse con un clic en "Solo lo que sirve para mis consolas".
- Se generan sugerencias: piezas de desgaste habituales, accesorios que le faltan, juegos de su plataforma.

**b) Asistente de identificación.** Un flujo guiado de 3 a 4 preguntas con imágenes ("¿tiene esta ranura? ¿qué código hay bajo la consola?") para que quien no sabe qué revisión tiene la determine sin errores.

**c) Builder de kits.** Configurador visual para armar:

- *Kit de reparación*: elige consola, falla (drift, batería, lector, ventilador) y obtiene el set mínimo de piezas más herramientas, con precio total y descuento por kit.
- *Mod / custom*: carcasa, botones y accesorios con vista previa por capas de color (composición de imágenes PNG en Cloudinary, sin necesidad de 3D en el MVP).

Todo se agrega al carrito en un clic, y el kit queda guardado como plantilla reutilizable.

**d) Fase 3, opcional: recomendaciones con IA.** Una vez que existan datos de compra y Garage, se puede sumar un asistente conversacional que **consulte la matriz de compatibilidad como fuente de verdad** (el modelo propone, la base de datos valida). Visor 3D de carcasas con `<model-viewer>` como extensión de la experiencia inmersiva.

### 3.5 Carrito de compras funcional

Requisitos:

- Persistencia para anónimos (cookie con `cartId`) y fusión al iniciar sesión.
- **El servidor es la fuente de verdad** del carrito: precios y totales se recalculan en backend; la disponibilidad es informativa y se vuelve a validar al confirmar manualmente la venta.
- Estado de UI (drawer abierto, animaciones) en Zustand; datos del carrito con TanStack Query y mutaciones optimistas.
- Validación con Zod compartido entre cliente y servidor.
- El envío de una solicitud no reserva stock ni crea una venta confirmada. La confirmación manual es el único punto del checkout que descuenta inventario.
- Cupones y envío calculados por reglas puras (testeables sin base de datos).

### 3.6 Cierre del pedido por WhatsApp

Por ahora la tienda no cobra online: el carrito termina en un botón que abre WhatsApp con el detalle del pedido ya escrito, y el equipo cierra la venta por ese chat.

1. En `/pedido/nuevo` el cliente revisa el resumen y completa nombre, teléfono y modalidad (retiro en tienda o despacho con comuna).
2. Al tocar **Enviar solicitud**, la API recalcula precios, valida el código promocional, guarda una solicitud (`REQUESTED`) con un código corto (por ejemplo NJ-1042) y no modifica el inventario.
3. La API devuelve un enlace `https://wa.me/<número de la tienda>?text=<mensaje codificado>` y el navegador lo abre; el cliente solo debe pulsar enviar en WhatsApp.
4. El equipo recibe el mensaje, valida existencias actuales y confirma o cancela la solicitud en el panel. Solo la confirmación manual descuenta inventario; luego se acuerdan pago y entrega por el chat.

Ejemplo de mensaje (los montos son placeholders):

```text
Hola Neojapan, quiero hacer este pedido (NJ-1042):

1x Joystick de repuesto Switch OLED (condición A) - $XX.XXX
1x Pack de inicio retro - $XX.XXX

Total: $XX.XXX
Modalidad: Retiro en tienda
Nombre: Nombre Apellido
Detalle: <dominio>/pedido/NJ-1042
```

- El mensaje lo arma el servidor con precios y totales vigentes, mediante una función pura (`buildWhatsAppOrderMessage`) con tests; el navegador no puede alterarlos.
- La solicitud se guarda antes de abrir WhatsApp: si el cliente no llega a enviar el mensaje, el equipo igual la ve en el panel, pero no hay stock reservado que liberar.
- El enlace de WhatsApp tiene un largo máximo práctico, así que el mensaje lleva un resumen y la URL con el detalle completo.
- El número de la tienda y la plantilla del mensaje se configuran por variables de entorno o desde el panel, no en el código.
- Cuando se active una pasarela de pago, cambia solo el paso 4: se agrega un `PaymentProvider` sin rehacer el carrito ni las solicitudes.

### 3.7 Rendimiento y SEO

- Las fichas y listados públicos consultan IDs de variantes y disponibilidad sin caché de servidor para evitar mostrar variantes obsoletas después de cambios o re-seed. Medir y optimizar esta estrategia con datos reales de rendimiento.
- Imágenes con `next/image` y loader de Cloudinary (`f_auto,q_auto`).
- `generateMetadata` y JSON-LD (`Product`, `Offer`) en cada ficha; sitemap dinámico por consola y producto.

---

## 4. Backend: gestor de inventario y POS

### 4.1 Arquitectura general

```
┌──────────────────┐     ┌────────────────────┐
│  Tienda (Next.js)│     │ Panel/POS (Next.js)│
│  SSR + RSC       │     │ PWA, rol staff     │
└────────┬─────────┘     └─────────┬──────────┘
         │   HTTPS / JSON (Zod)    │
         └──────────┬──────────────┘
                    ▼
          ┌───────────────────┐        ┌──────────────┐
          │   API NestJS      │───────▶│ Cloudinary   │
          │ (módulos por      │        └──────────────┘
          │  dominio)         │        ┌──────────────┐
          │                   │───────▶│ WhatsApp link│
          └─────────┬─────────┘        └──────────────┘
                    ▼
          ┌───────────────────┐        ┌──────────────┐
          │ PostgreSQL        │        │ Redis (colas,│
          │ (fuente de verdad)│        │ reservas)    │
          └───────────────────┘        └──────────────┘
```

### 4.2 Módulos de la API (NestJS)

Cada módulo es un límite de dominio con su propio service; los controllers solo traducen HTTP a llamadas al service (sin lógica de negocio).

| Módulo | Responsabilidad |
| --- | --- |
| `catalog` | Productos, variantes, categorías, plataformas |
| `compatibility` | Matriz producto ↔ modelo/revisión de consola |
| `inventory` | Stock, movimientos, reservas, conteos |
| `sales` | Solicitudes de pedido por WhatsApp, venta unificada (online y POS), pagos registrados por el equipo, devoluciones |
| `cart` | Carrito, reserva, cupones |
| `media` | Firma de subidas y ciclo de vida de imágenes en Cloudinary |
| `repairs` | Servicio técnico: recepción de equipos, diagnóstico, cotización y entrega |
| `customers` | Clientes, direcciones, Garage |
| `auth` | Sesiones, roles (`ADMIN`, `STAFF`, `CUSTOMER`) |
| `reports` | Ventas, márgenes, stock bajo, rotación |

### 4.3 Modelo de inventario: libro de movimientos

El error más común es guardar un campo `stock` y modificarlo. En su lugar:

- Cada cambio de stock es una fila inmutable en `stock_movements` (tipo, cantidad con signo, motivo, usuario, referencia a venta/compra/ajuste).
- El stock actual es la suma de movimientos, materializada en `stock_levels` y actualizada **en la misma transacción**.
- Descuento con operación atómica (`UPDATE ... SET on_hand = on_hand - $n WHERE on_hand - reserved >= $n`) para impedir sobreventa entre POS y web.
- Las bajas, mermas y ajustes por conteo exigen motivo obligatorio y quedan auditados.

### 4.4 Modelo de datos (núcleo)

| Entidad | Campos clave |
| --- | --- |
| `Product` | id, slug, nombre, descripción, categoría, plataforma, estado de publicación |
| `Variant` | id, productId, SKU, condición (`NEW`, `A`, `B`, `C`), precio, costo vigente, código de barras |
| `StockLevel` | variantId, ubicación (`STORE`, `WAREHOUSE`), onHand, reserved |
| `StockMovement` | id, variantId, delta, tipo, motivo, userId, refId, fecha |
| `ConsoleModel` | id, plataforma, nombre, revisión, notas de identificación |
| `Compatibility` | productId, consoleModelId, nivel (`CONFIRMED`, `PARTIAL`), fuente |
| `MediaAsset` | id, productId, `publicId` de Cloudinary, orden, alt, dimensiones |
| `Sale` | id, canal (`ONLINE`, `POS`), estado (solicitado, confirmado, pagado o cancelado), código corto, cliente, totales, usuario cajero |
| `SaleLine` | saleId, variantId, cantidad, precio unitario, costo unitario al vender |
| `Payment` | saleId, método, monto, referencia, estado; lo registra el equipo mientras no haya pasarela |
| `Customer` / `GarageItem` | datos y consolas del cliente |
| `RepairTicket` | id, código (`SR-XXXX`), datos y teléfono del cliente, equipo (`deviceName`, modelo, nº de serie), descripción de la falla, estado, diagnóstico, cotización, notas, motivo de cancelación, usuario que recibió, fecha de entrega |

Para artículos usados únicos (una consola con su propio estado), se admite una unidad serializada (`ItemUnit` con número de serie y fotos propias) ligada a la variante.

### 4.5 Gestión de inventario (altas, bajas, modificaciones)

- **Alta**: formulario en pasos (datos → variantes → imágenes → compatibilidad → stock inicial → publicar). Se guarda como borrador hasta que pasa validación Zod.
- **Modificación**: edición con historial de cambios de precio y datos; el stock **no se edita directo**, solo por movimientos.
- **Baja**: baja lógica (archivado) para conservar ventas históricas; baja física solo si nunca hubo movimientos.
- **Ingreso de mercadería** por orden de compra, con etiquetas imprimibles de código de barras.
- **Conteo cíclico** desde el celular: escanear, contar, el sistema propone el ajuste.
- **Alertas**: stock bajo, margen bajo, productos sin imagen o sin compatibilidad declarada.
- Importación y exportación CSV para la carga inicial del catálogo.

### 4.6 Punto de venta (POS)

Pensado para uso en mostrador, con tablet o notebook y un lector de código de barras (funciona como teclado).

- Pantalla de venta: búsqueda por escaneo o texto, líneas editables, descuentos con permiso por rol.
- Pagos mixtos (efectivo, tarjeta, transferencia), cálculo de vuelto.
- **Venta física y digital en el mismo modelo** `Sale` con `channel`. Una solicitud recibida por WhatsApp se confirma desde el panel y, si el cliente la retira en tienda, se cobra y se cierra en el POS escaneando su código de pedido.
- Apertura y cierre de caja con arqueo y diferencias registradas.
- Devoluciones y cambios que generan movimientos de stock inversos.
- Emisión de boleta/factura electrónica mediante un `TaxDocumentProvider` (adaptador a un proveedor local de DTE) sin acoplar el núcleo.
- **Modo degradado**: PWA con cola local de ventas si cae internet, sincronizadas con idempotencia (`clientSaleId`). Se implementa en fase 3, pero el contrato de la API se diseña idempotente desde el inicio.

### 4.7 Integración con Cloudinary

Flujo recomendado (el binario nunca pasa por la API):

1. El panel pide `POST /media/sign` con el producto destino.
2. La API valida permisos y devuelve una **firma de subida** (carpeta `neojapan/products/{productId}`, preset restringido, tamaño y formatos máximos).
3. El navegador sube directo a Cloudinary con esa firma.
4. El panel confirma con `POST /media` enviando `publicId`; la API verifica el recurso y crea el `MediaAsset`.
5. La tienda renderiza con un loader de `next/image` que arma URLs con transformaciones (`f_auto,q_auto,c_fill,ar_4:5,w_...`).

Buenas prácticas:

- Guardar `publicId` (no URLs completas) y derivar las URLs, así cambiar transformaciones no requiere migrar datos.
- Borrado en dos pasos: al eliminar un producto se desvincula el asset y un job lo elimina en Cloudinary tras un periodo de gracia.
- Reordenar y marcar imagen principal desde el panel con arrastrar y soltar.
- Credenciales solo en el servidor; nunca exponer el `api_secret`.
- Atrás de una interfaz `ImageStorage` (puerto) con `CloudinaryImageStorage` como adaptador, para poder cambiar de proveedor sin tocar el dominio.

### 4.8 Servicio técnico y recepción de equipos

Reparaciones de consolas y accesorios con custodia del equipo y trazabilidad de estado. Un `RepairTicket` es un documento de custodia: registra qué entró, quién lo recibió, el diagnóstico, la cotización aprobada y cuándo salió.

- **Recepción**: se abre el ticket en `RECEIVED` siempre con datos de contacto y descripción de la falla (y, si aplica, modelo y número de serie). El código `SR-XXXX` identifica la etiqueta física que se pega al equipo.
- **Única máquina de estados** (`RECEIVED → DIAGNOSED → QUOTED → APPROVED → IN_REPAIR → READY → DELIVERED`, más `CANCELLED` y `UNCLAIMED` en terminal): las reglas de transición viven en una función pura (`repairAdvanceError`), sin lógica en el controller, y se aplican re-dentro de una transacción para impedir carreras entre cajeros.
  - `DIAGNOSED` exige diagnóstico; `QUOTED` exige monto de cotización; `CANCELLED`/`UNCLAIMED` exigen motivo. Todo paso debe ser contiguo: no se salta de `RECEIVED` a `IN_REPAIR`.
  - `DELIVERED` fija `deliveredAt`; la entrega solo es válida estando `READY` (o `QUOTED`/`APPROVED` si el cliente retira sin reparar, caso "se arrepintió").
- **Ciclo de cotización**: cotizado el trabajo, se contacta al cliente con el monto; el ticket pasa a `APPROVED` solo con su aprobación. Si no lo aprueba, el equipo se devuelve sin reparar y el ticket termina en `DELIVERED` o `CANCELLED`.
- **Custodia**: el ticket referencia al usuario que recibió (`createdByUserId`) para trazabilidad; los repuestos usados se descuentan del inventario con un movimiento `TECH_REPAIR` (en la misma familia que venta/merma), así el costo de la reparación queda reflejado en el ledger.
- **Garantía de reparación**: al entregar, se asocian al ticket los repuestos y el cargo; una reentrada por garantía reabre el mismo ticket por referenciam sin duplicar la custodia.
- **Abandono**: tickets `READY` pendientes de retiro tras un plazo configurable pasan a `UNCLAIMED` (con motivo y aviso previo al cliente).

### 4.9 Principios de código limpio aplicados

- **Controllers delgados, services con una responsabilidad**, nombres que expresan intención (`reserveStockForCheckout`, `canCancelSale`).
- **Lógica pura aparte**: cálculo de totales, descuentos, margen, envío y armado del mensaje de WhatsApp en funciones puras (`lib/pricing`), testeables sin inyección de dependencias.
- **Strategy + puertos/adaptadores** para variación real: `PaymentProvider` (se activará en una fase posterior), `ImageStorage` (Cloudinary), `TaxDocumentProvider`, `ShippingProvider`.
- **Sin God Services**: `SalesService` orquesta, `InventoryService` mueve stock, `PaymentsService` cobra; ninguno hace el trabajo de otro.
- **Reglas de dominio en la entidad** cuando dependen solo de su estado (`sale.canBeRefunded()`).
- **DRY con criterio**: se extrae conocimiento de negocio duplicado, no coincidencias superficiales.
- **Zod como fuente única de verdad**: esquemas en un paquete compartido, de los que se derivan tipos y validación de DTOs en la API y formularios.

---

## 5. Arquitectura tecnológica recomendada

| Capa | Tecnología | Razón |
| --- | --- | --- |
| Monorepo | pnpm + Turborepo | Un repo, paquetes compartidos, builds cacheados |
| Tienda y panel | Next.js 16 (App Router), React 19.2, TypeScript estricto | RSC, `use cache`, PPR, Server Actions |
| Estilos | Tailwind CSS con tokens en `globals.css` | Sistema de diseño consistente |
| Estado cliente | Zustand v5 (UI), TanStack Query v5 (datos) | Separa estado de UI y de servidor |
| Formularios | TanStack Form + Zod | Validación compartida |
| API | NestJS (módulos por dominio) | Estructura, DI, testabilidad |
| Base de datos | PostgreSQL (Supabase u otro gestionado) | Transacciones, `pg_trgm`, integridad |
| ORM | Prisma | Migraciones y tipos |
| Caché/colas | Redis (BullMQ) | Reservas con TTL, jobs de limpieza, correos |
| Imágenes | Cloudinary | Transformaciones y CDN |
| Pagos | Sin pasarela por ahora: el pedido se cierra por WhatsApp (enlace wa.me). Webpay o Mercado Pago más adelante, tras `PaymentProvider` | Sin costo de integración al inicio y cierre conversacional |
| Auth | Auth.js o Supabase Auth, roles en JWT/sesión | Integración nativa con App Router |
| Tests | Vitest, MSW, Playwright, Jest en Nest | Pirámide completa |
| CI/CD | GitHub Actions | Lint, tests, build, despliegue |
| Hosting | Vercel (web), Fly.io/Railway/Render (API), DB gestionada | Despliegue simple |
| Observabilidad | Sentry + logs estructurados (pino) | Detección temprana de fallos |

### 5.1 Estructura del monorepo

```
neojapan/
├── apps/
│   ├── web/                  # Tienda (Next.js)
│   │   ├── app/
│   │   │   ├── (shop)/       # catálogo, producto, consola
│   │   │   ├── (account)/    # garage, pedidos
│   │   │   └── pedido/
│   │   ├── components/
│   │   └── proxy.ts
│   ├── admin/                # Panel + POS (Next.js)
│   │   └── app/
│   │       ├── inventario/
│   │       ├── pos/
│   │       ├── pedidos/
│   │       └── reportes/
│   └── api/                  # NestJS
│       └── src/
│           ├── catalog/
│           ├── compatibility/
│           ├── inventory/
│           ├── sales/
│           ├── media/
│           └── common/
├── packages/
│   ├── schemas/              # Zod: fuente única de verdad
│   ├── pricing/              # funciones puras
│   └── ui/                   # componentes compartidos
└── turbo.json
```

### 5.2 Seguridad

- Roles y permisos verificados en la API (nunca solo en el frontend), `proxy.ts` solo como primera barrera.
- Rate limiting en login, carrito y envío de pedidos; CSRF en acciones con cookies.
- Límite de solicitudes por IP y teléfono para evitar spam de pedidos; webhooks de pago firmados e idempotentes cuando se active la pasarela.
- Secretos en variables de entorno gestionadas, rotación documentada.
- Auditoría de acciones sensibles (ajustes de stock, descuentos, cierres de caja).
- Dependencias auditadas en CI (`pnpm audit`, Dependabot).
- Respaldos diarios de la base de datos con prueba de restauración mensual.

---

## 6. Flujos de usuario

### 6.1 Cliente: compra online

1. Llega por buscador, red social o el hub `/consola/[slug]`.
2. Elige su consola (o la registra en el Garage con el asistente de identificación).
3. Explora el catálogo filtrado; ve badges de compatibilidad y condición.
4. Abre la ficha: galería, variante, compatibilidad, contenido incluido.
5. Agrega al carrito (el servidor valida la variante y muestra disponibilidad estimada).
6. Opcional: abre el **Builder** para seleccionar una pieza individual con compatibilidad confirmada; no se promete un kit hasta que existan recetas de reparación publicadas.
7. Resumen del pedido: datos de contacto, despacho o retiro en tienda y cupón. Enviar genera una solicitud y no altera el inventario.
8. Toca «Enviar por WhatsApp»: se abre el chat de la tienda con el detalle del pedido ya escrito y solo debe pulsar enviar.
9. El equipo responde por el chat, confirma stock y acuerda pago y entrega; puede revisar el estado de su solicitud en `/pedido/[id]`.
10. Postventa: solicita cambio o devolución desde su cuenta.

### 6.2 Administrador: gestión de inventario

1. Inicia sesión (rol `ADMIN` o `STAFF`).
2. Recibe mercadería: crea la orden de ingreso, escanea o carga líneas, genera movimientos de stock.
3. Da de alta un producto: datos → variantes y condición → **sube imágenes a Cloudinary** (carga directa firmada) → define compatibilidad → publica.
4. Revisa alertas: stock bajo, margen bajo, productos incompletos.
5. Modifica precios o datos (queda historial); ajusta stock solo mediante movimientos con motivo.
6. Archiva productos descontinuados.
7. Consulta reportes de ventas, margen y rotación; exporta a CSV.

### 6.3 Administrador / cajero: venta en el POS

1. Abre caja con el monto inicial.
2. Escanea productos o los busca; el sistema muestra stock en tiempo real.
3. Aplica descuento (con permiso), selecciona cliente si corresponde.
4. Cobra (efectivo, tarjeta, mixto); se emite boleta/factura electrónica.
5. El stock se descuenta de forma atómica en la misma transacción.
6. Si es retiro de una solicitud hecha por WhatsApp, escanea su código, cobra y entrega.
7. Al cierre, hace arqueo y el sistema registra diferencias.

---

## 7. Hoja de ruta de desarrollo

Estimación para 1 a 2 desarrolladores; los plazos son referencia y deben validarse tras la Fase 0.

### Fase 0 · Fundaciones (semanas 1–2)

- Definición de catálogo inicial, plataformas y política de condición (A/B/C).
- Monorepo, CI, entornos (dev/staging/prod), esquemas Zod base.
- Diseño visual: tokens, tipografía, componentes clave en Figma o directamente en código.
- Modelo de datos y migraciones iniciales.

**Estado de ejecución · 7 de octubre de 2026:** fundaciones técnicas implementadas (monorepo y CI, esquemas compartidos, tokens visuales, modelo Prisma y migraciones, política provisional A/B/C y datos demo). La fase no está cerrada: falta aprobar/cargar el catálogo comercial real y documentar/provisionar staging y producción.

### Fase 1 · Núcleo de inventario y panel (semanas 3–6)

- Módulos `catalog`, `inventory`, `media` (Cloudinary firmado), `auth`.
- Panel: alta, edición y archivado de productos; ingreso de mercadería; movimientos de stock.
- Importación CSV del catálogo inicial.
- Tests de dominio (stock, pricing) y e2e del flujo de alta.

**Hito**: el catálogo real está cargado y el stock cuadra con el conteo físico.

**Estado de ejecución · 7 de octubre de 2026:** catálogo, ledger de stock, movimientos, carga inicial, importación CSV, autenticación Supabase/JWT, edición/archivo de productos y flujo de imágenes Cloudinary firmadas están implementados en código. Pendiente para cerrar la fase: configurar credenciales/roles reales de Supabase y el preset firmado de Cloudinary, importar el catálogo inicial real, conciliar el stock con conteo físico y completar pruebas e2e de alta/importación e imágenes.

### Fase 2 · Tienda y checkout (semanas 7–10)

- Catálogo, filtros, fichas, SEO y `use cache` con invalidación por etiquetas.
- Carrito servidor-autoritativo, solicitudes sin reserva automática, confirmación manual de inventario y cierre del pedido con WhatsApp (sin pasarela de pago).
- Correos transaccionales y estado de pedido.
- Compatibilidad v1: matriz curada y filtro por consola.

**Hito**: primer pedido real recibido por WhatsApp (lanzamiento beta cerrada).

### Fase 3 · POS (semanas 11–13)

- Pantalla de venta, pagos mixtos, caja, devoluciones.
- Retiro en tienda de pedidos online.
- Integración de documentos tributarios electrónicos.
- Pruebas en mostrador con ventas reales en paralelo al sistema anterior.

**Hito**: el local opera íntegramente con el sistema.

### Fase 4 · Diferenciación (semanas 14–18)

- Garage, asistente de identificación y sugerencias.
- Builder de kits de reparación y custom con vista previa por capas.
- Packs y descuentos por kit.

**Hito**: lanzamiento público con campaña de contenido.

### Fase 5 · Crecimiento (mes 5 en adelante)

- Modo offline del POS (PWA con cola idempotente); pasarela de pago (Webpay o Mercado Pago) cuando el volumen lo justifique.
- Integración con courier, seguimiento y etiquetas.
- Programa de canje (trade-in) y compra de usados.
- Recomendaciones con IA apoyadas en la matriz de compatibilidad; visor 3D.
- Marketplace o venta en canales externos sincronizando stock.

---

## 8. Calidad y pruebas

- **Unitarias (Vitest/Jest)**: pricing, armado del mensaje de WhatsApp, reglas de stock, reglas de devolución, todo lo puro.
- **Integración (Jest + base de datos de prueba)**: transacciones de venta y concurrencia sobre el mismo stock.
- **Componentes (Vitest + MSW)**: carrito, filtros, formularios.
- **E2E (Playwright)**: armado de carrito y envío por WhatsApp, alta de producto con imagen, venta en POS.
- **Prueba de concurrencia dedicada**: dos ventas simultáneas del último ítem; solo una debe prosperar.
- Cobertura mínima en módulos críticos (`inventory`, `sales`, `payments`), gate en CI.

---

## 9. Próximos pasos inmediatos

1. Confirmar supuestos: país, número de WhatsApp de la tienda, proveedor de boleta electrónica y volumen inicial de SKUs.
2. Definir la lista de consolas y revisiones del lanzamiento (el alcance de la matriz de compatibilidad).
3. Elegir el nombre del acento visual y producir 10 fichas de producto de prueba con fotografía real.
4. Levantar el monorepo con la Fase 0 y publicar un entorno de staging.

## 10. Auditoría de pendientes · 8 de octubre de 2026

La revisión del plan y del código confirma que hay funcionalidades implementadas, pero los hitos de puesta en marcha y validación operativa siguen abiertos. Los estados de servicios externos (Supabase, Cloudinary, proveedores tributarios y courier) no se pueden confirmar solo desde el repositorio.

| Fase / área | Pendientes por cerrar |
| --- | --- |
| 0 · Fundaciones | Aprobar el catálogo comercial, confirmar supuestos de operación, provisionar y documentar staging/producción. |
| 1 · Inventario y panel | Configurar y probar roles reales de Supabase y el preset firmado de Cloudinary; importar el catálogo real; conciliar existencias con conteo físico; completar E2E de alta, importación y carga de imágenes. |
| 2 · Tienda y checkout | Validar en staging el flujo completo de reserva, pedido y enlace de WhatsApp; confirmar correo transaccional, políticas de despacho/retiro y contenido legal antes de la beta. |
| 3 · POS | Completar pagos mixtos, apertura/cierre de caja, devoluciones/cambios, retiro de pedidos online y proveedor de documentos tributarios; probar ventas reales en paralelo. |
| 4 · Garage y builder | Completar y revisar datos de consolas, compatibilidades y recetas; validar el builder y Garage con catálogo real y pruebas de aceptación. |
| 5 · Crecimiento | Courier, offline idempotente, pagos online, trade-in, recomendaciones/visor 3D y canales externos permanecen como trabajo futuro; definir prioridades según métricas de la beta. |
| Calidad y operación | Añadir pruebas de componentes para web/admin, E2E con Playwright y concurrencia de la última unidad; acordar cobertura/gates, observabilidad, copias de seguridad y procedimiento de restauración. |

El panel ya cuenta con inventario, pedidos, terminal POS y reportes en el código, pero su disponibilidad efectiva depende de credenciales, API y datos de operación válidos. El build y las pruebas automatizadas verifican el código; no sustituyen pruebas de aceptación con servicios externos y datos reales.
