package com.workflow.tramites;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class AvanzarTramiteRequest {

    @NotNull(message = "La acción es obligatoria")
    private AccionTramite accion;

    private String observaciones;

    private Map<String, Object> formularioRespuesta;
}
