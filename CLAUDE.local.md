# Estado workflow-sistema — 2026-04-18

## Stack
- Backend: Java 21 + Spring Boot 3 + MongoDB → :8080
- Frontend: Angular 17 + Angular Material → :4200
- AI Service: Python 3.11 + FastAPI + Anthropic API → :8001
- Mobile: Flutter → congelado hasta Sprint 6
- Deploy: Docker Compose (4 contenedores)

## Roadmap resumido
| Sprint | Feature | Estado |
|---|---|---|
| 1 | Auth JWT, usuarios, roles | ✓ |
| 2–2.4 | Motor políticas CRUD, formularios, relaciones, UX, permisos | ✓ |
| 2.6 | bpmn-js editor BPMN real | ✓ |
| 2.7 | Token simulation + bpmnlint | ✓ |
| 2.8 | dmn-js: tablas de decisión CRUD | ✓ |
| 2.9 | form-js: editor/viewer de formularios | ✓ |
| 2.10 | Colaboración tiempo real (WebSocket) | ✓ |
| 3 | Motor de trámites: instanciar, ejecutar, auditar | ✓ |
| 2.12 | Vistas por actor (Cliente/Funcionario/Admin) + stats | ✓ |
| **2.11** | **Chat IA en el editor (NLP → bpmn-js)** | **⏳ PRÓXIMO** |
| 4 | IA copiloto avanzado + captura por voz | ⏳ |
| 5 | Analítica de cuellos de botella + portal cliente | ⏳ |
| 6 | App móvil Flutter | 🔒 |

## Sprint 3 ✓ — Motor de Trámites completado (2026-04-18)

**Ciclo probado:** Cliente inicia → estado INICIADO → Funcionario aprueba → COMPLETADO (navega BPMN) | DEVUELTO → Cliente responde → EN_PROCESO

**Backend — paquete `com.workflow.tramites`:**
- `Tramite.java` — Document MongoDB, enum `EstadoTramite` (INICIADO/EN_PROCESO/COMPLETADO/RECHAZADO/CANCELADO/DEVUELTO/ESCALADO), inner classes `EtapaActual` y `HistorialEntry`
- `BpmnMotorService.java` — parsea BPMN 2.0 XML con DocumentBuilder (namespace-unaware), soporta prefijos `bpmn:`, `bpmn2:` y sin prefijo. Salta gateways automáticamente. XXE prevention.
- `TramiteService.java` — filtrado por rol: ADMINISTRADOR=todos, FUNCIONARIO=por responsableRolNombre, CLIENTE=propios
- `TramiteController.java` — 6 endpoints REST

**Importante — BpmnMotorService:** La etapa dice "Revisión Manual" si el UserTask en el BPMN no tiene atributo `camunda:candidateGroups`. Para que el motor lea el rol correcto, los UserTasks en el editor deben tener ese atributo o texto "ROL:FUNCIONARIO" en `documentation`.

**Frontend — `frontend/src/app/tramites/`:**
- `tramites.component.ts` — bandeja paginada, chips de color por estado
- `tramite-detalle/` — detalle + form-js viewer + botones APROBAR/RECHAZAR/DEVOLVER con dialog de observaciones + timeline de historial
- `nuevo-tramite/` — selector de políticas ACTIVAS + submit
- `tramite-correccion/` — respuesta a devolución

**Rutas Angular:** `/tramites`, `/tramites/nuevo`, `/tramites/:id`, `/tramites/:id/correccion`

**Dataset de prueba en MongoDB:**
- 3 políticas ACTIVAS con BPMN: "Solicitud de Compra", "Solicitud de Licencia o Permiso", "Solicitud de Reembolso de Gastos"
- IDs: 69e2fa3f5872c06a054b3d8f, 69e2fa3f5872c06a054b3d90, 69e2fa3f5872c06a054b3d91
- 8 usuarios de prueba (password: `Test1234!`) + admin (password: `admin123`)

## Sprint 2.10 ✓ — Colaboración tiempo real
Backend: WebSocket STOMP + `CollaborationService` (in-memory presence), `/ws` endpoint, `WebSocketAuthInterceptor` (solo GESTIONAR_POLITICAS), endpoints `join/leave/collaborators`, optimistic lock en `saveBpmn` (bpmnVersion, 409 en conflicto).
Frontend: `CollaborationService` (@stomp/stompjs + SockJS), avatares en top-bar del editor, `localBpmnVersion` en autoSave y saveNow, snackbar de conflicto con reload.

## Plan Sprint 2.12 adelante — Gaps críticos (2026-04-19)

### Gaps identificados (análisis funcional)
1. **UserTask sin rol real** — BpmnMotorService ya parsea `documentation` buscando ROL:X, pero el editor no escribe ese dato. Todas las etapas caen en "Revisión Manual / FUNCIONARIO".
2. **Sin formularios vinculados** — `formularioId` en EtapaActual siempre null. El motor no lee `formKey` del BPMN.
3. **Sin "tomar tarea"** — Cualquier FUNCIONARIO puede resolver cualquier trámite. No hay asignación individual.

### Sprint 2.12.A — Panel propiedades UserTask en editor BPMN (Frontend)
Cuando se selecciona un UserTask en bpmn-js, mostrar panel lateral con:
- Nombre de la tarea (editable)
- Rol responsable (select: FUNCIONARIO/CLIENTE/ADMINISTRADOR) → escribe en `documentation` como "ROL:FUNCIONARIO"
- Formulario asociado (select lista GET /forms) → escribe como "FORM:{id}" en documentation
Implementación: `selection.changed` event del modeler → leer `businessObject.documentation` → escribir vía `modeling.updateProperties`

### Sprint 2.12.B — Backend: formKey + tomar tarea
- `BpmnMotorService.getFormKeyFromTask(bpmnXml, taskId)` — lee documentation para patrón "FORM:xxx"
- `TramiteService.crearTramite` y `procesarAprobacion` → setean formularioId desde formKey
- `Tramite`: nuevo campo `asignadoAId`, `asignadoANombre`
- `POST /tramites/{id}/tomar` → asigna funcionario actual
- `GET /tramites` para FUNCIONARIO: devuelve sin-asignar de su rol + asignados a él

### Sprint 2.12.C — Frontend: tomar tarea en bandeja
- Bandeja FUNCIONARIO: columna "Asignado" + botón "Tomar" si no asignado / badge "Tuyo" si asignado
- TramiteService.tomar(id)

## Sprint 2.12 ✓ — Vistas por actor completadas (2026-04-19)

**Backend:**
- `GET /tramites/stats` → `{ total, iniciados, enProceso, completados, rechazados, devueltos, escalados, cancelados }` — filtrado por scope de rol
- `GET /tramites?estado=X` → filtro por estado opcional (INICIADO/EN_PROCESO/COMPLETADO/RECHAZADO/DEVUELTO/ESCALADO/CANCELADO)
- `TramiteStatsResponse.java` — nuevo DTO
- `TramiteRepository` — 6 nuevos métodos count* y find*AndEstado

**Frontend:**
- `app.component.ts` — nav role-aware: CLIENTE (3 items), FUNCIONARIO (2), ADMIN (6). Toolbar muestra nombre + chip rol con colores (rojo=ADMIN, azul=FUNC, verde=CLIENTE)
- `dashboard.component.ts` — CLIENTE: stats+últimos 5+banner devueltos; FUNCIONARIO: stats+activos urgentes; ADMIN: 7 KPI cards+tabla global
- `tramites.component.ts` — bandeja role-aware con filtros por estado, indicador URGENTE si >3 días
- `tramite-detalle.component.ts` — panel decisión inline (APROBAR/RECHAZAR/DEVOLVER/ESCALAR), banners por estado para cliente, timeline historial con iconos
- `tramite-correccion.component.ts` — card contexto con observaciones del funcionario prominentes
- `nuevo-tramite.component.ts` — preview card de política seleccionada

**Dataset en MongoDB (8 trámites):**
- 2 COMPLETADO, 2 EN_PROCESO, 1 INICIADO, 1 DEVUELTO, 1 RECHAZADO, 1 ESCALADO

## Sprint 2.11 (PRÓXIMO) — Chat IA en el editor
- Panel lateral con textarea + botón micrófono (Web Speech API)
- AI Service: `POST /ai/bpmn/command` → recibe prompt + bpmnXml actual → devuelve operaciones estructuradas
- Frontend traduce operaciones a `bpmn-js` API calls (`modeling.createShape`, `modeling.connect`, etc.)
- Vista previa de cambios antes de aplicar + undo nativo bpmn-js

## Marco conceptual
El sistema NO es un editor de diagramas. Es una plataforma de control operativo con tres capas:
- **Modelado** (Admin): diseña, versiona y publica políticas
- **Ejecución** (Funcionario): opera tareas en su bandeja, aprueba/rechaza/devuelve
- **Solicitud** (Cliente): inicia trámites, adjunta docs, consulta estado, corrige observaciones

Reglas que nunca se rompen:
- Política publicada NO se edita estructuralmente → se crea nueva versión
- Toda acción importante genera trazabilidad (quién, qué, cuándo, por qué)
- Políticas deben validarse (bpmnlint ya activo) antes de publicarse
- Funcionarios ven solo lo de su rol; clientes no ven lógica interna
- INACTIVA permite editar metadatos Y diagrama BPMN (igual que BORRADOR)

## Decisiones técnicas fijas
- bpmn-js = editor; campo `bpmnXml` en documento `Politica`
- dmn-js = decisiones; colección `decisiones`, referenciadas desde gateways BPMN
- form-js = formularios; campo `formJsSchema` en documento `Formulario`
- BPMN XML = fuente de verdad del diagrama (Sprint 3 parsea el XML para ejecutar)
- API sin prefijo versión: `/policies`, `/forms`, `/decisions`, `/tramites`
- Login response: campo `token` (no `accessToken`)
- DTOs siempre — nunca exponer documentos MongoDB directos
- URLs del backend exclusivamente en `environment.ts`
- Lógica IA solo en `services/`, nunca en `routers/`
- User tiene campo `rolId` (String, single role) — no lista de roles

## Endpoints consolidados (:8080)
- `POST /auth/login` → `{ token }`
- `GET|PUT /policies/{id}/bpmn` → `{ bpmnXml }`
- `GET|POST|PUT|DELETE /policies`
- `POST /policies/{id}/publish` → publica política BORRADOR → ACTIVA
- `GET|POST|PUT|DELETE /forms` + `GET /forms/{id}`
- `GET|POST|PUT|DELETE /decisions` + `GET|PUT /decisions/{id}/dmn`
- `POST /tramites` → `{ politicaId }`
- `GET /tramites` → paginado, filtrado por rol automáticamente
- `GET /tramites/{id}`
- `POST /tramites/{id}/avanzar` → `{ accion: APROBAR|RECHAZAR|DEVOLVER|ESCALAR, observaciones }`
- `GET /tramites/{id}/formulario-actual`
- `POST /tramites/{id}/responder` → `{ observaciones }`

## Referencia detallada
Plan completo de sprints: `docs/sprint-planning.md`
