package com.workflow.decisions;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDecisionRequest(

        @NotBlank(message = "El politicaId es obligatorio")
        String politicaId,

        @NotBlank(message = "El gatewayBpmnId es obligatorio")
        String gatewayBpmnId,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 120, message = "El nombre debe tener entre 2 y 120 caracteres")
        String nombre
) {}
