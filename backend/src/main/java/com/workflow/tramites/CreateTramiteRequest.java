package com.workflow.tramites;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTramiteRequest {

    @NotBlank(message = "El ID de la política es obligatorio")
    private String politicaId;
}
