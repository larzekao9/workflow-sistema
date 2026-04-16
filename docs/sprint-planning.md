# Sprint Planning — workflow-sistema
*Replanteado 2026-04-15 para cumplir alcance docente: plataforma colaborativa, IA, ejecución real, voz, analítica*

---

## Visión del producto (según docente)

La plataforma NO es un editor de diagramas. Es una solución empresarial integral que une:
- **Modelado colaborativo** de políticas de negocio en tiempo real
- **IA como copiloto** del diseño (NLP + voz → operaciones en el editor)
- **Ejecución operativa real** (motor de trámites con formularios por etapa)
- **Captura por voz** para funcionarios que llenan formularios
- **Analítica de desempeño** para detectar cuellos de botella

### Actores del sistema
| Actor | Rol |
|---|---|
| Diseñador/Admin de políticas | Crea y edita workflows colaborativamente |
| Funcionario/Operador | Ejecuta tareas, llena formularios, avanza trámites |
| Cliente | Inicia solicitudes, consulta estado, responde observaciones |
| Administrador técnico | Permisos, auditoría, configuración |

---

## Sprint 2.10 — Colaboración en Tiempo Real
**Objetivo:** Múltiples diseñadores editan la misma política simultáneamente con sincronización en vivo.

### Backend
- Spring WebSocket + STOMP: canal `/topic/policy/{id}` para broadcast de cambios BPMN
- `POST /policies/{id}/collaborate/join` → registra presencia de usuario
- `POST /policies/{id}/collaborate/leave`
- `GET /policies/{id}/collaborators` → lista usuarios activos

### Frontend
- `CollaborationService`: conecta WebSocket STOMP, escucha cambios, aplica al modeler sin loop
- Indicador de presencia: avatares de usuarios activos en la barra del editor
- Bloqueo optimista: último en guardar gana, notificación de conflicto al que perdió

### DoD
- 2 usuarios en pestañas distintas ven cambios en tiempo real (< 500ms)
- Presencia visible: avatar aparece y desaparece al entrar/salir
- Tests de integración WebSocket

---

## Sprint 2.11 — Chat IA en el Editor (NLP → bpmn-js)
**Objetivo:** El diseñador escribe o dicta instrucciones en lenguaje natural y la IA las ejecuta en el diagrama.

### AI Service (FastAPI)
- `POST /ai/bpmn/command` → recibe `{ prompt, bpmnXml }` → devuelve lista de operaciones estructuradas
  - Ej: `[{ op: "createShape", type: "bpmn:UserTask", name: "Validar identidad", after: "Task_1" }]`
- `POST /ai/bpmn/generate` → recibe descripción de proceso → devuelve BPMN XML completo desde cero
- Usa `claude-sonnet-4-6` con prompt caching (system prompt + bpmnXml actual en cache)

### Frontend
- Panel lateral: textarea + botón micrófono (Web Speech API → transcribe → envía al AI Service)
- Frontend traduce operaciones devueltas a `bpmn-js` API calls (`modeling.createShape`, `modeling.connect`, etc.)
- Vista previa de cambios antes de aplicar ("¿Aplicar estos 3 cambios?")
- Undo nativo bpmn-js si el resultado no es el esperado

### DoD
- "Agrega una tarea de revisión legal después de la validación" → nueva UserTask en el diagrama
- Comando de voz funciona igual que texto
- Historial de comandos visible en el panel

---

## Sprint 3 — Motor de Trámites (Ejecución Real)
**Objetivo:** Instanciar y ejecutar políticas publicadas; funcionarios avanzan etapas llenando formularios; clientes consultan estado.

### Modelo de datos (MongoDB)
```
tramites {
  id, politicaId, politicaVersion,
  clienteId, estado: INICIADO|EN_PROCESO|COMPLETADO|RECHAZADO|CANCELADO,
  etapaActual: { actividadBpmnId, nombre, responsableRolId, formularioId },
  historial: [ { actividadId, responsableId, accion, timestamp, observaciones, evidencias[] } ],
  creadoEn, actualizadoEn
}
```

### Backend
- `POST /tramites` → instancia trámite desde política publicada (parsea bpmnXml, determina primera UserTask)
- `GET /tramites` (filtrado por rol del usuario, estado, fecha)
- `GET /tramites/{id}` → detalle completo con historial
- `POST /tramites/{id}/avanzar` → `{ accion: APROBAR|RECHAZAR|DEVOLVER, observaciones, formularioRespuesta: {} }`
  - Motor: determina siguiente nodo según gateways y condiciones DMN
  - Genera entrada en `historial` (auditoría obligatoria)
  - Evalúa tablas DMN si el gateway tiene `decisionRef`
- `POST /tramites/{id}/adjuntos` → upload de evidencias (base64 o multipart)
- `GET /tramites/{id}/formulario-actual` → devuelve schema form-js de la etapa actual

### AI Service
- `POST /ai/tramite/analyze-stage` → dado el historial y etapa, sugiere al funcionario próximos pasos

### Frontend
- `TramitesListComponent` → lista de trámites según rol (funcionario ve los asignados; cliente ve los propios)
- `TramiteDetailComponent` → timeline visual del historial + etapa actual
- `TramiteEjecucionComponent`:
  - Renderiza form-js viewer con el formulario de la etapa actual
  - Botones Aprobar / Rechazar / Devolver con campo observaciones
  - Upload de adjuntos
- `NuevoTramiteComponent` → formulario para que cliente inicie solicitud
- Guard: solo funcionarios con el rol correcto pueden avanzar una etapa
- Notificación en tiempo real cuando un trámite les es asignado (WebSocket del Sprint 2.10)

### DoD
- Un trámite completo: Cliente inicia → Funcionario A aprueba → Funcionario B completa → Estado COMPLETADO
- Historial de auditoría completo con timestamps y responsables
- Gateway exclusivo evalúa DMN correctamente y enruta al camino correcto
- Cliente puede ver estado sin poder modificarlo

---

## Sprint 4 — IA Copiloto Avanzado + Captura por Voz
**Objetivo:** NLP convierte comandos de voz/texto en operaciones del editor; funcionarios dictan para llenar formularios.

### AI Service
- `POST /ai/bpmn/refine` → recibe BPMN XML actual + instrucción → devuelve BPMN XML modificado
  - Ej: "Mueve la aprobación antes de la validación" → modifica XML directamente
- `POST /ai/form/fill` → recibe transcripción de voz + schema del formulario → devuelve JSON con campos mapeados
  - Ej: "El documento fue revisado, faltan dos firmas, plazo vence el viernes" → `{ observaciones: "...", firmasFaltantes: 2, fechaVencimiento: "2026-04-18" }`
- `POST /ai/policy/summarize` → devuelve descripción legible de un BPMN XML para mostrar a clientes
- Todas las llamadas usan prompt caching (system prompt + contexto del diagrama en cache)

### Frontend — Editor
- Botón micrófono en panel chat IA → Web Speech API → transcribe → envía a `/ai/bpmn/command`
- Visualización de operaciones pendientes antes de aplicar ("¿Aplicar estos cambios?")
- Historial de comandos IA con opción de deshacer (undo nativo bpmn-js)

### Frontend — Ejecución de trámites
- Botón micrófono en cada campo de formulario → transcribe → llena el campo
- Botón "Dictar informe completo" → transcribe párrafo libre → `/ai/form/fill` → rellena todos los campos
- Revisión antes de guardar: usuario confirma los campos auto-llenados

### DoD
- Comando de voz "Añade una tarea de validación de identidad" → nueva UserTask en el diagrama
- Funcionario dicta 30 segundos → 3+ campos del formulario se rellenan correctamente
- Latencia < 3s para operaciones de IA

---

## Sprint 5 — Analítica de Cuellos de Botella + Portal Cliente
**Objetivo:** Dashboard de KPIs operativos; detección automática de etapas problemáticas; portal de autoservicio para clientes.

### Backend
- `GET /analytics/policies/{id}/bottlenecks` → analiza historial de trámites:
  - Tiempo promedio por etapa
  - Etapas con más rechazos/devoluciones
  - Trámites vencidos por etapa
  - Carga por funcionario/rol
- `GET /analytics/policies/{id}/kpis` → throughput, tasa de aprobación, SLA compliance
- `GET /analytics/dashboard` → resumen global para administrador

### AI Service
- `POST /ai/analytics/interpret` → recibe métricas brutas → devuelve análisis narrativo con recomendaciones
  - Ej: "La etapa de validación legal tiene un promedio de 8 días vs SLA de 3. Recomendación: ..."

### Frontend — Dashboard analítico
- `AnalyticsDashboardComponent`:
  - Heatmap de etapas por tiempo promedio (chart)
  - Gráfico de barras: devoluciones por etapa
  - Timeline de SLA compliance
  - Panel de texto con análisis IA de cuellos de botella
- Filtros: por política, período, rol

### Frontend — Portal Cliente
- Ruta pública `/portal` con login propio (rol CLIENTE)
- `PortalIniciarTramiteComponent` → selecciona política → inicia trámite
- `PortalMisTramitesComponent` → lista con estado visual (stepper)
- `PortalDetalleTramiteComponent` → historial visible (sin datos internos), observaciones, responder solicitudes
- Notificaciones email cuando el trámite avanza o requiere acción del cliente

### DoD
- Dashboard muestra la etapa más lenta de una política con ≥5 trámites ejecutados
- IA genera párrafo de recomendación coherente con los datos
- Cliente puede iniciar trámite y ver su avance sin acceso al editor
- Tests end-to-end: flujo completo Cliente → Funcionario → Completado → Dashboard actualizado

---

## Sprint 6 — App Móvil Flutter
**Objetivo:** Funcionarios y clientes acceden desde móvil con funcionalidades clave.

### Pantallas mínimas
- Login JWT
- Lista de tareas asignadas (funcionario)
- Detalle de trámite + formulario para avanzar
- Voz-a-texto integrado (Flutter Speech)
- Estado de trámites (cliente)
- Push notifications (Firebase)

### Condición de inicio
Sprint 6 no inicia hasta que Sprint 5 esté completo y la API del backend sea estable.

---

## Mapa de cobertura de requisitos docentes

| Requisito docente | Sprint que lo cubre |
|---|---|
| Diseño colaborativo tiempo real | 2.10 |
| Sincronización en vivo + trazabilidad de cambios | 2.10 |
| Construcción híbrida (visual + NLP) | 2.10 + 4 |
| Entrada por voz para editor | 4 |
| IA como copiloto del diseño | 2.10 + 4 |
| Formularios por etapa del workflow | 2.9 (schema) + 3 (ejecución) |
| Llenado por voz de formularios | 4 |
| Motor de ejecución real de trámites | 3 |
| Auditoría completa con responsables | 3 |
| Análisis de cuellos de botella | 5 |
| KPIs e indicadores operativos | 5 |
| Portal de cliente (autoservicio) | 5 |
| App móvil | 6 |
