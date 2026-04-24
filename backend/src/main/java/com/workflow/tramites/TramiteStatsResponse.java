package com.workflow.tramites;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TramiteStatsResponse {

    private long total;
    private long iniciados;
    private long enProceso;
    private long sinAsignar;
    private long completados;
    private long rechazados;
    private long devueltos;
    private long escalados;
    private long cancelados;
    private long enApelacion;
}
