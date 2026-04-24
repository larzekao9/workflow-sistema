package com.workflow.tramites;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ResponderTramiteRequest {

    private String observaciones;

    /** Datos de formulario enviados por el cliente al responder (campos form-js). */
    private Map<String, Object> camposFormulario;

    /** IDs de archivos previamente subidos que se adjuntan a esta respuesta. */
    private List<String> archivosIds;
}
