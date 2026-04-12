# Prompt maestro para Claude / Riddicoin — Sprint 2

## Rol que debes asumir

Actúa como un **Senior Software Engineer / Software Architect / Product-minded Technical Lead**. No enfoques este proyecto como una app CRUD simple ni como un prototipo académico mínimo. Debes entenderlo, diseñarlo y desarrollarlo como una **plataforma de workflow empresarial visual, configurable y escalable**, gobernada por **políticas de negocio interrelacionadas**.

Tu responsabilidad no es solo programar pantallas o endpoints, sino traducir correctamente la lógica del dominio en una solución coherente a nivel de:

- arquitectura
- modelo de dominio
- experiencia de usuario
- reglas de negocio
- visualización gráfica
- trazabilidad
- escalabilidad futura

---

## Contexto general del proyecto

Se está desarrollando un **sistema workflow para la gestión de políticas de negocio**, orientado a que pueda ser utilizado por **cualquier empresa**, sin depender de reglas rígidas codificadas manualmente para un solo caso de uso.

La idea del sistema es permitir que una organización pueda:

- definir procesos
- gestionar solicitudes o trámites
- establecer políticas de negocio configurables
- hacer que esas políticas gobiernen el flujo del proceso
- visualizar gráficamente el comportamiento del workflow
- mantener trazabilidad completa de cada decisión

En este proyecto, una **política de negocio** no es un texto decorativo o un documento aislado, sino una **regla operativa ejecutable**, capaz de afectar el recorrido del proceso.

Esto significa que el sistema debe ser capaz de interpretar políticas y decidir cosas como:

- quién puede iniciar una acción
- quién puede aprobar o rechazar
- cuándo una solicitud puede avanzar
- cuándo debe bloquearse
- qué ruta debe seguir
- cuándo debe escalarse
- cuándo debe notificarse a alguien
- qué ocurre ante una excepción

Por tanto, el producto no debe entenderse como un simple gestor de tareas, sino como un **motor de workflow dinámico basado en políticas de negocio**.

---

## Estado del proyecto y objetivo de Sprint 2

En el Sprint 1 se construyó o se pensó la base conceptual del proyecto.

El **Sprint 2** debe elevar el nivel del sistema hacia una versión más madura del producto, incorporando:

1. una visión más realista y empresarial
2. mayor complejidad en reglas y flujos
3. políticas que puedan relacionarse entre sí
4. interfaz gráfica más fuerte y más intuitiva
5. visualización de procesos mediante diagramas tipo grafo
6. operaciones completas de gestión y mantenimiento
7. manejo claro de errores y estados del sistema
8. diseño preparado para evolución futura a colaboración en línea

Este sprint ya no debe verse como un ejercicio básico, sino como una aproximación seria a una **plataforma de gestión de procesos empresariales visual e inteligente**.

---

## Problema que busca resolver el sistema

En muchas empresas, los procesos internos dependen de:

- aprobaciones manuales
- reglas dispersas
- decisiones informales
- falta de claridad en responsabilidades
- ausencia de trazabilidad
- documentos separados de la operación real
- poca visibilidad del estado de un trámite

Problemas frecuentes:

- distintas personas resuelven el mismo caso de manera diferente
- no está claro quién debe aprobar
- las políticas existen en documentos, pero no en el sistema
- no se sabe por qué una solicitud fue aprobada o rechazada
- no se puede auditar con facilidad
- el usuario no entiende en qué parte del proceso está
- los flujos son rígidos o invisibles

El sistema debe resolver esto permitiendo que:

- el proceso sea visible
- la lógica de negocio sea configurable
- las decisiones sean automáticas o asistidas
- las rutas del workflow dependan de políticas
- las acciones queden registradas
- el usuario vea el flujo como un modelo gráfico entendible

---

## Visión del producto

La visión del producto es construir una plataforma capaz de combinar:

- **workflow management**
- **business rules engine**
- **visual process modeling**
- **operational tracking**
- **future collaborative editing**

Debe ser una base adaptable para distintos tipos de empresa, rubro o proceso.

No debe nacer amarrada a un solo ejemplo como compras, RRHH o soporte. Esos casos pueden ser escenarios iniciales, pero la estructura debe ser **parametrizable y genérica**.

---

## Actores del sistema

Los actores principales del sistema, en esta fase, son:

### 1. Administrador
Actor con mayor nivel de control sobre la plataforma.

Responsabilidades:
- gestionar usuarios
- gestionar roles y permisos
- crear y mantener procesos
- crear y mantener políticas
- relacionar políticas entre sí
- administrar catálogos base
- revisar auditoría
- controlar configuraciones globales
- habilitar o inhabilitar elementos del sistema

### 2. Funcionario
Usuario interno de la organización que participa operativamente en los procesos.

Responsabilidades:
- crear solicitudes o trámites internos
- revisar tareas asignadas
- aprobar, rechazar, observar o derivar según permisos
- consultar el estado del workflow
- interactuar con formularios y etapas
- recibir notificaciones
- visualizar el avance del proceso en diagramas

### 3. Cliente
Usuario externo o solicitante.

Responsabilidades:
- registrar solicitudes
- adjuntar información o documentos
- consultar estado del trámite
- recibir notificaciones del avance
- visualizar de forma clara y sencilla en qué etapa se encuentra su caso

---

## Idea conceptual central del sistema

El sistema debe sostenerse sobre estos pilares:

### 1. Proceso
Secuencia de etapas por las que pasa un trámite.

Ejemplo:
Solicitud → revisión → aprobación → ejecución → cierre

### 2. Política de negocio
Regla que condiciona el comportamiento del proceso.

Ejemplo:
- si el monto supera cierto valor, enviar a un aprobador superior
- si falta un documento, bloquear el avance
- si no se responde en cierto tiempo, escalar

### 3. Motor de reglas
Componente que interpreta políticas y decide qué ocurre en el workflow.

### 4. Trazabilidad y auditoría
Registro detallado de quién hizo qué, cuándo, por qué y bajo qué política.

### 5. Representación visual
Capacidad de mostrar el proceso y sus decisiones de forma gráfica, navegable e interactiva.

---

## Evolución conceptual requerida en Sprint 2

En este sprint ya no es suficiente manejar políticas simples y aisladas.

Ahora debes asumir que las políticas:

- pueden depender unas de otras
- pueden bloquear otras acciones
- pueden complementarse
- pueden tener prioridad diferente
- pueden actuar como excepción
- pueden encadenarse en secuencia
- pueden activarse por tiempo o por estado

Ejemplo real:
Una solicitud puede estar afectada simultáneamente por:

- política de validación documental
- política de autorización por rol
- política de monto
- política de prioridad
- política de tiempo máximo de respuesta
- política de escalamiento
- política de excepción
- política de visibilidad o seguridad

Eso implica que el sistema debe trabajar con una **red de políticas interrelacionadas**, no solo con reglas planas.

---

## Políticas base que el sistema debe soportar

Como mínimo, el sistema debe ser capaz de modelar estas categorías:

1. **Política de aprobación**  
   Define quién aprueba, en qué contexto y bajo qué condiciones.

2. **Política de autorización por rol**  
   Define qué acciones puede hacer cada actor.

3. **Política de validación**  
   Define requisitos mínimos antes de avanzar.

4. **Política de enrutamiento**  
   Define hacia qué etapa o responsable avanza el trámite.

5. **Política de tiempo**  
   Define plazos máximos de atención o respuesta.

6. **Política de escalamiento**  
   Define qué ocurre si no hay respuesta o se incumple un SLA.

7. **Política de notificación**  
   Define cuándo, a quién y cómo notificar.

8. **Política de seguridad y acceso**  
   Define visibilidad, edición y acciones permitidas.

9. **Política de excepción**  
   Permite alterar el comportamiento normal del flujo.

10. **Política de auditoría y trazabilidad**  
    Define qué debe quedar registrado y cómo.

---

## Estructura conceptual de una política

Cada política debe modelarse como una entidad configurable y no como lógica hardcodeada.

Debe contemplar, al menos:

- identificador
- nombre
- descripción
- tipo de política
- proceso asociado
- contexto de aplicación
- actor o rol asociado
- condición o conjunto de condiciones
- acción o resultado esperado
- prioridad
- vigencia
- estado
- relaciones con otras políticas
- historial de cambios

### Fórmula conceptual útil

**Política = contexto + condición + acción + responsable + tiempo + prioridad + excepción + auditoría**

---

## Relaciones entre políticas

El sistema debe permitir modelar relaciones como:

- dependencia
- precedencia
- secuencia
- complementariedad
- exclusión
- prioridad
- excepción / override
- escalamiento

### Operadores lógicos esperables

- AND
- OR
- NOT
- precedencia
- override

Esto es importante porque una política puede:

- activar otra
- bloquear otra
- reemplazar otra
- condicionar la evaluación de otra

---

## Flujo lógico del sistema

El comportamiento general del sistema debe entenderse así:

1. un actor crea una solicitud
2. el sistema identifica el proceso correspondiente
3. consulta las políticas activas aplicables
4. el motor de reglas evalúa condiciones y relaciones
5. el sistema determina el siguiente paso
6. asigna responsable o responsables
7. genera notificaciones
8. actualiza el estado del trámite
9. actualiza la representación gráfica
10. registra todo en auditoría
11. continúa hasta resolución, cierre o cancelación

---

## Enfoque de interfaz: visual, moderna e interactiva

La interfaz del sistema no debe ser únicamente administrativa ni basada solo en formularios y tablas.

Debe ofrecer una experiencia:

- visual
- clara
- moderna
- profesional
- entendible para usuarios no técnicos
- consistente con procesos complejos
- escalable a futuro

La plataforma debe combinar, como mínimo:

- panel administrativo
- vistas de listado
- formularios operativos
- detalle de trámite
- historial / timeline
- visor o editor de diagramas
- panel lateral de propiedades o contexto
- notificaciones contextuales

---

## Aclaración crítica: la interfaz gráfica de diagramas es tipo grafo

La representación visual de procesos **no debe tratarse como un simple flujograma lineal o una imagen estática**.

Debe concebirse como una interfaz **tipo grafo interactivo**, donde el workflow se represente mediante:

- **nodos**
- **aristas / conexiones**
- **relaciones dinámicas**
- **rutas alternativas**
- **dependencias entre políticas y decisiones**

### Qué representa el grafo

El grafo debe poder representar visualmente:

- etapas del proceso
- nodos de decisión
- nodos de políticas
- actores o responsables
- puntos de validación
- excepciones
- bloqueos
- escalamiento
- caminos alternos
- estado actual del trámite

### Interacciones esperadas en la vista grafo

La interfaz gráfica debe permitir:

- hacer clic en nodos
- ver detalles de un nodo o relación
- expandir o contraer secciones
- resaltar la ruta activa
- mostrar el nodo actual
- navegar con zoom y arrastre
- diferenciar tipos de nodos y estados con color, íconos o estilo
- entender visualmente por qué una solicitud fue por cierto camino

### Idea clave

El grafo debe sentirse como un **mapa vivo del workflow**, no como un dibujo decorativo.

Debe ayudar a responder preguntas como:

- ¿en qué etapa está el trámite?
- ¿qué política definió esta decisión?
- ¿quién debe actuar ahora?
- ¿por qué se bloqueó?
- ¿por qué escaló?
- ¿qué ruta alternativa se activó?

### Síntesis del enfoque visual

La representación visual del sistema debe basarse en un **modelo de grafos interactivos**, donde los nodos y aristas expresen procesos, decisiones, políticas, actores y relaciones del workflow.

---

## Operación completa: CRUDs, estados y mantenimiento

Este proyecto no puede quedarse en el nivel conceptual. Debe contemplar operaciones completas de mantenimiento y uso.

### CRUDs que el sistema debe soportar

#### 1. CRUD de usuarios
- crear usuario
- listar usuarios
- ver detalle
- editar usuario
- activar o desactivar usuario
- administrar estado de acceso

#### 2. CRUD de roles
- crear rol
- listar roles
- editar rol
- asignar permisos
- inactivar o eliminar si la integridad lo permite

#### 3. CRUD de procesos
- crear proceso
- listar procesos
- ver detalle
- editar proceso
- activar o inactivar
- eliminar con reglas de seguridad o baja lógica

#### 4. CRUD de etapas / nodos del proceso
- crear etapa
- editar etapa
- eliminar etapa con validaciones
- reordenar etapas
- definir transiciones
- asociar responsables

#### 5. CRUD de políticas
- crear política
- listar políticas
- ver detalle
- editar política
- activar o inactivar política
- duplicar política
- archivar o eliminar según reglas

#### 6. CRUD de relaciones entre políticas
- crear relación
- editar relación
- definir prioridad o tipo de dependencia
- eliminar relación
- visualizarla en configuración y/o grafo

#### 7. CRUD de solicitudes / trámites
- crear solicitud
- consultar solicitud
- actualizar ciertos campos según permisos y etapa
- cancelar solicitud cuando corresponda
- cerrar o finalizar trámite si cumple condiciones

#### 8. CRUD de documentos adjuntos
- adjuntar documento
- visualizar documento
- reemplazar documento si se permite
- eliminar documento cuando sea válido

#### 9. CRUD de notificaciones
- crear reglas de notificación
- listar notificaciones
- marcar como leídas
- configurar disparadores de aviso

#### 10. CRUD de catálogos o parámetros base
Administrar:
- tipos de trámite
- estados
- prioridades
- áreas
- tipos de documento
- motivos de rechazo
- configuraciones generales

---

## Regla importante sobre eliminación

No utilices eliminación destructiva por defecto cuando afecte trazabilidad, consistencia o auditoría.

En muchos casos conviene usar:

- baja lógica
- inactivación
- archivado
- versionado

Esto es especialmente importante para:

- políticas
- procesos
- roles
- solicitudes
- catálogos sensibles
- registros que ya participaron en auditoría

---

## Manejo de errores y escenarios alternos

Este sistema debe contemplar el comportamiento correcto no solo en escenarios exitosos, sino también cuando algo falla.

Claude / Riddicoin debe diseñar explícitamente los escenarios de error, el comportamiento visual y la continuidad del flujo.

### Tipos de error a contemplar

#### 1. Errores de validación
Ocurren cuando la entrada del usuario es incorrecta o incompleta.

Ejemplos:
- campos obligatorios vacíos
- formato inválido
- documento faltante
- valor fuera de rango
- datos inconsistentes

#### 2. Errores de negocio
Ocurren cuando una acción contradice reglas del proceso o políticas activas.

Ejemplos:
- usuario sin permisos intenta aprobar
- el trámite no puede avanzar porque falta un paso previo
- una política bloquea la transición
- el trámite ya está cerrado
- no se cumplen condiciones mínimas para ejecutar una acción

#### 3. Errores técnicos
Ocurren por fallos de sistema o infraestructura.

Ejemplos:
- base de datos no disponible
- error del servidor
- timeout
- falla de integración
- error al cargar historial o diagrama

---

## Qué debe pasar en caso de error

El sistema debe responder de manera clara y útil.

### Reglas generales

- mostrar mensajes comprensibles
- no perder datos ingresados cuando sea posible
- mantener consistencia del proceso
- impedir estados inválidos
- registrar incidentes importantes en logs o auditoría
- informar si la acción quedó bloqueada, rechazada o pendiente
- devolver al usuario a una vista lógica y segura

### Comportamiento por tipo de error

#### Error de validación
- resaltar campos inválidos
- explicar de forma puntual el problema
- mantener al usuario en contexto
- no permitir guardar o avanzar hasta corregir

#### Error de negocio
- explicar por qué la acción no es válida
- indicar, si corresponde, la política o condición que bloquea
- mantener el estado del trámite sin corrupción
- devolver al detalle o a la vista operativa correspondiente

#### Error técnico
- mostrar mensaje amigable, sin filtrar detalles internos sensibles
- permitir reintento cuando aplique
- registrar el incidente
- conservar contexto de navegación de forma segura

---

## Redirección y continuidad del flujo

Cada acción importante debe definir de forma explícita qué ocurre después.

Ejemplos:
- al crear una solicitud, redirigir al detalle o seguimiento del trámite
- al guardar una política, redirigir al listado o a su vista de edición
- al actualizar un proceso, refrescar diagrama y confirmar cambios
- al aprobar o rechazar, mostrar el estado actualizado del workflow
- al producirse un error, mantener o devolver al usuario a una vista coherente

La navegación nunca debe sentirse rota ni ambigua.

Cada operación debe terminar en uno de estos resultados:

- éxito
- advertencia
- bloqueo funcional
- error técnico controlado

---

## Requisitos funcionales de alto nivel

### Gestión de usuarios y roles
- registro y administración de actores
- asignación de permisos
- distinción entre administrador, funcionario y cliente

### Gestión de procesos
- crear, editar y visualizar procesos
- definir etapas y transiciones
- asociar roles responsables

### Gestión de políticas
- crear, editar, activar e inactivar políticas
- asociarlas a procesos
- definir condiciones, acciones y prioridades
- relacionar políticas entre sí

### Ejecución del workflow
- iniciar procesos a partir de solicitudes
- asignar tareas automáticamente
- cambiar rutas según reglas
- registrar eventos relevantes

### Visualización gráfica
- mostrar diagramas tipo grafo interactivo
- resaltar estado actual
- mostrar historial y decisiones
- permitir comprensión inmediata del proceso

### Seguimiento y trazabilidad
- historial completo por trámite
- registro de acciones por usuario
- seguimiento de cumplimiento de políticas

---

## Requisitos no funcionales de alto nivel

- interfaz intuitiva
- diseño visual moderno
- buena experiencia de usuario
- arquitectura escalable
- mantenibilidad
- trazabilidad sólida
- seguridad por roles
- flexibilidad de configuración
- base futura para colaboración en línea
- rendimiento aceptable en procesos complejos

---

## Proyección futura: colaboración en línea

Aunque en este sprint la colaboración en tiempo real puede no estar terminada, la arquitectura y el diseño deben prepararse para soportarla a futuro.

Visión futura:

- varios usuarios viendo el mismo proceso
- edición colaborativa de diagramas
- comentarios sobre nodos o reglas
- historial de cambios por usuario
- presencia en línea
- sincronización o bloqueo de edición
- trabajo concurrente sobre modelos de proceso

Esto no exige implementar todo ahora, pero sí **no cerrar el diseño** a una arquitectura que lo vuelva imposible.

---

## Criterio técnico que debes seguir

Diseña la solución con mentalidad de producto real.

Eso significa:

- no hardcodear reglas empresariales
- evitar modelos demasiado acoplados a un solo caso
- separar dominio, aplicación, presentación e infraestructura cuando tenga sentido
- pensar en extensibilidad
- modelar correctamente estados y transiciones
- cuidar la integridad de auditoría
- dar a la interfaz un rol real de comprensión del proceso

No construyas solo pantallas; construye un sistema coherente.

---

## Qué debes entender como desarrollador senior

Este proyecto no es:

- una app CRUD tradicional
- una maqueta de formularios
- un flujo lineal rígido
- un simple BPM estático

Este proyecto sí es:

- una plataforma de workflow
- un motor de reglas empresariales
- una interfaz visual tipo grafo
- una base multiempresa configurable
- una solución con trazabilidad fuerte
- una plataforma que puede crecer hacia colaboración en línea

---

## Síntesis conceptual final

Se debe desarrollar un sistema workflow visual e interactivo, orientado a múltiples empresas, en el que los procesos estén gobernados por políticas de negocio configurables e interrelacionadas, con trazabilidad completa, gestión operativa integral, manejo claro de errores, CRUDs funcionales y una representación gráfica basada en grafos interactivos que permitan comprender, ejecutar y administrar el flujo de negocio de forma moderna y escalable.

---

## Instrucción final para Claude / Riddicoin

Con base en todo este contexto, desarrolla Sprint 2 con visión de producto real. No lo enfoques como una aplicación básica. Debes concebirlo como una plataforma visual de gestión de procesos empresariales, donde el workflow esté controlado por políticas de negocio configurables, relacionadas entre sí y representadas mediante diagramas tipo grafo interactivo. Incluye desde el diseño los actores administrador, funcionario y cliente, los CRUDs principales, el manejo de errores, la trazabilidad, la navegación coherente entre vistas y una estructura lista para evolucionar hacia colaboración en línea.