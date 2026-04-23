# Datos locales — workflow-sistema (2026-04-23)

## Usuarios de prueba
| Email | Password | Rol |
|---|---|---|
| admin@workflow.com | Admin2024! | ADMINISTRADOR |
| carlos.mendez@empresa.com | User2024! | FUNCIONARIO |
| lucia.vargas@empresa.com | User2024! | FUNCIONARIO |
| sofia.ramos@gmail.com | User2024! | CLIENTE |
| miguel.torres@gmail.com | User2024! | CLIENTE |
| cliente@gmail.com | Admin2024! | CLIENTE (seed telecom) |

## Política demo activa
**"Solicitud de Licencia o Permiso"** — ID: `69e4f5cbf5d4e243da993d1a`

Formularios vinculados:
- `Task_CompletarSolicitud` → ROL:CLIENTE → Form `69e4f5cbf5d4e243da993d17`
- `Task_RevisionFuncionario` → ROL:FUNCIONARIO → Form `69e4f5cbf5d4e243da993d18`
- `Task_AprobacionAdmin` → ROL:ADMINISTRADOR → Form `69e4f5cbf5d4e243da993d19`

## Ciclos verificados en producción
1. ✅ COMPLETADO: Cliente inicia → completa → Funcionario revisa → Admin aprueba
2. ✅ DEVUELTO→EN_PROCESO: Funcionario devuelve → Cliente corrige
3. ✅ RECHAZADO: Funcionario rechaza con justificación

## Seed Telecom
Script: `seed_telecom.py` — pobla departamentos, formularios, BPMN de los 3 procesos, usuarios con área y trámites demo para la empresa telco.
