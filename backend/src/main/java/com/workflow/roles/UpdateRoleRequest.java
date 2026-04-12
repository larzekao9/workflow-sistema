package com.workflow.roles;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRoleRequest {

    // Todos los campos son opcionales — solo se actualizan los que vienen con valor
    private String descripcion;
    private List<String> permisos;
    private Boolean activo;
}
