# Skill: schema-change

## Cuándo se usa
Cada vez que se va a crear o modificar un Document de MongoDB (una clase con @Document).
Debe ejecutarse ANTES de escribir código Java.

## Lo que hacés
1. Describir el cambio de esquema propuesto (campos nuevos, modificados, eliminados)
2. Responder estas preguntas como db-modeler:
   - ¿Los datos nuevos deben embeberse o referenciarse? (justificar)
   - ¿Se necesita índice para el campo nuevo? ¿Simple o compuesto?
   - ¿El cambio puede afectar documentos existentes en producción?
3. Actualizar `docs/db-schema-notes.md` con la decisión
4. Si hay decisión no obvia, agregarla a `docs/decisions.md`
5. Solo entonces: proceder con el código

## Reglas
- Historial (`historial_tramites`) es siempre append-only — nunca proponer UPDATE
- Documentos pequeños y de consulta conjunta → embebidos
- Documentos grandes, reutilizados o con ciclo de vida propio → referenciados por ID
- Toda colección nueva necesita al menos un índice definido
