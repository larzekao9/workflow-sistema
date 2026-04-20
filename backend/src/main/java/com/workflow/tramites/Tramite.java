package com.workflow.tramites;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tramites")
@CompoundIndexes({
    @CompoundIndex(name = "idx_cliente_estado", def = "{'cliente_id': 1, 'estado': 1}"),
    @CompoundIndex(name = "idx_etapa_rol", def = "{'etapa_actual.responsable_rol_nombre': 1, 'estado': 1}"),
    @CompoundIndex(name = "idx_politica_estado", def = "{'politica_id': 1, 'estado': 1}"),
    @CompoundIndex(name = "idx_etapa_rol_asignado", def = "{'etapa_actual.responsable_rol_nombre': 1, 'asignado_a_id': 1}")
})
public class Tramite {

    public enum EstadoTramite {
        INICIADO, EN_PROCESO, COMPLETADO, RECHAZADO, CANCELADO, DEVUELTO, ESCALADO
    }

    // -----------------------------------------------------------------------
    // Clases embebidas
    // -----------------------------------------------------------------------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EtapaActual {
        @Field("actividad_bpmn_id")
        private String actividadBpmnId;

        @Field("nombre")
        private String nombre;

        @Field("responsable_rol_nombre")
        private String responsableRolNombre;

        @Field("formulario_id")
        private String formularioId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistorialEntry {
        @Field("actividad_bpmn_id")
        private String actividadBpmnId;

        @Field("actividad_nombre")
        private String actividadNombre;

        @Field("responsable_id")
        private String responsableId;

        @Field("responsable_nombre")
        private String responsableNombre;

        @Field("accion")
        private String accion;

        @Field("timestamp")
        private LocalDateTime timestamp;

        @Field("observaciones")
        private String observaciones;
    }

    // -----------------------------------------------------------------------
    // Campos del documento
    // -----------------------------------------------------------------------

    @Id
    private String id;

    @Field("politica_id")
    @Indexed
    private String politicaId;

    @Field("politica_nombre")
    private String politicaNombre;

    @Field("politica_version")
    private Integer politicaVersion;

    @Field("cliente_id")
    @Indexed
    private String clienteId;

    @Field("cliente_nombre")
    private String clienteNombre;

    @Field("asignado_a_id")
    @Indexed
    private String asignadoAId;

    @Field("asignado_a_nombre")
    private String asignadoANombre;

    @Field("estado")
    @Builder.Default
    private EstadoTramite estado = EstadoTramite.INICIADO;

    @Field("etapa_actual")
    private EtapaActual etapaActual;

    @Field("historial")
    @Builder.Default
    private List<HistorialEntry> historial = new ArrayList<>();

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;

    @Field("fecha_vencimiento_etapa")
    private LocalDateTime fechaVencimientoEtapa;
}
