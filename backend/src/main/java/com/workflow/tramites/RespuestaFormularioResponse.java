package com.workflow.tramites;

import com.workflow.files.FileReference;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO de salida para RespuestaFormulario. Nunca expone el Document directamente.
 */
@Value
@Builder
public class RespuestaFormularioResponse {

    String id;
    String tramiteId;
    String actividadId;
    String actividadNombre;
    String usuarioId;
    String usuarioNombre;
    String rolUsuario;
    Map<String, Object> campos;
    List<FileReference> archivos;
    String accion;
    LocalDateTime timestamp;

    public static RespuestaFormularioResponse fromDocument(RespuestaFormulario doc) {
        return RespuestaFormularioResponse.builder()
                .id(doc.getId())
                .tramiteId(doc.getTramiteId())
                .actividadId(doc.getActividadId())
                .actividadNombre(doc.getActividadNombre())
                .usuarioId(doc.getUsuarioId())
                .usuarioNombre(doc.getUsuarioNombre())
                .rolUsuario(doc.getRolUsuario())
                .campos(doc.getCampos())
                .archivos(doc.getArchivos())
                .accion(doc.getAccion())
                .timestamp(doc.getTimestamp())
                .build();
    }
}
