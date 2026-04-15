# Estado del proyecto — workflow-sistema
Última actualización: 2026-04-15

## Sprint actual
Sprint 2.6 | Inicio: pendiente | PRÓXIMO
Objetivo: Composición avanzada — subworkflows embebidos + workflows reutilizables externos

## Roadmap completo

| Sprint | Objetivo | Estado |
|---|---|---|
| Sprint 1 | Auth JWT + usuarios + roles | ✓ completo |
| Sprint 2 | Motor de políticas (CRUD + editor visual SVG) | ✓ completo |
| Sprint 2.1 | Módulo Formularios (schema + backend + frontend + integración editor) | ✓ completo |
| Sprint 2.2 | Relaciones de políticas + vista swimlane + árbol de versiones | ✓ completo |
| Sprint 2.3 | UX: creación de política → editor directo + acciones por fila | ✓ completo |
| Sprint 2.4 | UX /policies/new + editor full-screen + fixes permisos + delete CRUD | ✓ completo |
| Sprint 2.5 | Workbench profesional — zoom/pan/minimap/palette/validación/auto-save | ✓ completo |
| Sprint 2.6 | Composición avanzada — subworkflows + workflows reutilizables | ⏳ pendiente |
| Sprint 2.7 | Interoperabilidad BPMN — import/export .bpmn + JSON + imagen | ⏳ pendiente |
| Sprint 2.8 | Colaboración multiadmin en tiempo real | ⏳ pendiente |
| Sprint 2.9 | Simulación y testing visual del flujo | ⏳ pendiente |
| Sprint 2.10 | Chat asistido por IA + base para entrada por audio | ⏳ pendiente |
| Sprint 3 | Motor de Trámites (instanciación, ejecución del flujo, trazabilidad) | ⏳ pendiente |
| Sprint 4 | IA — policy/generate + flow/analyze | ⏳ pendiente |
| Sprint 6 | App móvil Flutter | ⏳ congelado |

## Features por estado

| Feature | Estado | Notas |
|---|---|---|
| auth + JWT | ✓ | Sprint 1 |
| gestión roles | ✓ | Sprint 1 |
| gestión usuarios | ✓ | Sprint 1 |
| motor de políticas | ✓ | Sprint 2 — CRUD + publish/version + editor SVG |
| formularios CRUD | ✓ | Sprint 2.1 — schema + backend + frontend completo |
| selector formulario en editor | ✓ | Sprint 2.1 — integrado en panel lateral del flow editor |
| relaciones entre políticas | ✓ | Sprint 2.2 — backend + panel en policy-detail |
| vista swimlane en editor | ✓ | Sprint 2.2 — toggle grafo/swimlane en flow editor |
| árbol de versiones UI | ✓ | Sprint 2.2 — stepper en policy-detail |
| dialog crear política | ✓ | Sprint 2.3 — nombre + desc → POST → editor directo |
| botón "Abrir Editor" | ✓ | Sprint 2.3 — CTA principal en filas BORRADOR |
| nombre editable inline | ✓ | Sprint 2.3 — en barra superior del flow-editor |
| página /policies/new moderna | ✓ | Sprint 2.4 — split layout hero+form, crea y va directo al editor |
| editor full-screen | ✓ | Sprint 2.4 — /flow oculta navbar+sidenav, ocupa toda la pantalla |
| fix permisos @PreAuthorize | ✓ | Sprint 2.4 — ADMIN→GESTIONAR_POLITICAS/PUBLICAR/VERSIONAR |
| fix AccessDeniedException→403 | ✓ | Sprint 2.4 — GlobalExceptionHandler cubre el 403 correctamente |
| botón Nueva Política → /policies/new | ✓ | Sprint 2.4 — sin dialog, navega a la página nueva |
| agentes mejorados (senior) | ✓ | Sprint 2.4 — todos los agentes con skills, checklists y coordinación |
| skill ui-ux-pro-max instalado | ✓ | Sprint 2.4 — disponible globalmente en .claude/skills |
| delete política (hard delete) | ✓ | Sprint 2.4 — individual + bulk; hard delete real |
| DELETE /policies bulk endpoint | ✓ | Sprint 2.4 — requiere permiso GESTIONAR_POLITICAS |
| botón delete en tabla políticas | ✓ | Sprint 2.4 — ícono basura por fila, diálogo confirmación permanente |
| DB limpiada (estado inicial) | ✓ | Sprint 2.4 — 9 políticas y 17 actividades eliminadas de MongoDB |
| canvas zoom/pan | ✓ | Sprint 2.5 — rueda + drag área vacía, viewBox SVG |
| minimap | ✓ | Sprint 2.5 — overlay SVG esquina inferior derecha, viewport rect |
| snap a grid 24px | ✓ | Sprint 2.5 — posiciones de nodos snapeadas al mover |
| palette rediseñada (8 nodos) | ✓ | Sprint 2.5 — grupos básico/avanzado: INICIO, TAREA, DECISION, FIN, APROBACION, NOTIFICACION, PARALELO, SUBPROCESO |
| property inspector mejorado | ✓ | Sprint 2.5 — selector de rol, auto-save al blur, tabs |
| validación visual del flujo | ✓ | Sprint 2.5 — badges error/warning sobre nodos, status bar |
| auto-save con debounce | ✓ | Sprint 2.5 — 2s debounce, indicador isDirty en toolbar |
| status bar | ✓ | Sprint 2.5 — nodos, conexiones, estado guardado, zoom% |
| atajos de teclado | ✓ | Sprint 2.5 — Delete, Escape, Ctrl+S |
| budget CSS ampliado (angular.json) | ✓ | Sprint 2.5 — anyComponentStyle: 8kb warn / 20kb error |
| subworkflow embebido | ⏳ pendiente | Sprint 2.6 |
| workflow reutilizable externo | ⏳ pendiente | Sprint 2.6 |
| navegación drill-down | ⏳ pendiente | Sprint 2.6 |
| import/export BPMN | ⏳ pendiente | Sprint 2.7 |
| colaboración multiadmin | ⏳ pendiente | Sprint 2.8 |
| simulación paso a paso | ⏳ pendiente | Sprint 2.9 |
| chat IA en editor | ⏳ pendiente | Sprint 2.10 |
| motor de trámites | ⏳ pendiente | Sprint 3 |
| historial/auditoría | ⏳ pendiente | Sprint 3 |
| IA — policy/generate | ⏳ pendiente | Sprint 4 |
| IA — flow/analyze | ⏳ pendiente | Sprint 4 |
| app móvil | ⏳ pendiente | Sprint 6 |

## Próximo paso inmediato
Sprint 2.6 — Composición avanzada:
- Subworkflow embebido: actividad de tipo SUBPROCESO que encapsula un flujo interno navegable (drill-down)
- Workflow reutilizable externo: actividad de tipo CALL que invoca otra política existente como componente
- Árbol de navegación entre niveles de flujo
- Variables de entrada/salida entre flujo padre e hijo
- Reglas anti-circularidad en referencias entre workflows

## Plan de implementación plan_editor_workflow.md
El archivo `plan_editor_workflows_sprint_2_5.md` en la raíz del proyecto contiene el plan completo de Sprints 2.5–2.10 con historias de usuario, DoD y riesgos por sprint.

## Bloqueos
Ninguno.

## Notas técnicas Sprint 2.5
- El editor ahora ocupa `flow-editor.component.ts` con 2334 líneas (standalone, sin subcomponentes separados)
- Los tipos avanzados de nodo (APROBACION, NOTIFICACION, PARALELO, SUBPROCESO) se persisten en backend como `tipo: 'TAREA'` con `subtipoVisual` local; Sprint 2.6 requerirá nuevos tipos en el backend
- El budget de CSS en `angular.json` fue ampliado a 8kb warn / 20kb error para soportar el editor grande
- `ignoreDeprecations` en tsconfig.json se debe mantener en `"5.0"` (el linter lo ajustó desde `"6.0"`)

## Referencias rápidas
- Contrato API vigente: `docs/api-contract.md`
- Esquema DB: `docs/db-schema-notes.md`
- Decisiones técnicas: `docs/decisions.md`
- Snapshots por feature: `docs/features/`
- Plan editor Sprints 2.5–2.10: `plan_editor_workflows_sprint_2_5.md`
