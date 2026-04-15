# Plan de Evolución del Editor de Workflows — Sprint 2.5 en adelante

## Contexto

El objetivo de esta etapa no es seguir construyendo el motor operativo de trámites, sino **evolucionar el editor actual de workflows hacia un Workbench profesional de modelado**, inspirado en herramientas como Camunda Web Modeler, pero adaptado a nuestro sistema académico e institucional.

Esta etapa debe enfocarse en:

- rediseño profesional del editor visual
- modelado de workflows complejos
- composición con subworkflows
- reutilización de workflows
- interoperabilidad BPMN
- colaboración multiadministrador
- validación y simulación del diagrama
- preparación para asistencia por IA

## Objetivo General

Convertir el editor actual de workflows en un entorno profesional de **modelado, colaboración, composición, validación y preparación para IA**, sin entrar todavía en el dominio operativo de trámites e instancias del Sprint 3.

---

## Alcance correcto de Sprint 2.5 en adelante

### Esto sí entra

- rediseño completo del editor visual
- UX profesional del canvas
- paneles de propiedades
- nodos, conexiones y grupos
- soporte de subworkflows
- soporte de workflows reutilizables
- importar BPMN
- exportar BPMN, JSON e imagen
- edición colaborativa multiadmin
- validaciones del diagrama
- simulación y test del workflow
- base para chat asistido por IA
- futura entrada por voz como placeholder de arquitectura

### Esto no entra todavía

- ejecución real de trámites institucionales
- bandeja operativa de funcionarios
- historial real de instancias
- formularios dinámicos ligados a un trámite vivo
- avance o rechazo de instancias reales del proceso

> Todo eso debe quedarse para Sprint 3.

---

## Replanteamiento del módulo

El módulo actual no debe entenderse como un simple “editor de flujos”, sino como un:

# Workbench Profesional de Modelado de Workflows

Este Workbench debe permitir:

- diseñar workflows visualmente
- construir flujos complejos y jerárquicos
- reutilizar workflows como componentes
- validar su consistencia antes de publicar
- simular su comportamiento
- colaborar en tiempo real
- importar y exportar modelos estándar
- preparar una futura experiencia asistida por IA

---

## Referencia conceptual inspirada en Camunda

La referencia conceptual principal es Camunda, especialmente en cómo distingue:

### 1. Subworkflow embebido
Sirve para encapsular complejidad dentro de un mismo flujo.

### 2. Workflow reutilizable externo
Equivale al concepto de `call activity`, donde un workflow puede invocar otro workflow ya definido y reutilizable.

Nuestro sistema debería soportar ambas ideas:

- **subworkflow interno**
- **workflow externo reutilizable**

Esto permitirá construir workflows realmente complejos sin perder legibilidad.

---

## Planeación por sprints

## Sprint 2.5 — Editor Profesional de Workflows

### Objetivo
Transformar el editor básico en un modelador visual serio, escalable y usable por analistas y administradores.

### Entregables
- nuevo canvas de edición con zoom, pan, minimapa, snap grid y auto-layout básico
- biblioteca lateral de nodos y conectores
- panel derecho de propiedades por nodo y enlace
- estados visuales claros
- agrupación visual y colapso de secciones complejas
- validaciones visuales inmediatas
- guardado automático
- versionado de borradores
- interfaz más limpia, corporativa y profesional

### Historias clave
- como administrador quiero editar un flujo en un canvas limpio y profesional
- como modelador quiero seleccionar un nodo y editar sus propiedades sin confusión
- como usuario quiero detectar errores visuales antes de publicar
- como equipo quiero que el editor soporte crecimiento a flujos complejos

### Riesgos
- que el rediseño visual no resuelva problemas estructurales del editor
- que el canvas se vuelva más bonito pero no más usable
- que falten reglas de interacción consistentes

### Definition of Done
- el nuevo editor permite modelar workflows con mayor claridad
- el usuario puede editar nodos y enlaces desde un panel de propiedades
- existen validaciones visuales básicas
- el canvas soporta navegación fluida y guardado automático

---

## Sprint 2.6 — Composición Avanzada de Workflows

### Objetivo
Soportar workflows complejos, anidados y reutilizables.

### Entregables
- subworkflow embebido dentro del workflow principal
- referencia a workflow reutilizable externo
- vista drill-down para entrar y salir de subflujos
- árbol de navegación del workflow
- librería de workflows reutilizables
- control de dependencias entre workflows
- reglas para evitar referencias circulares
- variables de entrada y salida entre workflow padre e hijo

### Historias clave
- como administrador quiero encapsular complejidad en subworkflows
- como analista quiero reutilizar workflows comunes en otros procesos
- como equipo quiero mantener ordenado el modelado de procesos grandes

### Riesgos
- inconsistencias entre workflow padre e hijo
- dependencia circular entre workflows
- dificultad para navegar en estructuras jerárquicas grandes

### Definition of Done
- el sistema soporta subworkflows embebidos y workflows reutilizables externos
- la navegación entre niveles es clara
- existen reglas para prevenir errores de dependencia

---

## Sprint 2.7 — Interoperabilidad BPMN e Import/Export

### Objetivo
Permitir abrir, migrar, compartir y sacar diagramas fuera del sistema.

### Entregables
- importar archivos `.bpmn`
- parser interno BPMN → modelo visual interno
- exportar a `.bpmn`
- exportar a JSON interno
- exportar imagen PNG o SVG
- validación de compatibilidad al importar
- panel de advertencias si hay elementos BPMN no soportados
- mapeo entre el modelo interno y BPMN estándar

### Historias clave
- como usuario quiero abrir diagramas BPMN hechos fuera del sistema
- como administrador quiero exportar el workflow a un estándar compartible
- como equipo quiero evitar quedar encerrados en un formato propietario

### Riesgos
- diferencias entre BPMN estándar y nuestro modelo interno
- pérdida parcial de información al importar o exportar
- complejidad de soportar todos los elementos BPMN

### Definition of Done
- el sistema importa BPMN con validaciones
- el sistema exporta BPMN y formatos complementarios
- existe retroalimentación clara sobre incompatibilidades

---

## Sprint 2.8 — Colaboración en Tiempo Real

### Objetivo
Permitir que varios administradores trabajen sobre el mismo workflow.

### Entregables
- edición colaborativa en tiempo real
- presencia de usuarios conectados
- cursores o selecciones visibles
- bloqueo fino o resolución de conflictos
- comentarios sobre nodos o enlaces
- historial de cambios
- control de versión del draft
- permisos por rol: viewer, editor, reviewer, publisher

### Historias clave
- como administrador quiero trabajar con otro modelador en el mismo flujo
- como revisor quiero dejar observaciones dentro del workflow
- como equipo quiero evitar pisarnos cambios

### Riesgos
- conflictos de edición concurrente
- problemas de sincronización en tiempo real
- dificultad para mantener consistencia del diagrama

### Definition of Done
- varios usuarios pueden colaborar sobre el mismo workflow
- existen roles y permisos claros
- el sistema conserva historial y resolución básica de conflictos

---

## Sprint 2.9 — Simulación y Testing del Workflow

### Objetivo
Validar el diseño antes de publicar.

### Entregables
- modo simulación
- ejecución visual paso a paso
- recorrido de tokens o estados
- panel de variables simuladas
- pruebas manuales de rutas
- guardado de escenarios de prueba
- resultados de validación
- chequeos de flujo muerto, bucles riesgosos, nodos sin salida y ramas imposibles

### Historias clave
- como analista quiero probar un flujo antes de publicarlo
- como docente o revisor quiero demostrar visualmente cómo se comporta
- como equipo quiero detectar errores de diseño temprano

### Riesgos
- que la simulación no coincida con el motor real futuro
- exceso de complejidad técnica en el simulador
- mala interpretación de resultados por parte del usuario

### Definition of Done
- el workflow puede probarse sin ejecutarse en el dominio real
- existen escenarios de test guardables
- el sistema detecta errores estructurales relevantes

---

## Sprint 2.10 — Asistente Conversacional para Diseñar Workflows

### Objetivo
Preparar la experiencia futura donde el usuario describa lo que quiere y el sistema le proponga un flujo.

### Entregables
- panel lateral de chat dentro del editor
- entrada de texto con prompts guiados
- arquitectura preparada para audio a futuro
- generación de borrador de workflow desde lenguaje natural
- sugerencias de nodos, rutas y validaciones
- confirmación humana antes de aplicar cambios
- diff entre flujo actual y propuesta IA
- explicación de por qué la IA propuso esa estructura

### Historias clave
- como usuario quiero escribir “quiero un flujo de licencia con revisión y aprobación final”
- como modelador quiero que el sistema me genere un borrador editable
- como administrador quiero aceptar o rechazar cambios sugeridos por la IA

### Riesgos
- generación ambigua o incompleta del workflow
- baja confianza del usuario si no entiende lo que la IA propone
- dificultad para convertir lenguaje natural a estructura precisa

### Definition of Done
- el editor incluye un chat lateral funcional
- la IA puede sugerir borradores editables
- toda propuesta requiere confirmación humana antes de aplicarse

---

## Requisitos funcionales obligatorios

## 1. Editor visual profesional
- canvas tipo modelador BPMN
- drag and drop fluido
- conexión entre nodos
- edición inline de nombres
- panel de propiedades
- grid, zoom, pan y minimapa
- atajos de teclado
- multi-selección
- duplicar, agrupar y alinear

## 2. Modelado complejo
- tareas lineales
- decisiones condicionales
- paralelismo
- iteraciones
- temporizadores
- eventos
- subworkflow embebido
- workflow reutilizable externo
- jerarquía entre procesos

## 3. Compatibilidad e interoperabilidad
- abrir BPMN
- exportar BPMN
- exportar imagen
- exportar JSON interno
- warning si el BPMN tiene elementos no soportados

## 4. Colaboración
- coedición
- presencia de usuarios
- comentarios
- historial de cambios
- permisos por rol
- guardado automático
- manejo de conflictos

## 5. Validación y simulación
- validaciones estructurales
- prepublicación
- simulación paso a paso
- variables de prueba
- escenarios guardables
- vista de rutas posibles
- advertencias de diseño

## 6. Asistencia por IA
- chat lateral
- texto hoy, audio después
- generación de borradores
- refactor del flujo actual
- explicación de cambios sugeridos
- comandos como:
  - “haz este flujo más claro”
  - “agrega aprobación paralela”
  - “divide este proceso en subworkflows”

---

## Requisitos UX/UI

La interfaz debe sentirse profesional, clara y escalable.

### Layout esperado
- panel izquierdo con palette de nodos y componentes
- canvas central amplio para modelado
- panel derecho con propiedades contextuales
- barra superior con acciones de guardar, validar, simular, importar y exportar
- barra secundaria para navegación entre subflujos y estado del draft

### Principios visuales
- interfaz limpia y corporativa
- jerarquía visual clara
- colores por estado y tipo de nodo
- feedback inmediato al usuario
- edición inline simple
- errores visibles sin bloquear innecesariamente
- navegación natural entre flujos y subflujos
- experiencia colaborativa visible pero no intrusiva

### Estados visuales recomendados
- draft
- validado
- con advertencias
- con errores
- publicado
- congelado
- editado por otro usuario
- conflicto de edición

---

## Reglas de arquitectura que deben imponerse

Estas reglas deben estar explícitas para que no se mezcle esta etapa con Sprint 3:

- no tocar instancias reales de trámites
- no implementar avance o rechazo operativo
- no construir bandeja funcional de ejecución
- el alcance aquí es editor + diseño + colaboración + simulación + interoperabilidad
- toda simulación en Sprint 2.9 es validación del modelo, no ejecución oficial del trámite
- la IA en esta fase propone y asiste, no publica automáticamente

---

## Riesgos técnicos principales

- complejidad real de importar BPMN de forma robusta
- diferencias entre el modelo interno y el estándar BPMN
- performance del canvas con workflows grandes
- edición concurrente y resolución de conflictos
- versionado de workflows con dependencias entre sí
- riesgo de referencias circulares entre workflows reutilizables
- divergencia entre simulación y motor operativo futuro
- complejidad de traducir lenguaje natural a workflows confiables

---

## Backlog priorizado

## Must Have
- rediseño profesional del editor visual
- paneles funcionales y property inspector
- soporte de subworkflows
- soporte de workflows reutilizables
- importación y exportación BPMN
- simulación básica
- validación estructural
- guardado automático
- roles mínimos de colaboración

## Should Have
- comentarios en tiempo real
- historial fino de cambios
- escenarios de prueba guardables
- exportación a imagen
- navegación drill-down avanzada
- librería de workflows reutilizables

## Could Have
- audio como entrada futura
- sugerencias IA contextuales
- auto-layout avanzado
- recomendaciones automáticas de mejora
- diff visual entre versiones de workflow

## Out of Scope por ahora
- motor operativo de trámites reales
- bandeja institucional de funcionarios
- historial real de instancias
- formularios vivos por actividad real
- ejecución real del proceso administrativo

---

## Instrucción final para Claude Code

Quiero que trabajes este módulo pensando como:

- Product Designer
- Solution Architect
- Tech Lead

No quiero todavía código operativo del Sprint 3.

Quiero primero una propuesta seria de rediseño, arquitectura funcional, plan de sprints, riesgos, backlog y lineamientos UX/UI para convertir el editor actual en una plataforma profesional de modelado de workflows complejos, colaborativos, interoperables, testeables y preparados para IA.
