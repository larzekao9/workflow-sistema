package com.workflow.policyrelations;

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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "politica_relaciones")
@CompoundIndexes({
    // Unicidad del par (origen, destino, tipo): impide duplicados; el driver lanza DuplicateKeyError
    @CompoundIndex(
        name = "idx_unique_origen_destino_tipo",
        def = "{'politica_origen_id': 1, 'politica_destino_id': 1, 'tipo_relacion': 1}",
        unique = true
    ),
    // Query crítica del motor: relaciones activas que parten de una política
    @CompoundIndex(name = "idx_origen_activo", def = "{'politica_origen_id': 1, 'activo': 1}"),
    // Consulta inversa: qué políticas afectan a esta
    @CompoundIndex(name = "idx_destino_activo", def = "{'politica_destino_id': 1, 'activo': 1}"),
    // Consultas de análisis operacional por tipo
    @CompoundIndex(name = "idx_tipo_activo", def = "{'tipo_relacion': 1, 'activo': 1}")
})
public class PoliticaRelacion {

    @Id
    private String id;

    @Field("politica_origen_id")
    private String politicaOrigenId;

    @Field("politica_destino_id")
    private String politicaDestinoId;

    @Field("tipo_relacion")
    private TipoRelacion tipoRelacion;

    /** Orden de resolución cuando múltiples relaciones aplican al mismo par; 1 = mayor prioridad. */
    @Field("prioridad")
    private Integer prioridad;

    @Field("descripcion")
    private String descripcion;

    /** false desactiva la relación sin borrado físico (trazabilidad). */
    @Field("activo")
    @Builder.Default
    private boolean activo = true;

    @Field("creado_por_id")
    @Indexed
    private String creadoPorId;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;
}
