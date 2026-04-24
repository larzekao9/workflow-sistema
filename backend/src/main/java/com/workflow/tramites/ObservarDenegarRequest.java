package com.workflow.tramites;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ObservarDenegarRequest {

    @NotBlank(message = "El motivo es obligatorio")
    private String motivo;

    /** IDs de archivos ya subidos vía /files — opcional */
    private List<String> documentosIds;
}
