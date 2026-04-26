# Skill: sync-api-contract

## Cuándo se usa
Cada vez que backend-spring crea o modifica un endpoint.
Es obligatoria antes de que frontend-angular empiece a consumir un endpoint nuevo.

## Lo que hacés
1. Identificar el endpoint nuevo o modificado (método, ruta, Controller)
2. Leer el RequestDTO y ResponseDTO correspondientes
3. Actualizar `docs/api-contract.md` con la firma completa:
   - Método HTTP y ruta
   - Campos del request con tipos
   - Campos del response con tipos
   - Códigos de respuesta posibles
   - Errores que puede lanzar
4. Actualizar la fecha de "Última actualización" en api-contract.md

## Formato de entrada en api-contract.md
```
### MÉTODO /ruta
Request: `{ "campo": "tipo", "campo2": "tipo?" }`  ← ? = opcional
Response [código]: `{ "campo": "tipo" }`
Errores: 400 si X, 404 si Y, 401 si no hay JWT
```

## Restricciones
- Sin copiar el código Java, solo la firma del contrato
- api-contract.md no debe superar 100 líneas — si crece, separar por dominio
- Frontend no debe implementar un servicio HTTP hasta que el endpoint esté en api-contract.md
