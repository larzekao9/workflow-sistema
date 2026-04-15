# Contrato de API — workflow-sistema
Base URL: `http://localhost:8080`
Auth: Bearer JWT en header `Authorization` (excepto /auth/*)
Última actualización: 2026-04-15 | Sprint 2.8 completado

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

## Forms `[requiere JWT]`

### GET /forms → 200 `Page<FormularioResponse>`
Query params: `nombre?`, `estado?` (ACTIVO|INACTIVO), `page?` (default 0), `size?` (default 20)

### GET /forms/{id} → 200 `FormularioResponse`

### POST /forms → 201 `FormularioResponse`
Request:
```json
{
  "nombre": "str (3-100)",
  "descripcion": "str?",
  "secciones": [{
    "titulo": "str",
    "orden": 1,
    "campos": [{
      "nombre": "snake_case",
      "etiqueta": "str",
      "tipo": "TEXT|NUMBER|DATE|BOOLEAN|SELECT|MULTISELECT|TEXTAREA|FILE|EMAIL",
      "obligatorio": true,
      "orden": 1,
      "placeholder": "str?",
      "valorDefecto": "str?",
      "opciones": ["str"],
      "validaciones": { "min": 0, "max": 0, "pattern": "str?", "mensajeError": "str?" }
    }]
  }]
}
```
Error 400 si nombre duplicado. Error 400 si SELECT/MULTISELECT sin opciones.

### PUT /forms/{id} → 200 `FormularioResponse`
Request: mismos campos, todos opcionales. Error 400 si formulario INACTIVO.

### DELETE /forms/{id} → 204
Soft delete (→ INACTIVO). Error 400 si formulario referenciado en alguna actividad.

FormularioResponse:
```json
{
  "id", "nombre", "descripcion", "estado",
  "secciones": [{ "id", "titulo", "orden", "campos": [{ "id", "nombre", "etiqueta", "tipo", "obligatorio", "orden", "placeholder", "valorDefecto", "opciones", "validaciones" }] }],
  "creadoPorId", "creadoEn", "actualizadoEn"
}
```

---

## Policy Relations `[requiere JWT]`

### GET /policies/{policyId}/relations → 200 `PoliticaRelacionResponse[]`
Retorna relaciones donde la política es origen O destino.

### POST /policies/{policyId}/relations → 201 `PoliticaRelacionResponse`
Request:
```json
{ "politicaDestinoId": "str", "tipoRelacion": "DEPENDENCIA|PRECEDENCIA|COMPLEMENTO|EXCLUSION|OVERRIDE|ESCALAMIENTO", "prioridad": 1, "descripcion": "str?" }
```
Error 400 si: origen == destino, par+tipo ya existe, tipo ESCALAMIENTO sin `tiempoLimiteDias` en política origen, políticas ARCHIVADAS.

### DELETE /policies/{policyId}/relations/{relacionId} → 204
Soft delete (`activo = false`). Nunca eliminación física.

PoliticaRelacionResponse:
```json
{ "id", "politicaOrigenId", "politicaOrigenNombre", "politicaDestinoId", "politicaDestinoNombre", "tipoRelacion", "prioridad", "descripcion", "activo", "creadoPorId", "creadoEn" }
```

---

## Decisions `[GET público | escritura requiere GESTIONAR_POLITICAS]`

### POST /decisions → 201 `DecisionResponse`
Crea una tabla de decisión DMN asociada a un Exclusive Gateway de una política.
Genera un DMN XML inicial válido para dmn-js.
Request:
```json
{ "politicaId": "str", "gatewayBpmnId": "str", "nombre": "str (2-120)" }
```

### GET /decisions/{id} → 200 `DecisionResponse`
Detalle sin dmnXml. Para obtener el XML usar `GET /decisions/{id}/dmn`.

### GET /decisions/by-politica/{politicaId} → 200 `DecisionResponse[]`
Lista todas las tablas DMN de una política, sin dmnXml.

### GET /decisions/by-gateway?politicaId=&gatewayBpmnId= → 200 `DecisionResponse` | 404
Busca la tabla DMN de un Exclusive Gateway específico.

### GET /decisions/{id}/dmn → 200
Retorna el XML DMN completo. Si no había XML guardado, genera y persiste uno inicial.
Response: `{ "dmnXml": "str" }`

### PUT /decisions/{id}/dmn → 204
Persiste el XML DMN completo (guardado por dmn-js).
Request: `{ "dmnXml": "str" }`

### DELETE /decisions/{id} → 204
Elimina la tabla de decisión.

DecisionResponse:
```json
{
  "id", "nombre", "dmnXml" (null en listados, presente en detalle y /dmn),
  "politicaId", "gatewayBpmnId",
  "creadoPorId", "creadoEn", "actualizadoEn"
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
