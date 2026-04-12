package com.workflow.forms;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormularioResponse {

    private String id;
    private String nombre;
    private String descripcion;
    private String estado;
    private List<SeccionResponse> secciones;
    private String creadoPorId;
    private Instant creadoEn;
    private Instant actualizadoEn;

    // -----------------------------------------------------------------------
    // Proyecciones anidadas
    // -----------------------------------------------------------------------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeccionResponse {
        private String id;
        private String titulo;
        private Integer orden;
        private List<CampoResponse> campos;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampoResponse {
        private String id;
        private String nombre;
        private String etiqueta;
        private String tipo;
        private Boolean obligatorio;
        private Integer orden;
        private String placeholder;
        private Object valorDefecto;
        private ValidacionResponse validaciones;
        private List<OpcionResponse> opciones;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidacionResponse {
        private Double min;
        private Double max;
        private String pattern;
        private String mensajeError;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpcionResponse {
        private String valor;
        private String etiqueta;
    }
}
