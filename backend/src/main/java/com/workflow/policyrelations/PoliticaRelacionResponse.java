package com.workflow.policyrelations;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoliticaRelacionResponse {

    private String id;
    private String politicaOrigenId;
    private String politicaDestinoId;
    private String tipoRelacion;
    private Integer prioridad;
    private String descripcion;
    private boolean activo;
    private String creadoPorId;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;

    /** Nombre legible de la política origen, resuelto por el servicio (no almacenado en el documento). */
    private String politicaOrigenNombre;

    /** Nombre legible de la política destino, resuelto por el servicio (no almacenado en el documento). */
    private String politicaDestinoNombre;
}
