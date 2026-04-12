# Prompts operativos para Claude — Workflow

Este archivo reúne los comandos/prompts base para trabajar por sesión, por feature y por sprint sin gastar tokens de más.

---

## 1) Inicio de sesión

Usar al comenzar cualquier sesión nueva.

```text
Usa session-start.
Lee CLAUDE.local.md y ubicame en el proyecto.
Luego decime:
1. dónde quedó el proyecto,
2. qué feature está activa,
3. qué bloqueos existen,
4. cuál es el siguiente paso técnico exacto,
5. qué agente debería actuar ahora.
```

---

## 2) Inicio de feature nueva

Usar cuando se va a comenzar una feature desde cero.

```text
Vamos a trabajar la feature [nombre_feature].
Usa session-start primero para leer el estado actual.
Luego identifica qué archivos de contexto corto necesitas revisar.
No inventes contexto ni releas todo el historial.
Quiero que propongas el siguiente paso mínimo y correcto para iniciar esta feature.
```

---

## 3) Diseño de esquema antes de backend

Usar antes de escribir Java/Spring si la feature toca datos.

```text
Quiero empezar la feature [nombre_feature].
Primero usa db-modeler.
Revisa el esquema actual y proponé la estructura MongoDB para esta feature,
sus relaciones, embebidos vs referencias e índices necesarios.
Si hace falta, aplica schema-change antes de avanzar.
No pases a backend hasta que el esquema quede claro.
```

---

## 4) Crear módulo backend

Usar cuando el esquema ya fue aprobado.

```text
Con base en el esquema aprobado para [nombre_feature],
usa backend-spring y create-backend-module
para crear el módulo completo:
Document, Repository, RequestDTO, ResponseDTO, Service y Controller.
Respeta las reglas del proyecto.
No avances si el contrato todavía no está claro.
```

---

## 5) Sincronizar contrato API

Usar cada vez que backend cree o modifique endpoints.

```text
Usa sync-api-contract.
Actualiza docs/api-contract.md con los endpoints reales de [nombre_feature],
incluyendo método, ruta, request, response, errores y campos obligatorios.
Verifica consistencia con backend.
```

---

## 6) Crear frontend desde contrato

Usar cuando el contrato API ya está definido.

```text
Usa frontend-angular y create-angular-crud
para construir la vista de [nombre_feature]
basada estrictamente en docs/api-contract.md.
No inventes campos fuera del contrato.
Usa componentes standalone, Reactive Forms y manejo de errores en llamadas HTTP.
```

---

## 7) Revisión rápida de feature

Usar antes de cerrar una feature.

```text
Usa feature-checklist y luego qa-reviewer en modo FEATURE.
Revisa si [nombre_feature] está consistente entre MongoDB, backend, contrato API y frontend.
Decime:
- qué está bien,
- qué falta,
- qué está inconsistente,
- qué debo corregir antes de cerrarla.
```

---

## 8) Revisión completa de fase o sprint

Usar cuando se cierra una fase más grande.

```text
Usa qa-reviewer en modo FULL.
Quiero una revisión completa de la fase actual.
Verifica:
- consistencia backend/frontend,
- DTOs y campos,
- validaciones,
- deuda técnica visible,
- riesgos de integración,
- puntos que deben corregirse antes de seguir.
```

---

## 9) Cierre de sesión o sprint

Usar al terminar una sesión importante.

```text
Usa sprint-close.
Actualiza CLAUDE.local.md con:
- qué se terminó hoy,
- qué quedó en progreso,
- qué bloqueo apareció,
- cuál es el siguiente paso exacto.

Actualiza también el snapshot de la feature correspondiente.
Mantén todo corto, claro y sin narrativa larga.
```

---

## 10) Trabajar una feature completa de punta a punta

Plantilla general para una feature nueva.

```text
Usa session-start.
Lee CLAUDE.local.md y resumime en 5 puntos:
- estado actual,
- feature activa,
- bloqueos,
- siguiente paso,
- agente que debe actuar ahora.

Luego vamos a trabajar la feature [nombre_feature].
Primero usa db-modeler y schema-change para proponer el esquema MongoDB.
Después usa backend-spring con create-backend-module.
Luego usa sync-api-contract para actualizar docs/api-contract.md.
Después usa frontend-angular con create-angular-crud.
Al final usa feature-checklist y qa-reviewer en modo FEATURE.
Y cierra con sprint-close actualizando CLAUDE.local.md y el snapshot de la feature.
```

---

## 11) Prompt corto de trabajo diario

Para avanzar rápido sin meter contexto innecesario.

```text
Usa session-start.
Ubícame rápido en el proyecto.
Vamos a trabajar la feature [nombre_feature].
Usa el agente correcto.
Basate solo en los archivos de estado existentes.
No inventes contexto ni repitas información innecesaria.
Al terminar, usa sprint-close.
```

---

## 12) Prompt corto solo para ubicarte

```text
Usa session-start.
Lee CLAUDE.local.md y decime cuál es el siguiente paso técnico exacto.
```

---

## 13) Prompt corto solo para cierre

```text
Usa sprint-close.
Deja actualizado el estado del proyecto y el siguiente paso en formato corto.
```

---

## Recomendación de uso

### Al iniciar sesión
1. usar prompt de inicio de sesión
2. identificar feature activa
3. revisar solo los archivos mínimos necesarios

### Al trabajar una feature
1. db-modeler si toca datos
2. backend-spring
3. sync-api-contract
4. frontend-angular
5. feature-checklist
6. qa-reviewer

### Al cerrar
1. sprint-close
2. actualizar CLAUDE.local.md
3. actualizar snapshot de la feature

---

## Archivos que Claude debería mirar primero

Según el tipo de tarea:

- `CLAUDE.local.md` → siempre al empezar
- `docs/api-contract.md` → si toca API o frontend/backend
- `docs/db-schema-notes.md` → si toca MongoDB
- `docs/features/[feature].md` → si se trabajará una feature concreta
- `docs/decisions.md` → si necesitas entender decisiones previas

---

## Regla principal

No volver a explicar todo el proyecto en cada sesión.

Siempre trabajar así:

**inicio de sesión → trabajo técnico → sincronización → revisión → cierre corto**

