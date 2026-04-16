package com.workflow.policies;

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
@Document(collection = "politicas")
@CompoundIndexes({
    @CompoundIndex(name = "idx_nombre_estado", def = "{'nombre': 1, 'estado': 1}"),
    @CompoundIndex(name = "idx_estado_creado", def = "{'estado': 1, 'creado_en': -1}")
})
public class Politica {

    public enum EstadoPolitica {
        BORRADOR, ACTIVA, INACTIVA, ARCHIVADA
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Metadatos {
        @Field("tags")
        @Builder.Default
        private List<String> tags = new ArrayList<>();

        @Field("icono")
        private String icono;

        @Field("color")
        private String color;
    }

    @Id
    private String id;

    @Field("nombre")
    private String nombre;

    @Field("descripcion")
    private String descripcion;

    @Field("version")
    @Builder.Default
    private Integer version = 1;

    @Field("version_padre_id")
    @Indexed
    private String versionPadreId;

    @Field("estado")
    @Builder.Default
    private EstadoPolitica estado = EstadoPolitica.BORRADOR;

    @Field("actividad_inicio_id")
    private String actividadInicioId;

    @Field("actividad_ids")
    @Builder.Default
    private List<String> actividadIds = new ArrayList<>();

    @Field("metadatos")
    @Builder.Default
    private Metadatos metadatos = new Metadatos();

    // Requerido por relaciones de tipo ESCALAMIENTO: define el SLA máximo de la política en días
    @Field("tiempo_limite_dias")
    private Integer tiempoLimiteDias;

    @Field("creado_por_id")
    @Indexed
    private String creadoPorId;

    @Field("departamento")
    private String departamento;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;

    @Field("bpmn_xml")
    private String bpmnXml;

    @Field("bpmn_version")
    @Builder.Default
    private Integer bpmnVersion = 0;
}
