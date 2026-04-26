# Skill: build-ai-endpoint

## Cuándo se usa
Cuando hay que crear un endpoint nuevo en el microservicio FastAPI.

## Pasos que siempre seguís
1. Crear schema Pydantic de entrada
2. Crear schema Pydantic de salida
3. Crear el router en routers/
4. Crear el servicio en services/ con la lógica de IA
5. Conectar router con servicio
6. Agregar manejo de errores con HTTPException
7. Mostrar ejemplo de request y response JSON

## Restricciones
- La llamada a la API de Claude va en services/, nunca en routers/
- Siempre validar que el input no esté vacío antes de llamar a la IA
- Timeout de 30 segundos