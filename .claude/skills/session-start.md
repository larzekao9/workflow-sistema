# Skill: session-start

## Cuándo se usa
Al iniciar cualquier sesión nueva de trabajo en el proyecto.

## Lo que hacés
1. Leer `CLAUDE.local.md` — estado general del sprint y features
2. Leer `docs/api-contract.md` — endpoints vigentes
3. Leer `docs/db-schema-notes.md` — estado del esquema
4. Devolver resumen en este formato exacto:

```
Sprint: [número y objetivo]
En curso: [feature] — [qué falta]
Pendiente próximo: [feature]
Bloqueos: [ninguno | descripción]
Próximo paso concreto: [acción específica]
```

## Restricciones
- Respuesta máxima: 10 líneas
- Sin repetir contexto del stack ni reglas generales
- Si CLAUDE.local.md no existe, avisar que hay que crearlo con sprint-close
