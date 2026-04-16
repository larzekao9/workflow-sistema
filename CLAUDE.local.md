# Estado workflow-sistema — 2026-04-15

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
| **2.11** | **Chat IA en el editor (NLP → bpmn-js)** | **⏳ PRÓXIMO** |
| 3 | Motor de trámites: instanciar, ejecutar, auditar | ⏳ |
| 4 | IA copiloto avanzado + captura por voz | ⏳ |
| 5 | Analítica de cuellos de botella + portal cliente | ⏳ |
| 6 | App móvil Flutter | 🔒 |

## Sprint 2.10 ✓ — Completado
Backend: WebSocket STOMP + `CollaborationService` (in-memory presence), `/ws` endpoint, `WebSocketAuthInterceptor` (solo GESTIONAR_POLITICAS), endpoints `join/leave/collaborators`, optimistic lock en `saveBpmn` (bpmnVersion, 409 en conflicto).
Frontend: `CollaborationService` (@stomp/stompjs + SockJS), avatares en top-bar del editor, `localBpmnVersion` en autoSave y saveNow, snackbar de conflicto con reload.

## Sprint 2.11 (PRÓXIMO) — Chat IA en el editor
- Panel lateral con textarea + botón micrófono (Web Speech API)
- AI Service: `POST /ai/bpmn/command` → recibe prompt + bpmnXml actual → devuelve operaciones estructuradas
- Frontend traduce operaciones a `bpmn-js` API calls (`modeling.createShape`, `modeling.connect`, etc.)
- Vista previa de cambios antes de aplicar + undo nativo bpmn-js

## Marco conceptual (skill: experto-workflows.md)
El sistema NO es un editor de diagramas. Es una plataforma de control operativo con tres capas:
- **Modelado** (Admin): diseña, versiona y publica políticas
- **Ejecución** (Funcionario): opera tareas en su bandeja, aprueba/rechaza/devuelve
- **Solicitud** (Cliente): inicia trámites, adjunta docs, consulta estado, corrige observaciones

Reglas que nunca se rompen:
- Política publicada NO se edita estructuralmente → se crea nueva versión
- Toda acción importante genera trazabilidad (quién, qué, cuándo, por qué)
- Políticas deben validarse (bpmnlint ya activo) antes de publicarse
- Funcionarios ven solo lo de su rol; clientes no ven lógica interna

## Sprint 3 — Motor de Trámites (el más crítico)
El corazón del sistema: convierte una política publicada en un proceso ejecutable real.

**Ciclo completo:** Cliente inicia → Funcionario valida (puede DEVOLVER al cliente) → Cliente corrige y reenvía → Funcionario aprueba → siguiente etapa → … → COMPLETADO

**Modelo `tramites` (MongoDB):**
```
{ politicaId, politicaVersion, clienteId,
  estado: INICIADO|EN_PROCESO|COMPLETADO|RECHAZADO|CANCELADO|DEVUELTO,
  etapaActual: { actividadBpmnId, nombre, responsableRolId, formularioId },
  historial: [{ actividadId, responsableId, accion, timestamp, observaciones, evidencias[] }],
  fechaVencimientoEtapa }   ← para escalamiento por SLA
```

**Backend endpoints:**
- `POST /tramites` → parsea bpmnXml de la política, instancia en primera UserTask
- `GET /tramites` → filtrado por rol (funcionario: asignados a su rol; cliente: propios)
- `GET /tramites/{id}` → detalle con historial completo
- `POST /tramites/{id}/avanzar` → `{ accion: APROBAR|RECHAZAR|DEVOLVER|ESCALAR, observaciones, formularioRespuesta }` → motor evalúa gateways + DMN → genera auditoría
- `GET /tramites/{id}/formulario-actual` → devuelve formJsSchema de la etapa activa
- `POST /tramites/{id}/adjuntos` → evidencias
- `POST /tramites/{id}/responder` → cliente reenvía tras devolución

**Frontend:**
- `TramitesListComponent` (bandeja) → funcionario ve asignados; cliente ve los propios
- `TramiteEjecucionComponent` → form-js viewer + Aprobar/Rechazar/Devolver + adjuntos
- `NuevoTramiteComponent` → cliente inicia solicitud desde política publicada
- `TramiteCorreccionComponent` → cliente responde observación y reenvía
- Toda acción genera entrada en historial (auditoría obligatoria)

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

## Endpoints consolidados (:8080)
- `POST /auth/login` → `{ token }`
- `GET|PUT /policies/{id}/bpmn` → `{ bpmnXml }`
- `GET|POST|PUT|DELETE /policies`
- `GET|POST|PUT|DELETE /forms` + `GET /forms/{id}`
- `GET|POST|PUT|DELETE /decisions` + `GET|PUT /decisions/{id}/dmn`
- `GET|POST /tramites` + `GET /tramites/{id}` + `POST /tramites/{id}/avanzar`

## Referencia detallada
Plan completo de sprints 2.10–6: `docs/sprint-planning.md`
