# Skill: sprint-close

## Cuándo se usa
Al cerrar un sprint o al final de una sesión de trabajo significativa.

## Prerequisito obligatorio — verificación funcional
Antes de ejecutar cualquier paso de cierre, verificar que los CRUDs del sprint funcionan en vivo:
1. Levantar backend (`http://localhost:8080`) y frontend (`http://localhost:4200`) si no están corriendo.
2. Por cada feature del sprint, probar el flujo completo: crear, leer, editar, eliminar (o los que apliquen según el dominio).
3. Confirmar que no hay errores 500, pantallas en blanco ni campos mal mapeados.
4. Si alguna verificación falla → **NO cerrar el sprint**, reportar qué falló y corregirlo primero.

Solo cuando todos los CRUDs pasen, continuar con los pasos de cierre.

## Lo que hacés
1. Revisar qué features cambiaron de estado en esta sesión/sprint
2. Actualizar tabla de features en `CLAUDE.local.md`
3. Actualizar "Próximo paso" con la acción concreta siguiente
4. Actualizar "Sprint actual" si el sprint cambió
5. Confirmar que `docs/api-contract.md` refleja todos los endpoints reales
6. Confirmar que `docs/db-schema-notes.md` refleja el esquema actual
7. Si hay decisiones técnicas nuevas, agregarlas a `docs/decisions.md` (una línea cada una)
8. Si hay features terminadas sin snapshot, crear `docs/features/[nombre].md`

## Restricciones
- `CLAUDE.local.md` no debe superar 60 líneas
- No guardes historial de sesiones en CLAUDE.local.md, solo el estado actual
- No duplicar información que ya está en docs/api-contract.md o docs/db-schema-notes.md
- El snapshot de feature va en docs/features/, no en CLAUDE.local.md
