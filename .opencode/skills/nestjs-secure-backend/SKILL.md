---
name: nestjs-secure-backend
description: Guía de arquitectura, clean code, seguridad y testing para backends NestJS de nivel producción. Úsala siempre que el usuario cree un proyecto NestJS nuevo, agregue módulos/controllers/services, diseñe entidades o DTOs, implemente autenticación/autorización, configure guards/interceptors/pipes/filters, trabaje con la base de datos (TypeORM/Prisma), escriba tests (unit/integration/e2e), o pida revisar/generar código NestJS "seguro", "profesional", "a prueba de fallos", "clean code" o "production-ready". También aplica si menciona OWASP, rate limiting, JWT, refresh tokens, RBAC, manejo de errores, logging, o resiliencia en un backend Node/NestJS.
---

# NestJS — Backend seguro y production-ready (2026)

Guía de referencia para generar y revisar código NestJS de nivel profesional: arquitectura limpia, seguridad por defecto, manejo de errores robusto y testing real. Genera siempre código completo, listo para copiar, con rutas de archivo exactas.

Si el proyecto del usuario ya tiene lineamientos propios (`my-forge-app`, arquitectura por capas — ver `project-guidelines`), esos tienen prioridad; esta skill es la base cuando no hay reglas de proyecto específicas o cuando se arranca un backend nuevo.

## 1. Arquitectura — módulos por feature, dependencias hacia adentro

- **Estructura por feature, no por capa técnica**. Cada módulo trae sus propios controllers, services, DTOs, entidades y tests en una sola carpeta. Nada de carpetas globales `controllers/`, `services/`, `dtos/` sueltas a nivel raíz.
- **Separación de capas dentro del módulo** (Clean/Hexagonal simplificada, sin sobre-ingeniería para CRUDs triviales):
  - `*.controller.ts` — solo HTTP: recibe request, delega, devuelve response. Cero lógica de negocio.
  - `*.service.ts` — casos de uso / lógica de negocio. No conoce Express/Fastify ni detalles HTTP.
  - `*.repository.ts` (o el repositorio de tu ORM) — acceso a datos, aislado detrás de una interfaz cuando la lógica de negocio es compleja o hay múltiples fuentes de datos.
  - `dto/` — contratos de entrada/salida, validados.
  - `entities/` — modelo de dominio/persistencia.
- Aplica Clean Architecture completa (entities/use-cases/interfaces separados del framework) **solo si el dominio tiene reglas de negocio reales** (fintech, healthcare, estados complejos). Para un CRUD simple, el patrón Controller→Service→Repository de Nest ya es suficiente; forzar capas extra ahí es deuda técnica, no calidad.
- Nunca definas un provider en un módulo que en realidad pertenece a otro — rompe el encapsulamiento. Si otro módulo necesita un provider, expórtalo explícitamente y usa `imports`, no accesos indirectos.

```
src/
├── modules/
│   └── users/
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       ├── users.module.ts
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── entities/user.entity.ts
│       └── users.service.spec.ts
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── pipes/
│   └── decorators/
├── config/
│   └── configuration.ts
└── main.ts
```

## 2. Validación de entrada — nunca confíes en el input

- Todo DTO se valida, sin excepción. `class-validator` + `class-transformer` es lo estándar en Nest; si el proyecto ya usa Zod (como el resto del stack del usuario), usa `nestjs-zod` o un `ZodValidationPipe` custom para mantener consistencia con el front.
- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true` — cualquier campo no declarado en el DTO se rechaza, no se ignora silenciosamente.

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
);
```

- Nunca expongas la entidad de dominio/ORM directamente como respuesta HTTP. Siempre mapea a un DTO de salida (evita fugar columnas como `passwordHash`, `internalNotes`, etc.).

## 3. Seguridad — checklist no negociable

**Headers y transporte**
- `helmet()` siempre activo.
- CORS explícito por whitelist de orígenes, nunca `origin: '*'` en producción.
- HTTPS/TLS terminado antes del proceso Node (proxy/load balancer), pero fuerza `Strict-Transport-Security` vía Helmet igual.

**Rate limiting y abuso**
- `@nestjs/throttler` global, con límites más estrictos en endpoints sensibles (login, reset password, registro) que en el resto de la API.

```ts
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]);
// endpoint sensible:
@Throttle({ default: { limit: 5, ttl: 60000 } })
```

**Autenticación**
- JWT de vida corta (access token, 15 min) + refresh token de vida larga, **rotado en cada uso** y almacenado hasheado en DB (nunca el token plano).
- Passwords: `bcrypt` o `argon2` (preferido, resistente a GPU) con cost factor adecuado — nunca hash propio, nunca MD5/SHA sin salt.
- Guards (`AuthGuard`, `RolesGuard`) en capas separadas: autenticación (¿quién sos?) y autorización (¿qué podés hacer?) no se mezclan en un solo guard.

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

**Autorización**
- RBAC (roles) para casos simples; ABAC/policy-based (CASL u otra lib de políticas) cuando los permisos dependen del recurso (ej. "el usuario solo puede editar su propio post").
- Nunca confíes en IDs del body/params sin verificar ownership contra el usuario autenticado (`req.user`).

**Secretos y configuración**
- `@nestjs/config` con validación de esquema al arrancar (Joi o Zod) — la app **no debe levantar** si falta una env var crítica.
- Nunca secretos hardcodeados ni en el repo (`.env` en `.gitignore`, usar un secrets manager en producción: AWS Secrets Manager, Vault, etc.).

**Inyección y OWASP Top 10**
- ORM/query builder parametrizado siempre — nunca concatenar strings SQL, ni siquiera para reportes internos.
- Sanitiza/escapa cualquier output que se inyecte en HTML/emails para evitar XSS si el backend genera contenido renderizado.
- `class-validator` con `@IsUUID()`, `@IsEmail()`, límites de longitud (`@MaxLength`) en todos los campos de texto libre — previene payloads gigantes y ataques de tipo ReDoS/DoS por input.
- Body size limit explícito (`app.use(json({ limit: '1mb' }))` o el default de Fastify/Express ajustado) para evitar payloads abusivos.

## 4. Manejo de errores — predecible y sin fugas de información

- **Exception filter global** que captura todo, loguea el detalle interno y devuelve al cliente solo lo necesario (nunca stack traces ni mensajes de motor de DB en producción).

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    logger.error(exception); // detalle completo solo en logs internos
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

- Excepciones de dominio propias (`UserNotFoundException`, `InsufficientFundsException`) que extienden de `HttpException` o se mapean explícitamente — no uses `throw new Error('...')` genérico en lógica de negocio.
- Nunca captures un error solo para loguearlo y tragarlo (`catch { }` vacío). Si no puedes manejarlo, propágalo.

## 5. Logging y observabilidad

- Logging estructurado (JSON) en producción — `pino` (vía `nestjs-pino`) o el logger de Nest con formato custom. Nunca `console.log`.
- **Correlation/request ID** por request (interceptor o middleware), propagado en todos los logs de ese request para poder trazar un flujo completo.
- Nunca loguear datos sensibles: passwords, tokens completos, tarjetas, PII sin necesidad. Enmascara (`****1234`) cuando haga falta trazabilidad parcial.
- Health checks con `@nestjs/terminus` (`/health`) verificando DB, cache y dependencias externas críticas — no solo "el proceso está vivo".

## 6. Resiliencia — a prueba de fallos

- **Graceful shutdown**: capturar `SIGTERM`/`SIGINT`, dejar de aceptar requests nuevos, esperar que terminen las conexiones activas (DB, requests en curso) antes de salir. `app.enableShutdownHooks()`.
- **Timeouts explícitos** en toda llamada a servicios externos (HTTP client, DB) — nunca esperar indefinidamente.
- **Retries con backoff exponencial** solo en operaciones idempotentes; nunca reintentar un `POST` que crea un recurso sin idempotency key.
- **Circuit breaker** (ej. con `opossum` u otra lib) para dependencias externas inestables — evita que un servicio caído tumbe toda la app por cascada.
- Transacciones de DB explícitas para cualquier operación multi-paso que deba ser atómica; nunca dejar estado a medio escribir si un paso falla.
- Idempotency keys en endpoints de mutación crítica (pagos, creación de recursos) para tolerar reintentos del cliente sin duplicar efectos.

## 7. Base de datos

- Migraciones versionadas siempre (TypeORM migrations / Prisma migrate) — nunca `synchronize: true` en producción.
- Índices explícitos en columnas usadas en `WHERE`/`JOIN`/`ORDER BY` frecuentes.
- Paginación obligatoria en cualquier listado (`limit`/`cursor`), nunca devolver una tabla completa.
- Evita N+1: usa `relations`/`include` explícito o dataloaders, no loops con queries dentro.
- Connection pooling configurado con límites acordes a la carga esperada, no el default sin revisar.

## 8. Testing — la pirámide completa

- **Unit tests** (Jest) para services: mockea el repositorio/dependencias, testea la lógica de negocio pura, sin levantar Nest ni DB real.
- **Integration tests**: módulo completo con `Test.createTestingModule`, DB real (contenedor de test, ej. Testcontainers) o in-memory cuando aplique — verifica que las piezas se conectan bien.
- **E2E tests** (Supertest) contra la app HTTP completa: valida guards, pipes, filters y el contrato real de la API, incluyendo casos de error (401, 403, 422, 500).
- Todo endpoint sensible (auth, permisos, pagos) necesita tests explícitos de los casos negativos: sin token, token expirado, rol incorrecto, ownership incorrecto — no solo el happy path.
- Cobertura como guía, no como meta ciega: prioriza cubrir lógica de negocio y casos límite sobre getters/setters triviales.

```ts
describe('UsersService', () => {
  let service: UsersService;
  const repoMock = { findOne: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repoMock },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('lanza NotFound si el usuario no existe', async () => {
    repoMock.findOne.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });
});
```

## 9. CI/CD y calidad de código

- Lint (`eslint` + `@typescript-eslint`) y `prettier` en pre-commit (Husky + lint-staged) y como gate obligatorio en CI, no solo sugerencia.
- TypeScript en modo estricto (`strict: true`), sin `any` implícito ni explícito salvo justificación documentada.
- Pipeline mínimo: lint → typecheck → unit tests → integration/e2e tests → build → (opcional) scan de dependencias (`npm audit`/Snyk) → deploy.
- Escaneo de dependencias vulnerables automatizado (Dependabot/Snyk) — no esperar a que alguien lo note manualmente.
- Versionado semántico de la API (`/v1/...`) desde el día uno para poder introducir breaking changes sin romper consumidores existentes.

## 10. Checklist rápido al generar código

- [ ] ¿El DTO valida todos los campos y rechaza los no declarados?
- [ ] ¿El endpoint tiene guard de auth + guard de rol/ownership si corresponde?
- [ ] ¿Los errores devueltos al cliente evitan filtrar detalles internos?
- [ ] ¿Hay rate limiting en endpoints sensibles?
- [ ] ¿La operación multi-paso está en una transacción?
- [ ] ¿El listado tiene paginación?
- [ ] ¿Hay test unitario del caso feliz y de al menos un caso de error/permiso?
- [ ] ¿Se loguea sin exponer datos sensibles?
