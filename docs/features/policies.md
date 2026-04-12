# Feature: Motor de Políticas
Sprint 2 | Completado: 2026-04-12 | Verificado en vivo

## Alcance
Diseño, gestión y publicación de políticas de negocio (workflows visuales).

## Backend — endpoints activos
- `GET /policies` — listado paginado con filtros por estado y nombre
- `GET /policies/{id}` — detalle
- `POST /policies` — crear en estado BORRADOR `[ADMIN]`
- `PUT /policies/{id}` — editar (solo BORRADOR) `[ADMIN]`
- `DELETE /policies/{id}` — soft delete (→ INACTIVA) `[ADMIN]`
- `POST /policies/{id}/publish` — publicar con validación de grafo (→ ACTIVA) `[ADMIN]`
- `POST /policies/{id}/version` — crear nueva versión (→ BORRADOR v+1) `[ADMIN]`

## Validaciones de publicación
1. Exactamente 1 actividad INICIO
2. Al menos 1 actividad FIN
3. Toda TAREA tiene `responsableRolId`
4. Toda DECISION tiene ≥ 2 transiciones con condiciones distintas
5. Todos los nodos alcanzables desde INICIO (grafo conexo)

## Frontend — rutas activas
- `/policies` — lista de políticas
- `/policies/new` — formulario de creación
- `/policies/:id` — detalle
- `/policies/:id/edit` — formulario de edición
- `/policies/:id/flow` — editor visual SVG con drag & drop

## Colección MongoDB
`politicas` — ver `docs/db-schema-notes.md` para esquema completo e índices.

## Reglas de negocio críticas
- Una política ACTIVA con trámites en curso no puede editarse estructuralmente → se versiona.
- Versionado: copia del documento con `version+1` y `version_padre_id`; al publicar, la versión anterior pasa a ARCHIVADA en operación atómica.
