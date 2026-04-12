# Estado del proyecto — workflow-sistema
Última actualización: 2026-04-12

## Sprint actual
Sprint 3 | Inicio: pendiente
Objetivo: Motor de Trámites — instanciación, ejecución del flujo, trazabilidad histórica

## Roadmap completo

| Sprint | Objetivo | Estado |
|---|---|---|
| Sprint 1 | Auth JWT + usuarios + roles | ✓ completo |
| Sprint 2 | Motor de políticas (CRUD + editor visual SVG) | ✓ completo |
| Sprint 2.1 | Módulo Formularios (schema + backend + frontend + integración editor) | ✓ completo |
| Sprint 2.2 | Relaciones de políticas + vista swimlane + árbol de versiones | ✓ completo |
| Sprint 2.3 | UX: creación de política → editor directo + acciones por fila | ⏳ pendiente |
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
| motor de trámites | ⏳ pendiente | Sprint 3 |
| historial/auditoría | ⏳ pendiente | Sprint 3 |
| IA — policy/generate | ⏳ pendiente | Sprint 4 |
| IA — flow/analyze | ⏳ pendiente | Sprint 4 |
| app móvil | ⏳ pendiente | Sprint 6 |

## Próximo paso inmediato
Sprint 2.3 (frontend-angular, 1 sesión):
- `policies-list`: "Nueva Política" → MatDialog (nombre + desc) → POST → navega directo a `/policies/{id}/flow-editor`
- `policies-list`: botón "Abrir Editor" por fila (CTA principal en BORRADOR)
- `flow-editor`: nombre editable inline en barra superior (solo BORRADOR)
Luego Sprint 3: schema `tramites` + `historial_tramites` con db-modeler.

## Bloqueos
Ninguno.

## Referencias rápidas
- Contrato API vigente: `docs/api-contract.md`
- Esquema DB: `docs/db-schema-notes.md`
- Decisiones técnicas: `docs/decisions.md`
- Snapshots por feature: `docs/features/`
