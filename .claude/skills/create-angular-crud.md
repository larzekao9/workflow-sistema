# Skill: create-angular-crud

## Cuándo se usa
Cuando hay que crear una vista administrativa completa en Angular.

## Pasos que siempre seguís
1. Crear la interface TypeScript del modelo
2. Crear el Service con HttpClient (GET, POST, PUT, DELETE)
3. Crear componente lista con tabla y paginación básica
4. Crear componente formulario con Reactive Forms
5. Agregar validaciones en el formulario
6. Registrar las rutas en el módulo correspondiente

## Restricciones
- URLs del backend siempre desde environment.ts
- Sin lógica de negocio en los componentes
- El interceptor JWT ya existe, no recrearlo