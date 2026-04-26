# CLAUDE.local.md — workflow-sistema · 2026-04-26

## Stack
Backend: Java 21 + Spring Boot 3.5 + MongoDB · :8080  
Frontend: Angular 17 + Material + bpmn-js/dmn-js/form-js · :4200  
Mobile: Flutter 3 + Dart · `mobile/`  
Docker Compose local · `docker-compose up -d`

## Credenciales demo
`admin@workflow.com / Admin2024!` → ADMINISTRADOR  
`superadmin@workflow.com / Super2024!` → SUPERADMIN  
`ana.soporte@telecom.bo / Func2024!` → FUNCIONARIO  
`cliente1@telecom.bo / Cliente2024!` → CLIENTE

## Reglas senior
- No reconstruir. Solo modificar lo necesario.
- Backend: DTOs siempre, nunca exponer MongoDB directos.
- Frontend/Mobile: URLs solo en environment.ts / constants.dart. Auth en sessionStorage (web) / flutter_secure_storage (mobile).
- Historial append-only. Política con trámites activos = congelada.
- Prohibido catch vacío.

---

## Estado actual — Sprints completados

| Sprint | Feature | Estado |
|--------|---------|--------|
| 3.1 | Empresas + SUPERADMIN + File Storage | ✅ |
| 3.2 | Refactor entidades | ✅ |
| 3.3 | Asignación automática | ✅ |
| 3.4 | Flujo apelación | ✅ |
| 3.5 | Panel propiedades BPMN | ✅ |
| 3.6 | Portal cliente /mis-tramites | ✅ |
| 4.1 | Respuestas formulario persistidas + GET /respuestas | ✅ |
| 4.2 | Swimlanes → auto-mapeo departmentId en flow-editor | ✅ |
| 4.4 | Seed TelecomBolivia (seed_telecom.py, 549 líneas) | ✅ |
| 4.5 | Accordion "Datos de etapas anteriores" en tramite-detalle | ✅ |

---

## Sprint 6 — App Móvil Flutter + Notificaciones Push

### Arquitectura

```
mobile/
  lib/
    core/
      constants.dart          ← BASE_URL, timeouts, FCM keys
      auth/
        jwt_storage.dart      ← flutter_secure_storage wrapper (key: access_token)
    data/
      models/
        tramite.dart          ← TramiteResponse, EtapaActualDTO, HistorialEntryDTO, ApelacionDTO
        politica.dart         ← PoliticaResponse (id, nombre, descripcion)
        campo.dart            ← CampoFormulario (nombre, tipo, label, required, opciones)
        notificacion.dart     ← Notificacion (id, titulo, cuerpo, leida, tramiteId, timestamp)
        user.dart             ← UserSession (id, nombreCompleto, rolNombre, token)
      repositories/
        tramite_repository.dart
        auth_repository.dart
        notificacion_repository.dart
      services/
        api_client.dart       ← http base con Bearer JWT auto-inject
        tramite_service.dart
        auth_service.dart
        file_service.dart
        fcm_service.dart
    domain/
      usecases/               ← lógica pura separada de UI
    presentation/
      screens/
        login/
        cliente/
          politicas_list/     ← GET /policies/publicas
          nuevo_tramite/      ← POST /tramites
          mis_tramites/       ← GET /tramites/mis-tramites
          tramite_detalle/    ← GET /tramites/{id}
          tramite_formulario/ ← GET /tramites/{id}/formulario-actual + POST /responder
          apelacion/          ← POST /tramites/{id}/apelar
        funcionario/
          bandeja/            ← GET /tramites (paginado, filtrable)
          tramite_detalle/    ← GET /tramites/{id} + POST /tomar
          tramite_accion/     ← POST /tramites/{id}/avanzar | observar
        shared/
          notificaciones/     ← historial push recibidas
      widgets/
        dynamic_form.dart     ← renderiza campos[] por tipo: TEXT/NUMBER/DATE/FILE/SELECT/TEXTAREA/BOOLEAN
        estado_chip.dart
        historial_list.dart
        file_preview.dart
      providers/              ← Riverpod providers (AsyncNotifier)
  main.dart
  pubspec.yaml
```

### Dependencias pubspec.yaml
```yaml
dependencies:
  http: ^1.2.0
  go_router: ^13.0.0
  flutter_riverpod: ^2.5.0
  flutter_secure_storage: ^9.0.0
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
  image_picker: ^1.0.0
  file_picker: ^8.0.0
  cached_network_image: ^3.3.0
  intl: ^0.19.0
```

---

### Endpoints reutilizados del backend (sin cambios)

| Método | Endpoint | Actor | Uso |
|--------|----------|-------|-----|
| POST | /auth/login | todos | JWT + rol |
| GET | /policies/publicas | CLIENTE | lista para nuevo trámite |
| POST | /tramites | CLIENTE | iniciar trámite |
| GET | /tramites/mis-tramites | CLIENTE | bandeja cliente |
| GET | /tramites | FUNCIONARIO | bandeja funcionario |
| GET | /tramites/{id} | todos | detalle completo |
| GET | /tramites/{id}/formulario-actual | todos | campos dinámicos por etapa |
| POST | /tramites/{id}/avanzar | FUNCIONARIO | APROBAR/RECHAZAR/DEVOLVER/ESCALAR |
| POST | /tramites/{id}/responder | CLIENTE | corregir DEVUELTO |
| POST | /tramites/{id}/observar | FUNCIONARIO | observar con comentario |
| POST | /tramites/{id}/tomar | FUNCIONARIO | auto-asignarse |
| POST | /tramites/{id}/apelar | CLIENTE | apelar OBSERVADO/DENEGADO |
| GET | /tramites/{id}/respuestas | todos | historial formularios anteriores |
| POST | /files/upload | todos | multipart/form-data |
| GET | /files/{fileId} | todos | download con JWT |

### Endpoints NUEVOS a agregar en backend (solo para FCM)

| Método | Endpoint | Body | Propósito |
|--------|----------|------|-----------|
| PATCH | /users/me/fcm-token | `{ fcmToken: string }` | registrar device token al login |
| GET | /notificaciones | — | historial notificaciones del usuario |
| PATCH | /notificaciones/{id}/leer | — | marcar como leída |

---

### Cambios de backend para FCM

**1. User entity** — agregar campo:
```java
@Field("fcm_token")
private String fcmToken;
```

**2. Nuevo endpoint** `PATCH /users/me/fcm-token`:
```java
@PatchMapping("/me/fcm-token")
public ResponseEntity<Void> updateFcmToken(@RequestBody FcmTokenRequest req, Principal principal) {
    userService.updateFcmToken(principal.getName(), req.getFcmToken());
    return ResponseEntity.ok().build();
}
```

**3. Colección `notificaciones`** MongoDB:
```
{ userId, titulo, cuerpo, tramiteId, tipo, leida: false, creadoEn }
tipos: TRAMITE_AVANZADO | TRAMITE_OBSERVADO | TRAMITE_RECHAZADO |
       TAREA_ASIGNADA | CLIENTE_RESPONDIO | APELACION_RESUELTA
```

**4. `FcmService`** — integra Firebase Admin SDK:
```java
// firebase-admin dependency en pom.xml
// FcmService.enviarPush(userId, titulo, cuerpo, tramiteId)
//   → busca user.fcmToken → llama FCM API → guarda Notificacion en MongoDB
```

**5. Hooks en TramiteService** — dónde disparar push:

| Evento | Receptor | Tipo |
|--------|----------|------|
| avanzarTramite (ASIGNADO_AUTO / SIN_ASIGNAR) | funcionario asignado | TAREA_ASIGNADA |
| avanzarTramite (cualquier avance) | cliente | TRAMITE_AVANZADO |
| avanzarTramite acción RECHAZAR | cliente | TRAMITE_RECHAZADO |
| observar / denegar | cliente | TRAMITE_OBSERVADO |
| responder (cliente corrige DEVUELTO) | funcionario asignado | CLIENTE_RESPONDIO |
| resolverApelacion | cliente | APELACION_RESUELTA |

---

### Formulario dinámico (DynamicFormWidget)

Los campos vienen de `GET /tramites/{id}/formulario-actual`:
```json
{ "actividadId": "...", "actividadNombre": "...",
  "campos": [{ "nombre": "dni", "tipo": "NUMBER", "label": "Cédula de identidad", "required": true }] }
```

Tipos → widget Flutter:
| Tipo backend | Widget Flutter |
|---|---|
| TEXT | TextFormField |
| NUMBER | TextFormField(keyboardType: numeric) |
| DATE | TextFormField + DatePicker |
| TEXTAREA | TextFormField(maxLines: 5) |
| SELECT | DropdownButtonFormField(items: campo.opciones) |
| BOOLEAN | SwitchListTile |
| FILE | ElevatedButton → file_picker → POST /files/upload → guarda fileId |

Submit → `POST /tramites/{id}/avanzar`:
```json
{ "accion": "APROBAR", "datos": { "dni": "12345", "fotoCarnet": "fileId-uuid" } }
```

---

### Plan de Sprints Mobile — Optimizado (7 días total)

**Principio**: cliente y funcionario comparten 80% de UI. `TramiteDetalleScreen` es único, con acciones condicionales por rol. `DynamicFormWidget` incluye FILE desde el día 1. Sin capa domain/usecases — providers llaman directo a repositories.

---

#### Sprint M1 — Base + Auth (1.5d)

Archivos a crear:
```
pubspec.yaml                        ← todas las deps de una vez
lib/core/constants.dart             ← BASE_URL = http://localhost:8080
lib/core/auth/jwt_storage.dart      ← flutter_secure_storage (access_token, current_user)
lib/data/services/api_client.dart   ← http wrapper que auto-inyecta Bearer JWT
lib/data/models/user.dart           ← UserSession {id, nombreCompleto, rolNombre, token}
lib/presentation/screens/login/login_screen.dart
main.dart                           ← go_router con redirect por rol
```

go_router rutas:
```
/login
/cliente/tramites          ← MisTramitesScreen
/cliente/tramites/nuevo    ← PoliticasListScreen → NuevoTramite
/cliente/tramites/:id      ← TramiteDetalleScreen (rol=CLIENTE)
/funcionario/bandeja       ← BandejaScreen
/funcionario/tramites/:id  ← TramiteDetalleScreen (rol=FUNCIONARIO)
```

---

#### Sprint M2 — Flujos completos: Cliente + Funcionario + Formularios + Archivos (4d)

Un solo sprint porque todo comparte los mismos widgets base.

**Widgets compartidos (construir primero, día 1):**
```
EstadoChip          ← color por estado (INICIADO/EN_PROCESO/COMPLETADO/etc.)
HistorialList       ← lista de HistorialEntryDTO con accion + timestamp + observaciones
DynamicFormWidget   ← renderiza campos[] completo:
  TEXT     → TextFormField
  NUMBER   → TextFormField(keyboardType: numeric)
  DATE     → TextFormField + showDatePicker
  TEXTAREA → TextFormField(maxLines: 5)
  SELECT   → DropdownButtonFormField(items: campo.opciones)
  BOOLEAN  → SwitchListTile
  FILE     → ElevatedButton → file_picker → POST /files/upload → guarda fileId en datos{}
```

**TramiteDetalleScreen (shared, día 2) — una pantalla, dos modos:**
```
GET /tramites/{id} → muestra: estado chip, etapaActual, historial, datos etapas anteriores

Si rol == CLIENTE && estado == DEVUELTO:
  → muestra DynamicFormWidget + botón "Enviar corrección" → POST /tramites/{id}/responder

Si rol == CLIENTE && apelacion.estado == PENDIENTE:
  → banner "Podés apelar" + botón → ApelarBottomSheet → POST /tramites/{id}/apelar

Si rol == FUNCIONARIO && tramite.asignadoAId == currentUser.id:
  → DynamicFormWidget + AccionesWidget (APROBAR/RECHAZAR/DEVOLVER/OBSERVAR)
  → APROBAR/RECHAZAR/DEVOLVER → POST /tramites/{id}/avanzar {accion, datos, observaciones}
  → OBSERVAR → POST /tramites/{id}/observar {motivo, observaciones}

Si rol == FUNCIONARIO && tramite.asignadoAId == null:
  → botón "Tomar tarea" → POST /tramites/{id}/tomar
```

**Pantallas Cliente (día 3):**
```
MisTramitesScreen   → GET /tramites/mis-tramites → lista + EstadoChip → navega a detalle
PoliticasListScreen → GET /policies/publicas → tarjetas → tap → POST /tramites → detalle
```

**Pantallas Funcionario (día 4):**
```
BandejaScreen → GET /tramites?page=0&size=20
  Filtros: chips de estado (INICIADO/EN_PROCESO/SIN_ASIGNAR/DEVUELTO)
  Cada item → navega a TramiteDetalleScreen (rol=FUNCIONARIO)
```

---

#### Sprint M3 — FCM Push (1.5d)

**Backend primero (medio día):**

1. `User.java` — agregar campo `fcmToken`
2. `UserController` — `PATCH /users/me/fcm-token` body: `{fcmToken}`
3. `pom.xml` — agregar `firebase-admin`
4. `FcmService.java` — `enviarPush(userId, titulo, cuerpo, tramiteId)`
5. `TramiteService.java` — agregar calls a FcmService en:
   - `avanzarTramite` → cliente (TRAMITE_AVANZADO) + funcionario nuevo asignado (TAREA_ASIGNADA)
   - `observar` / `denegar` → cliente (TRAMITE_OBSERVADO)
   - `responder` → funcionario (CLIENTE_RESPONDIO)

**Mobile (1 día):**
```
google-services.json (Android) / GoogleService-Info.plist (iOS) en proyecto
FirebaseMessaging.instance.getToken() al login → PATCH /users/me/fcm-token
Foreground  → FirebaseMessaging.onMessage → SnackBar con "Ver trámite" → navega
Background  → FirebaseMessaging.onMessageOpenedApp → go_router push /:id
Terminated  → FirebaseMessaging.instance.getInitialMessage → go_router push /:id
```

Payload FCM que el backend envía:
```json
{ "notification": { "title": "...", "body": "..." },
  "data": { "tramiteId": "...", "tipo": "TAREA_ASIGNADA" } }
```

---

### Seguridad mobile
- JWT en `flutter_secure_storage` (key: `access_token`), NUNCA en SharedPreferences
- User JSON en `flutter_secure_storage` (key: `current_user`)
- Cada request lleva `Authorization: Bearer $token` — centralizado en api_client.dart
- Rol detectado de `rolNombre` en respuesta de `/auth/login`
- Rutas protegidas en go_router con `redirect` que chequea token + rol

---

### Preparación para Chatbot (Fase 2)
- El backend AI Service (FastAPI :8001) ya existe
- Para fase 2: agregar `/chat` endpoint en FastAPI que recibe contexto del trámite + pregunta
- Mobile: agregar `ChatScreen` con historial de mensajes y contexto del tramite actual
- No acoplar lógica de chat a los repositorios de trámites — mantener separado en `chat_repository.dart`

---

## Infraestructura actual

| Servicio | Puerto | Estado |
|---------|--------|--------|
| Backend Spring Boot 3.5 | :8080 | UP |
| Frontend Angular 17 | :4200 | UP |
| AI Service FastAPI | :8001 | UP |
| MongoDB 7.0 | :27017 | UP |
