# Skill: feature-checklist

## Cuándo se usa
Antes de declarar una feature como terminada. Gate liviano por feature,
más rápido que qa-reviewer completo.

## Checklist que ejecutás

### Backend
- [ ] Endpoint registrado en `docs/api-contract.md`
- [ ] RequestDTO tiene validaciones (@NotBlank, @Email, etc.)
- [ ] ResponseDTO no expone campos sensibles (sin passwords, sin datos internos)
- [ ] Errores manejados con excepción específica (no 500 genérico)
- [ ] Si avanza estado de un trámite: genera registro en `historial_tramites`

### Frontend
- [ ] Service HTTP consume la URL desde `environment.ts`, no hardcodeada
- [ ] Los campos del request coinciden con lo definido en `docs/api-contract.md`
- [ ] Manejo de error en la llamada HTTP (no solo happy path)
- [ ] Interceptor JWT no fue recreado (ya existe en shared/)

### Integración
- [ ] Los nombres de campo en frontend coinciden exactamente con el ResponseDTO del backend
- [ ] Si hay campo nuevo en MongoDB: está en `docs/db-schema-notes.md`

## Output esperado
Lista con ✓ o ✗ por ítem. Si hay ✗, describir qué falta y dónde corregirlo.
No avanzar a la siguiente feature hasta que todos los ítems sean ✓.
