package com.workflow.decisions;

import jakarta.validation.constraints.NotBlank;

public record SaveDmnRequest(

        @NotBlank(message = "El dmnXml es obligatorio")
        String dmnXml
) {}
