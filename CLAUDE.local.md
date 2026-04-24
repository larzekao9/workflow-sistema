# CLAUDE.local.md — workflow-sistema · 2026-04-24

## Stack
Backend: Java 21 + Spring Boot 3.5 + MongoDB · :8080  
Frontend: Angular 17 + Material + bpmn-js/dmn-js/form-js · :4200  
Docker Compose local · `docker-compose up -d`

## Credenciales demo
`admin@workflow.com / Admin2024!` → ADMINISTRADOR  
`superadmin@workflow.com / Super2024!` → SUPERADMIN

## Actores (sin cargos)
- SUPERADMIN → gestiona empresas + asigna admins
- ADMINISTRADOR → empresa propia, departamentos, políticas BPMN, formularios
- FUNCIONARIO → atiende tareas de su área (sin cargo, solo departmentId)
- CLIENTE → inicia trámites, completa formularios, apela

## Reglas
- No reconstruir. Solo modificar lo necesario.
- Backend: DTOs siempre, nunca exponer MongoDB directos.
- Frontend: URLs solo en environment.ts, auth en sessionStorage.
- Historial append-only. Política con trámites activos = congelada.
- Prohibido catch vacío.

## Completado
3.1 Empresas+Superadmin+Files · 3.2 Refactor entidades · 3.3 Asignación auto  
3.4 Flujo apelación · 3.5 Panel propiedades BPMN · 3.6 Portal cliente

## Sprints pendientes

### Sprint 4.1 · Respuestas formulario persistidas (2d)
- `RespuestaFormulario` MongoDB: tramiteId, actividadId, usuarioId, campos Map<String,Object>, archivos FileRef[]
- `POST /tramites/{id}/responder` guarda respuestas + avanza estado
- `GET /tramites/{id}/respuestas` devuelve historial completo de respuestas
- tramite-detalle: sección "Datos previos" para que el siguiente actor vea todo

### Sprint 4.2 · Swimlanes → mapeo de área (1d)
- flow-editor: onElementChanged → si UserTask dentro de un Lane → auto-set departmentId desde lane name
- Backend `PATCH /activities/{id}/propiedades` ya existe; solo conectar lane → departmentId
- Quitar cargos del motor: solo departmentId para asignación
- Properties panel: campo "Área" se auto-completa desde el lane

### Sprint 4.3 · Form builder inline en editor BPMN (2d)
- En el sidebar del flow-editor (Sprint 3.5): tab "Formulario" con builder simple
- Campos: nombre, tipo (text/number/date/file/select/textarea), required
- Guardar via `POST /forms` → linkear a actividad.formularioId
- Si ya existe formularioId → cargar y editar (`PUT /forms/{id}`)

### Sprint 4.4 · Seed demo TelecomBolivia real (1d)
- `seed_telecom.py` actualizado: 3 políticas BPMN con BPMN XML real + formularios reales
- Policy 1: Instalación Internet (Solicitud CC → Verificación → Visita Técnico → Aprobación)
- Policy 2: Soporte Técnico (Recepción → Diagnóstico → Resolución)
- Policy 3: Reclamo (Recepción → Investigación → Respuesta con branching)
- Trámites demo en estados variados (INICIADO, EN_PROCESO, COMPLETADO, EN_APELACION)

### Sprint 4.5 · Continuidad de datos entre actividades (1d)
- Tramite.respuestasFormularios: List<RespuestaFormularioRef> (embed resumen por actividad)
- tramite-detalle: accordion "Datos de etapas anteriores" visible para todos los actores
- Documentos subidos en pasos anteriores: links de descarga accesibles
