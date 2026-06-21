# ms-geo — Microservicio de Geolocalización Espacial

> Motor geoespacial de FocoCero para el reporte, seguimiento y análisis de incendios forestales basado en PostGIS. Gestiona ubicaciones, perímetros y severidad de focos en territorio chileno.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/Express-5.2%2B-blue)](https://expressjs.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.3%2B-green)](https://postgis.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Stack

| Componente | Tecnología | Versión |
|-----------|------------|---------|
| **Runtime** | Node.js | ≥ 20.0.0 |
| **Framework** | Express | ^5.2.1 (v5 nativa) |
| **Base de Datos** | PostgreSQL + PostGIS | Postgres 15 + PostGIS 3.3 |
| **Cliente DB** | pg | ^8.20.0 |
| **Autenticación** | Firebase Admin SDK | ^10.3.0 |
| **Validación** | Zod | ^4.3.6 |
| **Documentación** | Swagger (swagger-ui-express) | ^5.0.1 |
| **Seguridad** | Helmet + express-rate-limit | ^8.1.0 / ^8.3.1 |
| **Métricas** | prom-client | ^15.1.3 |
| **Logs** | Pino | ^10.3.1 |
| **Service Discovery** | Eureka (eureka-js-client) | ^4.5.0 |
| **Proxy** | http-proxy-middleware | ^3.0.5 |

---

## Requisitos

- **Node.js** ≥ 20.0.0
- **PostgreSQL 15** con extensión **PostGIS 3.3+**
- **Acceso a Firebase Console** (proyecto `fococero-3f3f7`) — cuenta de servicio con permiso para verificar ID tokens
- **Eureka Server** corriendo en `http://localhost:8761` (opcional, para service discovery)
- **Docker** (recomendado) o instancia local de PostGIS

---

## Variables de Entorno

| Variable | Requerida | Valor por Defecto | Descripción |
|----------|-----------|-------------------|-------------|
| `PORT` | No | `3002` | Puerto del microservicio |
| `NODE_ENV` | No | `development` | Entorno (`development`, `production`, `test`) |
| `DB_USER` | **Sí** | — | Usuario de PostgreSQL |
| `DB_PASSWORD` | **Sí** | — | Contraseña de PostgreSQL |
| `DB_NAME` | **Sí** | — | Nombre de la base de datos (ej: `fococero_geo`) |
| `DB_HOST` | No | `localhost` | Host de PostgreSQL (se auto‑configura para Docker) |
| `DB_PORT` | No | `5432` | Puerto de PostgreSQL en Docker |
| `DB_HOST_LOCAL` | No | `localhost` | Host de PostgreSQL en desarrollo local |
| `DB_PORT_LOCAL` | No | `5433` | Puerto local expuesto (evita conflicto con otras DBs) |
| `EUREKA_HOST` | No | `localhost` | Host del servidor Eureka |
| `API_GATEWAY_URL` | No | `http://localhost:3000` | URL del API Gateway (para CORS estricto) |
| `INTERNAL_SECRET_TOKEN` | **Sí** | — | Token secreto compartido entre microservicios |
| `FIREBASE_PROJECT_ID` | **Sí** | — | ID del proyecto Firebase |
| `FIREBASE_CLIENT_EMAIL` | **Sí** | — | Email de la cuenta de servicio de Firebase |
| `FIREBASE_PRIVATE_KEY` | **Sí** | — | Llave privada RSA de la cuenta de servicio |

> **⚠️ Importante**: `FIREBASE_PRIVATE_KEY` debe contener saltos de línea literales (`\n` escapados como `\\n` en el `.env`). El código aplica `replace(/\\n/g, '\n')` automáticamente.

### Detección automática de Docker

Si `DB_HOST=db-fococero`, asume red Docker (puerto `5432`). En caso contrario, usa `DB_HOST_LOCAL` + `DB_PORT_LOCAL` para desarrollo local.

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url> fococero-backend
cd fococero-backend/ms-geo
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con los valores correspondientes
```

### 3. Inicializar la base de datos PostGIS

El microservicio requiere una base de datos con PostGIS habilitado. Usando Docker:

```bash
# Desde la raíz del backend
docker compose up -d db-fococero
```

O manualmente:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

El servidor se inicia en `http://localhost:3002` con hot‑reload via `ts-node-dev`.

### 5. Build y producción

```bash
npm run build
npm start
```

---

## Endpoints

Todas las rutas geográficas están prefijadas bajo `/api/geo`. El microservicio expone endpoints públicos (ciudadanos) y protegidos (personal autorizado).

### 🔓 Zona Pública — No requiere autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/geo` | Reportar un nuevo foco de incendio |
| `GET` | `/api/geo` | Listar todos los focos activos |
| `GET` | `/api/geo/cercanos?lat=&lng=&radio=` | Buscar focos cercanos a una coordenada (radio en metros) |
| `GET` | `/api/geo/:id` | Obtener detalle de un foco por ID |

### 🔒 Zona Protegida — Requiere token Firebase (personal autorizado)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/geo/:id/estado` | Cambiar estado operativo del foco |
| `PATCH` | `/api/geo/:id/perimetro` | Actualizar perímetro geográfico (formato WKT) |
| `PUT` | `/api/geo/:id` | Actualización integral del reporte (recalcula severidad) |
| `DELETE` | `/api/geo/:id` | Eliminación lógica (soft delete) de un foco |

### Estados Operativos (`EstadoFoco`)

```
Reportado → En Evaluación → En Combate → Controlado → Extinguido
                                                  → Falsa Alarma
```

### Severidad (cálculo automático)

La severidad se evalúa con `GeoHelper.evaluarSeveridad()` según:

| Factor | Baja | Moderada | Alta | Crítica |
|--------|------|----------|------|---------|
| Viento (km/h) | < 20 | 20–39 | 40–59 | ≥ 60 |
| Amenaza viviendas | No | — | — | Sí |

### Validación geográfica (Chile)

Todas las coordenadas pasan por un validador Zod que restringe el territorio chileno:

```
Latitud:  -56.0° a -17.0°
Longitud: -76.0° a -66.0°
```

---

## Swagger (/api/docs)

La documentación interactiva de la API está disponible en:

```
http://localhost:3002/api/docs
```

Se genera a partir del archivo `src/docs/swagger.json` y se sirve mediante `swagger-ui-express`. Incluye ejemplos de peticiones, esquemas de validación y códigos de respuesta.

---

## Seguridad

El microservicio implementa tres capas de seguridad:

### 1. Helmet (cabeceras HTTP)

Se aplica `helmet()` con CSP estricto que solo permite recursos `'self'` y datos inline para imágenes.

### 2. Rate Limiting (cuota por IP)

100 peticiones por IP cada 15 minutos. Respuesta `429` con mensaje en español.

### 3. Autenticación de dos niveles

| Capa | Middleware | ¿Qué protege? |
|------|-----------|---------------|
| **Interna** | `internalAuthMiddleware` | Todas las rutas `/api/geo` excepto `/api/health`, `/metrics` y `/api/docs`. Requiere header `x-internal-token` con el `INTERNAL_SECRET_TOKEN`. |
| **Firebase JWT** | `validateFirebaseToken` | Rutas operativas (`PATCH`, `PUT`, `DELETE`). Verifica criptográficamente el token Bearer contra Firebase Auth. |

> **Zona Pública vs Protegida**: Las rutas de consulta y reporte ciudadano (`POST`, `GET`) están abiertas. Las rutas de modificación requieren autenticación Firebase. Ver el orden en `geo.routes.ts`.

### 4. CORS

Origen restringido a `API_GATEWAY_URL` (por defecto `http://localhost:3000`).

---

## Eureka

El microservicio se registra automáticamente en el servidor Eureka al iniciar.

```typescript
initEurekaClient('ms-geo', Number(PORT));
```

**Comportamiento**:

- **Nombre de aplicación**: `MS-GEO` (en mayúsculas)
- **Host**: Si `EUREKA_HOST=localhost` usa `localhost`; si apunta a un contenedor Docker usa `ms-geo` (resolución por nombre de contenedor)
- **Puerto**: El definido en `PORT` (default `3002`)
- **Health check**: `http://<host>:<port>/health`
- **Reintentos**: 10 reintentos con 2 segundos de espera entre cada uno

Para deshabilitar Eureka, basta con no definir `EUREKA_HOST` o dejar que falle la conexión — el microservicio funciona de forma autónoma.

---

## Métricas (Prometheus)

Endpoints disponibles:

| Ruta | Descripción |
|------|-------------|
| `GET /api/health` | Health check (retorna `{ ok: true, status: 'UP', service: 'ms-geo', environment }`) |
| `GET /metrics` | Métricas en formato Prometheus (`prom-client`) |

---

## Pruebas

```bash
npm test              # Jest + Supertest
npm run lint          # ESLint + Prettier
npm run format        # Formateo automático
```

---

## Estructura del Proyecto

```
ms-geo/
├── src/
│   ├── config/           # Configuración (DB, Firebase, Eureka, logger, envs)
│   ├── controllers/      # Controladores Express (GeoController)
│   ├── docs/             # Documentación Swagger (swagger.json)
│   ├── helpers/          # Utilidades (AppError, GeoHelper, catchAsync)
│   ├── middlewares/       # auth, error, internalAuth, metrics, validate
│   ├── models/           # Interfaces, tipos y DTOs
│   ├── repositories/     # Capa de acceso a datos PostGIS
│   ├── routes/           # Definición de rutas Express
│   ├── services/         # Lógica de negocio (GeoService)
│   ├── validators/       # Esquemas Zod de validación
│   └── index.ts          # Punto de entrada
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Integración con el API Gateway

El `api-gateway` enruta las peticiones `GET/POST /api/geo/*` hacia `ms-geo:3002`. No es necesario exponer el puerto del microservicio al host — toda la comunicación ocurre en la red interna `fococero-network`.

```typescript
// En api-gateway/src/routes/routes.ts
appRoutes.use('/api/geo', proxyTo('GEO_SERVICE_URL'));
```

---

## Licencia

MIT © FocoCero
