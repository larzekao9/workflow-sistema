# auth — registro y login
Estado: ✓ terminada | Sprint 1
Endpoints: POST /auth/register, POST /auth/login (ver api-contract.md)
DB: colección `usuarios` + `roles` (referencia por rolId)
Regla clave: email es el identificador de Spring Security; password nunca sale en DTO de respuesta
QA: ✓ revisado Sprint 1
