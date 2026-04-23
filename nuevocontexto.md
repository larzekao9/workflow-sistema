# Sistema de Trámites con MongoDB - Idea Completa

## 1. Los 4 Actores del Sistema

El sistema tiene exactamente **4 actores fijos**, sin roles complejos adicionales:

### **Superadmin**
- Cargo: `null` (no pertenece a ninguna empresa)
- Acceso: Global, a todo el sistema
- Funciones: Gestión de empresas, ver estadísticas globales

### **Admin (por empresa)**
- Cargo: `"admin"`
- Acceso: Su empresa
- Funciones:
  - Crear y editar políticas (flujos BPMN)
  - Crear y editar actividades
  - Crear formularios
  - Ver reportes de su empresa
  - Gestionar funcionarios de su empresa

### **Funcionario (por empresa y departamento)**
- Cargo: Flexible (ej: `"jefe de área"`, `"revisor"`, `"supervisor"`, `"asistente"`)
- Acceso: Su empresa, su departamento
- Funciones:
  - Revisar trámites asignados
  - Aprobar o denegar trámites
  - Agregar observaciones
  - Ver historial de sus decisiones

### **Cliente**
- Cargo: `"cliente"`
- Acceso: Solo sus propios trámites
- Funciones:
  - Iniciar trámites
  - Llenar formularios
  - Ver estado de sus trámites en tiempo real
  - Apelar decisiones denegadas (en 2 días)
  - Subir documentos en la apelación

---

## 2. Schema MongoDB - Cambios Necesarios

### Colecciones existentes (sin cambios):
- `usuarios`
- `roles`
- `departamentos`
- `politicas`
- `actividades`
- `formularios`
- `decisiones`
- `politica_relaciones`

### Nuevas colecciones:
- `empresas`

### Cambios a colecciones existentes:

#### **usuarios**
```
Agregar:
  - empresa_id: String (ref → empresas, null si superadmin)
  
Nota: "cargo" ya existe y se usa tal cual
```

#### **departamentos**
```
Agregar:
  - empresa_id: String (ref → empresas)
```

#### **actividades**
```
Agregar:
  - cargo_requerido: String 
    Ej: "jefe de área", "revisor"
    Define quién (qué cargo) puede ejecutar esta actividad
    
  - department_id: String (ref → departamentos)
    Qué área ejecuta la actividad
```

#### **tramites**
```
Estados posibles:
  - INICIADO
  - EN_PROCESO
  - COMPLETADO
  - RECHAZADO
  - DEVUELTO
  - ESCALADO
  - EN_APELACION (NUEVO)

Agregar campos:
  
  apelacion: {
    activa: Boolean,
    fecha_inicio: DateTime,
    fecha_limite: DateTime (fecha_inicio + 2 días),
    observaciones_originales: String,
    documentos_apelatoria: [String],
    estado: String (EN_REVISION / APROBADO / DENEGADO)
  }
  
  historial[].responsable_cargo: String
    Agrega el cargo de quién hizo la acción
    
  historial[].documentos_adjuntos: [String]
    Documentos cargados en esa etapa
```

#### **empresas** (NUEVA COLECCIÓN)
```
{
  _id: ObjectId,
  nombre: String,
  razon_social: String,
  nit: String,
  email_contacto: String,
  telefono: String,
  direccion: String,
  ciudad: String,
  pais: String,
  activa: Boolean,
  admin_principal_id: String (ref → usuarios),
  creado_en: DateTime,
  actualizado_en: DateTime
}
```

---

## 3. Flujo: Cómo Admin Crea una Política

### Paso 1: Admin abre el editor BPMN
- Elige crear una nueva política o editar una existente

### Paso 2: Diseña el flujo visual
- Dibuja actividades (nodos) en el editor BPMN
- Define transiciones entre actividades (flechas)

### Paso 3: Para CADA actividad, especifica:
1. **Nombre**: Ej: "Revisar Solicitud", "Aprobar Pago"
2. **Descripción**: Qué hace esa etapa
3. **Departamento**: Qué área la ejecuta
4. **Cargo requerido**: Qué cargo debe tener el funcionario (ej: "jefe de área")
5. **Formulario**: Qué datos debe llenar el cliente (si aplica)
6. **Transiciones**:
   - Si se aprueba → siguiente actividad o FIN
   - Si se deniega → notificación o FIN
7. **SLA (opcional)**: Cuántos días/horas tiene para decidir

### Paso 4: Publica la política
- Queda disponible para que clientes inicien trámites

---

## 4. Flujo: Cliente Inicia un Trámite

### Paso 1: Cliente selecciona una política publicada
- Ve la descripción de qué es el trámite

### Paso 2: Inicia el trámite
```
Sistema:
  1. Crea documento en "tramites" con estado = INICIADO
  2. Obtiene la actividad inicial (START)
  3. Lee: 
     - department_id
     - cargo_requerido
  4. Busca funcionarios donde:
     - department_id == actividad.department_id
     - cargo == actividad.cargo_requerido
     - rol == "funcionario"
     - empresa_id == empresa del cliente
     - activo == true
  5. Asigna el trámite a un funcionario encontrado
     (si hay varios: decidir estrategia - round robin, menor carga, etc.)
  6. Cambia estado a EN_PROCESO
```

### Paso 3: Cliente ve el formulario y carga documentos
- El sistema muestra el formulario de esa actividad
- Cliente carga sus documentos
- El sistema valida según las reglas del formulario

---

## 5. Flujo: Funcionario Revisa y Decide

### Paso 1: Funcionario recibe la tarea asignada
- Ve la lista de trámites en su bandeja
- Abre uno y ve:
  - Documentos del cliente
  - Formulario que completó
  - Observaciones de etapas anteriores (si existen)

### Paso 2: Revisa y decide
- **Opción A: Aprueba**
  - Agrega (opcionalmente) observaciones
  - El sistema:
    1. Registra la decisión en historial
    2. Obtiene la actividad siguiente
    3. Busca funcionario para esa actividad
    4. Asigna el trámite a ese funcionario
    5. Cambia estado a EN_PROCESO
    6. Si no hay siguiente actividad → estado = COMPLETADO

- **Opción B: Deniega**
  - Agrega observaciones (OBLIGATORIO)
  - El sistema:
    1. Registra la decisión en historial
    2. Cambia estado a EN_APELACION
    3. Crea apelacion.fecha_limite = hoy + 2 días
    4. Notifica al cliente

---

## 6. Flujo: Apelación (2 Días)

### Paso 1: Cliente recibe la denegatoria
- Ve las observaciones del funcionario
- Recibe notificación con plazo de 2 días

### Paso 2: Cliente decide si apelar
- **Opción A: No apela**
  - El sistema marca estado = RECHAZADO
  - Trámite termina

- **Opción B: Apela (dentro de 2 días)**
  - Cliente ve un formulario especial para apelación
  - Puede:
    1. Ver las observaciones originales
    2. Cargar nuevos documentos corrigiendo lo solicitado
    3. Escribir justificación (opcional)
  - El sistema:
    1. Registra los documentos en apelacion.documentos_apelatoria
    2. Cambia apelacion.estado = EN_REVISION
    3. Busca funcionario para revisar apelación
    4. Asigna la apelación a ese funcionario

### Paso 3: Funcionario revisa la apelación
- Ve:
  - Observaciones originales
  - Nuevos documentos del cliente
  - Justificación

- **Opción A: Aprueba apelación**
  - El sistema:
    1. Registra en historial
    2. Los documentos de apelación se convierten en los documentos de la etapa
    3. Continúa con la siguiente actividad (mismo flujo que aprobación normal)
    4. Cambia apelacion.estado = APROBADO

- **Opción B: Deniega apelación**
  - El sistema:
    1. Registra en historial
    2. Cambia estado = RECHAZADO
    3. Cambia apelacion.estado = DENEGADO
    4. Trámite termina (sin más apelaciones)

---

## 7. Vista del Cliente: Dashboard de Estado

### Lo que el cliente VE en su portal:

#### **Sección 1: Estado Actual**
```
Estado: EN PROCESO / DENEGADO / EN APELACIÓN / COMPLETADO

Ubicación actual:
  - Actividad: "Revisar Solicitud"
  - Área: Departamento de Trámites
  - Responsable: Jefe de Área
  - Vence: 17 de abril (SLA)
```

#### **Sección 2: Timeline / Historial**
```
✅ Trámite iniciado
   15 de abril, 10:30 AM

✅ Documentos recibidos
   15 de abril, 11:15 AM

⏳ En revisión (ACTUAL)
   Desde: 15 de abril, 11:20 AM
   Vence: 17 de abril, 11:20 AM

⏸ Siguiente paso (pendiente)
   Esperando decisión...
```

Cada entrada del timeline muestra:
- Qué pasó
- Cuándo pasó
- Quién lo hizo (si aplica)
- Observaciones (si las hay)

#### **Sección 3: Acciones Disponibles**

| Estado | Acciones |
|--------|----------|
| EN_PROCESO | Ver estado, descargar formulario, ver SLA |
| DENEGADO | Ver observaciones, **APELAR** (botón si está dentro de 2 días) |
| EN_APELACION | Ver timer de 2 días, subir documentos, ver SLA de apelación |
| COMPLETADO | Descargar resultado final, ver todo el historial |
| RECHAZADO | Ver historial completo, contactar soporte |

#### **Notificaciones**
El cliente recibe notificaciones cuando:
- Su trámite es **asignado** a un funcionario
- Su trámite es **aprobado** y pasa a siguiente etapa
- Su trámite es **denegado**
- Su apelación es **aprobada**
- Su apelación es **denegada**
- El **plazo de 2 días** está por vencer (recordatorio)

---

## 8. Resumen de Decisiones Tomadas

### **Arquitectura de usuarios**
- 4 actores fijos: Superadmin, Admin, Funcionario, Cliente
- No hay múltiples roles por usuario (1 usuario = 1 rol)
- El "cargo" es flexible y define qué actividades puede ejecutar un funcionario

### **Asignación de funcionarios**
- Cada actividad especifica: departamento + cargo requerido
- El sistema busca automáticamente al funcionario disponible
- **PENDIENTE**: Definir estrategia si hay múltiples funcionarios con el mismo cargo en el mismo departamento (round-robin, menor carga, manual)

### **Apelación**
- Plazo fijo: **2 días** desde la denegatoria
- Sin límite de apelaciones por etapa (solo 1 apelación por denegatoria)
- Si deniega en apelación → trámite se rechaza sin más recursos
- Los documentos apelados reemplazan los originales si se aprueba

### **Flujo de aprobación**
- Lineal: cada aprobación pasa a la siguiente actividad
- Cada nueva actividad busca el funcionario correspondiente
- Si no hay siguiente actividad → trámite completado

### **Visibilidad del cliente**
- Panel de estado en tiempo real
- Timeline completo del trámite
- Notificaciones en cada cambio importante
- Acceso solo a sus propios trámites

---

## 9. Próximos Pasos (No definidos aún)

1. **Estrategia de asignación**: ¿Qué pasa si hay 3 "jefes de área"? ¿Round-robin? ¿Menor carga?
2. **Escalaciones**: ¿Pueden escalar a un superior si algo se demora?
3. **Búsqueda de políticas**: ¿El cliente ve todas o está categorizadas?
4. **Reportes**: ¿Qué reportes necesita admin? ¿KPIs?
5. **Integraciones**: ¿Envío de correos, SMS, webhooks?
6. **Archivo**: ¿Cuánto tiempo guardar trámites completados?
7. **Revisión de apelaciones**: ¿Siempre la revisa el mismo funcionario o es aleatorio/rotativo?

---

## 10. Ejemplo Concreto Paso a Paso

### **Contexto**
- Empresa: "Municipalidad de La Paz"
- Cliente: Juan García (cédula 12345678)
- Política: "Licencia de Conducir - Renovación"

### **Paso 1: Juan inicia trámite**
```
Juan entra al portal → selecciona "Licencia de Conducir"
Sistema:
  - Crea trámite: estado = INICIADO
  - Activ inicial = "Revisar Requisitos"
  - Busca: funcionario en "Área de Licencias" con cargo "revisor"
  - Encuentra: María Rodríguez (cargo: "revisor", área: "Licencias")
  - Asigna: trámite → María
  - Estado cambia a EN_PROCESO
  
Juan ve:
  - Formulario para "Revisar Requisitos"
  - Carga: cédula, foto, comprobante de domicilio
  - Envía
```

### **Paso 2: María revisa**
```
María abre su bandeja → ve "Licencia - Juan García"
María:
  - Ve los 3 documentos
  - Los revisa
  - Falta comprobante de domicilio actualizado → DENIEGA
  - Agrega observación: "El comprobante debe ser de los últimos 3 meses"
  
Sistema:
  - Registra rechazo en historial
  - Estado → EN_APELACION
  - apelacion.fecha_limite = hoy + 2 días
  - Notifica a Juan
```

### **Paso 3: Juan ve la denegatoria**
```
Juan recibe notificación
Juan abre su trámite:
  - Estado: EN_APELACION
  - Ve observación: "El comprobante debe ser de los últimos 3 meses"
  - Timer: 2 días para apelar
  - Opción: "Apelar con nuevos documentos"
```

### **Paso 4: Juan apela (día 1)**
```
Juan:
  - Hace click en "Apelar"
  - Ve un formulario especial
  - Carga nuevo comprobante de domicilio (más reciente)
  - Escribe: "Aquí está el comprobante actualizado"
  - Envía apelación
  
Sistema:
  - Guarda documentos en apelacion.documentos_apelatoria
  - apelacion.estado = EN_REVISION
  - Busca otro funcionario o el mismo para revisar apelación
  - Asigna la apelación
  - Notifica al funcionario
```

### **Paso 5: María revisa la apelación**
```
María ve: "Apelación de Juan García"
  - Ve observación original
  - Ve nuevo comprobante → VÁLIDO
  - APRUEBA apelación
  
Sistema:
  - apelacion.estado = APROBADO
  - Los documentos de apelación se convierten en los del trámite
  - Obtiene siguiente actividad = "Realizar Prueba"
  - Busca funcionario: área "Licencias", cargo "examinador"
  - Encuentra: Carlos Pérez
  - Asigna: trámite → Carlos
  - Estado → EN_PROCESO
  - Notifica a Juan
```

### **Paso 6: Juan completa la prueba**
```
Juan:
  - Ve que pasó a "Realizar Prueba"
  - Ve nuevo formulario para cargar resultados de prueba
  - Carga su examen (completado presencialmente con Carlos)
  
Carlos:
  - Revisa
  - Aprueba
  
Sistema:
  - No hay más actividades
  - Estado → COMPLETADO
  - Juan puede descargar su licencia en PDF
```

### **Timeline de Juan:**
```
✅ Trámite iniciado: 15 de abril, 10:30 AM
✅ Documentos recibidos: 15 de abril, 11:15 AM
❌ Denegado: 15 de abril, 14:00 PM
   "Comprobante debe ser de los últimos 3 meses"
✅ Apelación enviada: 16 de abril, 09:00 AM
✅ Apelación aprobada: 16 de abril, 15:30 PM
✅ Pasó a prueba: 16 de abril, 15:35 PM
✅ Prueba completada: 17 de abril, 10:00 AM
✅ Trámite completado: 17 de abril, 11:00 AM
   ✨ Licencia lista para descargar
```

---

**FIN DEL DOCUMENTO**