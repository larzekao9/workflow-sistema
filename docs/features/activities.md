# Feature: Actividades (nodos del flujo)
Sprint 2 | Completado: 2026-04-12 | Verificado en vivo

## Alcance
CRUD de nodos que componen el grafo de una política. Solo editables mientras la política está en BORRADOR.

## Backend — endpoints activos
- `GET /policies/{policyId}/activities` — lista actividades de una política
- `GET /activities/{id}` — detalle de una actividad
- `POST /activities` — crear (politicaId va en el body) `[ADMIN]`
- `PUT /activities/{id}` — editar `[ADMIN]`
- `DELETE /activities/{id}` — eliminar (con verificación de referencias) `[ADMIN]`

## Tipos de actividad
| Tipo | responsableRolId | Transiciones |
|---|---|---|
| INICIO | no requerido | 1 saliente (SIEMPRE) |
| TAREA | obligatorio | 1+ salientes |
| DECISION | no requerido | ≥ 2 con condiciones distintas |
| FIN | no requerido | ninguna |

## Reglas de negocio críticas
- Solo modificables si la política está en BORRADOR.
- Eliminar una actividad requiere que ninguna transición de otro nodo apunte a ella.
- `TAREA` requiere `responsableRolId` para poder publicar la política.
- `DECISION` requiere ≥ 2 transiciones con condiciones distintas para publicar.

## Colección MongoDB
`actividades` — transiciones embebidas, ver `docs/db-schema-notes.md` para esquema completo e índices.
