# Plan de Modificaciones — workflow-sistema
**Fecha:** 2026-04-23 | **Arquitecto:** Senior Dev Planning  
**Contexto base:** stack actual en producción (Sprint 2.16 completado)

---

## Decisiones de arquitectura confirmadas

| Decisión | Definido |
|---|---|
| Actores fijos | SUPERADMIN / ADMIN / FUNCIONARIO / CLIENTE |
| Clientes | **Globales** — se registran en el sistema, sin empresa_id, ven políticas publicadas de todas las empresas |
| Cada Admin = 1 empresa | ✅ |
| Funcionarios | Por empresa + departamento + cargo |
| Formularios soportan uploads | ✅ fotos, PDF, Word |
| Apelación | 2 días para corregir docs/datos, si se aprueba → pasan a siguiente actividad |
| Configuración de actividad | Inline en el editor BPMN (área + cargo + formulario + SLA) |

### ⚠️ Pendiente definir (1 sola cosa)
> **OBSERVAR vs DENEGAR:** ¿ambas acciones abren el plazo de 2 días de apelación, o solo DENEGAR?
> - Si OBSERVAR también abre apelación → el cliente puede corregir en ambos casos
> - Si OBSERVAR es solo una nota interna → el trámite sigue en la misma actividad sin plazo

---

## Qué cambia vs qué queda igual

| Área | Estado |
|---|---|
| Auth JWT, login, register | ✅ sin cambios |
| Motor BPMN (bpmn-js, dmn-js, form-js) | ✅ sin cambios |
| Políticas CRUD + editor visual | ✅ sin cambios |
| Decisiones DMN | ✅ sin cambios |
| Roles tabla en DB | ⚙️ agregar SUPERADMIN |
| Usuarios | ⚙️ agregar empresa_id (null en CLIENTE y SUPERADMIN) |
| Departamentos | ⚙️ agregar empresa_id |
| Actividades | ⚙️ agregar cargo_requerido + department_id |
| Políticas | ⚙️ agregar empresa_id |
| Formularios | ⚙️ agregar tipo campo FILE (fotos/PDF/Word) |
| Trámites | ⚙️ agregar EN_APELACION + objeto apelacion + docs en historial |
| Empresas | 🆕 nueva colección |
| Almacenamiento de archivos | 🆕 nueva infraestructura |
| Motor asignación automática | 🆕 nuevo |
| Flujo de apelación | 🆕 nuevo |
| Config de actividad inline en BPMN | 🆕 nuevo panel de propiedades |
| Dashboard cliente (portal) | 🆕 nuevo |

---

## Mapa de dependencias

```
Sprint 3.1 — Empresas + Superadmin + File Storage
    ↓
Sprint 3.2 — Refactor entidades (empresa_id, cargo_requerido, department_id)
             + Campo FILE en formularios
    ↓
Sprint 3.3 — Motor asignación automática (empresa + dpto + cargo → funcionario)
    ↓
Sprint 3.4 — Flujo apelación completo (EN_APELACION, docs, 2 días)
    ↓
Sprint 3.5 — Panel de propiedades inline en editor BPMN
    ↓
Sprint 3.6 — Portal del cliente (timeline visual + notificaciones)

Sprint 3.7 — Chat IA en editor BPMN ← independiente, puede ir en paralelo con 3.4+
```

---

## Sprint 3.1 — Empresas + Superadmin + File Storage
**Duración estimada:** 2 días  
**Objetivo:** Base multi-tenant + infraestructura de archivos. Sin esto, nada más arranca.

### DB: nueva colección `empresas`
```
{
  _id:                ObjectId
  nombre:             String   (requerido)
  razon_social:       String
  nit:                String
  email_contacto:     String
  telefono:           String
  direccion:          String
  ciudad:             String
  pais:               String
  activa:             Boolean  default: true
  admin_principal_id: String   (ref → usuarios)
  creado_en:          DateTime
  actualizado_en:     DateTime
}
```

### DB: nuevo rol en `roles`
```
{ nombre: "SUPERADMIN", descripcion: "Acceso global", permisos: ["*"], activo: true }
```

### Infraestructura de archivos
**Estrategia MVP (sin S3 por ahora):** almacenar archivos en el filesystem del contenedor Docker con volumen persistente, servir con endpoint propio.

```
POST /files/upload        → sube 1 archivo, devuelve { fileId, url, nombre, tipo, tamanio }
GET  /files/{fileId}      → descarga/sirve el archivo
DELETE /files/{fileId}    → elimina (solo admin o propietario)
```

Tipos permitidos: `image/jpeg`, `image/png`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`  
Límite: 10 MB por archivo.

Estructura de referencia en DB (se embebe donde se use):
```
{
  fileId:   String   (UUID)
  nombre:   String   (nombre original)
  tipo:     String   (MIME type)
  url:      String   (/files/{fileId})
  tamanio:  Long     (bytes)
  subidoEn: DateTime
}
```

### Backend
- [ ] Entidad `Empresa.java` + `EmpresaRepository` + `EmpresaService` + `EmpresaController` → `/empresas`
- [ ] `EmpresaRequest` / `EmpresaResponse` DTOs
- [ ] `@PreAuthorize("hasRole('SUPERADMIN')")` en gestión de empresas
- [ ] `FileStorageService`: guardar en `/uploads/` con UUID, validar MIME y tamaño
- [ ] `FileController` → `/files/upload`, `/files/{id}`, `/files/{id}` DELETE
- [ ] Volumen Docker para `/uploads/` en `docker-compose.yml`
- [ ] Seed: empresa demo "TelecomDemo S.A."

### Frontend
- [ ] Ruta `/empresas` → `EmpresasListComponent` (solo SUPERADMIN)
- [ ] `EmpresaFormDialogComponent` CRUD
- [ ] `empresa.service.ts`
- [ ] `file-upload.service.ts` — wrapper para `POST /files/upload` con progress
- [ ] Ocultar menú `/empresas` si no es SUPERADMIN

---

## Sprint 3.2 — Refactor entidades + Campo FILE en formularios
**Duración estimada:** 2 días  
**Prerequisito:** Sprint 3.1  
**Objetivo:** Conectar todos los modelos existentes a empresa, y agregar soporte de archivos en formularios.

### DB: campos nuevos en colecciones existentes
Todos opcionales — no rompen documentos actuales.

```
usuarios       → empresa_id: String   (null si CLIENTE o SUPERADMIN)
departamentos  → empresa_id: String
actividades    → cargo_requerido: String
                 department_id: String
politicas      → empresa_id: String
```

### Nuevo tipo de campo en formularios: FILE
```
CampoFormulario.tipo: agregar FILE

Atributos específicos de FILE:
  tipos_permitidos: [String]   (["pdf","jpg","png","doc","docx"] — configurable por el admin)
  max_archivos:     Integer    (cuántos archivos puede subir en ese campo)
  max_tamanio_mb:   Integer    (límite por archivo)
```

Ejemplo de campo FILE en un formulario:
```json
{
  "id": "campo_cedula",
  "nombre": "documento_identidad",
  "etiqueta": "Documento de identidad",
  "tipo": "FILE",
  "obligatorio": true,
  "tipos_permitidos": ["pdf", "jpg", "png"],
  "max_archivos": 2,
  "max_tamanio_mb": 5
}
```

### Backend
- [ ] Agregar `empresaId` a `User.java`, `Department.java`, `Actividad.java`, `Politica.java`
- [ ] Actualizar requests: `CreateUserRequest`, `DepartmentRequest`, `CreateActividadRequest` con nuevos campos
- [ ] Filtrado automático por empresa en todos los `GET`:
  - ADMIN → solo ve recursos de su empresa (extraer `empresaId` del JWT)
  - SUPERADMIN → ve todo sin filtro
  - CLIENTE → no tiene empresa_id, ve todas las políticas PUBLICADAS de todas las empresas
- [ ] Agregar `TipoCampo.FILE` al enum
- [ ] `CampoFormulario`: agregar `tiposPermitidos`, `maxArchivos`, `maxTamanioMb`
- [ ] Validar en `TramiteService.responder()` que los archivos subidos cumplen las restricciones del campo

### Frontend
- [ ] Actualizar `user.model.ts`, `department.model.ts` con `empresaId`
- [ ] `user-form.component.ts`: empresa visible solo para SUPERADMIN (auto-asignada para ADMIN)
- [ ] En el form-builder (form-js-editor o formulario propio): agregar bloque de campo tipo FILE
  - Configurar tipos permitidos con checkboxes
  - Configurar max_archivos y max_tamanio_mb
- [ ] En tramite al responder: renderizar campo FILE como zona de drag-and-drop / input file
  - Al seleccionar archivo → `POST /files/upload` inmediatamente → guardar fileId en la respuesta
  - Mostrar preview (imagen) o ícono (PDF/Word) con nombre del archivo
  - Botón de eliminar por archivo

---

## Sprint 3.3 — Motor de asignación automática
**Duración estimada:** 1–2 días  
**Prerequisito:** Sprint 3.2  
**Objetivo:** Al avanzar una actividad, el sistema busca y asigna al funcionario correcto automáticamente.

### Lógica de asignación (menor carga)
```
asignarFuncionario(actividad, empresaId):
  1. Obtener actividad.department_id + actividad.cargo_requerido
  2. Buscar en usuarios:
       empresa_id == empresaId
       department_id == actividad.department_id
       cargo == actividad.cargo_requerido
       rol == "FUNCIONARIO"
       activo == true
  3. Si 0 encontrados → estado SIN_ASIGNAR + alerta al admin
  4. Si 1 encontrado  → asignar directo
  5. Si N encontrados → menor carga:
       contar tramites activos por usuario (INICIADO | EN_PROCESO | EN_APELACION)
       elegir el de menor cantidad
  6. Actualizar tramite: asignado_a_id, asignado_a_nombre, estado = EN_PROCESO
```

### Backend
- [ ] `TramiteService.asignarFuncionarioAutomatico(actividadId, empresaId)` → retorna `User`
- [ ] `UserRepository.findFuncionariosDisponibles(empresaId, departmentId, cargo)` → lista
- [ ] `TramiteRepository.countActivosByAsignadoId(userId)` → Long
- [ ] Integrar en `BpmnMotorService`: al resolver la siguiente actividad → llamar asignador
- [ ] `POST /tramites/{id}/avanzar` ya no recibe `funcionarioId` — es automático
- [ ] Nuevo estado `SIN_ASIGNAR` en `EstadoTramite` para cuando no hay funcionario disponible
- [ ] `GET /tramites/sin-asignar` → solo ADMIN ve lista de trámites sin asignar
- [ ] `POST /tramites/{id}/asignar-manual` → ADMIN asigna manualmente en caso de emergencia

### Frontend
- [ ] `TramiteDetalleComponent`: mostrar funcionario asignado + su área + su cargo
- [ ] Panel admin: sección "Sin asignar" con alerta visual + botón asignar manual
- [ ] Remover cualquier selector de funcionario en el flujo de avance (ya es automático)

---

## Sprint 3.4 — Flujo de apelación
**Duración estimada:** 2 días  
**Prerequisito:** Sprint 3.3  
**Objetivo:** Ciclo completo OBSERVAR/DENEGAR → apelación 2 días → resolución.

### DB: cambios en `tramites`

```
Nuevo estado: EN_APELACION

Nuevo campo embebido:
apelacion: {
  activa:                   Boolean
  fecha_inicio:             DateTime
  fecha_limite:             DateTime       (fecha_inicio + 2 días)
  motivo_original:          String         (obs del funcionario que denegó/observó)
  documentos_originales:    [FileRef]      (docs del cliente antes de apelar)
  documentos_apelatoria:    [FileRef]      (docs nuevos que sube el cliente)
  justificacion_cliente:    String
  estado:                   String         (PENDIENTE | EN_REVISION | APROBADO | DENEGADO)
}

Nuevos campos en historial[]:
  responsable_cargo:     String    (cargo de quien actuó)
  documentos_adjuntos:   [FileRef] (docs cargados en esa etapa)
```

### Comportamiento OBSERVAR vs DENEGAR
> Ambas acciones abren el plazo de 2 días de apelación.
> La diferencia es semántica: OBSERVAR implica que hay correcciones posibles, DENEGAR implica rechazo formal. En ambos casos el cliente puede apelar con nuevos documentos/datos.

### Backend — nuevos endpoints
```
POST /tramites/{id}/observar              → funcionario observa + abre apelación
POST /tramites/{id}/denegar               → funcionario deniega + abre apelación  
POST /tramites/{id}/apelar                → cliente sube docs corregidos
POST /tramites/{id}/resolver-apelacion    → funcionario aprueba o deniega apelación
GET  /tramites/{id}/apelacion             → estado actual
```

- [ ] `TramiteService.observar(id, motivo, docs)`:
  - estado → `EN_APELACION`
  - crear `apelacion` con `fecha_limite = now + 2 días`, `estado = PENDIENTE`
  - registrar en historial con `responsable_cargo` y `documentos_adjuntos`
- [ ] `TramiteService.denegar(id, motivo, docs)`: igual que observar, diferente acción en historial
- [ ] `TramiteService.apelar(id, docsNuevos, justificacion)`:
  - validar `apelacion.fecha_limite > now`
  - guardar `documentos_apelatoria`
  - `apelacion.estado = EN_REVISION`
  - buscar funcionario para revisar (misma lógica asignación automática)
- [ ] `TramiteService.resolverApelacion(id, aprobada, observaciones)`:
  - APROBADA: `apelacion.estado = APROBADO` → los `documentos_apelatoria` pasan como `documentos_adjuntos` de la siguiente etapa → avanzar al siguiente nodo
  - DENEGADA: `apelacion.estado = DENEGADO` → estado tramite = `RECHAZADO` (fin definitivo)
- [ ] Scheduler (`@Scheduled`): cada hora revisar trámites con `apelacion.fecha_limite < now` y `apelacion.estado = PENDIENTE` → marcar `RECHAZADO` (cliente no apeló en tiempo)

### Frontend
- [ ] `TramiteDetalleComponent` para FUNCIONARIO: botones APROBAR / OBSERVAR / DENEGAR
  - Todos con modal de confirmación + campo de observaciones
  - OBSERVAR y DENEGAR: advertencia "esto abrirá plazo de apelación de 2 días"
- [ ] `TramiteDetalleComponent` para CLIENTE cuando estado = `EN_APELACION`:
  - Mostrar motivo del funcionario
  - Timer cuenta regresiva de 2 días (reactivo)
  - Botón "Corregir y apelar"
- [ ] `TramiteApelacionComponent` (nuevo): 
  - Vista de docs originales
  - Zona de upload de nuevos docs (reutilizar componente FILE del Sprint 3.2)
  - Campo de justificación de texto
- [ ] Vista funcionario cuando `apelacion.estado = EN_REVISION`:
  - Comparativa: docs originales vs docs de apelación
  - Botones APROBAR APELACIÓN / DENEGAR APELACIÓN
- [ ] Actualizar `tramite.model.ts` con interfaz `Apelacion` y `FileRef`

---

## Sprint 3.5 — Panel de propiedades inline en editor BPMN
**Duración estimada:** 2 días  
**Prerequisito:** Sprint 3.2 (para tener departamentos + cargos disponibles)  
**Objetivo:** Al hacer click en un userTask en el editor BPMN, aparece un panel lateral donde el admin configura todo sin salir del editor.

### Panel de propiedades de userTask
```
┌─────────────────────────────────────────────┐
│ ⚙️  Configurar actividad                     │
├─────────────────────────────────────────────┤
│ Nombre:        [Revisar Solicitud         ] │
│ Descripción:   [                          ] │
├─────────────────────────────────────────────┤
│ RESPONSABLE                                 │
│ Área/Dpto:     [Atención al Cliente     ▼] │
│ Cargo:         [Revisor                 ▼] │ ← filtrado por área
│                                             │
│ Acciones posibles:                          │
│   ☑ Aprobar    ☑ Observar    ☑ Denegar    │
├─────────────────────────────────────────────┤
│ FORMULARIO                                  │
│ ○ Sin formulario                            │
│ ○ Seleccionar existente [               ▼] │
│ ○ Crear nuevo  [+ Abrir constructor      ] │
├─────────────────────────────────────────────┤
│ SLA (tiempo límite):  [__] horas  [__] días │
├─────────────────────────────────────────────┤
│            [Cancelar]  [Guardar]            │
└─────────────────────────────────────────────┘
```

### Comportamiento del selector de cargo
- Al seleccionar un Área → `GET /departments/{id}/cargos` → lista de cargos únicos de funcionarios en ese departamento
- El cargo se guarda como texto libre en la actividad (no como ID) para que funcione con el motor de asignación

### Constructor de formulario inline
- Botón "Crear nuevo" → abre `FormBuilderComponent` en un `MatDialog` de pantalla completa
- Al guardar el formulario → devuelve el ID → se vincula automáticamente a la actividad
- Incluye el tipo de campo FILE con configuración de tipos permitidos

### Backend
- [ ] `GET /departments/{id}/cargos` → lista de cargos únicos de funcionarios en ese departamento
  - `UserRepository.findDistinctCargosByDepartmentId(departmentId)`
- [ ] `PUT /activities/{id}` ya existe — verificar que acepta `cargoRequerido` y `departmentId`

### Frontend
- [ ] En `FlowEditorComponent`: escuchar evento `element.click` de bpmn-js
- [ ] Si elemento es `userTask` → abrir `mat-sidenav` con `ActivityPropertiesPanelComponent`
- [ ] `ActivityPropertiesPanelComponent` (nuevo):
  - Dropdown de departamentos → `GET /departments` (filtrado por empresa del admin)
  - Dropdown de cargos → `GET /departments/{id}/cargos` (reactivo al elegir área)
  - Checkboxes de acciones (APROBAR / OBSERVAR / DENEGAR)
  - Selector/creador de formulario
  - Campo SLA
  - Al guardar → `PUT /activities/{id}` + actualiza `documentation` en el BPMN XML (patrón `ROL:X\nFORM:{id}`)
- [ ] `FormBuilderDialogComponent`: envolver `FormBuilderComponent` en `MatDialog`

---

## Sprint 3.6 — Portal del cliente
**Duración estimada:** 1–2 días  
**Prerequisito:** Sprint 3.4  
**Objetivo:** El cliente tiene un portal claro con estado en tiempo real, timeline visual y acciones disponibles por estado.

### Ruta `/mis-tramites` — vista exclusiva del cliente

#### Estado actual
```
Estado:       EN PROCESO
Actividad:    Revisar Solicitud
Área:         Atención al Cliente
Cargo:        Revisor  ← (no nombre del funcionario por privacidad)
SLA:          Vence 25 de abril
```

#### Timeline visual
```
✅ Trámite iniciado         — 23 Abr 10:30
✅ Documentos recibidos     — 23 Abr 11:15
❌ Observado                — 23 Abr 14:00
   "El comprobante debe ser de los últimos 3 meses"
✅ Apelación enviada        — 24 Abr 09:00
✅ Apelación aprobada       — 24 Abr 15:30
⏳ En revisión (ACTUAL)     — Desde 24 Abr  |  Vence 26 Abr
⏸ Siguiente paso            — Esperando decisión
```

#### Acciones disponibles por estado
| Estado | Lo que puede hacer el cliente |
|---|---|
| EN_PROCESO | Ver estado + SLA |
| EN_APELACION | Timer 2 días + botón "Corregir y apelar" |
| COMPLETADO | Ver historial completo |
| RECHAZADO | Ver historial + contactar soporte |

### Backend
- [ ] `GET /tramites/mis-tramites` → solo trámites del cliente autenticado (clienteId del JWT)
- [ ] `GET /policies/publicas` → todas las políticas PUBLICADAS de todas las empresas (para que el cliente pueda iniciar trámites)
- [ ] Validar en cada endpoint que CLIENTE solo accede a sus propios recursos

### Frontend
- [ ] Ruta `/mis-tramites` → `MisTramitesComponent` (solo visible para CLIENTE)
- [ ] `TramiteTimelineComponent` (reutilizable): línea de tiempo con íconos por acción
- [ ] `TramiteStatusCardComponent`: estado actual + área + cargo + SLA
- [ ] Timer reactivo countdown (RxJS `timer` o `interval`) para plazo de apelación
- [ ] Navegación: CLIENTE redirige a `/mis-tramites`, no a `/tramites` (bandeja de funcionarios)
- [ ] En `/mis-tramites`: botón "Iniciar nuevo trámite" → lista de políticas públicas

---

## Sprint 3.7 — Chat IA en editor BPMN
**Duración estimada:** 1–2 días  
**Prerequisito:** Ninguno — puede correr en paralelo con 3.4+  
**Objetivo:** El admin escribe o dicta un comando y el diagrama se modifica automáticamente.

### Flujo
```
Admin escribe/dicta en panel lateral del editor BPMN
    → POST /ai/bpmn/command { prompt, bpmnXml }
    → AI Service (Claude): devuelve lista de operaciones
    → Frontend: ejecuta modeling.createShape / modeling.connect
    → Ctrl+Z deshace con undo nativo de bpmn-js
```

### Backend — AI Service (base ya existe)
- [ ] `bpmn_command_service.py`: afinar prompt para devolver operaciones estructuradas
- [ ] Formato respuesta:
```json
{
  "operaciones": [
    { "tipo": "createShape", "elemento": "userTask", "nombre": "Revisar Solicitud", "x": 300, "y": 200 },
    { "tipo": "connect", "desde": "StartEvent_1", "hacia": "Task_nuevo" }
  ],
  "descripcion": "Agregué tarea 'Revisar Solicitud' conectada al inicio"
}
```

### Frontend
- [ ] `mat-sidenav` secundario en `FlowEditorComponent` (separado del panel de propiedades)
- [ ] Textarea + botón enviar + botón micrófono (Web Speech API)
- [ ] Loading indicator mientras procesa
- [ ] Ejecutar operaciones sobre `this.modeler` (bpmn-js)
- [ ] Botón "Deshacer último comando" → `modeler.get('commandStack').undo()`

---

## Resumen de todos los cambios a la DB

```
NUEVA COLECCIÓN:
  empresas

CAMPOS NUEVOS (todos opcionales — no rompen datos existentes):
  roles          → nuevo doc SUPERADMIN
  usuarios       → empresa_id (null en CLIENTE y SUPERADMIN)
  departamentos  → empresa_id
  actividades    → cargo_requerido, department_id
  politicas      → empresa_id
  formularios    → CampoFormulario.tipo ahora incluye FILE
                   campos: tipos_permitidos, max_archivos, max_tamanio_mb
  tramites       → estado EN_APELACION
                   campo: apelacion { activa, fecha_inicio, fecha_limite, 
                          motivo_original, documentos_originales,
                          documentos_apelatoria, justificacion_cliente, estado }
                   historial[].responsable_cargo
                   historial[].documentos_adjuntos: [FileRef]
```

---

## Resumen de endpoints nuevos

```
# Empresas (SUPERADMIN)
GET|POST|PUT|DELETE /empresas/{id}

# Archivos
POST   /files/upload
GET    /files/{fileId}
DELETE /files/{fileId}

# Cargos por departamento
GET    /departments/{id}/cargos

# Motor asignación
GET    /tramites/sin-asignar
POST   /tramites/{id}/asignar-manual

# Apelación
POST   /tramites/{id}/observar
POST   /tramites/{id}/denegar
POST   /tramites/{id}/apelar
POST   /tramites/{id}/resolver-apelacion
GET    /tramites/{id}/apelacion

# Portal cliente
GET    /tramites/mis-tramites
GET    /policies/publicas
```

---

## Estimación total

| Sprint | Feature | Días est. |
|---|---|---|
| 3.1 | Empresas + Superadmin + File Storage | 2 |
| 3.2 | Refactor entidades + campo FILE en formularios | 2 |
| 3.3 | Motor asignación automática | 1–2 |
| 3.4 | Flujo apelación completo | 2 |
| 3.5 | Panel propiedades inline en editor BPMN | 2 |
| 3.6 | Portal del cliente | 1–2 |
| 3.7 | Chat IA editor BPMN (paralelo con 3.4+) | 1–2 |
| **Total** | | **11–14 días** |

> 3.1 → 3.2 → 3.3 → 3.4 son estrictamente secuenciales.  
> 3.5 puede empezar en paralelo con 3.3 (solo necesita 3.2).  
> 3.6 necesita 3.4 completo.  
> 3.7 es completamente independiente.
