# Plan de Reconstrucción Sprint 2 — Base bpmn-js / dmn-js / form-js
Fecha: 2026-04-15 | Estado: PLANIFICACIÓN

---

## 1. Visión general

Reconstruir el módulo de modelado visual del Sprint 2 sobre las librerías oficiales del ecosistema Camunda/bpmn.io en lugar de mantener la implementación SVG custom. Los módulos de auth, usuarios, roles, CRUD de políticas y la shell Angular NO se tocan.

**Secuencia fija:**
```
Sprint 2.6 → bpmn-js (editor BPMN real)
Sprint 2.7 → bpmn-js plugins (simulation + lint + BPMN avanzado)
Sprint 2.8 → dmn-js (tablas de decisión)
Sprint 2.9 → form-js (formularios)
Sprint 2.10 → colaboración + IA
```

---

## 2. Inventario del estado actual y qué pasa con cada pieza

### BACKEND

| Módulo | Clase clave | Estado | Acción |
|---|---|---|---|
| `policies/` | `Politica.java` | ✓ sólido | +`bpmnXml: String` en Sprint 2.6 |
| `policies/` | `PoliticaController.java` | ✓ sólido | +2 endpoints bpmn en Sprint 2.6 |
| `policies/` | `PoliticaService.java` | ✓ sólido | +métodos getBpmn/saveBpmn |
| `activities/` | `Actividad.java` | ⚠ secundario | CONGELAR en 2.6 — no eliminar hasta Sprint 3 |
| `activities/` | `ActividadController.java` | ⚠ secundario | CONGELAR — el editor ya no lo llama |
| `forms/` | `Formulario.java` | ⚠ schema custom | Mantener hasta Sprint 2.9; migrar schema a form-js |
| `forms/` | `FormularioController.java` | ✓ sólido | Sin cambios hasta Sprint 2.9 |
| `policyrelations/` | `PoliticaRelacion.java` | ⚠ reemplazable | En Sprint 2.7, Call Activity BPMN lo reemplaza conceptualmente |
| `auth/` | todos | ✓ intocable | SIN CAMBIOS |
| `users/` | todos | ✓ intocable | SIN CAMBIOS |
| `roles/` | todos | ✓ intocable | SIN CAMBIOS |
| `shared/` | config, exceptions | ✓ intocable | SIN CAMBIOS |

### FRONTEND

| Componente | Ruta | Estado | Acción |
|---|---|---|---|
| `flow-editor.component.ts` | `/policies/:id/flow` | ⚠ 2334 líneas SVG | REESCRIBIR con bpmn-js en Sprint 2.6 |
| `form-builder.component.ts` | `/forms/new`, `/forms/:id/edit` | ⚠ builder custom | REESCRIBIR con form-js en Sprint 2.9 |
| `form-detail.component.ts` | `/forms/:id` | ⚠ viewer custom | REESCRIBIR con form-js viewer en Sprint 2.9 |
| `policy-detail.component.ts` | `/policies/:id` | ✓ sólido | +botón bpmn viewer (read-only) en Sprint 2.6 |
| `policies-list.component.ts` | `/policies` | ✓ intocable | SIN CAMBIOS |
| `new-policy.component.ts` | `/policies/new` | ✓ intocable | SIN CAMBIOS |
| `policy-form.component.ts` | `/policies/:id/edit` | ✓ intocable | SIN CAMBIOS |
| `auth/`, `users/`, `roles/` | varios | ✓ intocable | SIN CAMBIOS |
| `dashboard.component.ts` | `/dashboard` | ✓ intocable | SIN CAMBIOS |
| `actividad.service.ts` | shared | ⚠ | Quitar de flow-editor en 2.6; dejar el archivo |
| `actividad.model.ts` | shared | ⚠ | Quitar del editor en 2.6; dejar el archivo |
| `formulario.service.ts` | shared | ✓ | Usar hasta Sprint 2.9, luego revisar |
| `politica.service.ts` | shared | ✓ | +`getBpmn()` / `saveBpmn()` en Sprint 2.6 |

---

## 3. Decisiones de arquitectura fijas

### 3.1 BPMN XML como fuente de verdad del diagrama
```
ANTES: Politica → actividadIds[] → Actividad {posicion, transiciones, tipo}
AHORA: Politica → bpmnXml (string) — el XML contiene TODA la estructura del flujo
```
El campo `bpmnXml` en MongoDB guarda el BPMN 2.0 XML completo. El motor de Sprint 3 parseará este XML para instanciar trámites.

### 3.2 Propiedades de negocio como BPMN Extension Elements
Las propiedades de Actividad (responsableRolId, formularioId, tiempoLimiteHoras) pasan a ser extensionElements en el XML:
```xml
<bpmn:userTask id="Task_1" name="Revisar solicitud">
  <bpmn:extensionElements>
    <workflow:taskConfig xmlns:workflow="http://workflow-sistema/schema/1.0"
      responsableRolId="rol-abc123"
      formularioId="form-xyz789"
      tiempoLimiteHoras="24"
      slaEscalacionHoras="48" />
  </bpmn:extensionElements>
</bpmn:userTask>
```
Esto mantiene BPMN válido y compatible con Camunda Modeler.

### 3.3 Actividades congeladas, no eliminadas
La colección `actividades` en MongoDB se congela en Sprint 2.6. No se borra. En Sprint 3 se decide si:
- **Opción A**: El motor parsea el XML directamente (más limpio)
- **Opción B**: Se mantiene actividades como índice sincronizado (más query-friendly)
La decisión se toma en Sprint 3 con el motor de trámites.

### 3.4 PoliticaRelacion reemplazada por Call Activity
El concepto de relación ESCALAMIENTO/SUBPROCESO/COMPLEMENTARIA entre políticas pasa a modelarse como **Call Activity BPMN** dentro del diagrama. La colección `politica_relaciones` se mantiene como historial pero deja de ser la fuente de verdad en Sprint 2.7.

### 3.5 Formularios: schema custom → form-js schema
El schema actual de Formulario tiene estructura propia (`secciones → campos`). form-js usa `components[]`. La migración es Sprint 2.9. Hasta entonces, el backend de formularios no cambia.

---

## 4. Sprint 2.6 — bpmn-js Core (PRIMER SPRINT A EJECUTAR)

### Objetivo
Reemplazar el editor SVG custom por un editor BPMN profesional basado en bpmn-js. El usuario debe poder crear, editar, guardar y cargar diagramas BPMN reales.

### Dependencias a instalar (frontend)
```json
"bpmn-js": "^17.x",
"bpmn-js-properties-panel": "^3.x",
"@bpmn-io/properties-panel": "^3.x",
"camunda-bpmn-moddle": "^7.x",
"bpmn-js-minimap": "^5.x"
```

### Cambios backend

#### 4.1 `Politica.java` — agregar campo
```java
@Field("bpmn_xml")
private String bpmnXml;  // BPMN 2.0 XML completo
```

#### 4.2 `PoliticaController.java` — 2 endpoints nuevos
```
GET  /policies/{id}/bpmn   → { bpmnXml: string }
PUT  /policies/{id}/bpmn   → body: { bpmnXml: string } → 200 OK
```
Requieren permiso `GESTIONAR_POLITICAS`. El PUT valida que la política esté en estado BORRADOR.

#### 4.3 `PoliticaResponse.java` — NO exponer bpmnXml por defecto
El XML puede ser largo. El DTO de respuesta normal NO incluye `bpmnXml`. Solo los endpoints específicos `/bpmn` lo devuelven.

#### 4.4 Inicialización del XML vacío
Cuando se crea una política nueva (POST /policies), el backend genera un BPMN XML inicial mínimo:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  targetNamespace="http://workflow-sistema/bpmn">
  <bpmn:process id="Process_{politicaId}" isExecutable="true">
  </bpmn:process>
  <bpmndi:BPMNDiagram>
    <bpmndi:BPMNPlane bpmnElement="Process_{politicaId}"/>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
```

### Cambios frontend

#### 4.5 `politica.service.ts` — 2 métodos nuevos
```typescript
getBpmn(id: string): Observable<{ bpmnXml: string }> {
  return this.http.get<{ bpmnXml: string }>(`${this.url}/${id}/bpmn`);
}
saveBpmn(id: string, bpmnXml: string): Observable<void> {
  return this.http.put<void>(`${this.url}/${id}/bpmn`, { bpmnXml });
}
```

#### 4.6 `flow-editor.component.ts` — reescritura completa (~300 líneas)

**Estructura del componente:**
```typescript
@Component({
  selector: 'app-flow-editor',
  standalone: true,
  template: `
    <div class="bpmn-shell">
      <div class="bpmn-toolbar"> ... </div>
      <div class="bpmn-container">
        <div #canvas class="bpmn-canvas"></div>
        <div class="bpmn-properties-panel" #propertiesPanel></div>
      </div>
      <div class="bpmn-statusbar"> ... </div>
    </div>
  `
})
export class FlowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef;
  @ViewChild('propertiesPanel') propertiesPanelRef!: ElementRef;
  
  private modeler!: BpmnModeler | BpmnViewer;
  private destroy$ = new Subject<void>();
  isDirty = false;
  isSaving = false;
  
  // Inicializar bpmn-js
  // Cargar XML desde GET /policies/{id}/bpmn
  // Auto-save con debounce 2s en commandStack.changed
  // Export .bpmn y .svg
  // Readonly mode si política no es BORRADOR
}
```

**Módulos bpmn-js activados:**
```typescript
const modeler = new BpmnModeler({
  container: canvasEl,
  propertiesPanel: { parent: propertiesPanelEl },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    WorkflowPropertiesProviderModule,  // ← nuestro módulo custom
    MinimapModule,
  ],
  moddleExtensions: {
    workflow: workflowModdleDescriptor  // ← define extensionElements propios
  }
});
```

#### 4.7 `WorkflowPropertiesProviderModule` — módulo Angular custom
Provee el panel de propiedades de negocio en el panel derecho de bpmn-js:
- **Nodo seleccionado (UserTask/ServiceTask)**: Rol responsable (select de roles), Formulario asociado (select de formularios), Tiempo límite (input número), SLA escalación (input número)
- **Nodo seleccionado (Gateway)**: Condición default
- **Sequence Flow**: Etiqueta, condición
- Carga los roles y formularios disponibles via `RoleService.getAll()` y `FormularioService.getAll()`

#### 4.8 `workflowModdleDescriptor.json` — define extensionElements
```json
{
  "name": "Workflow",
  "uri": "http://workflow-sistema/schema/1.0",
  "prefix": "workflow",
  "xml": { "tagAlias": "lowerCase" },
  "types": [
    {
      "name": "TaskConfig",
      "superClass": ["Element"],
      "properties": [
        { "name": "responsableRolId", "isAttr": true, "type": "String" },
        { "name": "formularioId", "isAttr": true, "type": "String" },
        { "name": "tiempoLimiteHoras", "isAttr": true, "type": "Integer" },
        { "name": "slaEscalacionHoras", "isAttr": true, "type": "Integer" }
      ]
    }
  ]
}
```

#### 4.9 Palette personalizada — mostrar solo elementos soportados
Ocultar de la palette por defecto los elementos BPMN que no soportamos aún (Intermediate Events, etc.). Mostrar solo:
- Start Event, End Event
- User Task, Service Task
- Exclusive Gateway, Parallel Gateway
- Sub Process, Call Activity
- Sequence Flow

#### 4.10 Toolbar de acciones
- Botón **Guardar** (Ctrl+S) → `modeler.saveXML()` → PUT /bpmn
- Botón **Importar .bpmn** → file input → `modeler.importXML()`
- Botón **Exportar .bpmn** → `modeler.saveXML()` → download file
- Botón **Exportar imagen** → `modeler.saveSVG()` → download SVG
- Botón **Ajustar vista** → `modeler.get('canvas').zoom('fit-viewport')`
- Indicador dirty + timestamp último guardado

#### 4.11 CSS de bpmn-js en `styles.css` global
```css
/* En src/styles.css — NO en el componente */
@import 'bpmn-js/dist/assets/bpmn-js.css';
@import 'bpmn-js/dist/assets/diagram-js.css';
@import 'bpmn-js-properties-panel/dist/assets/properties-panel.css';
@import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
@import 'bpmn-js-minimap/assets/css/bpmn-js-minimap.css';
```
Esto evita el error de budget de componente.

### Entregables Sprint 2.6
- [ ] `bpmnXml` en `Politica.java` + migration MongoDB no requerida (campo opcional)
- [ ] `GET /policies/{id}/bpmn` endpoint
- [ ] `PUT /policies/{id}/bpmn` endpoint
- [ ] BPMN XML inicial en `POST /policies`
- [ ] `politica.service.ts` con `getBpmn()` + `saveBpmn()`
- [ ] `flow-editor.component.ts` reescrito con bpmn-js
- [ ] `workflowModdleDescriptor.json` con propiedades de negocio
- [ ] `WorkflowPropertiesProvider` con campos de negocio
- [ ] Palette limitada a elementos soportados
- [ ] Import/export .bpmn desde toolbar
- [ ] Export SVG desde toolbar
- [ ] Auto-save 2s debounce
- [ ] CSS en `styles.css` global
- [ ] Readonly mode para políticas no BORRADOR
- [ ] Docker rebuild + verificación

### DoD Sprint 2.6
- El editor abre BPMN XML válido que puede abrirse en Camunda Modeler
- Se pueden colocar User Tasks, Gateways, Sub Processes, etc. con drag & drop
- Las propiedades de negocio se guardan en extensionElements y sobreviven save/load
- Undo/redo funciona sin código adicional (CommandStack)
- Import y export de archivos .bpmn funciona
- El minimap se muestra sin código adicional
- Zoom/pan con rueda y drag sin código adicional

### Riesgos Sprint 2.6
| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| bpmn-js no tiene tipado TypeScript nativo | Media | Crear `declare module 'bpmn-js'` con tipos mínimos |
| CSS de bpmn-js conflicta con Angular Material | Media | Aislar en `.bpmn-shell` con encapsulación ViewEncapsulation.None |
| El WorkflowPropertiesProvider es complejo | Alta | Empezar con campos simples (solo input text), luego mejorar |
| Docker build lento por nuevas dependencias | Baja | npm ci cachea capas |

---

## 5. Sprint 2.7 — bpmn-js Avanzado + Deprecar actividades

### Objetivo
Activar plugins avanzados, soportar elementos BPMN completos y deprecar formalmente la colección `actividades`.

### Dependencias adicionales
```json
"bpmn-js-token-simulation": "^0.x",
"bpmn-js-bpmnlint": "^0.x",
"bpmnlint": "^8.x",
"bpmnlint-plugin-camunda": "^0.x"
```

### Tareas backend
- `PoliticaRelacionController` → agregar header deprecation warning
- Evaluar si la colección `actividades` se elimina o se mantiene como índice (decisión de Sprint 3)

### Tareas frontend
- Activar `bpmn-js-token-simulation` para simulación visual paso a paso
- Activar `bpmn-js-bpmnlint` con reglas Camunda para validación
- Soportar en palette: Timer Events, Error Events, Message Events, Boundary Events
- Soportar Pools y Lanes BPMN reales (reemplaza la vista swimlane custom)
- Call Activity → property panel muestra selector de política existente del sistema
- Drill-down en Sub Process (navegación nativa de bpmn-js)
- Eliminar el toggle "vista grafo / vista swimlane" — ya no existe la vista custom

### Entregables
- Token simulation funciona (play/pause/reset)
- Linting BPMN con panel de errores
- Pools y lanes creables en el editor
- Call Activity referencia políticas del sistema
- Sub Process con drill-down navegable
- Eliminar `actividad.service.ts` del flow-editor definitivamente

---

## 6. Sprint 2.8 — dmn-js (Tablas de Decisión)

### Objetivo
Integrar tablas de decisión DMN para modelar condiciones complejas en gateways, en lugar de strings libres.

### Dependencias
```json
"dmn-js": "^14.x"
```

### Schema nuevo en MongoDB
```
Collection: decisiones
{
  _id,
  politicaId,       // referencia a la política
  gatewayId,        // ID del gateway en el BPMN XML
  nombre,
  dmnXml,           // DMN XML completo de la tabla
  estado,
  creadoPorId, creadoEn, actualizadoEn
}
```

### Tareas backend
- Nueva entidad `Decision.java`, `DecisionController.java`, `DecisionService.java`, `DecisionRepository.java`
- Endpoints: `GET/POST /policies/{id}/decisions`, `PUT/DELETE /policies/{id}/decisions/{decisionId}`
- El BPMN XML del gateway referencia la decisión via `extensionElements`:
  ```xml
  <bpmn:exclusiveGateway id="Gateway_1">
    <bpmn:extensionElements>
      <workflow:decisionRef decisionId="dec-abc123"/>
    </bpmn:extensionElements>
  </bpmn:exclusiveGateway>
  ```

### Tareas frontend
- Nuevo `DmnEditorComponent` wrapper de `dmn-js`
- Ruta: `/policies/:id/decisions/:decisionId`
- Property panel del Exclusive Gateway: botón "Abrir tabla DMN"
- `DecisionService` Angular para CRUD

---

## 7. Sprint 2.9 — form-js (Migración del Form Builder)

### Objetivo
Reemplazar el form builder Angular custom por form-js. Los formularios pasan a ser form-js schemas compatibles con el ecosistema Camunda.

### Dependencias
```json
"@bpmn-io/form-js": "^1.x",
"@bpmn-io/form-js-editor": "^1.x",
"@bpmn-io/form-js-viewer": "^1.x"
```

### Diferencia de schema

**Schema actual (custom):**
```json
{
  "secciones": [{
    "titulo": "Datos personales",
    "campos": [{
      "nombre": "nombre_completo",
      "etiqueta": "Nombre completo",
      "tipo": "TEXT",
      "obligatorio": true
    }]
  }]
}
```

**Schema form-js:**
```json
{
  "schemaVersion": 12,
  "type": "default",
  "components": [
    {
      "type": "group",
      "label": "Datos personales",
      "components": [
        {
          "type": "textfield",
          "key": "nombre_completo",
          "label": "Nombre completo",
          "validate": { "required": true }
        }
      ]
    }
  ]
}
```

### Mapeo de tipos de campo
| Campo actual | form-js type |
|---|---|
| TEXT | textfield |
| NUMBER | number |
| DATE | datetime |
| BOOLEAN | checkbox |
| SELECT | select |
| MULTISELECT | taglist |
| TEXTAREA | textarea |
| FILE | (custom component) |
| EMAIL | textfield + validate.pattern |

### Tareas backend
- `Formulario.java`: reemplazar `secciones: List<SeccionFormulario>` por `formJsSchema: String` (JSON)
- Mantener campo `secciones` como deprecated hasta que todos los formularios estén migrados
- Script de migración: convertir documentos existentes al nuevo schema

### Tareas frontend
- `form-builder.component.ts` → wrapper de `@bpmn-io/form-js-editor`
- `form-detail.component.ts` → wrapper de `@bpmn-io/form-js-viewer`
- CSS de form-js en `styles.css` global
- Property panel del User Task en bpmn-js: preview del formulario seleccionado

---

## 8. Sprint 2.10 — Colaboración + Panel IA

### Tareas backend
- WebSocket endpoint con Spring WebSocket + STOMP
- Endpoint SSE para presencia de usuarios activos en el editor
- Nuevo endpoint AI: `POST /ai/workflow/generate` → recibe descripción en texto, devuelve BPMN XML

### Tareas frontend
- Servicio Angular WebSocket para sincronizar cambios del editor en tiempo real
- Panel lateral de chat con historial de mensajes
- Indicadores de presencia (avatares de usuarios conectados al mismo editor)
- Botón "Generar con IA" → llama al ai-service, importa el XML resultante en bpmn-js

---

## 9. Orden de ejecución y dependencias

```
2.6 (bpmn-js base)
  └─ requiere: nada — puede empezar hoy
  └─ bloquea: 2.7, 2.8, 2.9, 2.10

2.7 (bpmn-js avanzado)
  └─ requiere: 2.6 completo
  └─ bloquea: Sprint 3 (motor leerá el BPMN con elementos avanzados)

2.8 (dmn-js)
  └─ requiere: 2.7 (Exclusive Gateway debe estar bien modelado)
  └─ bloquea: Sprint 3 (el motor evaluará tablas DMN)

2.9 (form-js)
  └─ requiere: 2.6 (property panel ya integrado)
  └─ paralelo con 2.8 (independientes entre sí)

2.10 (colaboración + IA)
  └─ requiere: 2.6 (el editor debe existir)
  └─ paralelo con 2.8 y 2.9

Sprint 3 (motor de trámites)
  └─ requiere: 2.7 mínimo (BPMN XML estable y completo)
```

---

## 10. Riesgos globales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| bpmn-js sin tipos TypeScript nativos | Medio | Crear `bpmn-js.d.ts` con tipos mínimos; usar `any` donde sea necesario |
| CSS de bpmn-js/form-js/dmn-js con Angular Material | Medio | Todo en `styles.css` global, ViewEncapsulation.None en componentes wrapper |
| WorkflowPropertiesProvider requiere API interna de bpmn-js | Alto | Basarse en ejemplos oficiales; probar con la versión específica instalada |
| Migración de schema de Formulario puede romper datos existentes | Alto | Mantener campo legacy `secciones` hasta verificar migración completa |
| El moddle descriptor mal formado hace crash el modeler | Alto | Validar JSON descriptor antes de cada render; test con XML simple |
| Sprint 3 parsea BPMN XML directamente (no hay librería Java BPMN simple) | Medio | Usar `flowable-bpmn-model` o `activiti-engine-bpmn-model` para parsear en Spring Boot |

---

## 11. Criterios de calidad (DoD global)

- [ ] Un diagrama creado en nuestro editor se puede abrir en Camunda Web Modeler sin errores
- [ ] Los extensionElements de negocio sobreviven import/export
- [ ] form-js viewer renderiza formularios asociados a User Tasks
- [ ] El modelo BPMN puede usarse como input al motor de Sprint 3
- [ ] Ningún sprint rompió auth, usuarios, roles ni la lista de políticas

---

## 12. Archivos a crear/modificar por sprint (checklist de agentes)

### Sprint 2.6 — archivos a tocar

**Backend (agente backend-spring):**
```
MODIFICAR:
  policies/Politica.java                     (+bpmnXml)
  policies/PoliticaResponse.java             (no exponer bpmnXml por defecto)
  policies/PoliticaController.java           (+2 endpoints /bpmn)
  policies/PoliticaService.java              (+getBpmn, saveBpmn, initBpmnXml en create)

CREAR:
  (ninguno nuevo)
```

**Frontend (agente frontend-angular):**
```
MODIFICAR:
  shared/services/politica.service.ts        (+getBpmn, saveBpmn)
  policies/flow-editor/flow-editor.component.ts   (REESCRIBIR con bpmn-js)
  src/styles.css                             (+imports CSS bpmn-js)
  package.json                               (+dependencias bpmn-js)

CREAR:
  shared/bpmn/workflow-moddle-descriptor.json
  shared/bpmn/workflow-properties-provider.ts
  shared/bpmn/workflow-properties-provider.module.ts
```
