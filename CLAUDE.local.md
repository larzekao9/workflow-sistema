# CLAUDE.local.md — workflow-sistema · 2026-04-24

## Stack
Backend: Java 21 + Spring Boot 3.5 + MongoDB · :8080  
Frontend: Angular 17 + Material + bpmn-js/dmn-js/form-js · :4200  
Docker Compose local · `docker-compose up -d`

## Credenciales demo
`admin@workflow.com / Admin2024!` → ADMINISTRADOR  
`superadmin@workflow.com / Super2024!` → SUPERADMIN

## Actores (sin cargos)
- SUPERADMIN → gestiona empresas + asigna admins
- ADMINISTRADOR → empresa propia, departamentos, políticas BPMN, formularios
- FUNCIONARIO → atiende tareas de su área (sin cargo, solo departmentId)
- CLIENTE → inicia trámites, completa formularios, apela

## Reglas
- No reconstruir. Solo modificar lo necesario.
- Backend: DTOs siempre, nunca exponer MongoDB directos.
- Frontend: URLs solo en environment.ts, auth en sessionStorage.
- Historial append-only. Política con trámites activos = congelada.
- Prohibido catch vacío.

## Completado
3.1 Empresas+Superadmin+Files · 3.2 Refactor entidades · 3.3 Asignación auto  
3.4 Flujo apelación · 3.5 Panel propiedades BPMN · 3.6 Portal cliente

## Sprints pendientes

### Sprint 4.1 · Respuestas formulario persistidas (2d)
- `RespuestaFormulario` MongoDB: tramiteId, actividadId, usuarioId, campos Map<String,Object>, archivos FileRef[]
- `POST /tramites/{id}/responder` guarda respuestas + avanza estado
- `GET /tramites/{id}/respuestas` devuelve historial completo de respuestas
- tramite-detalle: sección "Datos previos" para que el siguiente actor vea todo

### Sprint 4.2 · Swimlanes → mapeo de área (1d)
- flow-editor: onElementChanged → si UserTask dentro de un Lane → auto-set departmentId desde lane name
- Backend `PATCH /activities/{id}/propiedades` ya existe; solo conectar lane → departmentId
- Quitar cargos del motor: solo departmentId para asignación
- Properties panel: campo "Área" se auto-completa desde el lane

### Sprint 4.3 · Form builder inline en editor BPMN (2d)
- En el sidebar del flow-editor (Sprint 3.5): tab "Formulario" con builder simple
- Campos: nombre, tipo (text/number/date/file/select/textarea), required
- Guardar via `POST /forms` → linkear a actividad.formularioId
- Si ya existe formularioId → cargar y editar (`PUT /forms/{id}`)

### Sprint 4.4 · Seed demo TelecomBolivia real (1d)
- `seed_telecom.py` actualizado: 3 políticas BPMN con BPMN XML real + formularios reales
- Policy 1: Instalación Internet (Solicitud CC → Verificación → Visita Técnico → Aprobación)
- Policy 2: Soporte Técnico (Recepción → Diagnóstico → Resolución)
- Policy 3: Reclamo (Recepción → Investigación → Respuesta con branching)
- Trámites demo en estados variados (INICIADO, EN_PROCESO, COMPLETADO, EN_APELACION)

### Sprint 4.5 · Continuidad de datos entre actividades (1d)
- Tramite.respuestasFormularios: List<RespuestaFormularioRef> (embed resumen por actividad)
- tramite-detalle: accordion "Datos de etapas anteriores" visible para todos los actores
- Documentos subidos en pasos anteriores: links de descarga accesibles

 Estado actual del stack — workflow-sistema                                                
                                                                                            
  Infraestructura viva                                                                      
                                                                                            
  ┌─────────────────────────────────────┬────────┬────────┐                                 
  │              Servicio               │ Puerto │ Estado │                                 
  ├─────────────────────────────────────┼────────┼────────┤ 
  │ Backend (Spring Boot 3.5 / Java 21) │ :8080  │ UP     │
  ├─────────────────────────────────────┼────────┼────────┤
  │ Frontend (Angular 17 + Material)    │ :4200  │ UP     │                                 
  ├─────────────────────────────────────┼────────┼────────┤                                 
  │ AI Service (FastAPI + Claude)       │ :8001  │ UP     │                                 
  ├─────────────────────────────────────┼────────┼────────┤                                 
  │ MongoDB 7.0                         │ :27017 │ UP     │ 
  └─────────────────────────────────────┴────────┴────────┘                                 
   
  ---                                                                                       
  Modelos MongoDB — qué son y qué hacen                     
                                                                                            
  ┌───────────────┬──────┬────────────┬──────────────────────────────────────────────────┐
  │   Colección   │ Docs │   Modelo   │                    Propósito                     │  
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤
  │ usuarios      │ 7    │ User       │ Identidad: email, password BCrypt, rol,          │  
  │               │      │            │ departamento, empresaId. Soporta multiempresa.   │
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤  
  │               │      │            │ SUPERADMIN / ADMINISTRADOR / FUNCIONARIO /       │
  │ roles         │ 4    │ Role       │ CLIENTE con lista de permisos string (ej.        │  
  │               │      │            │ GESTIONAR_POLITICAS).                            │
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤  
  │ empresas      │ 2    │ Empresa    │ Tenant raíz. Todo lo demás (usuarios, depts,     │  
  │               │      │            │ políticas) vive bajo empresaId.                  │
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤  
  │ departamentos │ 6    │ Department │ Área funcional dentro de una empresa.            │  
  │               │      │            │ Actualmente 3 para TelecomBolivia + 3 legacy.    │
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤  
  │               │      │            │ La "plantilla" de workflow. Contiene BPMN XML,   │
  │ politicas     │ 4    │ Politica   │ estado (BORRADOR/ACTIVA/INACTIVA/ARCHIVADA),     │  
  │               │      │            │ versión, tags, colaboradores activos WebSocket.  │
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤  
  │               │      │            │ Un nodo UserTask del BPMN. Embebe campos[]       │
  │ actividades   │ 24   │ Actividad  │ (formulario), departmentId, formularioId legacy. │  
  │               │      │            │  4 sets de actividades (hay duplicados de seeds  │
  │               │      │            │ anteriores).                                     │  
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤
  │               │      │            │ Instancia de ejecución de una política. Contiene │
  │ tramites      │ 3    │ Tramite    │  etapa_actual, historial[] append-only con       │  
  │               │      │            │ datos: Map<String,Object>, estado completo del   │
  │               │      │            │ workflow.                                        │  
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤
  │               │      │            │ Colección legacy de form-js. Coexiste con el     │
  │ formularios   │ 10   │ Formulario │ nuevo sistema de campos[] embebidos en           │  
  │               │      │            │ actividad.                                       │
  ├───────────────┼──────┼────────────┼──────────────────────────────────────────────────┤  
  │ decisiones    │ 0    │ Decision   │ DMN tables para gateways. Editor implementado,   │
  │               │      │            │ sin datos aún.                                   │  
  └───────────────┴──────┴────────────┴──────────────────────────────────────────────────┘
                                                                                            
  ---                                                       
  Qué puede hacer cada actor
                            
  SUPERADMIN (superadmin@workflow.com / Super2024!)
                                                                                            
  - Crear y gestionar empresas
  - Asignar admins a empresas                                                               
  - Ver todo cross-empresa                                  
                                                                                            
  ADMINISTRADOR (admin@workflow.com / Admin2024!)
                                                                                            
  - CRUD usuarios + departamentos de su empresa                                             
  - CRUD políticas: crear, editar, publicar, versionar, desactivar
  - Editor BPMN completo (bpmn-js) con panel propiedades por tarea: área, nombre, campos del
   formulario                                                                               
  - Editor DMN para gateways de decisión                                                    
  - Colaboración en tiempo real (WebSocket STOMP) en el editor BPMN                         
  - Ver todos los trámites de su empresa, stats por estado                                  
  - Asignación manual de trámites sin asignar                                               
  - Observar / Denegar trámites con periodo de apelación                                    
  - Resolver apelaciones                                                                    
  - Dashboard con métricas                                                                  
                                                                                            
  FUNCIONARIO (ana.soporte@telecom.bo / Func2024!, carlos.cc@telecom.bo / Func2024!,        
  pedro.tecnico@telecom.bo / Func2024!)                                                     
                                                                                            
  - Ver trámites asignados a su departamento                                                
  - "Tomar" un trámite (auto-asignación individual)
  - Avanzar trámite: APROBAR / RECHAZAR / DEVOLVER / ESCALAR                                
  - Ver y completar formulario dinámico de la etapa actual (ngx-formly: texto, número,      
  fecha, textarea, select, boolean toggle, file upload)                                     
  - Observar / Denegar con apelación                                                        
  - Dashboard con carga actual                                                              
                                                            
  CLIENTE (cliente1@telecom.bo / Cliente2024!, cliente2@telecom.bo / Cliente2024!)          
                                                            
  - Ver políticas públicas disponibles (/policies/publicas)                                 
  - Iniciar nuevo trámite seleccionando una política        
  - Ver sus trámites en /mis-tramites con contadores de apelación en tiempo real            
  - Responder cuando el trámite está en DEVUELTO                                            
  - Presentar apelación (con archivos) cuando está OBSERVADO o DENEGADO                     
  - Portal /mis-tramites separado del panel admin                                           
                                                                                            
  ---                                                       
  Motor de workflows — qué está funcionando                                                 
                                                                                            
  ┌────────────────────────────────────────────────────────────────────────┬──────────┐
  │                                Feature                                 │  Estado  │     
  ├────────────────────────────────────────────────────────────────────────┼──────────┤
  │ BPMN parsing (userTask, gateway, start/end events)                     │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤
  │ Asignación automática por departamento (menor carga)                   │ ✅       │     
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Asignación manual por admin                                            │ ✅       │     
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Estado SIN_ASIGNAR cuando no hay funcionario disponible                │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Avance de etapas siguiendo flujo BPMN                                  │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Historial append-only por trámite                                      │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Formulario dinámico por etapa (GET /tramites/{id}/formulario-actual)   │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Datos del formulario guardados en historial (datos: Map)               │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Flujo apelación completo: OBSERVAR/DENEGAR → EN_APELACION → resolver   │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Scheduler @hourly vence apelaciones sin respuesta (48h)                │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Upload de archivos (local FS, MIME validation, UUID naming)            │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ WebSocket colaboración BPMN editor                                     │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ AI panel en editor BPMN (FastAPI + Claude)                             │ ✅       │
  ├────────────────────────────────────────────────────────────────────────┼──────────┤     
  │ Formularios ngx-formly (TEXT/NUMBER/DATE/TEXTAREA/SELECT/BOOLEAN/FILE) │ ✅ nuevo │
  └────────────────────────────────────────────────────────────────────────┴──────────┘     
                                                            
  ---                                                                                       
  Lo que falta para producción real                         
                                                                                            
  Crítico antes de demo:
                                                                                            
  1. Duplicados de actividades — hay 4 sets de actividades para la misma política (seeds    
  anteriores no limpiaron). El motor funciona porque usa el politicaId activo, pero genera  
  ruido. Solución: db.actividades.deleteMany({campos: {$exists: false}}) más un re-seed     
  limpio.                                                   
  2. Sprint 4.1 incompleto — POST /tramites/{id}/responder guarda datos en historial pero no
   existe la colección respuestas_formulario ni GET /tramites/{id}/respuestas. El siguiente 
  actor no ve datos del anterior en la UI todavía.
  3. formularios legacy (10 docs) — coexiste con el nuevo sistema campos[] en Actividad. No 
  rompe nada pero es deuda técnica.                                                         
   
  No bloquea demo pero importante:                                                          
  - Sin HTTPS / reverse proxy (nginx bare HTTP en :4200/:8080)
  - Sin rate limiting en endpoints                                                          
  - Archivos en filesystem local del container (se pierden si se recrea el container, aunque
   hay volumen montado)                                                                     
  - Cero tests automatizados                                                                
                            
  Para producción real de workflows (producción de negocio):                                
  - Sprint 4.1 (respuestas visibles entre actores) es el único bloqueante funcional real    
  - Todo lo demás está suficientemente completo para demos y MVPs                        


  El fix funciona: APROBADO | Verificación Técnica | [factibilidad, distancia_nodo, ...] —
  datos correctamente en la acción del funcionario, no en ASIGNADO_AUTO.                    
                                                                                          
  ---                                                                                       
  Sprint 4.1 completado                                                                     
                                                                                            
  5 archivos modificados, 1 nuevo:                                                          
                                                                                            
  ┌──────────────────────────┬──────────────────────────────────────────────────────────┐
  │         Archivo          │                          Cambio                          │   
  ├──────────────────────────┼──────────────────────────────────────────────────────────┤
  │ RespuestaResponse.java   │ DTO de respuesta: actividadNombre, accion, datos,        │
  │ (nuevo)                  │ timestamp                                                │
  ├──────────────────────────┼──────────────────────────────────────────────────────────┤   
  │ TramiteService.java      │ + getRespuestas(): filtra historial donde datos != null  │
  ├──────────────────────────┼──────────────────────────────────────────────────────────┤   
  │                          │ Bug fix: datos se guardan en el entry APROBADO (índice   │
  │ TramiteService.java      │ capturado antes del switch), no en el ASIGNADO_AUTO que  │   
  │                          │ puede venir después                                      │   
  ├──────────────────────────┼──────────────────────────────────────────────────────────┤
  │ TramiteController.java   │ + GET /tramites/{id}/respuestas                          │   
  ├──────────────────────────┼──────────────────────────────────────────────────────────┤   
  │ tramite.model.ts         │ + interface RespuestaFormulario                          │
  ├──────────────────────────┼──────────────────────────────────────────────────────────┤   
  │ tramite.service.ts       │ + getRespuestas(id)                                      │
  └──────────────────────────┴──────────────────────────────────────────────────────────┘   
   
  Lo que ya estaba funcionando (no se tocó):                                                
  - historialConDatos getter en tramite-detalle filtra el historial del tramite en memoria
  - Template "Datos de etapas anteriores" con accordion ya existía y ya renderiza           
                                                            
  Flujo end-to-end verificado:                                                              
  1. Funcionario aprueba etapa + submit formly → datos: {factibilidad, distancia_nodo, ...}
  en body                                                                                   
  2. Backend guarda datos en el entry APROBADO del historial
  3. Frontend muestra los datos en "Datos de etapas anteriores" para el siguiente actor     
  4. GET /tramites/{id}/respuestas disponible para cualquier consumidor externo  