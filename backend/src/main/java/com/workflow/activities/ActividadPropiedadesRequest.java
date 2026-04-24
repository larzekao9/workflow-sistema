package com.workflow.activities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActividadPropiedadesRequest {

    private String nombre;

    private String descripcion;

    /** ID del departamento (mapeado a departmentId en la entidad). */
    private String area;

    private String cargoRequerido;

    private String formularioId;

    private Integer slaHoras;

    private List<String> accionesPermitidas;
}
