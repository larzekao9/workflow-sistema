package com.workflow.users;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    // Todos los campos son opcionales — solo se actualizan los que vienen con valor
    private String nombreCompleto;
    private String rolId;
    private String departmentId;
    private String cargo;
    private Boolean activo;
    private String empresaId;
}
