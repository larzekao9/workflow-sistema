# QA Review — Sprint 1: Auth + Usuarios + Roles
**Fecha:** 2026-04-12 | **Revisor:** qa-reviewer | **Veredicto: ✅ APROBADO CON OBSERVACIONES MENORES**

---

## ✅ Qué está bien

### Backend
- **Estructura correcta en todos los módulos:** `Document → Repository → Service → Controller` respetada en `auth/`, `users/`, `roles/`.
- **Password nunca expuesta:** `passwordHash` no aparece en `UserResponse` ni hay campo `password` en ningún DTO de salida. Marcado con `@JsonIgnore` en el Document. ✔
- **DTOs separados de Documents:** `UserResponse`, `RoleResponse`, `AuthResponse` son clases independientes, no se retornan Documents directos. ✔
- **Validaciones en RequestDTOs:** `RegisterRequest` y `CreateUserRequest` tienen `@NotBlank`, `@Email`, `@Size`. `CreateRoleRequest` tiene validaciones propias. ✔
- **GlobalExceptionHandler completo:** cubre `ResourceNotFoundException`, `BadRequestException`, `UnauthorizedException`, `BusinessRuleException`, `MethodArgumentNotValidException` y la excepción genérica `Exception`. Retorna `ErrorResponse` estructurado con timestamp y fieldErrors. ✔
- **JWT integrado correctamente:** `JwtAuthFilter` antes del filtro de Spring Security. Sesión STATELESS. Endpoints `/auth/**` permitidos sin token. ✔
- **CORS configurado:** permite origen `*` con los métodos necesarios. ✔
- **Soft delete en usuarios:** `deleteUser` desactiva el campo `activo` en lugar de borrar físicamente. ✔
- **Verificaciones de negocio en UserService:** email único, username único, rol existente antes de crear usuario. ✔
- **`ultimoAcceso` se actualiza en cada login.** ✔

### Frontend
- **URLs del backend en `environment.ts` únicamente.** Los servicios usan `environment.apiUrl`. ✔
- **Interceptor JWT funcional:** adjunta `Authorization: Bearer <token>` automáticamente en cada request si hay token en localStorage. ✔
- **Auth Guard protege rutas privadas.** Redirige a `/login` si no hay token. ✔
- **Modelos TypeScript alineados con el backend:** `User`, `Role`, `AuthResponse`, `LoginRequest`, `RegisterRequest` coinciden campo a campo con los DTOs Java. ✔
- **Componente de login usa Reactive Forms** con validaciones `Validators.required`, `Validators.email`, `Validators.minLength(6)`. ✔
- **Manejo de error HTTP en login:** captura `err?.error?.message` y lo muestra al usuario. ✔
- **Componentes standalone.** ✔

---

## ⚠️ Qué tiene deuda técnica (no bloquea avanzar, pero hay que corregir)

### Backend

| # | Problema | Archivo | Impacto |
|---|----------|---------|---------|
| DT-01 | `getAuthorities()` en `User` retorna lista vacía. Los permisos no se cargan desde el rol. Esto impedirá protección por rol con `@PreAuthorize` en Sprint 2. | `User.java:82` | Medio |
| DT-02 | `AuthService.login()` llama a `userRepository.findByEmail()` dos veces (una en `updateUltimoAcceso`, otra en el `.map()`). Es redundante y agrega latencia. | `AuthService.java:65` | Bajo |
| DT-03 | `UpdateUserRequest` no tiene `@Valid` en el `PUT /users/{id}` del Controller. Si se envía un `rolId` con formato inválido, el backend no lo valida antes de ir al Service. | `UserController.java:36` | Bajo |
| DT-04 | No existe endpoint `GET /auth/me` para que el frontend pueda refrescar el perfil del usuario logueado. Actualmente el frontend solo confía en el localStorage, que puede quedar desactualizado. | — | Medio |

### Frontend

| # | Problema | Archivo | Impacto |
|---|----------|---------|---------|
| DT-05 | `authGuard` solo verifica que exista el token en `localStorage`, no valida si expiró. Un token vencido pasará el guard pero fallará en el backend con 401. No hay manejo de ese 401 a nivel global. | `jwt.interceptor.ts` / `auth.guard.ts` | Medio |
| DT-06 | `RoleResponse` en `role.model.ts` está duplicado: existe la interface `Role` y `RoleResponse` con los mismos campos. Usar un solo tipo. | `role.model.ts:24` | Bajo |
| DT-07 | No existe registro de error en los servicios `user.service.ts` y `role.service.ts`. Si el backend retorna error, no hay `catchError` ni mensaje al usuario. | `user.service.ts`, `role.service.ts` | Bajo |

---

## ❌ Qué hay que corregir antes de avanzar al Sprint 2

> Solo estos puntos son BLOQUEANTES para iniciar Sprint 2.

### OBLIGATORIO — Bloqueo 1: Permisos no cargados en Spring Security (DT-01)
El motor de políticas (Sprint 2) usará `@PreAuthorize("hasRole('ADMIN')")` o similar. Si `getAuthorities()` siempre devuelve lista vacía, **todos los roles fallarán**. Hay que cargar los permisos desde el `Role` en el `UserService.loadUserByUsername()`.

**Corrección mínima para Sprint 2:**
```java
// En UserService.loadUserByUsername() → ya retorna User que implementa UserDetails
// En User.getAuthorities() → Cargar permisos desde el rol:
// Opción: pasar los permisos como campo en el User al momento de cargarlo,
// o inyectar RoleRepository dentro del User (NO recomendado).
// Corrección real: sobreescribir loadUserByUsername en UserService
// para construir un UserDetails enriquecido con las authorities del rol.
```

### OBLIGATORIO — Bloqueo 2: Manejo global de 401 en el frontend (DT-05)
Sin un interceptor que capte 401 y llame a `authService.logout()` + redirect a login, una sesión expirada dejará al usuario con pantallas rotas. Esto debe estar antes de Sprint 2.

**Corrección mínima:**
```typescript
// En jwt.interceptor.ts, agregar manejo de error:
import { catchError, throwError } from 'rxjs';
// Si error.status === 401 → authService.logout()
```

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Estructura de paquetes Java | ✅ Correcta |
| Seguridad JWT backend | ✅ Funcional |
| DTOs sin passwords | ✅ Verificado |
| Validaciones Bean Validation | ✅ En su lugar |
| GlobalExceptionHandler | ✅ Completo |
| Modelos frontend alineados con backend | ✅ Alineados |
| JWT Interceptor frontend | ✅ Funcional |
| Auth Guard | ⚠️ Parcial (no valida expiración) |
| Permisos/Authorities cargados | ❌ Pendiente (bloquea Sprint 2) |
| Manejo 401 global frontend | ❌ Pendiente (bloquea Sprint 2) |

**Veredicto final:** El Sprint 1 está bien construido, pero tiene **2 correcciones bloqueantes** que deben resolverse antes de iniciar Sprint 2. Las demás deudas técnicas son menores y se pueden atacar progresivamente.
