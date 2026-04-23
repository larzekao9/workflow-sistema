package com.workflow.activities;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateActividadRequest {

    private String nombre;

    private String descripcion;

    private String responsableRolId;

    private String formularioId;

    private String cargoRequerido;

    private String departmentId;

    @Valid
    private PosicionRequest posicion;

    @Valid
    private List<TransicionRequest> transiciones;

    private Integer tiempoLimiteHoras;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PosicionRequest {
        private Double x;
        private Double y;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransicionRequest {
        private String actividadDestinoId;
        private String condicion;
        private String etiqueta;
    }
}
