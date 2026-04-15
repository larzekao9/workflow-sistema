Actúa como un arquitecto de software senior, experto en BPMN, Camunda, bpmn.io, UX de modeladores visuales y refactorización de productos ya iniciados.

Necesito que analices TODO lo que ya se hizo en mi editor de flujos/workflows y me entregues una propuesta de rediseño e implementación técnica para reconstruirlo correctamente sobre las librerías del ecosistema BPMN de Camunda/bpmn.io, en lugar de seguir con una base gráfica inventada o demasiado custom.

## Contexto del producto
Estoy construyendo un sistema de workflows empresariales con editor visual tipo grafo, orientado a procesos complejos. No quiero un simple organizador de tareas. Quiero algo cercano conceptualmente a Camunda: modelado BPMN, soporte para decisiones, errores, tiempos, subprocesos, workflows dentro de workflows, simulación y futura integración con IA.

El sistema debe evolucionar hacia:
- editor visual profesional de workflows
- importación y exportación de archivos `.bpmn`
- soporte de BPMN real, no solo nodos sueltos
- panel lateral de propiedades
- validaciones
- simulación del flujo
- soporte para tareas humanas y automáticas
- base preparada para formularios, reglas y ejecución por motor propio
- a futuro: chat/voz para que el usuario describa el workflow y el sistema lo genere

## Base tecnológica que quiero adoptar
Quiero que el rediseño se haga tomando como base principal:
- `bpmn-js` como editor/viewer BPMN embebido
- `diagram-js` como base del canvas y comportamiento gráfico
- `bpmn-js-properties-panel` para edición de propiedades
- `bpmn-js-token-simulation` para simulación
- considerar también a futuro `dmn-js` para reglas y `form-js` para formularios

No quiero que reinventes lo que estas librerías ya resuelven. Quiero que identifiques qué parte de mi sistema debe apoyarse directamente en estas librerías y qué parte sí debe ser desarrollo propio.

## Lo que necesito que hagas
Quiero un análisis técnico profundo, claro y accionable, dividido en secciones.

### 1. Diagnóstico del estado actual
Analiza el enfoque actual del editor de flujo y detecta:
- qué partes están bien encaminadas
- qué partes están mal planteadas
- qué componentes actuales conviene conservar
- qué componentes conviene eliminar o rehacer
- qué riesgos existen si sigo con una implementación demasiado custom

Asume que probablemente ya tengo avances en UI, nodos, conexiones, lógica de edición, CRUD y estructura modular, pero necesito reordenarlo con una arquitectura más seria.

### 2. Mapeo “lo actual vs nueva base BPMN”
Haz una tabla o desglose donde expliques:
- funcionalidad actual
- si la resuelve `bpmn-js` / `diagram-js` / properties panel / token simulation
- si requiere extensión personalizada
- si debe eliminarse o refactorizarse
- nivel de prioridad

Quiero distinguir claramente:
- lo que ya me da la librería
- lo que debo personalizar
- lo que pertenece a mi negocio y no al editor BPMN

### 3. Arquitectura objetivo del editor
Diseña la arquitectura objetivo del módulo de edición visual.

Debes separar claramente:
- capa de render/editor BPMN
- capa de personalización UI/UX
- capa de propiedades de negocio
- capa de validación
- capa de simulación
- capa de persistencia/import/export
- capa de integración con motor de ejecución
- capa futura de IA asistida

Explica responsabilidades, fronteras y dependencias.

### 4. Estrategia de integración con `bpmn-js`
Quiero que propongas exactamente cómo debería integrarse `bpmn-js` en mi sistema:
- estructura de módulos
- inicialización del modeler
- carga y guardado de XML
- import/export `.bpmn`
- extensión de palette/context pad
- custom properties
- validaciones
- hooks/event bus
- comandos de edición
- control de zoom, selección, teclado, undo/redo
- versionado del diagrama

Quiero recomendaciones concretas de implementación y buenas prácticas.

### 5. Panel de propiedades
Explícame cómo plantear el panel de propiedades correctamente:
- qué debe venir del panel estándar
- qué propiedades BPMN debo respetar
- qué propiedades de negocio debo agregar como extensión propia
- cómo separar propiedades visuales, técnicas y de negocio
- cómo evitar ensuciar el BPMN con campos mal diseñados

Propón una estrategia seria para manejar metadata propia del sistema.

### 6. Simulación
Quiero una propuesta para integrar simulación:
- qué puede resolverse con token simulation
- qué limitaciones tiene frente a ejecución real
- cómo aprovecharla para demo, validación y aprendizaje
- cómo complementarla después con simulación propia más avanzada
- cómo mostrar errores, timeouts, ramas paralelas, gateways y eventos

Diferencia claramente:
- simulación visual BPMN
- ejecución lógica real del workflow
- pruebas funcionales

### 7. Importación y exportación
Quiero que definas cómo manejar:
- importación de `.bpmn`
- exportación de `.bpmn`
- validación de compatibilidad
- manejo de archivos sin layout visual
- preservación de extensiones propias
- estrategia para abrir archivos creados por Camunda Modeler o bpmn.io

Incluye criterios para no romper interoperabilidad.

### 8. Soporte BPMN mínimo viable
Propón el conjunto mínimo de elementos BPMN que debo soportar en esta fase para que el editor ya sea serio pero manejable.

Quiero que priorices elementos como:
- start event
- end event
- service task
- user task
- exclusive gateway
- parallel gateway
- subprocess
- call activity
- timer boundary event
- message event
- error event
- sequence flow
- pools/lanes si realmente conviene en esta etapa

Aclara cuáles dejar fuera por ahora.

### 9. Extensiones personalizadas de negocio
Propón cómo modelar cosas propias de mi sistema sin romper BPMN:
- tipos internos de nodo
- configuración de IA
- formularios
- integraciones
- políticas
- permisos
- SLA
- reintentos
- reglas internas
- comportamiento de ejecución

Quiero una estrategia limpia y escalable.

### 10. Refactor por etapas
Quiero que conviertas esto en un plan de refactor e implementación por fases.
No mezcles con otros módulos del sistema. Concéntrate solo en el editor/workflow builder.

Divide el trabajo en:
- quick wins
- refactor base
- integración BPMN real
- propiedades
- simulación
- interoperabilidad
- hardening UX/UI

Indica:
- objetivo
- tareas
- dependencias
- riesgos
- entregables

### 11. Criterios de calidad
Define criterios técnicos para aceptar el rediseño:
- el editor debe abrir y guardar BPMN válido
- debe permitir editar sin romper XML
- debe mantener compatibilidad razonable con herramientas del ecosistema BPMN
- debe soportar extensión ordenada
- debe ser mantenible
- debe permitir evolucionar a motor propio y a IA

### 12. Decisión final
Cierra con una recomendación ejecutiva clara:
- qué debo conservar
- qué debo rehacer
- qué debo montar directamente sobre bpmn.io
- qué debo dejar como desarrollo propio
- cuál sería la mejor arquitectura base para que el editor crezca de forma profesional

## Forma de respuesta
Quiero que respondas como documento técnico serio.
Sé específico, directo y sin relleno.
No me des teoría general de BPMN innecesaria.
Quiero análisis aplicado a producto y arquitectura.
Cuando hagas recomendaciones, justifícalas desde la mantenibilidad, interoperabilidad, escalabilidad y velocidad de desarrollo.

## Criterio clave
La meta no es “dibujar cajitas”.
La meta es construir un editor de workflows profesional, compatible con BPMN, extensible, integrable con motor propio y preparado para evolucionar hacia formularios, reglas, simulación e IA.