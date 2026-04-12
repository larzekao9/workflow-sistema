# Estado del proyecto — workflow-sistema
Última actualización: 2026-04-12

## Sprint actual
Sprint 3 | Inicio: 2026-04-12
Objetivo: Motor de Trámites (instanciación, ejecución del flujo, trazabilidad histórica)

## Features por estado

| Feature | Estado | Notas |
|---|---|---|
| auth + JWT | ✓ | Sprint 1 |
| gestión roles | ✓ | Sprint 1 |
| gestión usuarios | ✓ | Sprint 1 |
| motor de políticas | ✓ | Sprint 2 — backend + frontend + editor visual SVG |
| motor de trámites | ⏳ pendiente | Sprint 3 — siguiente |
| historial/auditoría | ⏳ pendiente | Sprint 3 |
| IA — policy/generate | ⏳ pendiente | Sprint 4 |
| IA — flow/analyze | ⏳ pendiente | Sprint 4 |
| app móvil | ⏳ pendiente | Sprint 6 |

## Próximo paso
Sprint 3: diseñar esquema de `tramites` e `historial_tramites` con db-modeler, luego implementar el motor de instanciación y ejecución.

## Bloqueos
Ninguno.

## Referencias rápidas
- Contrato API vigente: `docs/api-contract.md`
- Esquema DB: `docs/db-schema-notes.md`
- Decisiones técnicas: `docs/decisions.md`
- Snapshots por feature: `docs/features/`
