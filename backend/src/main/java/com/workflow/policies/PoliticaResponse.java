package com.workflow.policies;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoliticaResponse {

    private String id;
    private String nombre;
    private String descripcion;
    private Integer version;
    private String versionPadreId;
    private String estado;
    private String actividadInicioId;
    private List<String> actividadIds;
    private MetadatosResponse metadatos;
    private String creadoPorId;
    private String departamento;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetadatosResponse {
        private List<String> tags;
        private String icono;
        private String color;
    }
}
