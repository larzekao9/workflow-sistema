package com.workflow.policyrelations;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePoliticaRelacionRequest {

    @NotBlank(message = "El id de la política destino es obligatorio")
    private String politicaDestinoId;

    @NotNull(message = "El tipo de relación es obligatorio")
    private TipoRelacion tipoRelacion;

    @NotNull(message = "La prioridad es obligatoria")
    @Min(value = 1, message = "La prioridad mínima es 1 (1 = mayor prioridad)")
    private Integer prioridad;

    /** Explicación legible orientada al diseñador de por qué existe la relación. */
    private String descripcion;
}
