# CLAUDE.local.md — workflow-sistema
## Contexto operativo — 2026-04-24

### Objetivo
Plataforma BPMN + formularios dinámicos para ejecutar políticas/trámites administrativos.

### Stack
- **Backend:** Java 21 + Spring Boot 3 + MongoDB
- **Frontend:** Angular 17 + Material
- **AI:** Python 3.11 + FastAPI
- **BPMN:** bpmn-js (editor visual)
- **Puertos:** 4200 (frontend), 8080 (backend), 8001 (AI), 27017 (DB)

### Actores
1. **ADMINISTRADOR** — crea empresas, usuarios, áreas, cargos, políticas BPMN, formularios
2. **FUNCIONARIO** — ejecuta tareas asignadas (revisar, aprobar, observar, denegar, devolver)
3. **CLIENTE** — inicia trámites, completa formularios, corrige observaciones

### Usuario demo
```
admin@workflow.com / Admin2024! → ADMINISTRADOR
```

### Política demo activa
```
ID: 69e4f5cbf5d4e243da993d1a
Nombre: Solicitud de Licencia o Permiso
Formularios vinculados:
  - Task_CompletarSolicitud (CLIENTE) → Form 69e4f5cbf5d4e243da993d17
  - Task_RevisionFuncionario (FUNCIONARIO) → Form 69e4f5cbf5d4e243da993d18
  - Task_AprobacionAdmin (ADMINISTRADOR) → Form 69e4f5cbf5d4e243da993d19
```

### Estado real
✅ MVP funcional: login, políticas CRUD, BPMN, instanciación trámites, formularios vinculados, ciclos probados.

**Ciclos verificados:**
- **COMPLETADO:** cliente → completa → funcionario revisa → admin aprueba → fin
- **DEVUELTO:** funcionario devuelve → cliente corrige → EN_PROCESO
- **RECHAZADO:** funcionario rechaza + justificación → fin

**NO reconstruir desde cero.** Reforzar lo existente.

### Gaps críticos
1. **candidateGroups en BPMN** — tareas sin mapeo claro de rol/área/cargo
2. **Tomar tarea individual** — múltiples funcionarios no pueden reclamar una tarea
3. **Formularios por UserTask** — vinculación incompleta o inconsistente
4. **Persistencia de respuestas** — no guarda por trámite/tarea/usuario completo
5. **Historial append-only** — falta registro exhaustivo de cada acción
6. **Vistas por rol** — cliente/funcionario/admin necesitan mejora

### Plan de sprints
```
Sprint 3.1  Empresas + Superadmin + File Storage       (2 días)
Sprint 3.2  Refactor entidades (empresa_id, cargo_requerido) + FILE campos (2 días)
Sprint 3.3  Motor asignación automática (área + cargo → funcionario) (1-2 días)
Sprint 3.4  Flujo apelación (OBSERVAR/DENEGAR → 2 días corregir) (2 días)
Sprint 3.5  Panel propiedades inline en editor BPMN (2 días)
Sprint 3.6  Portal cliente (timeline + notificaciones) (1-2 días)
Sprint 3.7  Chat IA en editor BPMN (paralelo) (1-2 días)
```

---

## Instrucción para Claude Code

### Fase 1: Diagnóstico (sin modificar código)
```bash
1. Listar estructura backend: backend/src/main/java/
2. Listar estructura frontend: frontend/src/app/
3. Ver archivo: backend/src/main/java/com/workflow/service/TramiteService.java
4. Ver archivo: backend/src/main/java/com/workflow/service/ActivityService.java
5. Ver archivo: backend/src/main/java/com/workflow/service/FormularioService.java
6. Ver archivo: backend/src/main/java/com/workflow/entity/Tramite.java
7. Ver archivo: backend/src/main/java/com/workflow/entity/Actividad.java
8. Ver archivo: backend/src/main/java/com/workflow/entity/RespuestaFormulario.java
9. Ver archivo: seed_telecom.py
```

### Responder en formato corto:
```
## Qué funciona
- [lista rápida sin detalles]

## Qué está incompleto
- [lista de gaps reales encontrados]

## Archivos a tocar
- [paths exactos]

## Riesgo
- [qué puede romperse]

## Próximo paso
- [qué se implementa primero]
```

### Fase 2: Implementación (en orden)
1. **Guardar candidateGroups en tareas BPMN** — añadir rol/área/cargo a ActivityService
2. **Tomar tarea individual** — nuevo endpoint POST `/tasks/{id}/claim`
3. **Persistencia de respuestas** — validar RespuestaFormulario guarda todo (trámite/tarea/usuario/fecha)
4. **Historial append-only** — cada acción registra en historial sin sobrescribir
5. **Vistas por rol** — verificar Guards y filtrados en Angular

### Fase 3: Pruebas
```bash
1. Iniciar todo: docker-compose up
2. Login: admin@workflow.com / Admin2024!
3. Ejecutar ciclo demo: iniciado → completado → final
4. Ejecutar seed_telecom.py
5. Validar datos en MongoDB
```

### Notas
- NO gastar tokens en explicaciones largas
- Código al grano
- Mostrar solo cambios reales
- Validar cada paso
- Reportar errores encontrados

---

## Entidades clave (MongoDB)

### Tramite
```
_id, politicaId, clienteId, estado (INICIADO|EN_PROCESO|COMPLETADO|RECHAZADO|EN_APELACION)
actividadActual, responsableActual, respuestasFormularios[], historial[]
```

### Actividad
```
_id, politicaId, nombre, tipo (USER_TASK|SERVICE_TASK|GATEWAY)
rolResponsable, areaResponsable, cargoResponsable
formularioId, accionesPermitidas[], estado
```

### RespuestaFormulario
```
_id, tramiteId, actividadId, formularioId, usuarioId, rolUsuario
fecha, respuestas (map key→valor), adjuntos[], accionEjecutada, observacion
```

### Historial
```
Append-only. Nunca sobrescribir.
usuarioId, rolUsuario, accion, estadoAnterior, estadoNuevo
fecha, actividadId, tramiteId, comentario
```

---

## Comandos útiles

```bash
# Backend: levantar Spring Boot
cd backend && ./mvnw spring-boot:run

# Frontend: levantar Angular
cd frontend && ng serve

# AI Service: levantar FastAPI
cd ai-service && python -m uvicorn main:app --reload --port 8001

# MongoDB local (si usa docker-compose)
docker-compose up -d mongodb

# Ver logs
docker-compose logs -f backend

# Importar seed telecom
python seed_telecom.py
```

---

## Criterio de aceptación por sprint

### Sprint 3.1 — Empresas + Superadmin + File Storage
- [ ] Colección `empresas` creada en MongoDB
- [ ] Rol SUPERADMIN añadido a `roles`
- [ ] CRUD `/empresas` funcional (solo SUPERADMIN)
- [ ] `FileStorageService` guarda archivos en `/uploads/`
- [ ] `POST /files/upload` y `GET /files/{id}` funcionan
- [ ] Volumen Docker persistente para `/uploads/`

### Sprint 3.2 — Refactor entidades + FILE campos
- [ ] Campo `empresa_id` en usuarios, departamentos, actividades, políticas
- [ ] Filtrado automático por empresa en GET (ADMIN ve su empresa, SUPERADMIN ve todo, CLIENTE sin filtro)
- [ ] `TipoCampo.FILE` agregado a enum
- [ ] Formularios soportan campos FILE con validaciones (tipos, max archivos, max tamaño)
- [ ] Frontend renderiza input FILE con zona drag-and-drop

### Sprint 3.3 — Motor asignación automática
- [ ] `asignarFuncionarioAutomatico()` busca por empresa+departamento+cargo
- [ ] Menor carga: cuenta trámites activos por usuario, asigna al de menor carga
- [ ] Estado `SIN_ASIGNAR` si no hay funcionario disponible
- [ ] `GET /tramites/sin-asignar` solo para ADMIN
- [ ] `POST /tramites/{id}/asignar-manual` para ADMIN

### Sprint 3.4 — Flujo apelación
- [ ] Campo `apelacion` en Tramite con fecha_limite = now + 2 días
- [ ] `POST /tramites/{id}/observar` abre apelación
- [ ] `POST /tramites/{id}/denegar` abre apelación
- [ ] `POST /tramites/{id}/apelar` guarda docs nuevos + justificación
- [ ] `POST /tramites/{id}/resolver-apelacion` aprueba o deniega
- [ ] Scheduler revisa vencimientos cada hora

### Sprint 3.5 — Panel propiedades BPMN
- [ ] Sidebar con propiedades de UserTask (nombre, descripción, área, cargo, acciones, SLA)
- [ ] Dropdown área → filtrar cargos disponibles
- [ ] Selector/creador de formulario inline
- [ ] Guardar en actividad + actualizar BPMN XML

### Sprint 3.6 — Portal cliente
- [ ] Ruta `/mis-tramites` solo para CLIENTE
- [ ] Timeline visual con estados + fechas
- [ ] Timer countdown para apelaciones
- [ ] Botón iniciar nuevo trámite (lista políticas públicas)
- [ ] `GET /tramites/mis-tramites` filtrado por clienteId

---

## Seed Telecom
Poblar empresa telecomunicaciones con:
- Departamentos: Atención al Cliente, Soporte Técnico, Área Técnica
- Cargos: Revisor, Técnico de Campo, Supervisor
- Usuarios: funcionarios en cada departamento
- Políticas demo: Instalación Internet, Soporte Técnico, Reclamo/Mantenimiento
- Trámites demo: 2-3 por política en estados variados (INICIADO, EN_PROCESO, COMPLETADO)

---

## Reglas operativas
1. **Orden inmutable:** Entity → Repository → Service → Controller → DTO
2. **BPMN:** cada UserTask mapea a rol/área/cargo
3. **Formularios:** vinculados a actividad, respuestas guardadas por trámite/tarea/usuario
4. **Historial:** append-only, nunca sobrescribir
5. **Seguridad:** JWT obligatorio, filtrado por empresa/rol en backend
6. **Frontend:** URLs solo en `environment.ts`, Guards por rol
7. **Política con trámites activos = congelada** (no editar estructura)

---

## Limitaciones conocidas
- Colaboración real-time en BPMN no es prioridad aún
- DMN (decisiones automáticas) es futuro (Sprint 5)
- Notificaciones push básicas (Sprint 4)
- Mobile Flutter es optional (Sprint 6)

---

## Contacto / Escalación
Si algo no funciona:
1. Ver logs: `docker-compose logs backend`
2. Validar JWT: token incluye empresa_id, rol, userId
3. Validar estado trámite: verificar enum EstadoTramite
4. Verificar permisos: ADMIN filtra por empresa, CLIENTE sin empresa_id