# Plan Arquitectónico: Editor de Workflows BPMN
**Análisis Técnico Profundo y Propuesta Arquitectónica**

**Versión:** 1.0  
**Fecha:** 15 de abril de 2026  
**Estado:** Propuesta Técnica

---

## Contenido
1. [Diagnóstico del Estado Actual](#1-diagnóstico-del-estado-actual)
2. [Mapeo Actual vs BPMN](#2-mapeo-lo-actual-vs-nueva-base-bpmn)
3. [Arquitectura Objetivo](#3-arquitectura-objetivo-del-editor)
4. [Integración con bpmn-js](#4-estrategia-de-integración-con-bpmn-js)
5. [Panel de Propiedades](#5-panel-de-propiedades)
6. [Simulación](#6-simulación)
7. [Import / Export](#7-importación-y-exportación)
8. [BPMN Mínimo Viable](#8-soporte-bpmn-mínimo-viable)
9. [Extensiones de Negocio](#9-extensiones-personalizadas-de-negocio)
10. [Refactor por Etapas](#10-refactor-por-etapas)
11. [Criterios de Calidad](#11-criterios-de-calidad)
12. [Recomendación Ejecutiva](#12-decisión-final)

---

## 1. Diagnóstico del Estado Actual

### Estado de Implementación (Sprint 2.6 Completado)

#### ✅ Lo que está bien encaminado

**Frontend (flow-editor.component.ts)**
- ✅ Integración de `bpmn-js` Modeler ya implementada
- ✅ Switch Modeler/Viewer basado en estado de la Política (BORRADOR vs ACTIVA/INACTIVA)
- ✅ Canvas y propiedades panel estructurados correctamente
- ✅ Inicialización con módulos adicionales: minimap, token simulation, bpmnlint
- ✅ Auto-save con debounce de 2s
- ✅ Indicadores visuales: dirty flag, last saved, estado de publicación
- ✅ Soporte de teclado: Ctrl+S para guardar, Ctrl+Shift+H para fit viewport
- ✅ Manejo de Angular ChangeDetectorRef para sincronización UI
- ✅ Import/export de archivos .bpmn
- ✅ Exportación SVG del diagrama

**Backend (PoliticaService.java)**
- ✅ Campo `bpmnXml` en la entidad Politica
- ✅ Endpoints GET/PUT `/policies/{id}/bpmn` implementados
- ✅ Validación: solo editar BPMN en estado BORRADOR
- ✅ Inicialización automática de BPMN XML vacío al crear Política
- ✅ Método `buildInitialBpmnXml()` para crear diagrama base

**API (politica.service.ts)**
- ✅ Métodos `getBpmn()` y `saveBpmn()` expuestos
- ✅ Integración transparente con HTTP client

**Dependencias en package.json**
- ✅ bpmn-js@17.9.2
- ✅ bpmn-js-properties-panel@5.3.0
- ✅ @bpmn-io/properties-panel@3.25.0
- ✅ diagram-js-minimap@5.3.0
- ✅ bpmn-js-token-simulation@0.39.3
- ✅ bpmn-js-bpmnlint@0.24.0
- ✅ camunda-bpmn-moddle@7.0.1
- ✅ dmn-js@17.7.0 (listo para Sprint 2.8)

---

#### ⚠️ Lo que está parcialmente implementado

**Workflow-Moddle Descriptor**
- ⚠️ Se importa `workflow-moddle-descriptor.json` pero **no existe en las fuentes leídas**
- ⚠️ Necesario para serializar propiedades de negocio como extensiones BPMN
- **Acción:** Crear descriptor con propiedades: responsableRolId, formularioId, tiempoLimiteHoras, slaEscalacion

**Validación BPMN (bpmnlint)**
- ⚠️ Módulo cargado pero eventos no están siendo escuchados completamente
- ⚠️ Array `lintErrors` declarado pero no se muestra en UI
- **Acción:** Implementar panel lateral o tooltip con errores de validación

**Token Simulation**
- ⚠️ Botón toggle existe pero flag `simulationActive` es booleano simple
- ⚠️ No hay control de step/speed visible en la UI
- **Acción:** Agregar controles de ejecución (play, pause, step, reset)

---

#### ❌ Riesgos si continúa con implementación semi-custom

1. **Acoplamiento a bpmn-js incompleto**
   - Importa librerías pero no aprovecha 100% sus capacidades
   - Riesgo: Dificultad para actualizar bpmn-js en futuras versiones

2. **Propiedades de negocio sin estándar**
   - Sin moddle descriptor formal, extensiones pueden quedar mal serializadas
   - Riesgo: Archivos BPMN exportados podrían no abrirse en otras herramientas

3. **Falta de validación en UI**
   - bpmnlint activo pero errores no se muestran
   - Riesgo: Publicar diagramas inválidos sin feedback al usuario

4. **Sin panel contextual de edición**
   - Properties panel estándar pero sin customización para negocio
   - Riesgo: Campos de negocio (rol, formulario, SLA) ocupan espacio en propiedades BPMN estándar

5. **Simulación sin interactividad visual**
   - Token simulation cargado pero controles incompletos
   - Riesgo: No es evidente cómo usar simulación para demos y validación

---

### Conclusión Diagnóstico
**El editor ESTÁ BIEN FUNDAMENTADO en bpmn-js.** No requiere refactor de base, sino:
- Completar integración de las librerías ya presentes
- Formalizar extensiones de negocio
- Agregar interactividad y feedback visual
- Documentar estándares adoptados

---

## 2. Mapeo "Lo Actual vs Nueva Base BPMN"

### Tabla Completa: Funcionalidades

| Funcionalidad | Responsable BPMN | Status | Acción |
|---|---|---|---|
| **Renderizado canvas** | bpmn-js core | ✅ Implementado | Ninguna |
| **Zoom / Pan / Fit** | diagram-js | ✅ Implementado | Ninguna |
| **Selección elementos** | diagram-js | ✅ Implementado | Ninguna |
| **Undo / Redo** | commandStack (bpmn-js) | ✅ Built-in | Aprovechar automáticamente |
| **Importación XML** | bpmn-js.importXML() | ✅ Implementado | Ninguna |
| **Exportación XML** | bpmn-js.saveXML() | ✅ Implementado | Validar compatibilidad |
| **Read-only mode** | BpmnViewer | ✅ Implementado | Envolver en logic (estado BORRADOR) |
| **Minimap** | diagram-js-minimap | ✅ Implementado | **Todo:** Mostrar/ocultar en toolbar |
| **Validación BPMN** | bpmn-js-bpmnlint | ⚠️ Cargado, sin UI | **Crear panel errores** |
| **Token simulation** | bpmn-js-token-simulation | ⚠️ Cargado, sin controles | **Agregar stepper/controles** |
| **Guardar BPMN** | HTTP PUT backend | ✅ Implementado | Ninguna |
| **Cargar BPMN** | HTTP GET backend | ✅ Implementado | Ninguna |

---

### Tabla: Elementos BPMN Soportados

| Elemento | Soportado | Edición | Validación | Notas |
|---|---|---|---|---|
| **Start Event** | ✅ | ✅ | ⚠️ | bpmn-js paleta estándar; no es editable en propiedades |
| **End Event** | ✅ | ✅ | ⚠️ | idem |
| **User Task** | ✅ | ✅ | ✅ | Necesita extensión para responsableRolId, formularioId |
| **Service Task** | ✅ | ✅ | ⚠️ | No está usado; sin propiedades de negocio |
| **Exclusive Gateway** | ✅ | ✅ | ✅ | Necesita link a tabla DMN (Sprint 2.8) |
| **Parallel Gateway** | ✅ | ✅ | ⚠️ | Sin validación de sincronización |
| **Sub Process** | ✅ | ✅ | ⚠️ | Sin drill-down visual implementado |
| **Call Activity** | ✅ | ✅ | ❌ | Sin enlace a otra política del sistema |
| **Sequence Flow** | ✅ | ✅ | ✅ | Sin condiciones visuales en flecha |
| **Pools / Lanes** | ✅ | ✅ | ❌ | Sin modelo de responsabilidad |
| **Timer Boundary Event** | ⚠️ | ⚠️ | ❌ | No está en paleta |
| **Error Event** | ⚠️ | ⚠️ | ❌ | No está en paleta |
| **Message Event** | ⚠️ | ⚠️ | ❌ | No está en paleta |

---

### Decisiones: Qué Mantener / Refactor / Eliminar

| Componente | Decisión | Razón |
|---|---|---|
| **flow-editor.component.ts** | 🔄 Refactor | Completar manejo de eventos de bpmn-js; agregar error UI; integrar validación |
| **Actividad.service.ts** | 🗑️ Deprecar | No usarlo post Sprint 2.6; motor de trámites parsea directamente XML |
| **politica.service {getBpmn, saveBpmn}** | ✅ Mantener | API limpia, backend listo |
| **BpmnPropertiesPanel estándar** | 🔄 Extender | Agregar custom properties para negocio sin destruir BPMN estándar |
| **workflow-moddle-descriptor.json** | 🆕 Crear | Para serializar extensiones de forma correcta |
| **Token simulation toggle** | 🔄 Mejorar | Agregar controles de velocidad, step, reset |
| **bpmnlint** | 🔄 Integrar | Mostrar errores en panel lateral con feedback |
| **SVG export** | ✅ Mantener | Ya implementado, funcionando |
| **Auto-save debounce** | ✅ Mantener | Crítico para UX; ya bien hecho |

---

## 3. Arquitectura Objetivo del Editor

### Estructura en Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    FLOW EDITOR COMPONENT                     │
│                  (flow-editor.component.ts)                   │
├─────────────────────────────────────────────────────────────┤
│
│  ┌────────────────────────────────────────────────────────┐
│  │  CAPA 1: PRESENTACIÓN & CONTROL                        │
│  │  ───────────────────────────────────────────────────   │
│  │  - TopBar: guardar, exportar, simulación             │
│  │  - Canvas: renderizado bpmn-js                       │
│  │  - PropertiesPanel: edición propiedades               │
│  │  - StatusBar: indicadores dirty, versión             │
│  │  - Modal dialogs: confirmar acciones                 │
│  └────────────────────────────────────────────────────────┘
│                         ↓
│  ┌────────────────────────────────────────────────────────┐
│  │  CAPA 2: BPMN CORE (bpmn-js Engine)                   │
│  │  ───────────────────────────────────────────────────   │
│  │  - BpmnModeler: edición (BORRADOR)                   │
│  │  - BpmnViewer: lectura (ACTIVA/INACTIVA)             │
│  │  - diagram-js: canvas, zoom, pan, selección         │
│  │  - commandStack: undo/redo automático                │
│  │  - moddle: XML ↔ JS object mapping                   │
│  │  - palette: elementos BPMN                           │
│  │  - contextMenu: acciones en click derecho            │
│  └────────────────────────────────────────────────────────┘
│                         ↓
│  ┌────────────────────────────────────────────────────────┐
│  │  CAPA 3: PLUGINS DE BPMN-JS                           │
│  │  ───────────────────────────────────────────────────   │
│  │  - MinimapModule: vista miniatura                    │
│  │  - TokenSimulationModule: simulación paso a paso     │
│  │  - BpmnlintModule: validación BPMN                  │
│  │  - BpmnPropertiesPanelModule: propiedades            │
│  │  - BpmnPropertiesProviderModule: providers           │
│  │  - workflowModdleExtension: propiedades de negocio  │
│  └────────────────────────────────────────────────────────┘
│                         ↓
│  ┌────────────────────────────────────────────────────────┐
│  │  CAPA 4: INTEGRACIÓN CON BACKEND                      │
│  │  ───────────────────────────────────────────────────   │
│  │  - PoliticaService: {getBpmn, saveBpmn}             │
│  │  - RoleService: cargar roles para propiedades       │
│  │  - FormularioService: cargar formularios            │
│  │  - Auto-save: debounce de 2s + PUT HTTP            │
│  │  - Error handling: snackBar + logging               │
│  └────────────────────────────────────────────────────────┘
│                         ↓
│  ┌────────────────────────────────────────────────────────┐
│  │  CAPA 5: PERSISTENCIA                                 │
│  │  ───────────────────────────────────────────────────   │
│  │  - Backend: MongoDB field "bpmn_xml" en Politica     │
│  │  - Validación: solo guardar si estado === BORRADOR  │
│  │  - Inicialización: BPMN vacío al crear política      │
│  │  - Export: descarga .bpmn local                      │
│  │  - Import: carga desde archivo local                 │
│  └────────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────┘
```

---

### Responsabilidades por Capa

**CAPA 1: Presentación**
- Delega toda lógica BPMN a bpmn-js
- Mantiene estado local Angular (isDirty, lastSaved, editingName)
- Escucha eventos y sincroniza cambios
- Proporciona feedback visual (snackbar, spinner, indicadores)
- Maneja atajos de teclado

**CAPA 2: BPMN Core**
- Motor de edición / visualización BPMN
- Serialización XML ↔ objeto lógico
- Validación sintáctica de elements
- Undo/redo automático via commandStack
- No depende de backend ni propiedades de negocio

**CAPA 3: Plugins**
- Minimap: vista de navegación
- Token Simulation: ejecución paso a paso
- Linting: validación de patrones BPMN
- Properties Panel: UI para editar propiedades
- Moddle Extension: serialización de propiedades custom

**CAPA 4: Integración**
- Orquesta llamadas a backend
- Maneja lifecycle de carga/guardado
- Control de permisos y estado
- Enriquecimiento de datos (roles, formularios)

**CAPA 5: Persistencia**
- Backend almacena BPMN XML tal cual
- Validaciones de estado y permisos
- Inicialización de templates

---

### Flujo de Datos

```
USUARIO INICIA
    ↓
loadData() → GET /policies/{id} → obtener Politica
    ↓
initBpmnModeler() → instanciar BpmnModeler o BpmnViewer
    ↓
getBpmn(id) → GET /policies/{id}/bpmn → obtener BPMN XML
    ↓
modeler.importXML(xml) → parsea XML, renderiza en canvas
    ↓
[USUARIO EDITA]
    ↓
commandStack.changed → isDirty = true
    ↓
debounce 2s → autoSave()
    ↓
modeler.saveXML() → extrae XML serializado
    ↓
saveBpmn(id, xml) → PUT /policies/{id}/bpmn
    ↓
Backend: validar estado BORRADOR, guardar en MongoDB
    ↓
Response: OK → isDirty = false, lastSaved = now()
    ↓
[USUARIO EXPORTA]
    ↓
modeler.saveXML() → extrae XML
    ↓
Blob → descarga local {nombre-politica}.bpmn
    ↓
[USUARIO IMPORTA]
    ↓
selectFile → leer XML de archivo
    ↓
modeler.importXML(xml) → reemplaza diagrama
    ↓
autoSave() → persiste
```

---

## 4. Estrategia de Integración con bpmn-js

### Inicialización del Modeler

**Current State (Sprint 2.6):**
```typescript
// En initBpmnModeler()
const isReadOnly = this.politica?.estado !== 'BORRADOR';

if (isReadOnly) {
  this.modeler = new BpmnViewer({
    container: this.canvasRef.nativeElement,
    additionalModules: [MinimapModule]
  });
} else {
  this.modeler = new BpmnModeler({
    container: this.canvasRef.nativeElement,
    propertiesPanel: {
      parent: this.propertiesRef.nativeElement
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      MinimapModule,
      TokenSimulationModule,
      BpmnlintModule
    ],
    linting: { active: true },
    moddleExtensions: {
      workflow: workflowDescriptor
    }
  });
}
```

**Propuesta de Mejora:**
1. Extraer configuración a una constante/factory
2. Agregar custom palette provider
3. Agregar custom context menu
4. Manejar errores de deserialización
5. Inicializar simulación en estado inicial (no activa)

**Factory Pattern:**
```typescript
private createModelerConfig(): any {
  return {
    container: this.canvasRef.nativeElement,
    propertiesPanel: {
      parent: this.propertiesRef.nativeElement
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      MinimapModule,
      TokenSimulationModule,
      BpmnlintModule,
      // Custom modules (futuros)
      // WorkflowPaletteModule,
      // WorkflowContextMenuModule
    ],
    linting: {
      active: true,
      // linter rules configuration
    },
    moddleExtensions: {
      workflow: workflowDescriptor,
      // camunda: camundaDescriptor (opcional para Sprint 2.8+)
    },
    // Keyboard shortcuts
    keyboard: {
      bindTo: document // Allow global shortcuts
    }
  };
}
```

---

### Manejo de Eventos del Command Stack

**Implementación mejorada:**
```typescript
// En initBpmnModeler()
if (!isReadOnly) {
  const commandStack = this.modeler.get('commandStack');
  
  // Event: cambio en el diagrama
  commandStack.on('commandStack.changed', () => {
    this.isDirty = true;
    this.autoSave$.next(); // Dispara debounce
    this.cdr.detectChanges();
  });

  // Event: undo/redo
  commandStack.on('commandStack.redo.executed', () => {
    this.logChange('REDO');
  });
  commandStack.on('commandStack.undo.executed', () => {
    this.logChange('UNDO');
  });

  // Event: selección
  this.modeler.on('selection.changed', (e: any) => {
    const selected = e.newSelection[0];
    if (selected) {
      this.selectedElement = {
        id: selected.id,
        type: selected.type,
        businessObject: selected.businessObject
      };
    }
  });

  // Event: validación
  this.modeler.on('linting.completed', (e: any) => {
    this.lintErrors = this.extractLintIssues(e);
    this.cdr.detectChanges();
  });
}
```

---

### Import / Export XML

**Guardado con formato limpio:**
```typescript
private async saveToBackend(politicaId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    this.modeler.saveXML({ format: true })
      .then(({ xml }: { xml: string }) => {
        // XML está formateado, bien indentado
        this.politicaService.saveBpmn(politicaId, xml)
          .subscribe({
            next: () => {
              this.isDirty = false;
              this.lastSaved = new Date();
              resolve();
            },
            error: (err) => {
              this.snackBar.open('Error guardando diagrama', 'Cerrar');
              reject(err);
            }
          });
      })
      .catch((err: any) => {
        console.error('Error serializando BPMN:', err);
        reject(err);
      });
  });
}
```

**Import con validación:**
```typescript
private async importBpmnFile(xml: string): Promise<void> {
  try {
    // Validar que es XML válido
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('XML inválido');
    }

    // Importar en modeler
    await this.modeler.importXML(xml);
    
    // Fit viewport
    this.modeler.get('canvas').zoom('fit-viewport');
    
    // Mark as dirty para auto-save
    this.isDirty = true;
    this.autoSave$.next();
    
    this.snackBar.open('Diagrama importado ✓', 'Cerrar', { duration: 3000 });
  } catch (err: any) {
    this.snackBar.open(`Error importando: ${err.message}`, 'Cerrar', { duration: 4000 });
    console.error('Import error:', err);
  }
}
```

---

### Versionado del Diagrama

**Estrategia propuesta:**
- Cada cambio de perspectiva (publicar, hacer nueva versión) crea snapshot
- Backend guarda cada `bpmnXml` en collection `bpmn_versions` con timestamp
- Frontend permite revertir a versión anterior sin loss of data

```typescript
// Backend: 
saveBpmnVersion(politicaId: string, versionNumber: int, bpmnXml: string);

// Frontend:
viewVersion(versionId: string): void {
  // Mostrar versión anterior sin permitir editar
  // Opción: "Revertir a esta versión"
}
```

---

## 5. Panel de Propiedades

### Arquitectura del Panel

El panel de propiedades debe separar claramente:
1. **Propiedades BPMN estándar** → handled by bpmn-js-properties-panel
2. **Propiedades de Camunda** → via camunda-bpmn-moddle (opcional)
3. **Propiedades de negocio** → via workflow-moddle-descriptor (custom)

**Estructura recomendada:**

```
┌──────────────────────────────┐
│   Properties Panel (bpmn-js) │
├──────────────────────────────┤
│                              │
│  [PESTAÑA] PROPERTIES        │
│  ───────────────────────     │
│  • id: Task_1234             │
│  • name: Revisar Solicitud   │
│  • type: bpmn:UserTask       │
│                              │
│  [PESTAÑA] BUSINESS DATA     │
│  ───────────────────────     │
│  • Responsable Rol:          │
│    [Dropdown: Inspector]     │
│  • Formulario Asociado:      │
│    [Dropdown: Frm_001]       │
│  • Tiempo Límite (horas):    │
│    [Input: 24]               │
│  • SLA Escalación (horas):   │
│    [Input: 48]               │
│                              │
│  [PESTAÑA] ADVANCED          │
│  ───────────────────────     │
│  • Grupo Asignación:         │
│    [Text]                    │
│  • Reintentos:               │
│    [Input: 3]                │
│
└──────────────────────────────┘
```

---

### Workflow-Moddle Descriptor

**Archivo a crear:** `frontend/src/app/shared/bpmn/workflow-moddle-descriptor.json`

```json
{
  "name": "Workflow",
  "uri": "http://workflow-sistema/schema/1.0",
  "prefix": "workflow",
  "associations": [],
  "types": [
    {
      "name": "TaskConfig",
      "extends": ["bpmn:UserTask"],
      "properties": [
        {
          "name": "responsableRolId",
          "type": "String",
          "description": "ID del rol responsable de ejecutar esta tarea",
          "isAttr": false
        },
        {
          "name": "formularioId",
          "type": "String",
          "description": "ID del formulario a mostrar en esta tarea",
          "isAttr": false
        },
        {
          "name": "tiempoLimiteHoras",
          "type": "Integer",
          "description": "Tiempo máximo para completar la tarea en horas",
          "isAttr": false
        },
        {
          "name": "slaEscalacion",
          "type": "Integer",
          "description": "Tiempo de escalación automática en horas",
          "isAttr": false
        },
        {
          "name": "grupoAsignacion",
          "type": "String",
          "description": "Grupo alternativo de asignación si rol no disponible",
          "isAttr": false
        },
        {
          "name": "reintentos",
          "type": "Integer",
          "default": 3,
          "description": "Número máximo de reintentos en caso de error",
          "isAttr": false
        }
      ]
    },
    {
      "name": "GatewayConfig",
      "extends": ["bpmn:ExclusiveGateway"],
      "properties": [
        {
          "name": "decisionTableId",
          "type": "String",
          "description": "ID de la tabla DMN asociada para evaluación de reglas",
          "isAttr": false
        },
        {
          "name": "defaultPath",
          "type": "String",
          "description": "Identificador del flujo por defecto si no hay coincidencia",
          "isAttr": false
        }
      ]
    },
    {
      "name": "ProcessConfig",
      "extends": ["bpmn:Process"],
      "properties": [
        {
          "name": "tiempoLimiteDias",
          "type": "Integer",
          "description": "SLA total del proceso en días",
          "isAttr": false
        },
        {
          "name": "departamento",
          "type": "String",
          "description": "Departamento responsable del proceso",
          "isAttr": false
        },
        {
          "name": "version",
          "type": "Integer",
          "description": "Versión del workflow",
          "isAttr": false
        }
      ]
    }
  ]
}
```

---

### Custom Properties Provider

**Crear:** `frontend/src/app/shared/bpmn/workflow-properties-provider.ts`

```typescript
import { WorkflowPropertiesProvider as BaseProvider } from 'bpmn-js-properties-panel/lib/provider/camunda';

export class WorkflowPropertiesProvider extends BaseProvider {
  constructor(eventBus: any, canvas: any, translate: any) {
    super(eventBus, canvas, translate);
  }

  getGroups(element: any): any[] {
    const groups = super.getGroups(element);

    // Agregar grup custom para elementos UserTask
    if (element.type === 'bpmn:UserTask') {
      groups.push({
        id: 'workflowTaskConfig',
        label: 'Business Config',
        entries: this.getTaskConfigEntries(element)
      });
    }

    // Agregar grupo custom para ExclusiveGateway
    if (element.type === 'bpmn:ExclusiveGateway') {
      groups.push({
        id: 'workflowGatewayConfig',
        label: 'Decision Rule',
        entries: this.getGatewayConfigEntries(element)
      });
    }

    return groups;
  }

  private getTaskConfigEntries(element: any): any[] {
    return [
      {
        id: 'responsableRolId',
        label: 'Responsible Role',
        modelProperty: 'responsableRolId',
        type: 'select',
        options: [], // Cargar dinámicamente desde RoleService
        widget: 'select'
      },
      {
        id: 'formularioId',
        label: 'Associated Form',
        modelProperty: 'formularioId',
        type: 'select',
        options: [], // Cargar dinámicamente desde FormularioService
        widget: 'select'
      },
      {
        id: 'tiempoLimiteHoras',
        label: 'Time Limit (hours)',
        modelProperty: 'tiempoLimiteHoras',
        type: 'textfield',
        widget: 'textfield'
      },
      {
        id: 'slaEscalacion',
        label: 'Escalation SLA (hours)',
        modelProperty: 'slaEscalacion',
        type: 'textfield',
        widget: 'textfield'
      }
    ];
  }

  private getGatewayConfigEntries(element: any): any[] {
    return [
      {
        id: 'decisionTableId',
        label: 'Decision Table (DMN)',
        modelProperty: 'decisionTableId',
        type: 'select',
        options: [], // Cargar tabla DMN disponibles (Sprint 2.8)
        widget: 'select'
      }
    ];
  }
}
```

---

## 6. Simulación

### Niveles de Simulación

**Nivel 1: Visual Token Simulation (Ya implementado)**
- bpmn-js-token-simulation
- Muestra movimiento de token step-by-step
- No evalúa lógica real, solo sigue flujo visual
- Útil para: demo, aprendizaje, validación de grafo

**Nivel 2: Simulation con Lógica Básica (Sprint 2.7+)**
- Evaluación de Exclusive Gateway conditions
- Seguimiento de variables simples
- Detección de deadlocks (parallelismo sin sincronización)
- Útil para: validar correctitud de decisiones

**Nivel 3: Ejecución Real del Motor (Sprint 3)**
- Motor interpreta BPMN XML
- Instancia actividades según flujo
- Maneja timers, errores, reintentos
- Asigna responsables y crea formularios
- Útil para: ejecutar procesos reales en producción

---

### Mejoras a Token Simulation (Sprint 2.7)

**Current State:**
- Botón toggle simple
- Sin control de velocidad / pausa / reset
- Sin indicadores visuales del token actual

**Propuesta:**
```html
<!-- Toolbar mejorado para simulación -->
<div class="simulation-bar" *ngIf="simulationActive">
  <button mat-icon-button (click)="simulationPause()" [title]="'Pausa'">
    <mat-icon>pause</mat-icon>
  </button>
  <button mat-icon-button (click)="simulationStep()" [title]="'Siguiente paso'">
    <mat-icon>skip_next</mat-icon>
  </button>
  
  <mat-form-field appearance="outline" class="sim-speed">
    <mat-label>Velocidad</mat-label>
    <mat-select [(ngModel)]="simulationSpeed">
      <mat-option value="slow">Lenta (2s)</mat-option>
      <mat-option value="normal">Normal (800ms)</mat-option>
      <mat-option value="fast">Rápida (300ms)</mat-option>
    </mat-select>
  </mat-form-field>

  <span class="sim-state">{{ simulationState }}</span>
  
  <button mat-icon-button (click)="simulationReset()" [title]="'Reiniciar'">
    <mat-icon>restart_alt</mat-icon>
  </button>
  <button mat-icon-button color="warn" (click)="toggleSimulation()" [title]="'Salir simulación'">
    <mat-icon>close</mat-icon>
  </button>
</div>
```

---

### Diferencia: Simulación vs Ejecución

| Aspecto | Simulación Visual | Ejecución Real |
|---|---|---|
| **Qué evalúa** | Solo estructura BPMN, flujo visual | Lógica completa, valores, reglas |
| **Dónde se ejecuta** | En el navegador (canvas) | En backend (motor workflow) |
| **Datos de prueba** | Ficticios o vacíos | Datos reales de trámite |
| **Efectos secundarios** | Ninguno | Crea instancias, registros, notificaciones |
| **Cuándo se usa** | Antes de publicar la política | Durante ejecución de trámite |
| **Responsable** | Frontend (bpmn-js-token-simulation) | Backend (motor Sprint 3) |

---

## 7. Importación y Exportación

### Flujos de Import/Export

```
USUARIO PRESIONA "Importar .BPMN"
    ↓
[File Dialog] Selecciona archivo .bpmn
    ↓
Leer archivo como texto (FileReader.readAsText)
    ↓
Validar XML (parseInt, DOMParser)
    ↓
modeler.importXML(xml)
    ↓
[Éxito] diagrama reemplazado, auto-save en 2s
[Error] Mostrar error con detalles
    ↓
---

USUARIO PRESIONA "Exportar .BPMN"
    ↓
modeler.saveXML({ format: true })
    ↓
Crear Blob(xml, 'application/xml')
    ↓
Descargar: {nombre-politica}.bpmn
    ↓
---

USUARIO PRESIONA "Exportar SVG"
    ↓
modeler.saveSVG()
    ↓
Crear Blob(svg, 'image/svg+xml')
    ↓
Descargar: {nombre-politica}.svg
```

---

### Interoperabilidad con Herramientas del Ecosistema

**Objetivo:** El BPMN exportado debe abrirse en:
- ✅ Camunda Modeler
- ✅ bpmn.io
- ✅ Otros editores BPMN estándar

**Requisitos:**
1. BPMN válido según especificación OASIS 2.0
2. Extensiones custom preferentemente en `<extensionElements>` 
3. Evitar atributos propietarios
4. Documentar mapping de campos

**Validación de interoperabilidad:**
```bash
# Después de exportar {file}.bpmn:
1. Abrir en Camunda Modeler
2. Abrir en bpmn.io
3. Verificar que elementos se cargan correctamente
4. Verificar que propiedades se preservan (si tenemos extensiones)
```

**Ejemplo de XML exportado (esperado):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                   xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                   xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                   xmlns:workflow="http://workflow-sistema/schema/1.0"
                   id="Definitions_123">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
    <bpmn:userTask id="Task_1" name="Revisar">
      <bpmn:extensionElements>
        <workflow:taskConfig
          responsableRolId="rol-inspector"
          formularioId="form-001"
          tiempoLimiteHoras="24"/>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <!-- ... resto del diagrama ... -->
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <!-- ... información de layout visual ... -->
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
```

---

## 8. Soporte BPMN Mínimo Viable

### Conjunto de Elementos Recomendados para MVP

| Elemento | Priority | Sprint | Notas |
|---|---|---|---|
| **Start Event** | MUST | 2.6 | Punto entrada del flujo |
| **End Event** | MUST | 2.6 | Punto salida del flujo |
| **User Task** | MUST | 2.6 | Tarea humana (más común) |
| **Service Task** | SHOULD | 2.7 | Tarea automática (integraciones) |
| **Exclusive Gateway** | MUST | 2.6 | Decisión (if/else) |
| **Parallel Gateway** | SHOULD | 2.7 | Paralelismo (fork/join) |
| **Sub Process** | SHOULD | 2.7 | Flujo anidado |
| **Call Activity** | COULD | 2.9 | Invocar otra política |
| **Sequence Flow** | MUST | 2.6 | Conexiones entre elementos |
| **Boundary Error Event** | COULD | 2.8 | Manejo de errores |
| **Timer Boundary Event** | COULD | 2.8 | Timeouts (SLA) |
| **Message Event** | COULD | 2.9 | Comunicación inter-procesos |
| **Pools** | WONT | 3+ | No necesario inicialmente |
| **Lanes** | WONT | 3+ | No necesario inicialmente |

---

### Elementos a Soportar en Sprint 2.6 (Mínimo)

```
✅ Start Event
   • No tiene propiedades de negocio
   • Siempre hay exactamente uno por proceso

✅ End Event
   • Termina el flujo
   • Puede haber múltiples

✅ User Task
   • Propiedades: nombre, descripción
   • Extensiones: responsableRolId, formularioId, tiempoLimite, slaEscalacion
   • Sin formularios inline BPMN (referencia por ID)

✅ Exclusive Gateway
   • Decisión binaria o multi-rama
   • Propiedades: nombre, descripción
   • Extensiones: decisionTableId (referencia a tabla DMN)
   • Condiciones en sequence flows (textos descriptivos)

✅ Sequence Flow
   • Conexión dirigida
   • Propiedades: nombre, condición (texto)
   • Sin expresiones XPath (para Sprint 3+)
```

---

### Elementos a Postergar

| Elemento | Razón | Consideraciones |
|---|---|---|
| **Message Flow** | Requiere múltiples procesos / pools | Implementar en Sprint 2.9 cuando Call Activity esté maduro |
| **Message Event** | Espera eventos externos | Requiere infraestructura de eventos (Kafka, RabbitMQ) |
| **Intermediate Events** | Flujo complejo | No es crítico para MVP |
| **Error Event** | Manejo de excepciones avanzado | Será soporte en Sprint 2.8 |
| **Compensation** | Rollback de transacciones | Fuera de alcance inicial |
| **Complex Gateway** | Lógica condicional avanzada | XOR es suficiente |

---

## 9. Extensiones Personalizadas de Negocio

### Estrategia de Extensiones BPMN

**Principio:** Mantener BPMN válido, agregar propiedades como extensiones sin romper especificación.

---

### Propiedades por Tipo de Elemento

**User Task (ext: Tarea humana)**
```xml
<bpmn:userTask id="Task_AprobacionSolicitud" name="Aprobar Solicitud">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
  
  <!-- Extensión de negocio -->
  <bpmn:extensionElements>
    <workflow:taskConfig xmlns:workflow="http://workflow-sistema/schema/1.0">
      <workflow:responsableRolId>rol-inspector-001</workflow:responsableRolId>
      <workflow:formularioId>form-solicitud-001</workflow:formularioId>
      <workflow:tiempoLimiteHoras>24</workflow:tiempoLimiteHoras>
      <workflow:slaEscalacion>48</workflow:slaEscalacion>
      <workflow:grupoAsignacion>admin-fallback</workflow:grupoAsignacion>
      <workflow:reintentos>3</workflow:reintentos>
    </workflow:taskConfig>
  </bpmn:extensionElements>
</bpmn:userTask>
```

**Exclusive Gateway (ext: Decisión con tabla DMN)**
```xml
<bpmn:exclusiveGateway id="Gateway_Decision" name="¿Solicitud aprobada?">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:outgoing>Flow_Approved</bpmn:outgoing>
  <bpmn:outgoing>Flow_Rejected</bpmn:outgoing>
  
  <bpmn:extensionElements>
    <workflow:gatewayConfig xmlns:workflow="http://workflow-sistema/schema/1.0">
      <workflow:decisionTableId>dmn-evaluation-criteria</workflow:decisionTableId>
      <workflow:defaultPath>Flow_Rejected</workflow:defaultPath>
    </workflow:gatewayConfig>
  </bpmn:extensionElements>
</bpmn:exclusiveGateway>
```

**Service Task (ext: Integración automática)**
```xml
<bpmn:serviceTask id="Task_SendEmail" name="Enviar Notificación">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
  
  <bpmn:extensionElements>
    <workflow:serviceConfig xmlns:workflow="http://workflow-sistema/schema/1.0">
      <workflow:integracion>email-service</workflow:integracion>
      <workflow:template>notificacion-aprobacion</workflow:template>
      <workflow:reintentos>5</workflow:reintentos>
      <workflow:timeoutMs>30000</workflow:timeoutMs>
    </workflow:serviceConfig>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

**Process (ext: Metadatos del flujo)**
```xml
<bpmn:process id="Process_main" name="Solicitud de Permiso" isExecutable="true">
  <bpmn:extensionElements>
    <workflow:processConfig xmlns:workflow="http://workflow-sistema/schema/1.0">
      <workflow:tiempoLimiteDias>30</workflow:tiempoLimiteDias>
      <workflow:departamento>RRHH</workflow:departamento>
      <workflow:version>1</workflow:version>
      <workflow:slaEscalacionAutomatica>true</workflow:slaEscalacionAutomatica>
    </workflow:processConfig>
  </bpmn:extensionElements>
  
  <!-- elementos del proceso -->
</bpmn:process>
```

---

### Mapping: Propiedades Workflow → BPMN Extensión

| Propiedad de Sistema | Elemento BPMN | Ubicación Extensión | Tipo |
|---|---|---|---|
| `Politica.tiempoLimiteDias` | Process | processConfig.tiempoLimiteDias | Integer |
| `Actividad.responsableRolId` | UserTask | taskConfig.responsableRolId | String (roleId) |
| `Actividad.formularioId` | UserTask | taskConfig.formularioId | String (formId) |
| `Actividad.tiempoLimiteHoras` | UserTask | taskConfig.tiempoLimiteHoras | Integer |
| `Actividad.SLA Escalación` | UserTask | taskConfig.slaEscalacion | Integer |
| `Decision.tableId` | ExclusiveGateway | gatewayConfig.decisionTableId | String (dmnId) |
| `Decision.defaultPath` | ExclusiveGateway | gatewayConfig.defaultPath | String (flowId) |
| `ServiceTask.integration` | ServiceTask | serviceConfig.integracion | String |
| `Transicion.condicion` | SequenceFlow | name+ description | String |

---

### Deserialization: XML → Objeto Lógico

**En backend (Sprint 3, Motor de Trámites):**
```java
public class BpmnParser {
  
  // Parsear propiedades de negocio desde BPMN XML
  public TaskConfig extractTaskConfig(Element userTaskElement) {
    Element ext = userTaskElement.getFirstChildElement("extensionElements");
    Element taskConfig = ext.getFirstChildElement("taskConfig", WorkflowNamespace);
    
    if (taskConfig == null) {
      return TaskConfig.builder()
        .responsableRolId(null)
        .formularioId(null)
        .tiempoLimiteHoras(null)
        .build();
    }
    
    return TaskConfig.builder()
      .responsableRolId(taskConfig.getTextContent("responsableRolId"))
      .formularioId(taskConfig.getTextContent("formularioId"))
      .tiempoLimiteHoras(Integer.parseInt(
        taskConfig.getTextContent("tiempoLimiteHoras", "0")))
      .slaEscalacion(Integer.parseInt(
        taskConfig.getTextContent("slaEscalacion", "0")))
      .build();
  }
  
  // Similar para Gateway, Process, ServiceTask
}
```

---

## 10. Refactor por Etapas

### Plan Detallado de Implementación

#### **Etapa 1: Quick Wins (Semana 1)**
**Duración:** 2-3 días  
**Objetivo:** Completar integraciones ya parcialmente hechas

**Tareas:**
1. [ ] **Crear workflow-moddle-descriptor.json**
   - Definir tipos: TaskConfig, GatewayConfig, ProcessConfig
   - Documentar propiedades de negocio
   - Archivo: `frontend/src/app/shared/bpmn/workflow-moddle-descriptor.json`

2. [ ] **Mejorar manejo de eventos BPMN**
   - Agregar listeners para: selection, linting, simulation
   - Actualizar componente con state para lintErrors
   - Crear método `extractLintIssues(event)` 

3. [ ] **Implementar panel de validación**
   - Mostrar errores de bpmnlint en UI (badge count)
   - Opción: expandir panel lateral con lista de errores
   - Click en error → scroll y select elemento

4. [ ] **Mejorar token simulation**
   - Agregar toolbar con: pause, step, speed, reset
   - Indicador de estado actual (nodo activo, variables)
   - Cosmética: más visible y controles intuitivos

**Entregables:**
- ✅ BPMN válido exportable a Camunda Modeler
- ✅ Validación visual en editor
- ✅ Simulación mejorada con controles

**Riesgos:**
- Descriptor JSON con sintaxis incorrecta → propiedades no se serializan
- **Mitigación:** Validar con herramienta bpmn-js-modeler test

---

#### **Etapa 2: Refactor Base (Semana 2)**
**Duración:** 3-4 días  
**Objetivo:** Limpiar y documentar arquitectura

**Tareas:**
1. [ ] **Refactor de flow-editor.component.ts**
   - Extraer configuración a factory method
   - Extraer listeners a métodos privados named
   - Separar concerns: state management, BPMN core, services
   - Agregar JSDoc completo

2. [ ] **Crear moddle extension completa**
   - Implementar WorkflowPropertiesProvider
   - Cargar roles dinámicamente en dropdowns
   - Cargar formularios dinámicamente en dropdowns
   - Versionado de descriptor

3. [ ] **Documentar API REST**
   - Contrato GET /policies/{id}/bpmn
   - Contrato PUT /policies/{id}/bpmn
   - Ejemplos de request/response
   - Validaciones de backend

4. [ ] **Testing básico**
   - Unit tests para parseo de moddle descriptor
   - E2E: importar BPMN, editar propiedades, exportar, verificar XML
   - Tests de validación (linting)

**Entregables:**
- ✅ Código limpio, documentado, testeable
- ✅ API contracts públicos y claros
- ✅ Cobertura de tests 70%+

**Riesgos:**
- Refactor puede romper flujos existentes
- **Mitigación:** Branch de feature, tests en verde antes de merge

---

#### **Etapa 3: Integración BPMN Real (Semana 3)**
**Duración:** 2-3 días  
**Objetivo:** Asegurar BPMN estándar compatible

**Tareas:**
1. [ ] **Validación de interoperabilidad**
   - Exportar diagrama desde editor
   - Abrir en Camunda Modeler → verificar carga correcta
   - Abrir en bpmn.io → verificar carga correcta
   - Editar en Camunda, importar en nuestro editor → round-trip

2. [ ] **Soporte de elementos completo**
   - Start Event ✅ ya funciona
   - End Event ✅ ya funciona
   - User Task ✅ + properties custom
   - Service Task ✅ + properties custom
   - Exclusive Gateway ✅ + reference a DMN
   - Parallel Gateway ✅ + validación
   - Sequence Flow ✅ + condiciones

3. [ ] **Palette customizada**
   - Mostrar solo elementos soportados
   - Ocultar elementos no soportados (p.e., Message Flow)
   - Agregar categorías (Basic, Gateway, Advanced)
   - Tooltips descriptivos

4. [ ] **Error handling mejorado**
   - Catch errores de importXML
   - Mostrar mensajes claros al usuario
   - Log detallado para debugging

**Entregables:**
- ✅ BPMN exportado abre en Camunda Modeler sin errores
- ✅ Paleta clara y controlada
- ✅ Errores bien documentados y recuperables

**Riesgos:**
- Incompatibilidades con versiones de bpmn-js
- **Mitigación:** Pin de versiones, tests de interoperabilidad en CI/CD

---

#### **Etapa 4: Propiedades (Semana 3-4)**
**Duración:** 2-3 días  
**Objetivo:** Panel de propiedades profesional

**Tareas:**
1. [ ] **Properties panel estándar**
   - ✅ Ya implementado (bpmn-js-properties-panel)
   - Verificar que muestra propiedades BPMN correctas
   - Agregar ayuda/tooltips para cada propiedad

2. [ ] **Properties custom (negocio)**
   - Implementar segundo tab "Business Config"
   - Dropdowns dinámicos para roles y formularios
   - Validación de valores
   - Aplicar sobre User Task, Service Task, Gateway

3. [ ] **Gestión de valores**
   - Persist propiedades en extensionElements
   - Auto-save después de cambios
   - Validar que valores existen (rol existe, form existe)
   - Mostrar warnings de valores no encontrados

4. [ ] **Documentación**
   - Guía: ¿Cómo asignar un formulario a una tarea?
   - Guía: ¿Cómo usar tabla DMN en gateway?
   - Ejemplos visuales en modal de ayuda

**Entregables:**
- ✅ Properties panel profesional con 2 tabs
- ✅ Dropdowns dinámicos sincronizados con backend
- ✅ Documentación clara para usuarios

**Riesgos:**
- Performance si hay muchos roles/formularios
- **Mitigación:** Lazy load, caching, paginación en dropdowns

---

#### **Etapa 5: Simulación (Sprint 2.7)**
**Duración:** 2-3 días  
**Objetivo:** Simulación avanzada con controles

**Tareas:**
1. [ ] **Mejorar UI de token simulation**
   - Toolbar separado con controles
   - Speed control (slow, normal, fast)
   - Botones: play, pause, step, reset
   - Indicador de nodo actual

2. [ ] **Lógica de evaluación básica**
   - Exclusive Gateway: mostrar condición evaluada
   - Variable tracking (simple): mostrar valores
   - Detectar ciclos infinitos → break automático

3. [ ] **Integración con propiedades**
   - Mostrar valores de tiempo limite durante simulación
   - Simular timeouts visualmente
   - Estado de asignación (quién ejecutaría la tarea)

4. [ ] **Exportación de reporte de simulación**
   - Generar reporte: nodos visitados, tiempos, decisiones
   - Descarga como PDF o JSON
   - Útil para validación de flujo

**Entregables:**
- ✅ Simulación visual interactiva
- ✅ Validación de flujos sin ejecutar
- ✅ Reporte exportable

---

#### **Etapa 6: Interoperabilidad (Sprint 2.7)**
**Duración:** 1-2 días  
**Objetivo:** Asegurar compatibilidad bidireccional

**Tareas:**
1. [ ] **Round-trip testing**
   - Crear diagrama en nuestro editor
   - Exportar .bpmn
   - Abrir en Camunda Modeler
   - Editar (agregar elemento, cambiar nombre)
   - Exportar desde Camunda
   - Importar en nuestro editor
   - Verificar: estructura, propiedades, layout

2. [ ] **Manejo de layout**
   - bpmn.io trae información de coordenadas en `BPMNDiagram`
   - Nuestro editor preserva layout al exportar/importar
   - Archivos creados en Camunda Modeler tienen layout automático

3. [ ] **Documentación de formato**
   - Describir schema BPMN esperado
   - Listar extensiones soportadas
   - Validación de compatibilidad

**Entregables:**
- ✅ Especificación de BPMN soportado
- ✅ Testsuite de round-trip
- ✅ Documentación de interoperabilidad

---

### Timeline Estimado

```
Abril 2026:
  ├─ Semana 1 (15-19): Etapa 1 (Quick Wins) ✓ Sprint 2.6 completado
  ├─ Semana 2 (22-26): Etapa 2 (Refactor Base)
  ├─ Semana 3 (29-30): Etapa 3 + Etapa 4 (BPMN + Properties)
  
Mayo 2026:
  ├─ Semana 1 (1-3): Etapa 5 + Etapa 6 (Simulation + Interop)
  ├─ Semana 2-3 (6-17): Sprint 2.8 (dmn-js integration)
  └─ Semana 4 (20-24): Sprint 2.9 (form-js integration)
```

---

## 11. Criterios de Calidad

### Checklist de Aceptación

#### ✅ Formato BPMN Válido
- [ ] Archivo exportado pasa validación XML (parser bien-formado)
- [ ] Archivo exportado pasa validación BPMN XML Schema
- [ ] Herramienta bpmn-linter no reporta errores críticos
- [ ] Archivo abre en Camunda Modeler sin advertencias

#### ✅ No Rompe Especificación BPMN
- [ ] Elementos BPMN tienen namespaces correctos
- [ ] Propiedades estándar están en lugares correctos
- [ ] Extensiones custom están en `<extensionElements>` 
- [ ] Atributos id, name, type son válidos

#### ✅ Compatibilidad Bidireccional
- [ ] Importar archivo creado en Camunda → nuestro editor abre correctamente
- [ ] Elemento creado en Camunda (no lista negra) → se importa sin error
- [ ] Propiedades estándar se preservan (round-trip)
- [ ] Layout visual se preserva (coordenadas BPMNDi)

#### ✅ Propiedades de Negocio
- [ ] Propiedades custom se guardan en extensionElements
- [ ] No interfieren con propiedades BPMN estándar
- [ ] Se preservan en round-trip (export → import)
- [ ] Son opcionales (no bloquean validación BPMN)

#### ✅ Mantenibilidad
- [ ] Código tiene JSDoc completo
- [ ] Estructura clara entre BPMN core y business logic
- [ ] Tests cubren 70%+ de flujos críticos
- [ ] Dependencias pinned a versión específica
- [ ] Breaking changes documentados en CHANGELOG

#### ✅ Escalabilidad
- [ ] Editor maneja diagramas de 100+ nodos sin lag
- [ ] Auto-save no bloquea UI
- [ ] Undo/redo sin memory leaks
- [ ] Import de archivo grande (> 1MB) en < 5s

#### ✅ Seguridad
- [ ] XML import validado contra XSD (prevenir XXE)
- [ ] Propiedades sanitizadas (no injection)
- [ ] Credenciales no se guardan en BPMN
- [ ] Auditoría: cambios registrados con usuario

#### ✅ UX / Feedback Visual
- [ ] Indicador dirty / guardado siempre visible
- [ ] Errores mostrados sin tecnicismos
- [ ] Atajos de teclado documentados
- [ ] Tooltips sobre elementos BPMN
- [ ] Fast feedback (< 100ms para acciones simples)

---

## 12. Decisión Final

### Recomendación Ejecutiva

#### **Veredicto: GO con Arquitectura BPMN**
El editor YA ESTÁ bien fundamentado en bpmn-js. No requiere refactor radical, sino:
1. ✅ **Completar integraciones** ya presentes (simulación, validación, propiedades)
2. ✅ **Formalizar extensiones de negocio** con moddle descriptor
3. ✅ **Agregar feedback visual** (validación, ahorro, controles)
4. ✅ **Documentar y testear** compatibilidad bidireccional

---

### Matriz de Decisiones

| Aspecto | Decisión | Justificación |
|---|---|---|
| **Base del editor** | ✅ Mantener bpmn-js | Built-in undo/redo, zoom, plugins, interop. Valor comprobado. |
| **XML como fuente de verdad** | ✅ Mantener | Estándar, portable, parseable por motor externo. |
| **Propiedades de negocio** | ✅ Extensiones BPMN | No rompe estándar, preservables, compatibles. |
| **Formularios dentro de BPMN** | ❌ NO embarcar | Referencia por ID en extensión. Formularios gestión separada (form-js Sprint 2.9). |
| **Tabla DMN** | ✅ Referencia + Sprint 2.8 | Hoy: ID en extensión. Sprint 2.8: integración dmn-js. |
| **Simulación simple** | ✅ Mantener bpmn-js token sim | Suficiente para validación. Motor real en Sprint 3. |
| **Paleta customizada** | ✅ Hacer | Mostrar solo elementos soportados, mejorar UX. |
| **Properties panel** | ✅ Extender | bpmn-js base + custom tab de negocio. |
| **Undo/Redo** | ✅ Built-in (no hacer) | commandStack automático, no hay que codificar. |
| **Validación** | ✅ bpmnlint + custom | bpmnlint para BPMN; custom para business rules. |
| **Import/Export .bpmn** | ✅ Ya hay, mejorar | Round-trip testing, hand-off a Camunda Modeler. |

---

### Qué Conservar

1. ✅ **flow-editor.component.ts** — refactor interno, mantener interfaz
2. ✅ **Backend GET/PUT /bpmn** — API limpia, mantener como está
3. ✅ **Campo bpmnXml en Politica** — fuente de verdad
4. ✅ **Auto-save 2s debounce** — buena UX
5. ✅ **Indicadores dirty/saved** — feedback útil
6. ✅ **Import/export local** — ya funciona

---

### Qué Rehacer

1. 🔄 **Workflow-moddle-descriptor.json** — crear con formato correcto
2. 🔄 **Properties panel** — agregar tab custom para negocio
3. 🔄 **Validación UI** — mostrar errores bpmnlint en panel lateral
4. 🔄 **Token simulation UI** — agregar controles (play, pause, step, speed)
5. 🔄 **Documentación** — guía del usuario para editor, API, extensiones

---

### Qué Eliminar

1. 🗑️ **Actividad.service.ts** — post Sprint 2.6, motor parsea XML directamente
2. 🗑️ **Legacy SVG drawing code** — si existe, 100% reemplazado por bpmn-js
3. 🗑️ **Nodos/conexiones custom objects** — no necesarios, bpmn-js moddle maneja

---

### Qué NO hacer (Evitar Overengineering)

1. ❌ **Custom canvas rendering** — bpmn-js ya lo hace bien
2. ❌ **Undo/redo propios** — commandStack es profesional
3. ❌ **Zoom/pan propios** — diagram-js lo implementa
4. ❌ **Parser BPMN propio** — moddle de bpmn-js es estándar
5. ❌ **Almacenamiento de metadatos fuera de BPMN** — extensionElements existe para eso
6. ❌ **Pools/Lanes complejos** — MVP no lo necesita
7. ❌ **Subprocesos expandibles en editor** — post-MVP, puede no ser necesario

---

### Roadmap Claro

**Sprint 2.6:** ✅ COMPLETADO
- bpmn-js integrado, XML guardable, import/export

**Sprint 2.7:** 🔄 EN PROGRESO
- Mejorar simulación, validación, propiedades
- Agregar elementos avanzados (Timer, Error boundary)
- Documentación, testing, hardening

**Sprint 2.8:** ⏳ PENDIENTE
- dmn-js: tablas de decisión enlazadas a gateways
- Integración editor DMN ↔ BPMN

**Sprint 2.9:** ⏳ PENDIENTE
- form-js: reemplazar form builder
- Enlace User Task → formulario desde properties

**Sprint 3:** ⏳ PENDIENTE
- Motor de trámites: parsea BPMN, instancia actividades, ejecuta
- Trazabilidad completa

---

### Criterios de Éxito Final

```
✅ El editor es profesional
   → Soporta BPMN estándar
   → Compatible con herramientas externo
   → Feedback visual claro

✅ Mantenible a largo plazo
   → Código documentado
   → Tests en verde
   → Dependencias pinned

✅ Preparado para evolucionar
   → Extensiones bien diseñadas
   → Separación de concerns clara
   → No acoplado a peculiaridades bpmn-js

✅ Listo para integración con motor
   → XML exportado es parseable
   → Propiedades de negocio están en lugares correctos
   → No hay ambigüedades en el grafo
```

---

## Cierre

**El editor NO requiere refactor de base.** 

Está bien fundamentado en bpmn-js y el BPMN XML como fuente de verdad. Los pasos restantes son:

1. **Completar** las integraciones parciales (simulación, validación, propiedades)
2. **Formalizar** las extensiones de negocio con moddle descriptor
3. **Documentar y testear** la compatibilidad e interoperabilidad
4. **Agregar feedback visual** para una UX profesional

Con esta base sólida, el sprint 2.7 (mejoras), 2.8 (DMN), 2.9 (form-js) y 3 (motor) procederán sin fricciones arquitectónicas.

---

**Autor:** Arquitecto de Software  
**Fecha:** 15 de abril de 2026  
**Estado:** Propuesta lista para implementación
