# Estado workflow-sistema — 2026-04-19

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
| 2.6–2.10 | bpmn-js, dmn-js, form-js, colaboración WebSocket | ✓ |
| 3 | Motor de trámites: instanciar, ejecutar, auditar | ✓ |
| 2.12 | Vistas role-aware + stats + tomar tarea | ✓ |
| 2.13 | Demo Ready: dataset limpio, ciclos verificados | ✓ |
| **2.11** | **Chat IA en el editor (NLP → bpmn-js)** | **⏳ PRÓXIMO** |
| 4 | IA copiloto avanzado + captura por voz | ⏳ |
| 5 | Analítica + portal cliente | ⏳ |
| 6 | App móvil Flutter | 🔒 |

## Dataset actual — LIMPIO Y VERIFICADO (2026-04-19)

### Usuarios (5)
| Email | Password | Rol |
|---|---|---|
| admin@workflow.com | Admin2024! | ADMINISTRADOR |
| carlos.mendez@empresa.com | User2024! | FUNCIONARIO |
| lucia.vargas@empresa.com | User2024! | FUNCIONARIO |
| sofia.ramos@gmail.com | User2024! | CLIENTE |
| miguel.torres@gmail.com | User2024! | CLIENTE |

### Política ACTIVA con BPMN completo
**"Solicitud de Licencia o Permiso"** — ID: `69e4f5cbf5d4e243da993d1a`

Flujo verificado:
```
StartEvent → serviceTask(Validar Auto) → userTask(CLIENTE: completar datos) →
userTask(FUNCIONARIO: revisar) → userTask(ADMIN: aprobación final) →
serviceTask(Notificar Auto) → EndEvent
```

Formularios vinculados por userTask:
- `Task_CompletarSolicitud` → ROL:CLIENTE   → Form `69e4f5cbf5d4e243da993d17` (Datos del Solicitante)
- `Task_RevisionFuncionario` → ROL:FUNCIONARIO → Form `69e4f5cbf5d4e243da993d18` (Revisión del Funcionario)
- `Task_AprobacionAdmin`    → ROL:ADMINISTRADOR → Form `69e4f5cbf5d4e243da993d19` (Aprobación Final)

### Ciclos verificados en producción
1. ✅ COMPLETADO: Cliente inicia → Cliente completa → Funcionario revisa → Admin aprueba → fin (historial 5 entradas)
2. ✅ DEVUELTO→EN_PROCESO: Funcionario devuelve → Cliente responde corrección
3. ✅ RECHAZADO: Funcionario rechaza con justificación

### Trámites demo actuales (3)
- 1 EN_PROCESO (devuelto+respondido, en revisión)
- 1 COMPLETADO (ciclo completo)
- 1 RECHAZADO

## Motor BPMN — comportamiento actual
- `serviceTask`/`scriptTask`/`task` se atraviesan automáticamente (como gateways)
- `userTask`: lee ROL desde `camunda:candidateGroups` > `documentation` patrón `ROL:X`
- Formulario: lee `camunda:formKey` > `documentation` patrón `FORM:{id}`
- `extractRolFromTask` devuelve solo X (sin el prefijo ROL:)

## Sprint 2.11 (PRÓXIMO) — Chat IA en el editor
- Panel lateral textarea + botón micrófono (Web Speech API)
- AI Service: `POST /ai/bpmn/command` → prompt + bpmnXml → operaciones estructuradas
- Frontend: traduce a `modeling.createShape` / `modeling.connect` bpmn-js
- Vista previa + undo nativo bpmn-js

## Decisiones técnicas fijas
- BPMN field en MongoDB: `bpmn_xml` (snake_case)
- BPMN documentation pattern: `ROL:X\nFORM:{formId}` en cada userTask
- API sin prefijo: `/policies`, `/forms`, `/decisions`, `/tramites`
- Login: campo `token` (no accessToken)
- DTOs siempre, URLs solo en environment.ts, lógica IA solo en services/
- User: `rol_id` (String) → `rolId` en Java
- **Auth storage: `sessionStorage`** (NO localStorage) — aislado por pestaña, evita bug de sesión cruzada entre tabs

## Endpoints consolidados (:8080)
- `POST /auth/login` → `{ token, nombreCompleto, rolNombre }`
- `GET|PUT /policies/{id}/bpmn`, `GET|POST|PUT|DELETE /policies`, `POST /policies/{id}/publish`
- `GET|POST|PUT|DELETE /forms`
- `POST /tramites` → `{ politicaId }`
- `GET /tramites?estado=X&page=0&size=10` — filtrado por rol automático
- `GET /tramites/{id}`, `POST /tramites/{id}/avanzar`, `POST /tramites/{id}/tomar`
- `POST /tramites/{id}/responder`, `GET /tramites/{id}/formulario-actual`
- `GET /tramites/stats`
