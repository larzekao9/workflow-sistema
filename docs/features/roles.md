# roles — CRUD de roles
Estado: ✓ terminada | Sprint 1
Endpoints: GET/POST /roles, GET/PUT/DELETE /roles/{id} (ver api-contract.md)
DB: colección `roles`, permisos embebidos como lista de strings
Regla clave: nombre único; roles con usuarios asignados no deberían eliminarse sin verificación
Frontend: componente lista + formulario con Angular Material
QA: ✓ revisado Sprint 1
