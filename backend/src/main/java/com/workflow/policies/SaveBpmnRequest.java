package com.workflow.policies;

import jakarta.validation.constraints.NotBlank;

public record SaveBpmnRequest(
        @NotBlank(message = "bpmnXml es requerido") String bpmnXml,
        Integer bpmnVersion
) {}
