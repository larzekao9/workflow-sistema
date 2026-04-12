package com.workflow.forms;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class CreateFormularioRequest {

    @NotBlank(message = "El nombre del formulario es obligatorio")
    @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
    private String nombre;

    private String descripcion;

    @NotEmpty(message = "El formulario debe tener al menos una sección")
    @Valid
    private List<SeccionRequest> secciones;

    // -----------------------------------------------------------------------
    // DTOs anidados
    // -----------------------------------------------------------------------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeccionRequest {

        @NotBlank(message = "El título de la sección es obligatorio")
        private String titulo;

        @NotNull(message = "El orden de la sección es obligatorio")
        private Integer orden;

        @NotEmpty(message = "Cada sección debe tener al menos un campo")
        @Valid
        private List<CampoRequest> campos;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampoRequest {

        @NotBlank(message = "El nombre del campo es obligatorio")
        private String nombre;

        @NotBlank(message = "La etiqueta del campo es obligatoria")
        private String etiqueta;

        @NotNull(message = "El tipo del campo es obligatorio")
        private Formulario.TipoCampo tipo;

        @NotNull(message = "El flag obligatorio es requerido")
        private Boolean obligatorio;

        @NotNull(message = "El orden del campo es obligatorio")
        private Integer orden;

        private String placeholder;

        private Object valorDefecto;

        @Valid
        private ValidacionRequest validaciones;

        // Requerido para SELECT y MULTISELECT; debe estar vacío o nulo para los demás
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
        @NotBlank(message = "El valor de la opción es obligatorio")
        private String valor;

        @NotBlank(message = "La etiqueta de la opción es obligatoria")
        private String etiqueta;
    }
}
