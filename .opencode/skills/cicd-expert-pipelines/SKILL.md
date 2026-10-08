---
name: cicd-expert-pipelines
description: Guía experta para diseñar y generar pipelines de CI/CD de nivel producción, principalmente con GitHub Actions, para proyectos Node.js/TypeScript (Next.js, NestJS, React). Úsala siempre que el usuario pida crear o revisar un workflow de GitHub Actions, configurar lint/test/build/deploy automatizado, armar un Dockerfile multi-stage para CI, configurar despliegue a staging/producción, manejar secretos/OIDC, agregar cache de dependencias, matrix builds, gates de aprobación, rollback, o pida un pipeline "profesional", "rápido", "seguro" o "a prueba de fallos". También aplica si menciona "GitHub Actions", "workflow", "pipeline", "CI/CD", "deploy automático", "self-hosted runner", o compara GitHub Actions vs GitLab CI vs Jenkins.
---

# CI/CD — Pipelines de nivel producción (2026)

Guía de referencia para diseñar y generar pipelines de CI/CD rápidos, seguros y confiables. Foco en **GitHub Actions** (plataforma dominante en 2026 para proyectos Node.js/TypeScript), con los mismos principios aplicables a GitLab CI si el proyecto usa esa plataforma. Genera siempre workflows completos, listos para copiar, con rutas de archivo exactas (`.github/workflows/...`).

Principio rector: **un pipeline solo vale la pena si es rápido, confiable y dice la verdad**. Uno que tarda 15+ minutos, es flaky, o no detecta los bugs reales que llegan a producción es peor que no tener pipeline — entrena al equipo a ignorarlo. Todo lo de esta guía apunta a eso.

## 1. Estructura — un workflow por responsabilidad

No metas todo en un archivo de 200 líneas. Separa por trigger y propósito:

```
.github/workflows/
├── ci.yml          # PR checks: lint, typecheck, test — el más rápido y paranoico
├── deploy.yml       # push a main: build + deploy a staging
└── release.yml       # tag/release: deploy a producción con aprobación
```

- `ci.yml` corre en cada PR y push — debe ser el más veloz posible, porque es el que el equipo ve constantemente.
- Reutiliza lógica común con **reusable workflows** (`workflow_call`) en vez de copiar/pegar steps entre archivos.

## 2. CI rápido — el pipeline que nadie debe aprender a ignorar

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage
      - run: npm run build
```

Puntos no negociables:
- **`permissions` explícito y mínimo** (`contents: read` por defecto; solo agrega más si un step lo necesita) — nunca dejes los permisos default amplios de `GITHUB_TOKEN`.
- **`concurrency` con `cancel-in-progress: true`**: si el usuario pushea 3 commits seguidos, no hace falta correr 3 pipelines completos — cancela los obsoletos. Ahorra 30-40% de minutos de CI en PRs activos.
- **`timeout-minutes` en cada job**: un job colgado sin timeout bloquea runners y retrasa a todo el equipo.
- **`cache: 'npm'`** en `setup-node` (hashea `package-lock.json` automáticamente) — sin esto, `npm ci` descarga todo desde cero en cada corrida.
- Usa siempre `npm ci`, nunca `npm install`, en CI — instalación determinística desde el lockfile, falla si el lockfile está desincronizado.
- Objetivo de tiempo: **bajo 5 minutos**. Si el pipeline supera eso, paraleliza jobs (lint/test/build como jobs separados que corren en paralelo, no secuenciales) antes de aceptar que sea lento.

## 3. Cache de artefactos de build

Además del cache de dependencias, cachea artefactos de build cuando el framework lo soporta (ej. `.next/cache` en Next.js):

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      nextjs-${{ runner.os }}-
```

## 4. Matrix builds — cuando hace falta, no por defecto

```yaml
strategy:
  matrix:
    node-version: [20, 22]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

- Úsalo cuando el proyecto declara soporte a múltiples versiones de Node/runtime, o para correr el mismo test suite contra distintos navegadores en e2e (Playwright). No lo agregues "por si acaso" — multiplica el tiempo total de CI.

## 5. Docker multi-stage — estándar para apps containerizadas

```dockerfile
# Dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
USER nodejs
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- **Multi-stage siempre**: la imagen final no lleva devDependencies, código fuente sin compilar, ni herramientas de build — solo lo necesario para correr.
- **Usuario no-root** (`USER nodejs`) — nunca corras el proceso de producción como root dentro del container.
- Imagen base `alpine` o `slim` — reduce superficie de ataque y tamaño de imagen.
- `.dockerignore` con `node_modules`, `.git`, `.env*`, tests — evita invalidar cache de capas innecesariamente y filtrar secretos al build context.
- Si despliegas a runners ARM (AWS Graviton, Apple Silicon), agrega `platforms: linux/amd64,linux/arm64` al step de build/push.

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## 6. Secretos — OIDC, nunca claves estáticas

**OIDC (OpenID Connect) es el estándar 2026** para autenticar contra la nube (AWS, GCP, Azure) desde GitHub Actions — evita guardar claves de larga duración como secreto.

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions-deploy
      aws-region: us-east-1
```

- Nunca hardcodees secretos en el YAML ni los imprimas en logs (`echo $SECRET` queda en el output del run).
- `GITHUB_TOKEN` con permisos mínimos por job (`permissions:` a nivel de job, no solo global).
- **Los secretos no están disponibles en workflows disparados por PRs desde forks** — es una protección de seguridad, no un bug. Para contribuciones externas, usa `environments` con aprobación requerida en vez de intentar exponer secretos al fork.
- Rota secretos periódicamente y usa un secrets manager (AWS Secrets Manager, Vault, GitHub Environments secrets) en vez de secretos a nivel de repo para todo.

## 7. Despliegue multi-entorno con gates

```yaml
# .github/workflows/release.yml
name: Deploy to Production
on:
  push:
    tags: ['v*']

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./scripts/deploy.sh
```

- **`environment: production` con reviewers requeridos** configurado en GitHub (Settings → Environments) — ningún deploy a producción sin aprobación humana explícita, sin importar quién pushee.
- Flujo de promoción: `main` → deploy automático a **staging** → gate manual → deploy a **producción**. Nunca saltees staging para features no triviales.
- **Zero-downtime**: rolling update o blue-green según la plataforma de destino; health check obligatorio antes de enrutar tráfico al nuevo release.
- **Rollback**: cada deploy debe ser reversible en minutos — tagea imágenes con el SHA del commit (no solo `latest`), para poder re-desplegar la versión anterior sin rebuild.

```yaml
- name: Health check post-deploy
  run: |
    for i in {1..10}; do
      curl -sf https://app.example.com/health && exit 0
      sleep 5
    done
    exit 1
```

## 8. Security scanning — parte del pipeline, no un paso aparte

- **Dependencias**: Dependabot (nativo de GitHub) o Snyk, con PRs automáticos de actualización. Además, `npm audit --audit-level=high` como gate en CI para vulnerabilidades conocidas.
- **Imagen Docker**: scan de la imagen construida (Trivy, Grype) antes de push al registry — bloquea el pipeline si hay CVEs críticos sin parche.
- **Actions de terceros**: fija versiones por SHA completo, no solo por tag (`uses: actions/checkout@<sha>` en vez de `@v4`), para acciones sensibles de terceros no mantenidas por GitHub/orgs verificadas — un tag puede ser reescrito, un SHA no.
- **Dependabot para Actions**: mantiene actualizadas las versiones de las actions usadas, igual que las dependencias del proyecto.
- Secret scanning y push protection (nativos de GitHub) activados a nivel de repo/org.

```yaml
- name: Scan image for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1
```

## 9. Monorepo — no rebuildees lo que no cambió

Si el proyecto es un monorepo (ej. app Next.js + API NestJS en el mismo repo):

- Usa `paths:` en los triggers para correr solo el pipeline del paquete afectado.

```yaml
on:
  pull_request:
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'
```

- O una herramienta de monorepo-aware CI (Turborepo, Nx) con cache remoto — evita recompilar/retestear paquetes que no cambiaron entre commits.
- Jobs independientes por app/paquete cuando el monorepo lo justifica, para paralelizar y no bloquear el deploy de un servicio por el fallo de otro no relacionado.

## 10. Observabilidad del propio pipeline

- Métricas a trackear: frecuencia de deploy, tiempo de build, tasa de fallos, MTTR (tiempo medio de recuperación ante un deploy roto) — no solo "¿pasó o no pasó?".
- Notificaciones de fallo en el canal del equipo (Slack/Discord webhook) solo para `main`/`release` — no satures con notificaciones de cada PR fallido, eso genera fatiga de alertas.
- Un pipeline flaky (falla intermitente sin cambios de código) es una prioridad a arreglar, no a re-ejecutar hasta que pase — normaliza esa práctica y el pipeline deja de decir la verdad.

## 11. Checklist rápido al generar un pipeline

- [ ] ¿`permissions` explícito y mínimo, no el default amplio?
- [ ] ¿`concurrency` con `cancel-in-progress` para no desperdiciar minutos?
- [ ] ¿`timeout-minutes` en cada job?
- [ ] ¿Cache de dependencias (`npm ci` + `cache: 'npm'`) y de build artifacts si aplica?
- [ ] ¿El Dockerfile es multi-stage con usuario no-root?
- [ ] ¿Los secretos de nube usan OIDC en vez de claves estáticas?
- [ ] ¿El deploy a producción tiene gate de aprobación humana (`environment` con reviewers)?
- [ ] ¿Hay health check post-deploy y estrategia de rollback clara (tag por SHA)?
- [ ] ¿Hay scan de dependencias y de la imagen Docker antes de deploy?
- [ ] ¿El pipeline de CI corre en menos de 5 minutos, o está paralelizado si no?
