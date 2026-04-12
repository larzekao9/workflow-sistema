package com.workflow.activities;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateActividadRequest {

    @NotBlank(message = "El politicaId es obligatorio")
    private String politicaId;

    @NotBlank(message = "El nombre de la actividad es obligatorio")
    private String nombre;

    private String descripcion;

    @NotNull(message = "El tipo de actividad es obligatorio")
    private Actividad.TipoActividad tipo;

    // Obligatorio para nodos TAREA; opcional para otros tipos
    private String responsableRolId;

    private String formularioId;

    @Valid
    @Builder.Default
    private PosicionRequest posicion = new PosicionRequest(0.0, 0.0);

    @Valid
    @Builder.Default
    private List<TransicionRequest> transiciones = new ArrayList<>();

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
        @NotBlank(message = "El actividadDestinoId en una transición es obligatorio")
        private String actividadDestinoId;

        @NotBlank(message = "La condición de la transición es obligatoria")
        private String condicion;

        private String etiqueta;
    }
}
