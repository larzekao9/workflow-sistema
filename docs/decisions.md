# Decision Log
Formato: [fecha] decisión — motivo

[2026-04-12] rol_id referenciado en usuarios, no embebido — roles reutilizados por N usuarios y pueden actualizarse
[2026-04-12] permisos embebidos en roles como lista de strings — cortos, locales, no requieren colección propia
[2026-04-12] Spring Security usa email como identificador principal (getUsername() devuelve email) — consistencia con login por email
[2026-04-12] historial_tramites será append-only sin UPDATE — trazabilidad legal, inmutabilidad auditada
[2026-04-12] políticas con trámites activos no se editan estructuralmente, se versionan — evitar inconsistencias en trámites en curso
[2026-04-12] ai-service separado como microservicio independiente en puerto 8001 — stack Python distinto, escala independiente

## Sprint 2 — Motor de Políticas (2026-04-12)

[2026-04-12] actividades referenciadas desde politicas por array de ObjectIds, no embebidas — los grafos de flujo crecen de forma variable e imprevisible; embeber crearía documentos de tamaño ilimitado y rompería la reutilización de actividades entre versiones de una misma política
[2026-04-12] transiciones embebidas dentro de cada actividad, no como colección separada — una transición no tiene identidad propia fuera de su nodo origen, siempre se accede junto con la actividad; embeber elimina un lookup en la operación más crítica del motor (evaluar el siguiente paso del trámite)
[2026-04-12] actividad_destino_id dentro de transiciones es referencia por ObjectId — el destino es otro documento de la misma colección; referenciarlo permite que el motor resuelva el grafo de forma incremental sin ciclos de datos embebidos
[2026-04-12] responsable_rol_id en actividades es referencia, no embebido — los roles son reutilizados por N actividades y N políticas; actualizar un rol no debe requerir writes masivos sobre actividades
[2026-04-12] formulario_id en actividades es referencia, no embebido — los formularios son documentos complejos reutilizables; embeber duplicaría datos y rompería consistencia ante actualizaciones del formulario
[2026-04-12] posicion (x, y) embebida dentro de actividad como sub-objeto — estrictamente local al nodo, sin consultas independientes, tamaño fijo y mínimo
[2026-04-12] metadatos de politica (tags, icono, color) embebidos — objeto auxiliar pequeño, local a la política, nunca consultado de forma independiente
[2026-04-12] version_padre_id en politicas es referencia a la política origen — permite reconstruir el árbol de versiones con una sola query sin duplicar datos
[2026-04-12] actividad_inicio_id en politicas es referencia explícita al nodo INICIO — el motor de workflow necesita el punto de entrada sin cargar todo el grafo; evita un filtro adicional sobre actividad_ids
[2026-04-12] versionado de políticas por copia de documento + version_padre_id — al publicar una nueva versión, la anterior cambia a ARCHIVADA en transacción atómica; esto preserva el estado exacto bajo el que corren trámites activos sin congelar el desarrollo de nuevas versiones
[2026-04-12] regla de integridad referencial de transiciones validada en capa de servicio, no en DB — MongoDB no impone FK; el backend verifica antes de eliminar una actividad que ninguna transición de otra actividad apunte a ella como destino
