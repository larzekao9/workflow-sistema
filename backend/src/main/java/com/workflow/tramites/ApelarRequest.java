package com.workflow.tramites;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApelarRequest {

    @NotBlank(message = "La justificación es obligatoria")
    private String justificacion;

    /** IDs de FileReference ya subidos vía /files — opcional */
    private List<String> documentosIds;
}
