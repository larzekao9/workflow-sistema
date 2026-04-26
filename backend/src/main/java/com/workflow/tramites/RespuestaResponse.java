package com.workflow.tramites;

import com.workflow.files.FileReference;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class RespuestaResponse {
    private String actividadBpmnId;
    private String actividadNombre;
    private String responsableId;
    private String responsableNombre;
    private String accion;
    private Map<String, Object> datos;
    private List<FileReference> documentosAdjuntos;
    private LocalDateTime timestamp;
}
