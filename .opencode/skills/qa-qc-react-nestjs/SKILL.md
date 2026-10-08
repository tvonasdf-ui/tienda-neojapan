---
name: qa-qc-react-nestjs
description: Guía experta de QA/QC (estrategia de testing, calidad y prevención de regresiones) para stacks React (Vite/Next.js) + NestJS. Úsala siempre que el usuario pida diseñar una estrategia de testing, escribir tests unitarios/integración/e2e, configurar Vitest/Jest/Playwright/MSW/Supertest, definir qué y cuánto testear, revisar cobertura, detectar tests flaky, armar un plan de QA/QC, o pida que el código sea "confiable", "sin regresiones" o "bien testeado" en un proyecto React/NestJS. También aplica si menciona "test pyramid", "coverage", "mocking", "contract testing", "visual regression", o "smoke tests".
---

# QA/QC — React + NestJS (2026)

Guía de referencia para diseñar estrategia de testing y calidad en proyectos full-stack React + NestJS. Genera siempre tests completos, listos para copiar, con rutas de archivo exactas.

Principio rector: **una suite de 80 tests de comportamiento da más confianza que 200 tests que cada uno verifica una variable de estado interna.** El objetivo no es cobertura por cobertura — es que cuando algo se rompe, un test lo detecte antes que el usuario.

Stack de referencia 2026: **Vitest** (unit/integración, reemplaza a Jest en proyectos nuevos Vite/Next.js) + **React Testing Library** (componentes) + **MSW** (mocking de red) + **Playwright** (E2E) en el front; **Jest** + **Supertest** en NestJS (estándar del framework, sin necesidad de migrar a Vitest ahí). Si el proyecto ya tiene Jest funcionando en el front, no hay urgencia en migrar — pero para código nuevo, Vitest es el default.

## 1. La pirámide de testing — qué va en cada capa

```
        /\
       /E2E\          ← pocos (10-30), rutas críticas de negocio
      /------\
     /Integra-\        ← moderados, módulos/features completos
    /  ción    \
   /------------\
  /   Unitarios   \    ← muchos, lógica pura y aislada
 /------------------\
```

- **Unitarios**: funciones puras, hooks, servicios de NestJS con dependencias mockeadas, schemas Zod, utils. Rápidos (ms), sin red, sin DB, sin filesystem.
- **Integración**: un módulo/feature completo con sus piezas reales conectadas (componente + hooks + fetch mockeado con MSW; módulo NestJS completo con `Test.createTestingModule` y DB de test).
- **E2E**: flujo completo de usuario en un navegador real (Playwright) o contra la API HTTP real (Supertest end-to-end). Reservado para los 10-30 caminos donde un fallo cuesta dinero o confianza: login, checkout, creación del recurso principal del producto.

**Qué NO testear**: componentes de librerías de terceros ya testeadas upstream (no testees que un `<Button>` de shadcn/ui renderiza un `<button>`), snapshots gigantes que rompen con cualquier cambio de estilo, verificación de tipos que ya hace el compilador de TypeScript.

## 2. React — configuración base

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom msw jsdom
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- **Limitación conocida (2026)**: Vitest todavía no puede renderizar Server Components async de forma estable — esa lógica se testea con Playwright (E2E) o extrayendo la parte async a una función pura testeable aparte, no forzando el render en Vitest.

## 3. Testing de componentes React — comportamiento, no implementación

- Testea lo que el usuario ve y hace, no detalles internos (`useState` interno, nombres de props). React Testing Library fuerza esto por diseño (`getByRole`, `getByText`, no `getByTestId` como primera opción).
- `userEvent` (no `fireEvent`) para simular interacción real — dispara la secuencia completa de eventos del navegador (focus, keydown, keyup), no solo el evento sintético final.

```tsx
// login-form.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

test('muestra error si el email es inválido', async () => {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={vi.fn()} />);

  await user.type(screen.getByLabelText(/email/i), 'no-es-un-email');
  await user.click(screen.getByRole('button', { name: /ingresar/i }));

  expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
});
```

- No testees el `onSubmit` interno llamando directamente a la función — testea el flujo completo: el usuario interactúa, el resultado observable ocurre (mensaje de error, llamada a la API mockeada, navegación).

## 4. MSW — mockear red, no módulos

MSW intercepta requests HTTP a nivel de red (Service Worker en browser, interceptor en Node) — el código de la app no sabe que está mockeado, a diferencia de mockear el módulo `fetch`/axios directamente.

```ts
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com') {
      return HttpResponse.json({ token: 'fake-token' });
    }
    return HttpResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
  }),
];
```

- Handlers por defecto en `mocks/handlers.ts`; overrides puntuales por test con `server.use(...)` para casos de error específicos — no dupliques handlers completos por cada variación.
- `onUnhandledRequest: 'error'` (ver setup arriba) — un request no mockeado debe fallar el test explícitamente, no pasar silenciosamente a la red real.

## 5. Testing de Server Actions y schemas Zod

Las Server Actions de Next.js son funciones — testéalas como tales, sin renderizar nada:

```ts
// create-post.test.ts
import { createPost } from './create-post';

test('rechaza título vacío', async () => {
  const formData = new FormData();
  formData.set('title', '');
  await expect(createPost(formData)).rejects.toThrow();
});
```

- Los schemas Zod se testean directamente con `.safeParse()` — casos válidos, casos inválidos por cada regla, y los mensajes de error si el UX depende de ellos.

```ts
test('CreatePostSchema rechaza título mayor a 100 caracteres', () => {
  const result = CreatePostSchema.safeParse({ title: 'a'.repeat(101), content: 'x' });
  expect(result.success).toBe(false);
});
```

## 6. NestJS — unit tests de services

Mockea el repositorio/dependencias, testea la lógica pura, sin levantar Nest ni DB real:

```ts
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  const repoMock = { findOne: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repoMock }],
    }).compile();
    service = module.get(UsersService);
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    repoMock.findOne.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('hashea el password antes de guardar', async () => {
    await service.create({ email: 'a@b.com', password: 'plain' });
    expect(repoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: expect.not.stringMatching('plain') }),
    );
  });
});
```

- Un mock por dependencia externa (repositorio, cliente HTTP, servicio de email) — el test de un service nunca debe tocar red ni DB real.
- Casos negativos siempre: recurso no encontrado, input inválido, permiso insuficiente — no solo el happy path.

## 7. NestJS — integration tests de módulo

Módulo completo con `Test.createTestingModule`, DB real de test (Testcontainers) o in-memory según el motor:

```ts
// users.module.integration.spec.ts
describe('UsersModule (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [UsersModule, TestDatabaseModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('crea y luego encuentra un usuario', async () => {
    const service = app.get(UsersService);
    const created = await service.create({ email: 'a@b.com', password: 'x' });
    const found = await service.findById(created.id);
    expect(found?.email).toBe('a@b.com');
  });
});
```

- Testcontainers (o el contenedor de test del proyecto) para DB real de integración — evita el falso positivo de un mock de repositorio que no refleja restricciones reales del schema (constraints, índices únicos).

## 8. NestJS — E2E con Supertest

Contra la app HTTP completa: valida guards, pipes, filters y el contrato real de la API, incluyendo casos de error.

```ts
// auth.e2e-spec.ts
describe('POST /auth/login (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  it('devuelve 401 con credenciales inválidas', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' })
      .expect(401);
  });

  it('devuelve 200 y un token con credenciales válidas', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'correct' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
```

- Todo endpoint sensible (auth, permisos, pagos) necesita tests explícitos de: sin token, token expirado, rol incorrecto, ownership incorrecto — no solo 200 OK.
- Testea el `ValidationPipe` real (`forbidNonWhitelisted`) enviando campos extra y esperando rechazo — verificar el contrato de validación, no solo la lógica de negocio.

## 9. Playwright — E2E de React/Next.js

```ts
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('usuario inicia sesión y ve el dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/contraseña/i).fill('password123');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
});
```

- **Page Object Model** para flujos que se repiten entre tests (login, navegación común) — evita duplicar selectores en cada spec.
- Auto-waiting nativo de Playwright (`expect(locator).toBeVisible()`) en vez de `waitForTimeout` fijo — timeouts fijos son la causa #1 de tests flaky.
- Aísla estado entre tests con `test.beforeEach` que resetea sesión/DB de test, no dependas de orden de ejecución entre specs.
- Reserva Playwright para los flujos que Vitest no puede cubrir (Server Components async, integración real con el navegador) o donde el costo de un fallo en producción es alto — no dupliques ahí lo que un test unitario ya cubre más rápido.

## 10. Tests flaky — tratarlos como bug, no reintentar hasta que pasen

- Causas más comunes: timeouts fijos en vez de esperas basadas en condición, dependencia de orden de ejecución entre tests, estado compartido no limpiado entre tests (DB, mocks globales), fechas/horas no mockeadas (`Date.now()` real en un test que depende de tiempo).
- `vi.useFakeTimers()`/`jest.useFakeTimers()` para cualquier lógica que dependa de tiempo — nunca `setTimeout` real en un test.
- Un test flaky que se re-ejecuta hasta pasar en CI no está arreglado, está oculto — trátalo como el mismo tipo de bug que un fallo determinístico, con la misma prioridad.

## 11. Cobertura — guía, no meta ciega

- Usa cobertura para encontrar código sin testear que sí importa (lógica de negocio, validaciones, cálculos), no como número a maximizar.
- No persigas 100% — getters/setters triviales, código generado, y wrappers finos sobre librerías externas no aportan al perseguirlos.
- Gate de CI razonable: cobertura mínima sobre el código nuevo/modificado en un PR (diff coverage), más útil que un umbral global estático que penaliza igual todo el repo.

## 12. Contract testing y visual regression (cuándo sí)

- **Contract testing** (Pact u otro) cuando front y backend evolucionan en repos/equipos separados y un E2E completo es costoso de mantener — verifica que el contrato de la API no se rompió sin necesitar ambos servicios corriendo juntos.
- **Visual regression** (Chromatic si el proyecto usa Storybook, o `expect(page).toHaveScreenshot()` de Playwright) para componentes de UI donde el detalle visual es el producto (design system, landing pages) — no para cada componente del proyecto, el mantenimiento de baselines tiene costo real.

## 13. CI — dos jobs, no uno

Alineado con `cicd-expert-pipelines`: separa unit/integración (rápido, corre siempre) de E2E (más lento, corre solo si el primero pasa).

```yaml
jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test -- --coverage   # Vitest/Jest, unit + integración
  e2e:
    needs: unit-and-integration
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## 14. Checklist rápido al escribir tests

- [ ] ¿El test verifica comportamiento observable (lo que el usuario ve/hace), no implementación interna?
- [ ] ¿Cada endpoint sensible tiene test de al menos un caso negativo (401/403/422), no solo el happy path?
- [ ] ¿MSW/mocks cubren tanto el caso de éxito como el de error de red?
- [ ] ¿El test es determinístico — sin `setTimeout` real, sin dependencia de orden con otros tests?
- [ ] ¿La lógica de negocio compleja tiene test unitario aislado, sin pasar por HTTP/DB real?
- [ ] ¿El E2E está reservado para un flujo realmente crítico, no duplicando cobertura ya unitaria?
- [ ] ¿Un test que falla intermitentemente se investiga como bug, no se re-ejecuta hasta pasar?
