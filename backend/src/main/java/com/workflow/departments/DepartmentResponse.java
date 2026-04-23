package com.workflow.departments;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponse {

    private String id;
    private String nombre;
    private String descripcion;
    private String responsable;
    private boolean activa;
    private String empresaId;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}
