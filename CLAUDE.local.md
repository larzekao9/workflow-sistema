# Estado del proyecto — workflow-sistema
Última actualización: 2026-04-13

## Sprint actual
Sprint 2.4 | Inicio: 2026-04-13 | EN CURSO
Objetivo: UX página creación de política + full-screen editor + fixes de permisos

## Roadmap completo

| Sprint | Objetivo | Estado |
|---|---|---|
| Sprint 1 | Auth JWT + usuarios + roles | ✓ completo |
| Sprint 2 | Motor de políticas (CRUD + editor visual SVG) | ✓ completo |
| Sprint 2.1 | Módulo Formularios (schema + backend + frontend + integración editor) | ✓ completo |
| Sprint 2.2 | Relaciones de políticas + vista swimlane + árbol de versiones | ✓ completo |
| Sprint 2.3 | UX: creación de política → editor directo + acciones por fila | ✓ completo |
| Sprint 2.4 | UX página /policies/new + editor full-screen + fixes permisos | ⏳ en curso |
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
| motor de trámites | ⏳ pendiente | Sprint 3 |
| historial/auditoría | ⏳ pendiente | Sprint 3 |
| IA — policy/generate | ⏳ pendiente | Sprint 4 |
| IA — flow/analyze | ⏳ pendiente | Sprint 4 |
| app móvil | ⏳ pendiente | Sprint 6 |

## Próximo paso inmediato
Sprint 2.4 sigue en curso — el usuario irá indicando qué más entra en este sprint.

## Bloqueos
Ninguno.

## Referencias rápidas
- Contrato API vigente: `docs/api-contract.md`
- Esquema DB: `docs/db-schema-notes.md`
- Decisiones técnicas: `docs/decisions.md`
- Snapshots por feature: `docs/features/`
