# Skill: create-backend-module

## Cuándo se usa
Cuando hay que crear un módulo completo en Spring Boot.

## Pasos que siempre seguís
1. Crear el Document con @Document(collection="nombre")
2. Crear el Repository extendiendo MongoRepository
3. Crear RequestDTO con validaciones (@NotBlank, @Email, etc)
4. Crear ResponseDTO sin campos sensibles (sin passwords)
5. Crear el Service con toda la lógica de negocio
6. Crear el Controller con los endpoints REST
7. Registrar errores específicos en el handler global
8. Mostrar ejemplo de JSON de entrada y salida

## Restricciones
- No crear más archivos de los necesarios
- Si hay ambigüedad en el modelo, preguntar antes de crear
- Verificar que no rompe módulos existentes