# Skill: create-auth-module

## Cuándo se usa
Cuando hay que implementar el módulo de autenticación JWT completo en Spring Boot.

## Pasos que siempre seguís

### 1. Módulo `roles/`
- `Role.java` @Document(collection="roles") con todos los campos del schema
- `RoleRepository.java` extiende MongoRepository con queries custom
- `CreateRoleRequest.java` con validaciones Bean Validation
- `UpdateRoleRequest.java` con campos opcionales
- `RoleResponse.java` sin campos sensibles
- `RoleService.java` con lógica de negocio completa (no puede borrar rol con usuarios asignados)
- `RoleController.java` con endpoints REST

### 2. Módulo `users/`
- `User.java` @Document(collection="usuarios") — IMPORTANTE: implementa `UserDetails` de Spring Security
- `UserRepository.java` con `findByEmail()`, `findByUsername()`, `findByRolId()`
- DTOs separados: `CreateUserRequest`, `UpdateUserRequest`, `UserResponse` (sin password_hash)
- `UserService.java` — implementa `UserDetailsService` (esto desbloquea SecurityConfig)
- `UserController.java` con CRUD completo

### 3. Módulo `auth/`
- `LoginRequest.java` — email + password
- `RegisterRequest.java` — username, email, password, nombreCompleto, rolId
- `AuthResponse.java` — token, expiresIn, user (UserResponse)
- `AuthService.java` — register (crea usuario + hashea password), login (valida + genera JWT)
- `AuthController.java` — POST /auth/register, POST /auth/login

## Contrato API que siempre se respeta
- POST /auth/register → 201 + AuthResponse
- POST /auth/login → 200 + AuthResponse
- GET /users → 200 + List<UserResponse> (solo ADMIN)
- POST /users → 201 + UserResponse (solo ADMIN)
- PUT /users/{id} → 200 + UserResponse
- DELETE /users/{id} → 204 (solo ADMIN)
- GET /roles → 200 + List<RoleResponse>
- POST /roles → 201 + RoleResponse (solo ADMIN)
- PUT /roles/{id} → 200 + RoleResponse
- DELETE /roles/{id} → 204 (solo si no tiene usuarios asignados)

## Restricciones de seguridad
- password_hash NUNCA en ningún DTO de respuesta, ni en logs
- BCryptPasswordEncoder para hashear
- UserDetailsService implementado en UserService, no en AuthService
- JWT debe incluir: subject=email, claim roles=lista de permisos
- Endpoints /auth/** son públicos, todo lo demás requiere autenticación
