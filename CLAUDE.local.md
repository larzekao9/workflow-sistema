# Estado del proyecto — workflow-sistema
Última actualización: 2026-04-15

## Sprint actual
Sprint 2.10 | PRÓXIMO → Colaboración multiadmin + panel chat IA
Sprint 2.8 ✓ completado: colección decisiones CRUD, endpoints GET/POST/PUT/DELETE/dmn, dmn-js wrapper Angular, ruta /decisions/:id/edit, QA PASS (todos los HTTP codes correctos, XML DMN válido)
Sprint 2.7 ✓ completado: token simulation (play/stop), bpmnlint activo, CSS de ambos plugins, Docker rebuild
Sprint 2.6 ✓ completado: bpmn-js wrapeado, endpoints GET/PUT /bpmn, auto-save, minimap, palette, properties panel, import/export .bpmn, Docker rebuild

---

## Roadmap completo (replaneado con bpmn-js / dmn-js / form-js)

| Sprint | Objetivo | Librería | Estado |
|---|---|---|---|
| Sprint 1 | Auth JWT + usuarios + roles | — | ✓ completo |
| Sprint 2 | Motor de políticas (CRUD + publish/version) | — | ✓ completo |
| Sprint 2.1 | Formularios CRUD (schema + backend + frontend) | — | ✓ completo |
| Sprint 2.2 | Relaciones de políticas + swimlane + árbol versiones | — | ✓ completo |
| Sprint 2.3 | UX creación política → editor directo | — | ✓ completo |
| Sprint 2.4 | /policies/new + full-screen + permisos + delete CRUD | — | ✓ completo |
| Sprint 2.5 | Workbench SVG custom (baseline pre-pivot) | SVG custom | ✓ completo |
| Sprint 2.6 | PIVOT: bpmn-js — editor BPMN real | bpmn-js | ✓ completo |
| Sprint 2.7 | bpmn-js avanzado: simulation + lint + subprocess + import/export | bpmn-js plugins | ✓ completo |
| Sprint 2.8 | dmn-js: tablas de decisión enlazadas a gateways | dmn-js | ✓ completo |
| Sprint 2.9 | form-js: reemplazar form builder, enlace a user tasks | form-js | ✓ completo |
| **Sprint 2.10** | **Colaboración multiadmin + panel chat IA** | **WebSocket + AI** | ⏳ PRÓXIMO |
| Sprint 2.10 | Colaboración multiadmin + panel chat IA | WebSocket + AI | ⏳ pendiente |
| Sprint 3 | Motor de Trámites (instanciación, ejecución, trazabilidad) | — | ⏳ pendiente |
| Sprint 4 | IA — policy/generate + flow/analyze | FastAPI | ⏳ pendiente |
| Sprint 6 | App móvil Flutter | Flutter | 🔒 congelado |

---

## Sprint 2.6 — PIVOT bpmn-js (detalle completo)

### Objetivo
Reemplazar `flow-editor.component.ts` SVG custom por un workbench Angular que envuelve `bpmn-js`. El resultado debe verse y comportarse como un modelador profesional real.

### Por qué ahora
- Sprint 2.7 (subworkflows) y el antiguo 2.7 (BPMN import/export) son triviales con bpmn-js, semanas de trabajo sin él
- Undo/redo, zoom, minimap, subprocess drill-down, token simulation: todos built-in
- Seguir sobre SVG custom es deuda técnica que bloquea Sprints 2.7, 2.8 y 2.9

### Dependencias a instalar (frontend)
```
bpmn-js
bpmn-js-properties-panel
@bpmn-io/properties-panel
camunda-bpmn-moddle           ← extensiones Camunda (para properties)
bpmn-js-minimap               ← plugin minimap
```

### Cambios en backend (schema)
La `Politica` document en MongoDB pasa a guardar el BPMN XML directamente:
```
Politica {
  ...campos actuales...
  bpmnXml: String    ← nuevo campo — fuente de verdad del diagrama
}
```
- Nueva endpoint: `PUT /policies/{id}/bpmn` → recibe `{ bpmnXml: string }`, guarda en MongoDB
- Nueva endpoint: `GET /policies/{id}/bpmn` → devuelve `{ bpmnXml: string }`
- La colección `actividades` queda en stand-by para Sprint 3 (el motor leerá el XML)
- Los campos de negocio (responsableRolId, formularioId, tiempoLimiteHoras, SLA) pasan a ser `<extensionElements>` dentro del XML BPMN

### Cambios en frontend
- Reescribir `flow-editor.component.ts` como wrapper Angular de bpmn-js
- Componente carga el XML desde `GET /policies/{id}/bpmn`
- Auto-save con debounce: `modeler.saveXML()` → `PUT /policies/{id}/bpmn`
- Custom palette: mostrar solo los elementos BPMN que soportamos (ver abajo)
- Custom properties panel: propiedades de negocio como extensiones BPMN

### Elementos BPMN mínimos para Sprint 2.6
```
✓ Start Event         (nuestro INICIO)
✓ End Event           (nuestro FIN)
✓ User Task           (nuestro TAREA)
✓ Service Task        (nuestro TAREA automática)
✓ Exclusive Gateway   (nuestro DECISION)
✓ Parallel Gateway    (nuestro PARALELO)
✓ Sub Process         (nuestro SUBPROCESO, con drill-down)
✓ Call Activity       (workflow reutilizable externo)
✓ Sequence Flow       (nuestras transiciones)
— Pools/Lanes         (dejar para Sprint 2.7)
— Timer/Error/Message Events (dejar para Sprint 2.7)
```

### Propiedades de negocio como extensiones BPMN
```xml
<userTask id="Task_1">
  <extensionElements>
    <workflow:taskConfig xmlns:workflow="http://workflow-sistema/schema/1.0"
      responsableRolId="rol-abc"
      formularioId="form-xyz"
      tiempoLimiteHoras="24"
      slaEscalacion="48" />
  </extensionElements>
</userTask>
```

### Entregables Sprint 2.6
- [ ] bpmn-js instalado y wrapeado en Angular (BpmnEditorComponent standalone)
- [ ] Carga y guarda XML real en backend (PUT/GET /policies/{id}/bpmn)
- [ ] Palette personalizada con 8 elementos BPMN
- [ ] Panel de propiedades con campos de negocio (rol, formulario, tiempo, SLA)
- [ ] Auto-save con debounce 2s + indicador dirty
- [ ] Minimap plugin activo
- [ ] Zoom/pan/undo/redo (built-in, cero código)
- [ ] Import .bpmn desde archivo local
- [ ] Export .bpmn a archivo
- [ ] Docker rebuild con nuevas dependencias

### DoD Sprint 2.6
- El editor abre y guarda BPMN XML válido que puede abrirse en Camunda Modeler
- Undo/redo funciona sin código adicional
- Las propiedades de negocio se guardan como extensiones y sobreviven save/load
- El CSS budget no se excede (extraer estilos bpmn-js a global styles.css)

---

## Sprint 2.7 — bpmn-js avanzado

### Objetivo
Activar los plugins restantes de bpmn-js y soportar elementos BPMN avanzados.

### Dependencias adicionales
```
bpmn-js-token-simulation      ← simulación paso a paso
bpmn-js-bpmnlint              ← validación BPMN
bpmnlint-plugin-camunda       ← reglas de validación Camunda
```

### Entregables
- Simulación visual token (play/pause/step)
- Validación BPMN con reporte de errores (linting)
- Subprocess con navegación drill-down (built-in bpmn-js)
- Call activity referenciando otra política del sistema
- Pools y lanes BPMN reales
- Timer Boundary Event, Error Event, Message Event
- Export imagen PNG/SVG del diagrama

---

## Sprint 2.8 — dmn-js

### Objetivo
Integrar tablas de decisión DMN para los gateways complejos.

### Dependencias
```
dmn-js
```

### Qué resuelve
- Los `Exclusive Gateway` pueden tener una tabla DMN asociada
- El usuario modela las reglas de decisión visualmente (no solo `condicion: 'APROBADO'`)
- Las tablas DMN se guardan como documentos separados en MongoDB y se referencian desde el BPMN XML

### Entregables
- DmnEditorComponent wrapper Angular
- CRUD de tablas DMN (collection `decisiones` en MongoDB)
- Enlace `Exclusive Gateway` → tabla DMN desde el property panel

---

## Sprint 2.9 — form-js

### Objetivo
Reemplazar el form builder custom por form-js (el editor de formularios de Camunda).

### Dependencias
```
@bpmn-io/form-js
@bpmn-io/form-js-editor
@bpmn-io/form-js-viewer
```

### Qué cambia
- El `FormBuilderComponent` actual se reemplaza por un wrapper de form-js editor
- El `FormDetailComponent` / viewer pasa a usar form-js viewer
- Los schemas JSON de formularios son 100% compatibles con form-js
- Migración: los formularios existentes en MongoDB se convierten a schema form-js

### Entregables
- FormJsEditorComponent (wrapper Angular)
- FormJsViewerComponent (para render en trámites del Sprint 3)
- Migración de schemas existentes
- Enlace User Task → formulario desde property panel bpmn-js

---

## Sprint 2.10 — Colaboración + IA

### Entregables
- WebSocket para edición colaborativa (Spring WebSocket / STOMP)
- Presencia de usuarios activos en el editor
- Panel lateral de chat para instrucciones a IA
- IA genera borradores BPMN XML desde descripción en lenguaje natural

---

## Decisiones técnicas tomadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| bpmn-js como base del editor | SVG custom (Sprint 2.5) | Undo/redo, subprocess, import/export BPMN son built-in |
| BPMN XML como fuente de verdad del diagrama | Colección `actividades` con coordenadas | Interoperabilidad, no hay conversión, Sprint 3 parsea XML |
| Extensiones BPMN para propiedades de negocio | Campos extras en JSON propio | Mantiene BPMN válido, abre en Camunda Modeler |
| dmn-js para decisiones | Lógica propia de condiciones | Estándar, visual, mantenible |
| form-js para formularios | Form builder Angular custom | Mismo ecosistema, compatible con Sprint 3 |

---

## Features por estado (tabla actualizada)

| Feature | Estado | Notas |
|---|---|---|
| auth + JWT | ✓ | Sprint 1 |
| gestión roles | ✓ | Sprint 1 |
| gestión usuarios | ✓ | Sprint 1 |
| motor de políticas CRUD | ✓ | Sprint 2 |
| publish/version | ✓ | Sprint 2 |
| formularios CRUD | ✓ | Sprint 2.1 — se migrará a form-js en 2.9 |
| relaciones entre políticas | ✓ | Sprint 2.2 |
| árbol de versiones UI | ✓ | Sprint 2.2 |
| vista swimlane | ✓ | Sprint 2.2 — reemplazada por lanes BPMN en 2.7 |
| página /policies/new | ✓ | Sprint 2.4 |
| editor full-screen | ✓ | Sprint 2.4 |
| fix permisos 403 | ✓ | Sprint 2.4 |
| delete CRUD | ✓ | Sprint 2.4 |
| workbench SVG custom | ✓ | Sprint 2.5 — baseline, reemplazado en 2.6 |
| bpmn-js wrapper Angular | ✓ | Sprint 2.6 |
| BPMN XML en backend | ✓ | Sprint 2.6 — campo `bpmnXml` en Politica |
| import/export .bpmn | ✓ | Sprint 2.6 |
| undo/redo | ✓ | Sprint 2.6 — built-in bpmn-js |
| subprocess + call activity | ✓ | Sprint 2.6 |
| token simulation | ✓ | Sprint 2.7 |
| validación bpmnlint | ✓ | Sprint 2.7 |
| pools/lanes BPMN | ✓ | Sprint 2.7 — built-in bpmn-js |
| dmn-js decisiones | ✓ | Sprint 2.8 — QA PASS |
| form-js formularios | ⏳ | Sprint 2.9 |
| motor de trámites | ⏳ | Sprint 3 |
| IA — generate/analyze | ⏳ | Sprint 4 |
| app móvil | ⏳ | Sprint 6 |

---

---

## Mapa de migración (qué pasa con cada módulo existente)

### NO TOCA (0 cambios)
- `auth/`, `users/`, `roles/`, `dashboard/` — backend y frontend completos
- `policies-list/`, `new-policy/`, `policy-form/` — no relacionados con el editor
- `shared/guards/`, `shared/interceptors/`, `shared/config/` — infraestructura base

### SE EXTIENDE (mínimo cambio, no rompe nada)
- `Politica.java` → +campo `bpmnXml: String`
- `PoliticaController.java` → +`GET /policies/{id}/bpmn` y `PUT /policies/{id}/bpmn`
- `politica.service.ts` (frontend) → +`getBpmn(id)` y `saveBpmn(id, xml)`
- `policy-detail.component.ts` → botón "Ver diagrama" usa bpmn-js viewer (read-only)

### SE REEMPLAZA (mismo lugar, nueva implementación)
- `flow-editor.component.ts` → reescritura con bpmn-js wrapper (Sprint 2.6)
- `form-builder.component.ts` → reescritura con form-js editor (Sprint 2.9)
- `form-detail.component.ts` → reescritura con form-js viewer (Sprint 2.9)

### SE DEPRECA GRADUALMENTE (no se elimina aún)
- `activities/` backend completo — Sprint 2.6 lo deja de usar; Sprint 3 decide su destino final
- `actividad.service.ts` + `actividad.model.ts` — se quitan del flow-editor en Sprint 2.6
- `policyrelations/` — Sprint 2.7 evalúa si Call Activity BPMN lo reemplaza

### SE MIGRA EL SCHEMA (dato existente se convierte)
- Formularios MongoDB → schema form-js compatible en Sprint 2.9 (script de conversión)

---

## Bloqueos
Ninguno. Sprint 2.6 puede iniciar con los subagentes.

## Referencias rápidas
- **Plan detallado reconstrucción bpmn**: `plan_reconstruccion_sprint2_bpmn.md` ← LEER ANTES DE CODEAR
- Plan editor original Sprints 2.5–2.10: `plan_editor_workflows_sprint_2_5.md`
- Contrato API vigente: `docs/api-contract.md`
- Esquema DB: `docs/db-schema-notes.md`
- Decisiones técnicas: `docs/decisions.md`
