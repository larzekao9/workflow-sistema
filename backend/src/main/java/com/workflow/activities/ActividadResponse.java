package com.workflow.activities;

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
public class ActividadResponse {

    private String id;
    private String politicaId;
    private String nombre;
    private String descripcion;
    private String tipo;
    private String responsableRolId;
    private String formularioId;
    private PosicionResponse posicion;
    private List<TransicionResponse> transiciones;
    private Integer tiempoLimiteHoras;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PosicionResponse {
        private Double x;
        private Double y;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransicionResponse {
        private String actividadDestinoId;
        private String condicion;
        private String etiqueta;
    }
}
