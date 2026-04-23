package com.workflow.tramites;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TramiteResponse {

    private String id;
    private String politicaId;
    private String politicaNombre;
    private Integer politicaVersion;
    private String clienteId;
    private String clienteNombre;
    private String asignadoAId;
    private String asignadoANombre;
    private String estado;
    private EtapaActualDTO etapaActual;
    private List<HistorialEntryDTO> historial;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
    private LocalDateTime fechaVencimientoEtapa;

    @Data
    @Builder
    public static class EtapaActualDTO {
        private String actividadBpmnId;
        private String nombre;
        private String responsableRolNombre;
        private String formularioId;
        private String area;
    }

    @Data
    @Builder
    public static class HistorialEntryDTO {
        private String actividadBpmnId;
        private String actividadNombre;
        private String responsableId;
        private String responsableNombre;
        private String accion;
        private LocalDateTime timestamp;
        private String observaciones;
    }

    // -----------------------------------------------------------------------
    // Método de conversión desde el documento
    // -----------------------------------------------------------------------

    public static TramiteResponse fromDocument(Tramite tramite) {
        return TramiteResponse.builder()
                .id(tramite.getId())
                .politicaId(tramite.getPoliticaId())
                .politicaNombre(tramite.getPoliticaNombre())
                .politicaVersion(tramite.getPoliticaVersion())
                .clienteId(tramite.getClienteId())
                .clienteNombre(tramite.getClienteNombre())
                .asignadoAId(tramite.getAsignadoAId())
                .asignadoANombre(tramite.getAsignadoANombre())
                .estado(tramite.getEstado().name())
                .etapaActual(mapEtapa(tramite.getEtapaActual()))
                .historial(mapHistorial(tramite.getHistorial()))
                .creadoEn(tramite.getCreadoEn())
                .actualizadoEn(tramite.getActualizadoEn())
                .fechaVencimientoEtapa(tramite.getFechaVencimientoEtapa())
                .build();
    }

    private static EtapaActualDTO mapEtapa(Tramite.EtapaActual etapa) {
        if (etapa == null) return null;
        return EtapaActualDTO.builder()
                .actividadBpmnId(etapa.getActividadBpmnId())
                .nombre(etapa.getNombre())
                .responsableRolNombre(etapa.getResponsableRolNombre())
                .formularioId(etapa.getFormularioId())
                .area(etapa.getArea())
                .build();
    }

    private static List<HistorialEntryDTO> mapHistorial(List<Tramite.HistorialEntry> historial) {
        if (historial == null) return List.of();
        return historial.stream()
                .map(h -> HistorialEntryDTO.builder()
                        .actividadBpmnId(h.getActividadBpmnId())
                        .actividadNombre(h.getActividadNombre())
                        .responsableId(h.getResponsableId())
                        .responsableNombre(h.getResponsableNombre())
                        .accion(h.getAccion())
                        .timestamp(h.getTimestamp())
                        .observaciones(h.getObservaciones())
                        .build())
                .toList();
    }
}
