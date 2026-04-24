package com.workflow.tramites;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AvanzarTramiteRequest {

    @NotNull(message = "La acción es obligatoria")
    private AccionTramite accion;

    private String observaciones;

    /** Datos de formulario enviados al avanzar (campos form-js). */
    private Map<String, Object> camposFormulario;

    /** IDs de archivos previamente subidos que se adjuntan a esta acción. */
    private List<String> archivosIds;
}
