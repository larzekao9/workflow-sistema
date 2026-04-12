# Esquema MongoDB — decisiones de diseño
Base de datos: MongoDB Atlas
Última actualización: 2026-04-12 | Sprint 1

---

## Colección: `usuarios`
Campos clave: `username` (unique), `email` (unique), `password_hash`, `nombre_completo`, `rol_id`, `departamento`, `activo`, `ultimo_acceso`, `creado_en`, `actualizado_en`
Índices: `username` unique, `email` unique, `rol_id` (frecuente en filtros)
Decisión: `rol_id` referenciado (no embebido) — los roles cambian y son reutilizados por N usuarios

## Colección: `roles`
Campos clave: `nombre` (unique), `descripcion`, `permisos: [str]`, `activo`, `creado_en`, `actualizado_en`
Índices: `nombre` unique, `activo` compound
Decisión: `permisos` embebido como lista de strings — corto, no cambia con frecuencia, no necesita colección propia

## Colección: `politicas` _(Sprint 2 — diseño definitivo 2026-04-12)_

### Documento de ejemplo

```json
{
  "_id": "ObjectId('683a1f2e4b3c9d0012ab0001')",
  "nombre": "Solicitud de Licencia Laboral",
  "descripcion": "Flujo para tramitar licencias laborales de hasta 30 días hábiles.",
  "version": 3,
  "version_padre_id": "ObjectId('683a1f2e4b3c9d0012ab0000')",
  "estado": "ACTIVA",
  "actividad_inicio_id": "ObjectId('683b2a3c5c4d8e0023bc0010')",
  "actividad_ids": [
    "ObjectId('683b2a3c5c4d8e0023bc0010')",
    "ObjectId('683b2a3c5c4d8e0023bc0011')",
    "ObjectId('683b2a3c5c4d8e0023bc0012')",
    "ObjectId('683b2a3c5c4d8e0023bc0013')"
  ],
  "creado_por_id": "ObjectId('682f0a1b2c3d4e0056cd0001')",
  "departamento_owner": "Recursos Humanos",
  "tiempo_limite_dias": 15,
  "creado_en": "ISODate('2026-03-01T09:00:00Z')",
  "publicado_en": "ISODate('2026-03-15T11:30:00Z')",
  "archivado_en": null,
  "metadatos": {
    "tags": ["RRHH", "licencias"],
    "icono": "calendar_today",
    "color": "#1976D2"
  }
}
```

### Campos y tipos

| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Identificador único del documento |
| `nombre` | String | Nombre legible de la política (único por versión activa) |
| `descripcion` | String | Descripción del propósito del flujo |
| `version` | Integer | Número de versión, empieza en 1, incrementa al versionar |
| `version_padre_id` | ObjectId / null | Referencia a la política que origina esta versión; null en v1 |
| `estado` | String (enum) | `BORRADOR`, `ACTIVA`, `INACTIVA`, `ARCHIVADA` |
| `actividad_inicio_id` | ObjectId | Referencia a la actividad de tipo INICIO del flujo |
| `actividad_ids` | Array<ObjectId> | Lista de IDs de todas las actividades que componen este flujo |
| `creado_por_id` | ObjectId | Referencia al usuario que creó la política |
| `departamento_owner` | String | Departamento responsable de la política |
| `tiempo_limite_dias` | Integer / null | SLA máximo del trámite en días hábiles |
| `creado_en` | Date | Timestamp de creación |
| `publicado_en` | Date / null | Timestamp en que pasó a ACTIVA |
| `archivado_en` | Date / null | Timestamp en que fue archivada |
| `metadatos` | Object | Datos visuales auxiliares (tags, icono, color) — embebido |

### Indices

```
db.politicas.createIndex({ "nombre": 1, "estado": 1 })
// Justificacion: búsqueda de políticas activas por nombre desde el panel admin.

db.politicas.createIndex({ "estado": 1, "creado_en": -1 })
// Justificacion: listado paginado de políticas filtrado por estado, ordenado por reciente.

db.politicas.createIndex({ "version_padre_id": 1 })
// Justificacion: reconstruir el árbol de versiones de una política.

db.politicas.createIndex({ "creado_por_id": 1 })
// Justificacion: filtrar políticas por diseñador/administrador.
```

### Decisiones embebido vs referenciado

- `actividad_ids` → **referenciado** (array de ObjectIds). Las actividades son documentos independientes con su propia lógica, transiciones y posición visual. Al versionar, la nueva política puede referenciar actividades no modificadas de la versión anterior sin duplicarlas. Embeber crearía documentos de tamaño variable e imprevisible en flujos complejos.
- `actividad_inicio_id` → **referenciado**. El motor de workflow necesita el punto de entrada sin cargar todo el grafo.
- `version_padre_id` → **referenciado**. Permite navegar el historial de versiones con una sola query.
- `creado_por_id` → **referenciado**. Los datos del usuario cambian (nombre, departamento) y son reutilizados; no tiene sentido duplicarlos.
- `metadatos` → **embebido**. Es un objeto pequeño (3-4 campos), estrictamente local a esta política, nunca consultado de forma independiente.

### Reglas de negocio que el esquema soporta

1. Solo puede existir **una política `ACTIVA` por nombre** — el índice `(nombre, estado)` no lo garantiza solo, la validación debe hacerse en la capa de servicio antes de publicar.
2. Si `estado = ACTIVA` existe al menos un trámite en curso: el documento **no puede ser modificado estructuralmente** (campos `actividad_ids`, `actividad_inicio_id`). El backend valida esto antes de permitir cualquier PUT sobre esos campos.
3. Para modificar una política activa se crea un nuevo documento con `version = N+1`, `version_padre_id` apuntando a la versión actual, `estado = BORRADOR`. Al publicar la nueva versión, la anterior pasa a `ARCHIVADA` en una operación atómica (transacción MongoDB).
4. El campo `tiempo_limite_dias` alimenta alertas de SLA en el motor de trámites; null significa sin límite.

---

## Colección: `actividades` _(Sprint 2 — diseño definitivo 2026-04-12)_

### Documento de ejemplo — tipo TAREA

```json
{
  "_id": "ObjectId('683b2a3c5c4d8e0023bc0011')",
  "politica_id": "ObjectId('683a1f2e4b3c9d0012ab0001')",
  "nombre": "Revisión por RRHH",
  "descripcion": "El funcionario de RRHH revisa la solicitud y verifica los días disponibles.",
  "tipo": "TAREA",
  "orden": 2,
  "responsable_rol_id": "ObjectId('681c0d2a3b4c5e0067de0003')",
  "formulario_id": "ObjectId('684c3b4d6e5f9a0034cd0020')",
  "tiempo_limite_horas": 48,
  "posicion": {
    "x": 420.0,
    "y": 180.0
  },
  "transiciones": [
    {
      "id": "ObjectId('683b2a3c5c4d8e0023bc0091')",
      "actividad_destino_id": "ObjectId('683b2a3c5c4d8e0023bc0012')",
      "condicion": "APROBADO",
      "etiqueta": "Aprobar",
      "orden": 1
    },
    {
      "id": "ObjectId('683b2a3c5c4d8e0023bc0092')",
      "actividad_destino_id": "ObjectId('683b2a3c5c4d8e0023bc0010')",
      "condicion": "RECHAZADO",
      "etiqueta": "Rechazar y devolver",
      "orden": 2
    }
  ],
  "creado_en": "ISODate('2026-03-01T09:05:00Z')",
  "actualizado_en": "ISODate('2026-03-01T09:05:00Z')"
}
```

### Documento de ejemplo — tipo DECISION

```json
{
  "_id": "ObjectId('683b2a3c5c4d8e0023bc0012')",
  "politica_id": "ObjectId('683a1f2e4b3c9d0012ab0001')",
  "nombre": "¿Requiere aprobacion gerencial?",
  "descripcion": "Bifurcacion según días solicitados.",
  "tipo": "DECISION",
  "orden": 3,
  "responsable_rol_id": null,
  "formulario_id": null,
  "tiempo_limite_horas": null,
  "posicion": {
    "x": 680.0,
    "y": 180.0
  },
  "transiciones": [
    {
      "id": "ObjectId('683b2a3c5c4d8e0023bc0093')",
      "actividad_destino_id": "ObjectId('683b2a3c5c4d8e0023bc0013')",
      "condicion": "DIAS_MAYOR_10",
      "etiqueta": "Más de 10 días",
      "orden": 1
    },
    {
      "id": "ObjectId('683b2a3c5c4d8e0023bc0094')",
      "actividad_destino_id": "ObjectId('683b2a3c5c4d8e0023bc0014')",
      "condicion": "DIAS_MENOR_IGUAL_10",
      "etiqueta": "Hasta 10 días",
      "orden": 2
    }
  ],
  "creado_en": "ISODate('2026-03-01T09:06:00Z')",
  "actualizado_en": "ISODate('2026-03-01T09:06:00Z')"
}
```

### Documento de ejemplo — tipo INICIO

```json
{
  "_id": "ObjectId('683b2a3c5c4d8e0023bc0010')",
  "politica_id": "ObjectId('683a1f2e4b3c9d0012ab0001')",
  "nombre": "Inicio",
  "descripcion": "Punto de entrada del flujo de solicitud de licencia.",
  "tipo": "INICIO",
  "orden": 1,
  "responsable_rol_id": null,
  "formulario_id": "ObjectId('684c3b4d6e5f9a0034cd0019')",
  "tiempo_limite_horas": null,
  "posicion": {
    "x": 80.0,
    "y": 180.0
  },
  "transiciones": [
    {
      "id": "ObjectId('683b2a3c5c4d8e0023bc0090')",
      "actividad_destino_id": "ObjectId('683b2a3c5c4d8e0023bc0011')",
      "condicion": "SIEMPRE",
      "etiqueta": "Continuar",
      "orden": 1
    }
  ],
  "creado_en": "ISODate('2026-03-01T09:04:00Z')",
  "actualizado_en": "ISODate('2026-03-01T09:04:00Z')"
}
```

### Campos y tipos

| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Identificador único de la actividad |
| `politica_id` | ObjectId | Referencia a la política dueña de esta actividad |
| `nombre` | String | Nombre del nodo visible en el editor visual |
| `descripcion` | String | Descripción de la tarea o decisión |
| `tipo` | String (enum) | `INICIO`, `TAREA`, `DECISION`, `FIN` |
| `orden` | Integer | Orden lógico en el flujo (auxiliar para ordenamiento en UI) |
| `responsable_rol_id` | ObjectId / null | Rol asignado para ejecutar la actividad; null en INICIO/DECISION/FIN |
| `formulario_id` | ObjectId / null | Formulario dinámico asociado; null si la actividad no requiere formulario |
| `tiempo_limite_horas` | Integer / null | SLA de la actividad; null = sin límite |
| `posicion.x` | Double | Coordenada X en el editor visual del frontend |
| `posicion.y` | Double | Coordenada Y en el editor visual del frontend |
| `transiciones` | Array<Object> | Aristas salientes del nodo — **embebidas** (ver decisión abajo) |
| `transiciones[].id` | ObjectId | ID único de la transición (para referencias en historial) |
| `transiciones[].actividad_destino_id` | ObjectId | Nodo destino de la arista |
| `transiciones[].condicion` | String | Clave de condición evaluada por el motor (`APROBADO`, `RECHAZADO`, `SIEMPRE`, `DIAS_MAYOR_10`, etc.) |
| `transiciones[].etiqueta` | String | Texto visible en el editor sobre la arista |
| `transiciones[].orden` | Integer | Orden de evaluación cuando hay múltiples transiciones |
| `creado_en` | Date | Timestamp de creación |
| `actualizado_en` | Date | Timestamp de última modificación |

### Indices

```
db.actividades.createIndex({ "politica_id": 1 })
// Justificacion: carga completa del grafo de una política al abrir el editor visual.
// Es la query más frecuente del sistema: GET /politicas/{id}/actividades.

db.actividades.createIndex({ "politica_id": 1, "tipo": 1 })
// Justificacion: el motor de workflow necesita localizar la actividad INICIO de una política
// y el frontend filtra nodos por tipo en el panel lateral del editor.

db.actividades.createIndex({ "responsable_rol_id": 1 })
// Justificacion: consultas de impacto — "¿qué actividades se ven afectadas si elimino este rol?"
// También útil para saber carga de trabajo asignada a un rol.

db.actividades.createIndex({ "formulario_id": 1 })
// Justificacion: consultas de impacto — "¿qué actividades usan este formulario?"
// Previene borrado accidental de formularios en uso.
```

### Decisiones embebido vs referenciado

- `transiciones` → **embebidas** dentro de la actividad. Una transición no tiene identidad propia fuera del nodo que la origina: no se consulta una transición aislada, siempre se accede junto con su actividad. Embeber elimina un JOIN (lookup) en la operación más crítica del motor de workflow (evaluar el siguiente paso). Cada nodo tiene un máximo razonable de transiciones (2-5), por lo que el documento nunca crece de forma problemática.
- `actividad_destino_id` dentro de transiciones → **referenciado** por ObjectId. El destino es otro documento de la misma colección; referenciarlo evita ciclos de datos y permite que el motor resuelva el grafo incrementalmente.
- `responsable_rol_id` → **referenciado**. Los roles son reutilizados por muchas actividades y políticas. Cambiar el nombre de un rol no debe requerir actualizar N actividades.
- `formulario_id` → **referenciado**. Los formularios son documentos complejos y reutilizables entre actividades y políticas. Embeber duplicaría datos y rompería la consistencia cuando el formulario se actualiza.
- `posicion` → **embebido** como sub-objeto. Son dos doubles (x, y) estrictamente locales a esta actividad en el editor; nunca se consultan de forma independiente.

### Reglas de negocio que el esquema soporta

1. Solo puede existir **una actividad de tipo INICIO y una de tipo FIN por política**. La validación es responsabilidad de la capa de servicio al guardar o publicar una política.
2. Las actividades de tipo `TAREA` **deben tener** `responsable_rol_id` no nulo al publicar la política (BORRADOR puede tenerlo null).
3. Las actividades de tipo `DECISION` **deben tener** al menos 2 transiciones con condiciones distintas.
4. La actividad de tipo `FIN` tiene `transiciones = []` (array vacío). El motor interpreta esto como fin del flujo.
5. `condicion = "SIEMPRE"` es la única transición válida para nodos INICIO y TAREA cuando no hay bifurcación (exactamente una transición saliente).
6. Al modificar una actividad dentro de una política `ACTIVA` está prohibido; el backend rechaza cualquier escritura en actividades cuya `politica_id` apunte a una política con `estado = ACTIVA`.
7. Eliminar una actividad requiere verificar que ninguna otra actividad tenga `transiciones[].actividad_destino_id` apuntando a ella (integridad referencial manual, dado que MongoDB no la impone).

## Colección: `tramites` _(Sprint 2 — pendiente)_
Referencia a `politicas` y `usuarios` por ID.
Estado actual y actividad actual embebidos (acceso frecuente, cambian con el flujo).

## Colección: `historial_tramites` _(Sprint 2 — pendiente)_
Append-only. Nunca UPDATE. Cada avance/rechazo/cambio genera un documento nuevo.
Campos mínimos: `tramite_id`, `accion`, `actor_id`, `timestamp`, `datos_anteriores`, `datos_nuevos`

## Colección: `formularios` _(Sprint 3+ — pendiente)_
Estructura dinámica. Referenciada desde actividades por ID.
