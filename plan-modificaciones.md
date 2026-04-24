# CLAUDE.local.md — workflow-sistema
## Contexto operativo resumido — 2026-04-23

## Objetivo
Sistema para diseñar, ejecutar y monitorear políticas/procesos de negocio mediante BPMN, formularios dinámicos, roles, trazabilidad y reglas de negocio.

Cada empresa administra sus propios procesos, funcionarios, departamentos, cargos y trámites. Los clientes pueden iniciar trámites sobre políticas publicadas y consultar su estado.

## Stack
- Backend: Java 21 + Spring Boot 3 + MongoDB + JWT
- Frontend: Angular 17 + TypeScript + Angular Material
- BPMN: bpmn-js / BPMN 2.0
- Formularios: dinámicos, vinculados a UserTasks
- AI Service: Python 3.11 + FastAPI
- DB: MongoDB
- Docker: backend 8080, frontend 4200, ai-service 8001, mongo 27017

## Actores
- SUPERADMIN: administra empresas y configuración global.
- ADMIN: representa una empresa; crea políticas, usuarios, áreas, cargos, formularios y BPMN.
- FUNCIONARIO: atiende tareas asignadas por empresa, departamento y cargo.
- CLIENTE: usuario global, sin empresa_id; ve políticas públicas e inicia trámites.

## Decisiones confirmadas
- Cada ADMIN pertenece a una sola empresa.
- Funcionarios pertenecen a empresa + departamento + cargo.
- Clientes son globales y no tienen empresa_id.
- Las políticas publicadas pertenecen a una empresa.
- Formularios soportan campos tipo FILE: fotos, PDF y Word.
- Las actividades BPMN se configuran con área, cargo, formulario, SLA y acciones.
- La apelación dura 2 días para corregir documentos o datos.
- Si la apelación se aprueba, el trámite continúa a la siguiente actividad.
- Si se deniega o vence el plazo, el trámite queda rechazado.

## Estado actual
El sistema ya tiene MVP funcional. No reconstruir desde cero.

Ya existe:
- Auth JWT, login y roles.
- CRUD base de políticas.
- Editor BPMN.
- Formularios vinculados a tareas.
- Instanciación de trámites.
- Ciclos probados: completado, devuelto/corregido y rechazado.
- Política demo activa.
- Seed telecom inicial.

## Usuario principal de prueba
Email: admin@workflow.com
Password: Admin2024!
Rol: ADMINISTRADOR

## Política demo activa
Nombre: Solicitud de Licencia o Permiso
ID: 69e4f5cbf5d4e243da993d1a

Formularios vinculados:
- Task_CompletarSolicitud -> CLIENTE
- Task_RevisionFuncionario -> FUNCIONARIO
- Task_AprobacionAdmin -> ADMINISTRADOR

## Cambios de arquitectura
- Agregar colección Empresas.
- Agregar SUPERADMIN.
- Agregar empresa_id a usuarios, departamentos, políticas y formularios.
- En CLIENTE y SUPERADMIN, empresa_id debe ser null.
- Agregar cargo_requerido y department_id a actividades.
- Agregar campo FILE en formularios.
- Agregar almacenamiento de archivos.
- Agregar motor de asignación automática.
- Agregar estado EN_APELACION en trámites.
- Agregar objeto apelacion en trámite.
- Agregar documentos_adjuntos y responsable_cargo en historial.

## Sprint 3.1 — Empresas + Superadmin + File Storage
Objetivo: soportar múltiples empresas y carga de archivos.
Incluye:
- CRUD empresas.
- Rol SUPERADMIN.
- Relación ADMIN -> empresa.
- Infraestructura para subir archivos.
- Validación de acceso por empresa.

## Sprint 3.2 — Refactor entidades + formularios FILE
Objetivo: adaptar datos al modelo multiempresa.
Incluye:
- empresa_id en usuarios, departamentos, políticas y formularios.
- department_id y cargo_requerido en actividades.
- Campo FILE en formularios.
- Soporte para fotos, PDF y Word.
- Ajustar DTOs y validaciones.

## Sprint 3.3 — Motor de asignación automática
Objetivo: asignar tareas al funcionario correcto.
Regla:
empresa + departamento + cargo -> funcionario disponible.
Incluye:
- Buscar funcionario por área/cargo.
- Asignar automáticamente al avanzar.
- Evitar selector manual en flujo normal.
- Panel admin para casos sin asignar.

## Sprint 3.4 — Flujo de apelación
Objetivo: OBSERVAR/DENEGAR -> apelación 2 días -> resolución.
Incluye:
- Estado EN_APELACION.
- Objeto apelacion en trámite.
- Endpoints observar, denegar, apelar, resolver-apelacion.
- Scheduler para vencer apelaciones.
- Historial con docs y cargo responsable.

## Sprint 3.5 — Panel inline BPMN
Objetivo: configurar cada UserTask desde el editor.
Cada tarea debe permitir:
- Nombre.
- Descripción.
- Área/departamento.
- Cargo.
- Formulario.
- SLA.
- Acciones: aprobar, observar, denegar.
- Guardar metadata en BPMN y backend.

## Sprint 3.6 — Portal cliente
Objetivo: que el cliente vea y gestione sus trámites.
Incluye:
- Ruta /mis-tramites.
- Timeline visual.
- Estado actual, área, cargo y SLA.
- Timer de apelación.
- Botón corregir y apelar.
- Lista de políticas públicas.
- Cliente solo accede a sus trámites.

## Sprint 3.7 — Chat IA en editor BPMN
Objetivo: modificar diagramas con comandos de texto o voz.
Flujo:
Admin escribe prompt -> AI Service analiza BPMN -> devuelve operaciones -> frontend modifica el diagrama.

## Prioridad actual para Claude
1. No reconstruir todo.
2. Revisar errores actuales del proyecto.
3. Corregir primero diagnostics/compilación.
4. Implementar Sprint 3.4 sin romper flujo actual.
5. Validar backend y frontend por separado.
6. No usar agentes largos si el límite está bajo.
7. Modificar solo archivos necesarios.
8. Al final entregar archivos tocados, errores corregidos, comandos ejecutados y estado final.

## Instrucción directa para Claude
Revisa el proyecto actual. No leas todo si no es necesario.
Primero corrige los errores del panel Problems.
No hagas refactor grande.
No cambies arquitectura ya funcional.
Trabaja por sprint y por archivo.
Responde corto con:
- archivos modificados,
- endpoints agregados/corregidos,
- pruebas ejecutadas,
- errores pendientes,
- siguiente paso.