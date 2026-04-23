package com.workflow.users;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private String id;
    private String username;
    private String email;
    private String nombreCompleto;
    private String rolId;
    private String rolNombre;        // enriquecido desde RoleRepository
    private String departamento;     // nombre denormalizado del área (para el motor BPMN)
    private String departmentId;     // referencia al Document Department
    private String departmentNombre; // enriquecido desde DepartmentRepository
    private String cargo;
    private String empresaId;
    private boolean activo;
    private LocalDateTime creadoEn;
    // passwordHash NUNCA se incluye en el DTO de respuesta
}
