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

## Trámites `[requiere JWT]`
Sprint 3 — Motor de ejecución. Última actualización: 2026-04-18.

Estados posibles: `INICIADO | EN_PROCESO | COMPLETADO | RECHAZADO | CANCELADO | DEVUELTO | ESCALADO`

### POST /tramites → 201 `TramiteResponse`
Inicia un nuevo trámite sobre una política ACTIVA. El usuario autenticado queda como `clienteId`.
Parsea el `bpmnXml` de la política y posiciona el trámite en la primera `UserTask`.
Request:
```json
{ "politicaId": "str (requerido)" }
```
Error 400 si la política no existe, no está ACTIVA, o no tiene `bpmnXml`.

### GET /tramites → 200 `Page<TramiteResponse>`
Lista paginada filtrada automáticamente por rol del usuario autenticado:
- `ADMINISTRADOR` → todos los trámites
- `FUNCIONARIO` → trámites donde `etapaActual.responsableRolNombre` coincide con su rol
- `CLIENTE` (y otros) → solo trámites propios (`clienteId == userId`)

Query params: `page=0`, `size=20`

### GET /tramites/{id} → 200 `TramiteResponse`
Detalle completo con historial de auditoría.
Error 404 si no existe.

### POST /tramites/{id}/avanzar → 200 `TramiteResponse`
Avanza el trámite. Solo disponible en estados no finales (no COMPLETADO, RECHAZADO, CANCELADO).
Request:
```json
{ "accion": "APROBAR|RECHAZAR|DEVOLVER|ESCALAR", "observaciones": "str?", "formularioRespuesta": { ... }? }
```
Comportamiento por acción:
- `APROBAR` → navega al siguiente nodo BPMN. Si llega a EndEvent → estado `COMPLETADO`, `etapaActual = null`. Si hay siguiente UserTask → estado `EN_PROCESO`, actualiza `etapaActual`.
- `RECHAZAR` → estado `RECHAZADO`. Final.
- `DEVOLVER` → estado `DEVUELTO`. Cliente debe responder con `POST /tramites/{id}/responder`.
- `ESCALAR` → estado `ESCALADO`.
Toda acción genera un `HistorialEntry` con responsable, timestamp y observaciones.
Error 400 si el trámite ya está en estado final.

### GET /tramites/{id}/formulario-actual → 200 `FormularioActualResponse`
Retorna el formulario form-js de la etapa activa, si está configurado.
```json
{ "formularioId": "str|null", "formJsSchema": { ... }|null }
```

### POST /tramites/{id}/responder → 200 `TramiteResponse`
El cliente corrige y reenvía un trámite en estado `DEVUELTO`.
Solo puede llamarlo el `clienteId` original del trámite.
Request:
```json
{ "observaciones": "str?" }
```
Transición: `DEVUELTO → EN_PROCESO` (misma `etapaActual`).
Error 400 si no está en estado DEVUELTO o si otro usuario intenta responderlo.

---

TramiteResponse:
```json
{
  "id": "str",
  "politicaId": "str",
  "politicaNombre": "str",
  "politicaVersion": 1,
  "clienteId": "str",
  "estado": "INICIADO|EN_PROCESO|COMPLETADO|RECHAZADO|CANCELADO|DEVUELTO|ESCALADO",
  "etapaActual": {
    "actividadBpmnId": "str",
    "nombre": "str",
    "responsableRolNombre": "str",
    "formularioId": "str|null"
  },
  "historial": [
    {
      "actividadBpmnId": "str",
      "actividadNombre": "str",
      "responsableId": "str",
      "responsableNombre": "str",
      "accion": "str",
      "timestamp": "ISO datetime",
      "observaciones": "str|null"
    }
  ],
  "creadoEn": "ISO datetime",
  "actualizadoEn": "ISO datetime",
  "fechaVencimientoEtapa": "ISO datetime|null"
}
```

---

## Empresas `[GET público | escritura requiere GESTIONAR_EMPRESAS]`
Sprint 3.1 — Módulo multi-empresa. Última actualización: 2026-04-22.

### GET /empresas → 200 `EmpresaResponse[]`
Lista todas las empresas activas. Público (no requiere JWT).

### GET /empresas/{id} → 200 `EmpresaResponse`
Detalle de una empresa. Público. Error 404 si no existe.

### POST /empresas → 201 `EmpresaResponse`
Requiere `GESTIONAR_EMPRESAS` (solo SUPERADMIN).
Request:
```json
{ "nombre": "str (requerido, max 150)", "razonSocial": "str?", "nit": "str?", "emailContacto": "email?", "telefono": "str?", "direccion": "str?", "ciudad": "str?", "pais": "str?", "activa": "bool?" }
```
Error 400 si ya existe una empresa con ese nombre.

### PUT /empresas/{id} → 200 `EmpresaResponse`
Requiere `GESTIONAR_EMPRESAS`. Actualiza solo campos no nulos (patch semántico).
Error 404 si no existe. Error 400 si el nuevo nombre ya está tomado.

### DELETE /empresas/{id} → 204
Requiere `GESTIONAR_EMPRESAS`. Soft delete (`activa = false`).

EmpresaResponse:
```json
{ "id", "nombre", "razonSocial", "nit", "emailContacto", "telefono", "direccion", "ciudad", "pais", "activa", "adminPrincipalId", "creadoEn", "actualizadoEn" }
```

---

## Files `[POST requiere JWT | GET público | DELETE requiere GESTIONAR_USUARIOS o GESTIONAR_EMPRESAS]`
Sprint 3.1 — Almacenamiento de archivos. Última actualización: 2026-04-22.

### POST /files/upload → 201 `FileReference`
Sube un archivo. Content-Type: `multipart/form-data`, field: `file`.
Tipos permitidos: `image/jpeg`, `image/png`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
Tamaño máximo: 10 MB.
Error 400 si el tipo MIME no está permitido o supera el tamaño.

### GET /files/{fileId} → 200 `Resource`
Sirve el archivo con su Content-Type correcto.
Uso: referenciable directamente en `<img src>` sin token.
Error 404 si el archivo no existe.

### DELETE /files/{fileId} → 204
Elimina el archivo físicamente. Requiere autoridad `GESTIONAR_USUARIOS` o `GESTIONAR_EMPRESAS`.

FileReference (también clase embebible en otros Documents):
```json
{ "fileId": "uuid", "nombre": "str (nombre original)", "tipo": "MIME type", "url": "/files/{fileId}", "tamanio": "bytes (Long)", "subidoEn": "ISO datetime" }
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
