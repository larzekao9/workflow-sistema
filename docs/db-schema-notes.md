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

## Colección: `tramites` _(Sprint 3 — pendiente)_
Referencia a `politicas` y `usuarios` por ID.
Estado actual y actividad actual embebidos (acceso frecuente, cambian con el flujo).

## Colección: `historial_tramites` _(Sprint 3 — pendiente)_
Append-only. Nunca UPDATE. Cada avance/rechazo/cambio genera un documento nuevo.
Campos mínimos: `tramite_id`, `accion`, `actor_id`, `timestamp`, `datos_anteriores`, `datos_nuevos`

## Colección: `formularios` _(Sprint 3 — diseño definitivo 2026-04-12)_

### Documento de ejemplo

```json
{
  "_id": "ObjectId('684c3b4d6e5f9a0034cd0020')",
  "nombre": "Formulario de Solicitud de Licencia",
  "descripcion": "Captura los datos iniciales de la solicitud: periodo, tipo de licencia y motivo.",
  "estado": "ACTIVO",
  "creado_por_id": "ObjectId('682f0a1b2c3d4e0056cd0001')",
  "creado_en": "ISODate('2026-03-01T09:02:00Z')",
  "actualizado_en": "ISODate('2026-03-10T14:20:00Z')",
  "secciones": [
    {
      "id": "sec_001",
      "titulo": "Datos de la Solicitud",
      "orden": 1,
      "campos": [
        {
          "id": "campo_001",
          "nombre": "nombre_solicitante",
          "etiqueta": "Nombre completo del solicitante",
          "tipo": "TEXT",
          "obligatorio": true,
          "orden": 1,
          "placeholder": "Ej: Juan Pérez López",
          "valor_defecto": null,
          "validaciones": {
            "min": 3,
            "max": 120,
            "pattern": null,
            "mensaje": "El nombre debe tener entre 3 y 120 caracteres."
          },
          "opciones": []
        },
        {
          "id": "campo_002",
          "nombre": "email_solicitante",
          "etiqueta": "Correo electrónico",
          "tipo": "EMAIL",
          "obligatorio": true,
          "orden": 2,
          "placeholder": "usuario@empresa.com",
          "valor_defecto": null,
          "validaciones": {
            "min": null,
            "max": null,
            "pattern": "^[\\w.+-]+@[\\w-]+\\.[\\w.]+$",
            "mensaje": "Ingrese un correo electrónico válido."
          },
          "opciones": []
        },
        {
          "id": "campo_003",
          "nombre": "tipo_licencia",
          "etiqueta": "Tipo de licencia",
          "tipo": "SELECT",
          "obligatorio": true,
          "orden": 3,
          "placeholder": "Seleccione un tipo",
          "valor_defecto": null,
          "validaciones": {
            "min": null,
            "max": null,
            "pattern": null,
            "mensaje": "Debe seleccionar un tipo de licencia."
          },
          "opciones": [
            { "valor": "ENFERMEDAD", "etiqueta": "Enfermedad" },
            { "valor": "VACACIONES", "etiqueta": "Vacaciones" },
            { "valor": "MATERNIDAD", "etiqueta": "Maternidad / Paternidad" },
            { "valor": "ESTUDIO",    "etiqueta": "Capacitación / Estudio" },
            { "valor": "OTRO",       "etiqueta": "Otro motivo" }
          ]
        },
        {
          "id": "campo_004",
          "nombre": "categorias_adicionales",
          "etiqueta": "Categorías adicionales aplicables",
          "tipo": "MULTISELECT",
          "obligatorio": false,
          "orden": 4,
          "placeholder": "Puede seleccionar varias",
          "valor_defecto": null,
          "validaciones": {
            "min": null,
            "max": 3,
            "pattern": null,
            "mensaje": "Seleccione como máximo 3 categorías."
          },
          "opciones": [
            { "valor": "CON_GOCE_SUELDO",    "etiqueta": "Con goce de sueldo" },
            { "valor": "SIN_GOCE_SUELDO",    "etiqueta": "Sin goce de sueldo" },
            { "valor": "PARCIAL",            "etiqueta": "Jornada parcial" },
            { "valor": "URGENTE",            "etiqueta": "Carácter urgente" }
          ]
        }
      ]
    },
    {
      "id": "sec_002",
      "titulo": "Periodo y Justificación",
      "orden": 2,
      "campos": [
        {
          "id": "campo_005",
          "nombre": "fecha_inicio",
          "etiqueta": "Fecha de inicio de la licencia",
          "tipo": "DATE",
          "obligatorio": true,
          "orden": 1,
          "placeholder": "AAAA-MM-DD",
          "valor_defecto": null,
          "validaciones": {
            "min": null,
            "max": null,
            "pattern": null,
            "mensaje": "La fecha de inicio es obligatoria."
          },
          "opciones": []
        },
        {
          "id": "campo_006",
          "nombre": "cantidad_dias",
          "etiqueta": "Cantidad de días hábiles solicitados",
          "tipo": "NUMBER",
          "obligatorio": true,
          "orden": 2,
          "placeholder": "Ej: 5",
          "valor_defecto": null,
          "validaciones": {
            "min": 1,
            "max": 30,
            "pattern": null,
            "mensaje": "La cantidad debe ser un número entre 1 y 30 días."
          },
          "opciones": []
        },
        {
          "id": "campo_007",
          "nombre": "requiere_reemplazo",
          "etiqueta": "¿Requiere reemplazo durante la ausencia?",
          "tipo": "BOOLEAN",
          "obligatorio": true,
          "orden": 3,
          "placeholder": null,
          "valor_defecto": false,
          "validaciones": {
            "min": null,
            "max": null,
            "pattern": null,
            "mensaje": null
          },
          "opciones": []
        },
        {
          "id": "campo_008",
          "nombre": "motivo_detallado",
          "etiqueta": "Motivo detallado",
          "tipo": "TEXTAREA",
          "obligatorio": false,
          "orden": 4,
          "placeholder": "Describa el motivo de la solicitud...",
          "valor_defecto": null,
          "validaciones": {
            "min": null,
            "max": 1000,
            "pattern": null,
            "mensaje": "El motivo no puede superar los 1000 caracteres."
          },
          "opciones": []
        },
        {
          "id": "campo_009",
          "nombre": "certificado_adjunto",
          "etiqueta": "Certificado médico o documento de respaldo",
          "tipo": "FILE",
          "obligatorio": false,
          "orden": 5,
          "placeholder": null,
          "valor_defecto": null,
          "validaciones": {
            "min": null,
            "max": 5242880,
            "pattern": "application/pdf,image/jpeg,image/png",
            "mensaje": "Adjunte un archivo PDF o imagen. Tamaño máximo: 5 MB."
          },
          "opciones": []
        }
      ]
    }
  ]
}
```

### Campos y tipos

| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Identificador único del formulario |
| `nombre` | String | Nombre legible del formulario, único entre formularios activos |
| `descripcion` | String | Propósito del formulario; orientado al diseñador del flujo |
| `estado` | String (enum) | `ACTIVO`, `INACTIVO` — un formulario INACTIVO no puede asociarse a nuevas actividades |
| `creado_por_id` | ObjectId | Referencia al usuario diseñador que creó el formulario |
| `creado_en` | Date | Timestamp de creación |
| `actualizado_en` | Date | Timestamp de última modificación |
| `secciones` | Array<Object> | Agrupaciones visuales de campos — embebidas |
| `secciones[].id` | String | ID interno de la sección (ej. `sec_001`), único dentro del documento |
| `secciones[].titulo` | String | Encabezado visible de la sección en el formulario renderizado |
| `secciones[].orden` | Integer | Posición de la sección en el formulario; determina el orden de renderizado |
| `secciones[].campos` | Array<Object> | Campos pertenecientes a esta sección — embebidos |
| `campos[].id` | String | ID interno del campo (ej. `campo_001`), único dentro del documento |
| `campos[].nombre` | String | Nombre técnico en snake_case; usado como clave en el payload de respuesta |
| `campos[].etiqueta` | String | Texto visible (label) mostrado al funcionario en el formulario |
| `campos[].tipo` | String (enum) | `TEXT`, `NUMBER`, `DATE`, `BOOLEAN`, `SELECT`, `MULTISELECT`, `TEXTAREA`, `FILE`, `EMAIL` |
| `campos[].obligatorio` | Boolean | Indica si el campo es requerido para poder avanzar el trámite |
| `campos[].orden` | Integer | Posición del campo dentro de su sección |
| `campos[].placeholder` | String / null | Texto de ayuda dentro del input; null si no aplica |
| `campos[].valor_defecto` | Any / null | Valor precargado al abrir el formulario; tipo varía según `tipo` del campo |
| `campos[].validaciones` | Object | Reglas de validación aplicables al campo — embebidas |
| `campos[].validaciones.min` | Number / null | Longitud mínima (TEXT/TEXTAREA), valor mínimo (NUMBER), cantidad mínima (MULTISELECT), tamaño mínimo en bytes (FILE) |
| `campos[].validaciones.max` | Number / null | Longitud máxima (TEXT/TEXTAREA), valor máximo (NUMBER), cantidad máxima (MULTISELECT), tamaño máximo en bytes (FILE) |
| `campos[].validaciones.pattern` | String / null | Expresión regular de validación (TEXT, EMAIL) o lista de MIME types permitidos (FILE) |
| `campos[].validaciones.mensaje` | String / null | Mensaje de error mostrado al usuario cuando la validación falla |
| `campos[].opciones` | Array<Object> | Lista de opciones disponibles; poblada solo para `SELECT` y `MULTISELECT`, array vacío en los demás |
| `campos[].opciones[].valor` | String | Clave interna de la opción, enviada en el payload |
| `campos[].opciones[].etiqueta` | String | Texto visible de la opción en el desplegable |

### Indices

```
db.formularios.createIndex({ "nombre": 1, "estado": 1 })
// Justificacion: búsqueda de formularios activos por nombre desde el panel del diseñador.
// También previene asociar un formulario INACTIVO a una actividad nueva filtrando en la query.

db.formularios.createIndex({ "estado": 1, "actualizado_en": -1 })
// Justificacion: listado paginado de formularios filtrado por estado, ordenado por más reciente.
// Es la query del panel de gestión de formularios: GET /formularios?estado=ACTIVO.

db.formularios.createIndex({ "creado_por_id": 1 })
// Justificacion: filtrar formularios por diseñador. Necesario para auditoría y para mostrar
// al usuario sus propios formularios en el panel de administración.
```

### Decisiones embebido vs referenciado

- `secciones` y `campos` → **embebidos** dentro del formulario. Una sección o un campo no tienen identidad propia fuera del formulario al que pertenecen: nunca se consultan de forma independiente, siempre se acceden junto con el formulario completo para renderizarlo. El número de secciones y campos es acotado y predecible (formularios típicos: 2-5 secciones, 5-20 campos en total). Embeber garantiza que un único documento `findById` entrega todo lo necesario para renderizar el formulario en el frontend y validar los datos enviados por el funcionario.
- `validaciones` y `opciones` → **embebidos** dentro de cada campo. Son datos pequeños, estrictamente locales al campo, sin identidad propia. Nunca se consultan fuera del campo al que pertenecen.
- `creado_por_id` → **referenciado** por ObjectId. Los datos del usuario (nombre, email, departamento) cambian y son compartidos por toda la plataforma. Embeber implicaría propagar actualizaciones del usuario a cada formulario que creó.
- El formulario en sí es **referenciado** desde `actividades.formulario_id` (ObjectId). Un mismo formulario puede reutilizarse en múltiples actividades de distintas políticas. Embeber el formulario dentro de la actividad impediría esta reutilización y multiplicaría el mantenimiento: actualizar un formulario requeriría modificar cada actividad que lo usa.

### Reglas de negocio que el esquema soporta

1. Un formulario con `estado = INACTIVO` **no puede asociarse a nuevas actividades**. La validación es responsabilidad del servicio de actividades al recibir un `formulario_id` en un POST o PUT.
2. Los `ids` internos de secciones y campos (`sec_001`, `campo_001`, etc.) deben ser **únicos dentro del documento**. El backend los genera y valida al crear o actualizar el formulario; se usan como claves en el payload de respuesta de un trámite para mapear cada respuesta a su campo de origen.
3. El campo `campos[].nombre` (snake_case) debe ser **único dentro del formulario completo** (no solo dentro de la sección). Es la clave con la que el motor de trámites almacena y recupera los valores ingresados por el funcionario.
4. Solo los campos de tipo `SELECT` y `MULTISELECT` deben tener `opciones` con al menos un elemento. El backend rechaza documentos donde `tipo` sea `SELECT`/`MULTISELECT` y `opciones` esté vacío, o donde `tipo` sea otro y `opciones` no esté vacío.
5. Un formulario **no puede ser eliminado** si al menos una actividad tiene `formulario_id` apuntando a él. El backend verifica esto antes de procesar cualquier DELETE, consultando `db.actividades.countDocuments({ formulario_id: ObjectId(...) })`.
6. Al actualizar un formulario cuyas actividades ya forman parte de una política `ACTIVA` con trámites en curso, la modificación está **prohibida** en campos que alteren la estructura (agregar, eliminar o renombrar campos). Solo se permiten cambios de presentación (`etiqueta`, `placeholder`, `descripcion` del formulario). El versionado estructural debe seguir el mismo patrón que el de políticas.

---

## Colección: `politica_relaciones` _(Sprint 3 — diseño definitivo 2026-04-12)_

### Documento de ejemplo

```json
{
  "_id": "ObjectId('685d4c5e7f6a0b0045ef0001')",
  "politica_origen_id": "ObjectId('683a1f2e4b3c9d0012ab0001')",
  "politica_destino_id": "ObjectId('683a1f2e4b3c9d0012ab0002')",
  "tipo_relacion": "PRECEDENCIA",
  "prioridad": 1,
  "descripcion": "La política de evaluación de crédito debe completarse antes de iniciar la política de desembolso.",
  "activo": true,
  "creado_por_id": "ObjectId('682f0a1b2c3d4e0056cd0001')",
  "creado_en": "ISODate('2026-04-12T10:00:00Z')",
  "actualizado_en": "ISODate('2026-04-12T10:00:00Z')"
}
```

### Campos y tipos

| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Identificador único de la relación |
| `politica_origen_id` | ObjectId | Referencia a la política que origina o impone la relación |
| `politica_destino_id` | ObjectId | Referencia a la política que recibe o es afectada por la relación |
| `tipo_relacion` | String (enum) | `DEPENDENCIA`, `PRECEDENCIA`, `COMPLEMENTO`, `EXCLUSION`, `OVERRIDE`, `ESCALAMIENTO` |
| `prioridad` | Integer | Orden de resolución cuando múltiples relaciones aplican al mismo par; 1 = más alta prioridad |
| `descripcion` | String / null | Explicación legible de por qué existe la relación; orientada al diseñador |
| `activo` | Boolean | Indica si la relación está vigente; false desactiva sin eliminar (trazabilidad) |
| `creado_por_id` | ObjectId | Referencia al usuario administrador que registró la relación |
| `creado_en` | Date | Timestamp de creación del documento |
| `actualizado_en` | Date | Timestamp de última modificación (cambio de prioridad, descripcion o activo) |

### Indices

```
db.politica_relaciones.createIndex(
  { "politica_origen_id": 1, "politica_destino_id": 1, "tipo_relacion": 1 },
  { unique: true }
)
// Justificacion: garantiza unicidad del par (origen, destino, tipo) a nivel de base de datos.
// Evita que el servicio deba hacer un findOne previo antes de cada insert; el driver lanza
// DuplicateKeyError si se intenta insertar la misma relacion dos veces.

db.politica_relaciones.createIndex({ "politica_origen_id": 1, "activo": 1 })
// Justificacion: el motor de workflow consulta todas las relaciones activas que parten de una
// politica antes de instanciar o avanzar un tramite. Es la query critica del grafo de relaciones:
// GET /politicas/{id}/relaciones?activo=true.

db.politica_relaciones.createIndex({ "politica_destino_id": 1, "activo": 1 })
// Justificacion: consulta inversa — "¿qué politicas afectan a esta?". Necesaria al publicar
// una politica para advertir al diseñador sobre restricciones que otras le imponen
// (EXCLUSION, OVERRIDE, DEPENDENCIA).

db.politica_relaciones.createIndex({ "tipo_relacion": 1, "activo": 1 })
// Justificacion: consultas de analisis operacional y auditoria por tipo de relacion;
// por ejemplo, listar todos los ESCALAMIENTO activos para el panel de supervision.

db.politica_relaciones.createIndex({ "creado_por_id": 1 })
// Justificacion: filtrar relaciones registradas por un administrador especifico.
// Util para auditoria y para mostrar al usuario sus propias configuraciones.
```

### Decisiones embebido vs referenciado

- `politica_origen_id` y `politica_destino_id` → **referenciados** por ObjectId. Las políticas son documentos grandes y completamente independientes, con su propio ciclo de vida (versionado, archivado). Embeber cualquiera de los dos en esta colección duplicaría datos que cambian y rompería la consistencia al versionar una política. La relación solo necesita los IDs para que el motor pueda cargar cada política cuando deba evaluarlas.
- `creado_por_id` → **referenciado** por ObjectId. Los datos del usuario son compartidos por toda la plataforma; el mismo criterio que en `politicas` y `formularios`.
- No existe ningún subdocumento embebido en esta colección: el documento es intencionalmente plano. La relación entre dos políticas es un hecho atómico (un par + un tipo), no una estructura compuesta. Mantenerlo plano maximiza la legibilidad del esquema, simplifica las queries del motor y reduce el riesgo de sub-documentos que crezcan de forma impredecible.

### Reglas de negocio que el esquema soporta

1. **Prohibicion de auto-relacion:** `politica_origen_id` y `politica_destino_id` nunca pueden ser iguales. Esta restriccion no es imponible con un indice MongoDB nativo; la validacion es obligatoria en la capa de servicio antes de cualquier insert.
2. **Unicidad del par + tipo:** el indice unico `(politica_origen_id, politica_destino_id, tipo_relacion)` garantiza que no existan dos registros del mismo tipo para el mismo par de politicas. Si se necesita cambiar la prioridad o descripcion de una relacion existente, se hace un UPDATE sobre el documento ya existente, no un nuevo insert.
3. **Desactivacion logica, no borrado fisico:** cuando una relacion deja de ser relevante se setea `activo = false`. Esto preserva la trazabilidad historica y permite auditar cuantas veces fue activada/desactivada una relacion. El borrado fisico esta prohibido.
4. **Resolucion de conflictos por prioridad:** cuando el motor detecta multiples relaciones activas que aplican al mismo par en una evaluacion, el campo `prioridad` (menor numero = mayor prioridad) determina cual se aplica primero. La logica de desempate en caso de prioridad identica es responsabilidad del servicio de motor de politicas.
5. **Tipo `EXCLUSION`:** si existe una relacion activa de tipo `EXCLUSION` entre A y B, el motor debe impedir que ambas politicas esten activas simultaneamente sobre el mismo tramite o contexto. La validacion ocurre al intentar instanciar o activar cualquiera de las dos.
6. **Tipo `ESCALAMIENTO`:** requiere que la politica origen tenga `tiempo_limite_dias` no nulo. El servicio valida este prerequisito al crear la relacion para evitar configuraciones de escalamiento sin SLA definido.
7. **Tipo `OVERRIDE`:** la politica origen anula a la destino. El motor debe registrar en `historial_tramites` que se aplico un override, indicando ambas politicas involucradas, para garantizar trazabilidad completa del reemplazo.
