# Skill: create-angular-auth

## Cuándo se usa
Cuando hay que implementar el módulo de autenticación completo en Angular 17 (login, register, auth service, guards).

## Pasos que siempre seguís

### 1. `shared/services/auth.service.ts`
- `login(email, password)` → POST /auth/login → guarda token en localStorage
- `register(data)` → POST /auth/register
- `logout()` → limpia localStorage + navega a /login
- `isAuthenticated()` → verifica si hay token válido (no expirado)
- `currentUser$` → BehaviorSubject<UserResponse | null>
- `getToken()` → lee de localStorage

### 2. `auth/login/login.component.ts`
- FormGroup con: email (Validators.required + email), password (Validators.required + minLength(6))
- Manejo de errores del backend (mensaje en pantalla)
- Loading state durante el request
- Navega a /dashboard en éxito
- Link a /register
- NO muestra sidenav (layout especial)

### 3. `auth/register/register.component.ts`
- FormGroup con: username, email, password, nombreCompleto
- Validators.required en todos, email validator, password minLength(6)
- Llama a auth.service.register()
- Redirige a /login en éxito
- Link a /login

### 4. Actualizar `app.component.ts`
- Inyectar Router
- Observar el route actual: si es /login o /register, NO mostrar sidenav
- Usar `router.events` + `filter(NavigationEnd)`

### 5. `shared/services/user.service.ts` y `role.service.ts`
- CRUD completo con HttpClient
- URLs siempre desde environment.ts
- Métodos: getAll(), getById(), create(), update(), delete()
- Tipados con los modelos del sistema

## Restricciones
- Reactive Forms para todos los formularios, sin Template-driven
- Sin lógica de negocio en los componentes
- El interceptor JWT ya existe, no recrearlo
- URLs del backend SIEMPRE desde environment.ts
- Error handling en cada llamada HTTP, mostrar mensaje al usuario
