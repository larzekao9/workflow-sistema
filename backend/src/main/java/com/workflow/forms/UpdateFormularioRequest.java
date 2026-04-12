package com.workflow.forms;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateFormularioRequest {

    @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
    private String nombre;

    private String descripcion;

    // Null = no modificar; lista vacía = rechazado por la validación de negocio en el servicio
    @Valid
    private List<SeccionRequest> secciones;

    // -----------------------------------------------------------------------
    // DTOs anidados — misma estructura que en CreateFormularioRequest
    // -----------------------------------------------------------------------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeccionRequest {

        private String titulo;
        private Integer orden;

        @Valid
        private List<CampoRequest> campos;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampoRequest {

        private String nombre;
        private String etiqueta;
        private Formulario.TipoCampo tipo;
        private Boolean obligatorio;
        private Integer orden;
        private String placeholder;
        private Object valorDefecto;

        @Valid
        private ValidacionRequest validaciones;

        private List<OpcionRequest> opciones;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidacionRequest {
        private Double min;
        private Double max;
        private String pattern;
        private String mensajeError;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpcionRequest {
        private String valor;
        private String etiqueta;
    }
}
