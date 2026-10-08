---
name: devops-docker-kubernetes
description: Guía experta de DevOps para containerizar y orquestar aplicaciones con Docker y Kubernetes de nivel producción. Úsala siempre que el usuario pida crear/revisar un Dockerfile, diseñar manifiestos de Kubernetes (Deployment, Service, Ingress, HPA), configurar Helm charts o Kustomize, implementar GitOps (ArgoCD/Flux), definir resource limits/requests, configurar RBAC/Network Policies/Pod Security Standards, diseñar health checks (liveness/readiness/startup probes), o pida una infraestructura "segura", "resiliente", "escalable" o "production-ready" con Docker/Kubernetes. También aplica si menciona "K8s", "pod", "namespace", "service mesh", "cluster", "orquestación de contenedores", o compara Kubernetes vs Docker Swarm/Nomad.
---

# DevOps — Docker + Kubernetes de nivel producción (2026)

Guía de referencia para containerizar aplicaciones y orquestarlas en Kubernetes de forma segura, resiliente y observable. Genera siempre manifiestos/Dockerfiles completos, listos para copiar, con rutas de archivo exactas.

Principio rector: **Kubernetes es desopinado por defecto** — permite desplegar un pod sin límites de recursos, sin health checks y con acceso root al host si nadie lo impide explícitamente. Un cluster bien configurado se autorepara y escala sin que nadie lo note; uno mal configurado convierte cada deploy en un riesgo. Esta guía existe para cerrar esa brecha.

Esta skill complementa a `cicd-expert-pipelines` (el pipeline que construye y publica la imagen) y a `nestjs-secure-backend` (la app que corre dentro del container) — úsalas juntas cuando el flujo completo esté en juego.

## 1. Docker — imágenes listas para producción

- **Multi-stage siempre** (deps → build → runtime): la imagen final no lleva devDependencies, código fuente, ni herramientas de compilación.
- **Usuario no-root obligatorio** — nunca corras el proceso como root dentro del container; un container comprometido con root puede escalar al host.
- **Imagen base mínima**: `alpine`/`distroless`/`slim` — menos superficie de ataque, menos CVEs heredados, imágenes más chicas y rápidas de pull.
- Nunca montes el socket de Docker (`/var/run/docker.sock`) dentro de un container de aplicación — un container con acceso a ese socket puede lanzar containers privilegiados y comprometer el host.

```dockerfile
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
USER nodejs
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- `.dockerignore` con `node_modules`, `.git`, `.env*`, tests — evita filtrar secretos al build context e invalidar cache innecesariamente.
- Tagea imágenes por SHA del commit, nunca solo `latest` — es lo que permite rollback determinístico.
- Escanea la imagen (Trivy, Grype) antes de push al registry; bloquea el pipeline ante CVEs críticos sin parche.

## 2. Kubernetes — anatomía de un Deployment production-ready

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels: { app: api, team: backend }
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: api
          image: registry.example.com/api:GIT_SHA
          ports: [{ containerPort: 3000 }]
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits: { cpu: "500m", memory: "512Mi" }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          livenessProbe:
            httpGet: { path: /health/live, port: 3000 }
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 10
          startupProbe:
            httpGet: { path: /health/live, port: 3000 }
            failureThreshold: 30
            periodSeconds: 2
```

**`resources.requests`/`limits` no son opcionales.** Sin `requests`, el scheduler no puede ubicar pods de forma consciente de la carga real del nodo. Sin `limits`, un pod con memory leak puede consumir toda la memoria del nodo y tumbar a sus vecinos. Define ambos siempre, basados en medición real, no en un número arbitrario.

**Las tres probes cumplen roles distintos, no son intercambiables:**
- `livenessProbe`: ¿el proceso está trabado? Si falla, Kubernetes **reinicia el pod**.
- `readinessProbe`: ¿el pod puede recibir tráfico ahora mismo? Si falla, Kubernetes **lo saca del Service** sin reiniciarlo (útil durante warm-up o dependencias temporalmente caídas).
- `startupProbe`: para apps con arranque lento — evita que `livenessProbe` mate el pod antes de que termine de iniciar.

## 3. RollingUpdate y zero-downtime

- `maxUnavailable: 0` + `maxSurge: 1` (o más) asegura que nunca haya menos réplicas sirviendo tráfico de las declaradas durante un deploy.
- El `readinessProbe` es lo que hace el rolling update seguro: un pod nuevo no recibe tráfico hasta que reporta estar listo.
- **`preStop` hook + `terminationGracePeriodSeconds`** para shutdown ordenado: al recibir `SIGTERM`, la app debe dejar de aceptar conexiones nuevas y esperar que terminen las activas antes de salir, no cortar en seco.

```yaml
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          lifecycle:
            preStop:
              exec: { command: ["sh", "-c", "sleep 5"] }
```

## 4. Seguridad — defensa en profundidad (las 4C's)

Cloud → Cluster → Container → Code. Cada capa asume que la anterior puede fallar.

**RBAC — nunca wildcards**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { namespace: production, name: api-reader }
rules:
  - apiGroups: [""]
    resources: ["pods", "configmaps"]
    verbs: ["get", "list"]   # nunca ["*"] — un cluster sin RBAC granular otorga acceso amplio a cualquier cuenta autenticada
```
- Cuentas de servicio dedicadas por app, nunca `default` compartida entre workloads distintos.
- Principio de menor privilegio: cada `Role`/`ClusterRole` lista exactamente los verbos y recursos necesarios.

**Pod Security Standards — nivel `restricted` para producción**
- Reemplaza a las Pod Security Policies (deprecadas). Se aplica a nivel de namespace vía el admission controller nativo (estable desde 1.25).
- `restricted` exige: sin privilegios elevados, usuario no-root, filesystem raíz de solo lectura donde sea posible, todas las capabilities de Linux dropeadas.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
```

**Network Policies — deny-by-default**
- Sin `NetworkPolicy`, todos los pods del cluster pueden hablar entre sí libremente. Define una política deny-all por namespace y habilita solo el tráfico explícitamente necesario.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: production }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-api-to-db, namespace: production }
spec:
  podSelector: { matchLabels: { app: api } }
  policyTypes: [Egress]
  egress:
    - to: [{ podSelector: { matchLabels: { app: postgres } } }]
      ports: [{ protocol: TCP, port: 5432 }]
```

**Secretos**
- `Secret` nativo de K8s está solo codificado en base64, no cifrado — habilita **encryption at rest** en el cluster y, para producción seria, usa un secrets manager externo (External Secrets Operator + AWS Secrets Manager/Vault) en vez de secretos planos en manifiestos versionados.
- Nunca commitees `Secret` manifests con valores reales al repo, ni siquiera en un cluster privado — usa Sealed Secrets o el operador externo.

**API server**
- TLS en todas las conexiones, autenticación en cada request — esto ya viene resuelto en clusters managed (EKS/GKE/AKS); en self-managed, verifícalo explícitamente.

## 5. Health checks a nivel aplicación

El código de la app debe exponer endpoints reales, no solo "200 OK siempre":

- `/health/live`: el proceso responde — no verifica dependencias externas (si la DB cae, el proceso sigue vivo, no hay que reiniciarlo).
- `/health/ready`: el proceso puede servir tráfico — sí verifica dependencias críticas (conexión a DB, cache) con timeout corto.
- Nunca hagas que `/health/live` dependa de servicios externos — eso causa reinicios en cascada cuando una dependencia cae, en vez de solo sacar el pod del balanceo vía readiness.

## 6. Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api-hpa, namespace: production }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

- HPA depende de que `resources.requests` esté bien definido — sin eso, el porcentaje de utilización no tiene una base real de cálculo.
- `minReplicas` nunca en 1 para servicios críticos — sin redundancia mínima, cualquier reinicio de nodo causa downtime.
- Considera VPA (Vertical Pod Autoscaler) para ajustar `requests`/`limits` automáticamente en workloads con patrones de consumo variables, en vez de adivinar el valor una sola vez.

## 7. GitOps — el cluster como estado declarado, no como comandos sueltos

- **Todo cambio al cluster pasa por Git**, no por `kubectl apply` manual desde una laptop. Cada `kubectl` manual es una señal de que falta algo en el pipeline de GitOps.
- ArgoCD o Flux sincronizan el estado del cluster contra un repo — el repo es la fuente de verdad, el cluster converge hacia él automáticamente.
- Estructura recomendada: manifiestos base + overlays por entorno (Kustomize) o values por entorno (Helm), nunca manifiestos duplicados y editados a mano por ambiente.

```
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── staging/kustomization.yaml
    └── production/kustomization.yaml
```

- Todo cambio manual detectado (drift) entre el repo y el cluster real debe alertar — GitOps solo funciona si el drift se corrige automáticamente o se audita, no se ignora.

## 8. Namespaces y organización multi-equipo

- Un namespace por entorno/equipo/dominio, con convención de nombres y labels estandarizada en toda la organización (`app`, `team`, `env`).
- `ResourceQuota` y `LimitRange` por namespace para evitar que un equipo consuma todos los recursos del cluster compartido.
- Cada cambio manual vía `kubectl` en un namespace gestionado por GitOps es deuda técnica — trátalo como bug a corregir en el pipeline, no como atajo válido.

## 9. Observabilidad

- Métricas (Prometheus) + logs centralizados (Loki/ELK) + tracing distribuido (OpenTelemetry) — los tres, no solo logs sueltos por pod.
- Alertas basadas en SLOs definidos primero, no al revés — cada alerta debe mapear a un runbook documentado, no solo generar ruido en Slack.
- `kubectl top pods`/`nodes` y dashboards de Grafana para capacity planning — no esperes a un OOMKill para descubrir que los `limits` estaban mal dimensionados.

## 10. FinOps — costo como variable de diseño

- Right-sizing de `requests`/`limits` basado en métricas reales de uso (VPA en modo recomendación, o revisión periódica manual) — sobre-provisionar "por las dudas" es el desperdicio más común en clusters productivos.
- Nodos spot/preemptibles para workloads tolerantes a interrupción (batch jobs, workers no críticos), nodos on-demand solo donde la disponibilidad lo exige.
- Cluster autoscaler (no solo HPA de pods) para escalar la cantidad de nodos según demanda real, evitando pagar capacidad ociosa.

## 11. Checklist rápido al generar manifiestos

- [ ] ¿El Dockerfile es multi-stage con usuario no-root e imagen base mínima?
- [ ] ¿El Deployment define `resources.requests` y `limits`?
- [ ] ¿Existen las tres probes (`liveness`, `readiness`, `startup` si aplica) apuntando a endpoints reales?
- [ ] ¿`securityContext` con `runAsNonRoot`, `readOnlyRootFilesystem`, `capabilities: drop: [ALL]`?
- [ ] ¿El namespace fuerza Pod Security Standards `restricted`?
- [ ] ¿Hay `NetworkPolicy` deny-by-default con excepciones explícitas?
- [ ] ¿Los secretos usan un secrets manager externo, no valores planos versionados?
- [ ] ¿El RollingUpdate garantiza `maxUnavailable: 0` para servicios críticos?
- [ ] ¿El HPA tiene `minReplicas` > 1 y depende de `requests` bien definido?
- [ ] ¿El cambio se aplica vía GitOps (Git → ArgoCD/Flux), no `kubectl apply` manual?
