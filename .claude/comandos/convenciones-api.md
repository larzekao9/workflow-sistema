Recordame las convenciones de API de este proyecto.

## Convenciones REST del backend (Spring Boot)
- Rutas en kebab-case para recursos: /tramites, /politicas, /historial-tramites
- Métodos: GET lista, GET /{id}, POST crear, PUT /{id} actualizar completo, PATCH /{id} parcial, DELETE /{id}
- Respuestas: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
- Error body estándar: `{ "timestamp", "status", "error", "message" }`
- Paginación cuando aplica: `{ "content": [], "totalElements", "totalPages", "number" }`
- JWT en header: `Authorization: Bearer <token>`

## Convenciones del AI service (FastAPI)
- Prefijo de rutas: `/api/v1/`
- Todos los endpoints son POST (reciben contexto, devuelven resultado)
- Schemas Pydantic para request y response, nunca dicts sueltos
- Timeout máximo: 30 segundos por llamada a Claude

## Convenciones de campos JSON
- camelCase en los DTOs Java (serializado automáticamente por Jackson)
- snake_case en los campos de MongoDB (@Field)
- Fechas en ISO 8601: "2026-04-12T14:30:00"
- IDs como strings (MongoDB ObjectId serializado)

## Contrato vigente
Ver `docs/api-contract.md` para la lista completa de endpoints implementados.