package com.workflow.roles;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {

    private String id;
    private String nombre;
    private String descripcion;
    private List<String> permisos;
    private boolean activo;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}
