Eres un redactor técnico profesional. Genera un documento Word formal y completo sobre el stack tecnológico del sistema descrito abajo. El documento debe tener portada, índice, secciones bien estructuradas con títulos y subtítulos, tablas donde corresponda, y lenguaje técnico académico en español.

---

# SISTEMA: Workflow Sistema — Plataforma de Gestión de Trámites Empresariales

## Descripción general

Plataforma web y móvil para diseñar, ejecutar y monitorear políticas y procesos de negocio. Permite modelar flujos con BPMN, crear formularios dinámicos, gestionar roles de usuario, generar trazabilidad completa y aplicar reglas de negocio con DMN. Caso de uso principal: empresa de telecomunicaciones (TelecomBolivia) con procesos de instalación de internet, soporte técnico y reclamos.

---

## Stack tecnológico completo

### 1. Backend — API REST

| Elemento | Detalle |
|---|---|
| Lenguaje | Java 21 |
| Framework | Spring Boot 3.x |
| Base de datos | MongoDB 7.0 (driver reactivo) |
| Autenticación | JWT (JSON Web Tokens) |
| Puerto | 8080 |
| Build | Maven (mvnw wrapper) |
| Contenedor | Docker |

**Módulos y dependencias clave:**
- Spring Web MVC — controladores REST
- Spring Security — autenticación y autorización por roles
- Spring Data MongoDB — repositorios y consultas
- Spring WebSocket + STOMP — colaboración en tiempo real
- Lombok — reducción de boilerplate
- Jackson — serialización JSON
- Spring Actuator — health checks y métricas

**Patrones aplicados:**
- Arquitectura por capas: Controller → Service → Repository
- DTOs para todas las respuestas (nunca documentos MongoDB directos)
- Append-only para historial de trámites
- Versionado de políticas (no edición con trámites activos)
- Scheduler con `@Scheduled` para vencimiento de apelaciones

**Roles del sistema:**
- `SUPERADMIN` — administra empresas y configuración global
- `ADMINISTRADOR` — administra su empresa, usuarios, áreas, políticas y formularios
- `FUNCIONARIO` — atiende tareas asignadas por departamento
- `CLIENTE` — inicia trámites y consulta estado

**Endpoints principales:**
- `/auth` — login y refresh de tokens
- `/users`, `/roles`, `/departments`, `/empresas` — gestión de entidades
- `/policies` — CRUD, publicación, versionado, BPMN, colaboración WebSocket
- `/activities` — tareas BPMN con propiedades y formularios asociados
- `/forms`, `/decisions` — formularios dinámicos y reglas DMN
- `/tramites` — motor de trámites completo (avanzar, tomar, responder, apelar)
- `/files/upload`, `/files/{id}` — almacenamiento de archivos

---

### 2. Frontend — Aplicación Web

| Elemento | Detalle |
|---|---|
| Lenguaje | TypeScript 5.x |
| Framework | Angular 17 |
| UI Components | Angular Material |
| Routing | Angular Router (lazy loading) |
| Estado | Services + RxJS |
| Puerto desarrollo | 4200 |
| Build producción | nginx en Docker |

**Dependencias clave:**
- `@angular/material` — componentes UI (tablas, formularios, dialogs, snackbars)
- `@stomp/rx-stomp` — WebSocket para colaboración en tiempo real
- `bpmn-js` — editor visual de procesos BPMN 2.0
- `dmn-js` — editor de tablas de decisión DMN
- `@bpmn-io/form-js` — renderizador y editor de formularios dinámicos
- `rxjs` — programación reactiva

**Módulos principales:**
- `AuthModule` — login, guards por rol
- `PoliciesModule` — CRUD de políticas, editor BPMN, panel de propiedades
- `TramitesModule` — portal cliente y panel funcionario
- `AdminModule` — gestión de usuarios, departamentos y empresa
- `FormsModule` — editor de formularios dinámicos
- `DecisionsModule` — editor DMN

**Convenciones:**
- Todas las URLs del backend en `environment.ts` solamente
- Autenticación en `sessionStorage` (no `localStorage`)
- Interceptor HTTP agrega el JWT en cada petición

---

### 3. AI Service — Generación de Flujos con IA

| Elemento | Detalle |
|---|---|
| Lenguaje | Python 3.11 |
| Framework | FastAPI |
| Servidor ASGI | Uvicorn |
| Puerto | 8001 |
| Contenedor | Docker |

**Dependencias clave:**
- `anthropic` — SDK oficial de Claude (Anthropic)
- `groq` — SDK de Groq (modelos alternativos)
- `pydantic` + `pydantic-settings` — validación de datos y configuración
- `httpx` — cliente HTTP asíncrono
- `python-dotenv` — carga de variables de entorno

**Capacidades:**
- Generación automática de XML BPMN a partir de descripción en lenguaje natural
- Sugerencia de formularios por tipo de proceso
- Modelo por defecto: `claude-sonnet-4-6`
- Comunicación interna con el backend (no expuesto al frontend directamente)

---

### 4. Aplicación Móvil

| Elemento | Detalle |
|---|---|
| Framework | Flutter 3.x |
| Lenguaje | Dart |
| Plataformas | Android, iOS |
| Estado | Riverpod 2.x |

**Dependencias clave:**
- `flutter_riverpod` + `riverpod_annotation` + `riverpod_generator` — gestión de estado reactivo con generación de código
- `go_router` — navegación declarativa
- `http` — cliente HTTP para consumir la API REST del backend
- `flutter_secure_storage` — almacenamiento seguro de tokens JWT
- `firebase_core` + `firebase_messaging` — notificaciones push (FCM)

**Funcionalidades:**
- Autenticación con JWT (token guardado en secure storage)
- Portal cliente: iniciar y consultar trámites
- Panel funcionario: ver tareas asignadas, completar formularios
- Notificaciones push en tiempo real con Firebase Cloud Messaging
- Entrada de voz para descripción de trámites

---

### 5. Base de Datos

| Elemento | Detalle |
|---|---|
| Motor | MongoDB 7.0 |
| Modo local | Docker (puerto 27017) |
| Modo producción | MongoDB Atlas (cloud) |

**Colecciones principales:**
- `users` — usuarios con rol, empresa y departamento
- `empresas` — empresas multitenancy
- `departments` — departamentos por empresa
- `policies` — políticas con XML BPMN embebido y versionado
- `activities` — actividades BPMN con propiedades (departamento, formulario, etc.)
- `forms` — definiciones de formularios dinámicos (campos, tipos, validaciones)
- `decisions` — tablas de decisión DMN
- `tramites` — instancias de procesos con estado, historial y archivos
- `respuestas_formulario` — respuestas por actividad (append-only)
- `files` — metadatos de archivos almacenados
- `roles` — definiciones de roles del sistema

---

### 6. Infraestructura y DevOps

| Elemento | Detalle |
|---|---|
| Contenedores | Docker + Docker Compose |
| Servidor web (frontend prod) | nginx |
| CI/CD | Manual (build local + scp a EC2) |
| Despliegue opción A | EC2 único con Docker Compose |
| Despliegue opción B | EC2 backend + S3/CloudFront frontend + MongoDB Atlas |

**Variables de entorno por servicio:**

Backend:
```
MONGODB_URI, JWT_SECRET, JWT_EXPIRATION, AI_SERVICE_URL, CORS_ORIGINS, UPLOADS_DIR
```

AI Service:
```
ANTHROPIC_API_KEY, GROQ_API_KEY, CLAUDE_MODEL, MAX_TOKENS, TIMEOUT_SECONDS, CORS_ORIGINS
```

Frontend (compiladas en build):
```
apiUrl, aiServiceUrl, wsUrl
```

---

### 7. Protocolos y comunicación entre servicios

```
Navegador / App móvil
        │
        ├── HTTPS/REST → Frontend Angular (puerto 80/443 prod)
        │                       │
        │                       └── HTTP/REST → Backend Spring Boot (8080)
        │                                               │
        │                                               ├── MongoDB (27017)
        │                                               ├── HTTP → AI Service (8001)
        │                                               └── /uploads/ (archivos)
        │
        └── WebSocket (wss://) → Backend Spring Boot (colaboración BPMN)
        └── FCM (Firebase) → App móvil (notificaciones push)
```

**Regla de arquitectura:** el frontend y la app móvil nunca se comunican directamente con MongoDB ni con el AI Service. Todo pasa por el backend.

---

### 8. Seguridad

- JWT firmado con secreto configurable (mínimo 32 caracteres)
- Tokens en `sessionStorage` (web) y `flutter_secure_storage` (móvil)
- CORS configurado por variable de entorno (solo dominios autorizados)
- Roles verificados en cada endpoint con Spring Security
- Archivos servidos con autenticación (no públicos)
- Sin contraseñas en código fuente (todas por variables de entorno)

---

### 9. Motor de procesos BPMN

- Estándar: BPMN 2.0 (compatible con Camunda)
- Editor visual: `bpmn-js` con panel de propiedades personalizado
- Elemento soportado: `userTask` con asignación por `departmentId`
- Formularios: `camunda:formKey` o referencia `FORM:{id}` en documentation
- Estados de trámite: `INICIADO`, `EN_PROCESO`, `COMPLETADO`, `RECHAZADO`, `CANCELADO`, `DEVUELTO`, `ESCALADO`, `SIN_ASIGNAR`, `EN_APELACION`
- Acciones disponibles: `APROBAR`, `RECHAZAR`, `DEVOLVER`, `ESCALAR`, `OBSERVAR`, `DENEGAR`
- Apelaciones: ventana de 48h desde OBSERVAR/DENEGAR, vencimiento automático por scheduler

---

Genera el documento Word con los siguientes requerimientos:
1. Portada con título "Stack Tecnológico — Workflow Sistema", fecha y nombre del autor si se proporciona
2. Tabla de contenidos automática
3. Cada sección numerada con título en negrita
4. Tablas con bordes y encabezados sombreados
5. Bloques de código en fuente monoespaciada (Consolas o Courier New)
6. Diagrama de arquitectura en texto ASCII conservado tal como está
7. Tono formal y técnico, en español
8. Márgenes normales, fuente Arial o Calibri 11pt, interlineado 1.15
