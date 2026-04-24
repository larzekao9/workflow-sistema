package com.workflow.tramites;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AsignarManualRequest {

    @NotBlank(message = "El ID del funcionario es obligatorio")
    private String funcionarioId;
}
