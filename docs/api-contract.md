# Contrato de API — workflow-sistema
Base URL: `http://localhost:8080`
Auth: Bearer JWT en header `Authorization` (excepto /auth/*)
Última actualización: 2026-04-12 | Sprint 2 completado

---

## Auth

### POST /auth/register
Request:
```json
{ "email": "str", "username": "str", "password": "str (min 6)", "nombreCompleto": "str", "rolId": "str", "departamento": "str?" }
```
Response 201:
```json
{ "token": "str", "expiresIn": 86400000, "user": { ...UserResponse } }
```

### POST /auth/login
Request:
```json
{ "email": "str", "password": "str" }
```
Response 200: igual a /register

---

## Users `[requiere JWT]`

### GET /users → 200 `UserResponse[]`
### GET /users/{id} → 200 `UserResponse`
### POST /users → 201 `UserResponse`
Request: `{ "email", "username", "password", "nombreCompleto", "rolId", "departamento?" }`
### PUT /users/{id} → 200 `UserResponse`
Request: `{ "nombreCompleto?", "rolId?", "departamento?", "activo?" }`
### DELETE /users/{id} → 204

UserResponse:
```json
{ "id", "username", "email", "nombreCompleto", "rolId", "rolNombre", "departamento", "activo", "creadoEn" }
```

---

## Roles `[requiere JWT]`

### GET /roles → 200 `RoleResponse[]`
### GET /roles/{id} → 200 `RoleResponse`
### POST /roles → 201 `RoleResponse`
Request: `{ "nombre": "str", "descripcion": "str?", "permisos": ["str"] }`
### PUT /roles/{id} → 200 `RoleResponse`
Request: `{ "nombre?", "descripcion?", "permisos?", "activo?" }`
### DELETE /roles/{id} → 204

RoleResponse:
```json
{ "id", "nombre", "descripcion", "permisos": ["str"], "activo", "creadoEn", "actualizadoEn" }
```

---

## Policies `[requiere JWT]`

### GET /policies → 200 `Page<PoliticaResponse>`
Query params: `estado?` (BORRADOR|ACTIVA|INACTIVA|ARCHIVADA), `nombre?`, `page?` (default 0), `size?` (default 20)

### GET /policies/{id} → 200 `PoliticaResponse`

### POST /policies → 201 `PoliticaResponse` `[ADMIN]`
Request:
```json
{ "nombre": "str (3-150)", "descripcion": "str?", "departamento": "str?", "tags": ["str"]?, "icono": "str?", "color": "str?" }
```
Estado inicial: BORRADOR. version: 1.

### PUT /policies/{id} → 200 `PoliticaResponse` `[ADMIN]`
Request: `{ "nombre?", "descripcion?", "departamento?", "tags?", "icono?", "color?" }`
Error 400 si la política no está en estado BORRADOR.

### DELETE /policies/{id} → 204 `[ADMIN]`
Soft delete: cambia estado a INACTIVA. Error 400 si ya está ARCHIVADA.

### POST /policies/{id}/publish → 200 `PoliticaResponse` `[ADMIN]`
Publica la política (BORRADOR → ACTIVA). Validaciones:
- Exactamente 1 actividad INICIO
- Al menos 1 actividad FIN
- Toda actividad TAREA tiene `responsableRolId`
- Toda actividad DECISION tiene >= 2 transiciones con condiciones distintas
- Todos los nodos son alcanzables desde INICIO (grafo conexo)
Error 400 si alguna validación falla.

### POST /policies/{id}/version → 201 `PoliticaResponse` `[ADMIN]`
Crea una nueva versión (BORRADOR, version+1) copiando la política y sus actividades.
Solo desde estado ACTIVA o ARCHIVADA. Error 400 si el estado no permite versionado.

PoliticaResponse:
```json
{
  "id", "nombre", "descripcion", "version", "versionPadreId", "estado",
  "actividadInicioId", "actividadIds": ["str"],
  "metadatos": { "tags": ["str"], "icono": "str", "color": "str" },
  "creadoPorId", "departamento", "creadoEn", "actualizadoEn"
}
```

---

## Activities `[requiere JWT]`

### GET /policies/{policyId}/activities → 200 `ActividadResponse[]`
Lista todas las actividades de una política.

### GET /activities/{id} → 200 `ActividadResponse`

### POST /activities → 201 `ActividadResponse` `[ADMIN]`
Request:
```json
{
  "politicaId": "str",
  "nombre": "str",
  "descripcion": "str?",
  "tipo": "INICIO|TAREA|DECISION|FIN",
  "responsableRolId": "str? (obligatorio para TAREA)",
  "formularioId": "str?",
  "posicion": { "x": 0.0, "y": 0.0 },
  "transiciones": [{ "actividadDestinoId": "str", "condicion": "SIEMPRE|APROBADO|RECHAZADO|str", "etiqueta": "str?" }],
  "tiempoLimiteHoras": 0
}
```
Error 400 si la política no está en estado BORRADOR.

### PUT /activities/{id} → 200 `ActividadResponse` `[ADMIN]`
Request: todos los campos son opcionales.
Error 400 si la política no está en estado BORRADOR.

### DELETE /activities/{id} → 204 `[ADMIN]`
Error 400 si la actividad está referenciada por la transición de otra actividad.
Error 400 si la política no está en estado BORRADOR.

ActividadResponse:
```json
{
  "id", "politicaId", "nombre", "descripcion", "tipo",
  "responsableRolId", "formularioId",
  "posicion": { "x": 0.0, "y": 0.0 },
  "transiciones": [{ "actividadDestinoId", "condicion", "etiqueta" }],
  "tiempoLimiteHoras", "creadoEn", "actualizadoEn"
}
```

---

## AI Service
Base URL: `http://localhost:8001`

### POST /api/v1/policy/generate → genera borrador de política desde texto
### POST /api/v1/tramite/summarize → resume historial de trámite
### POST /api/v1/flow/analyze → detecta cuellos de botella

_Schemas detallados: ver ai-service/app/schemas/_

---

## Errores estándar
```json
{ "timestamp": "ISO", "status": 400|401|403|404|500, "error": "str", "message": "str" }
```
