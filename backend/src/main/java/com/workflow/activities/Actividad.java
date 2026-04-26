package com.workflow.activities;

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
@Document(collection = "actividades")
@CompoundIndexes({
    @CompoundIndex(name = "idx_politica_tipo", def = "{'politica_id': 1, 'tipo': 1}")
})
public class Actividad {

    public enum TipoActividad {
        INICIO, TAREA, DECISION, FIN
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Posicion {
        @Field("x")
        private Double x;

        @Field("y")
        private Double y;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Transicion {

        @Field("actividad_destino_id")
        private String actividadDestinoId;

        // Condiciones posibles: SIEMPRE | APROBADO | RECHAZADO | cualquier string libre
        @Field("condicion")
        private String condicion;

        @Field("etiqueta")
        private String etiqueta;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampoActividad {
        private String nombre;   // key del campo
        private String label;
        private String tipo;     // TEXT, NUMBER, DATE, FILE, SELECT, TEXTAREA, BOOLEAN
        private boolean required;
        private List<String> opciones; // solo para SELECT
    }

    @Id
    private String id;

    @Field("politica_id")
    @Indexed
    private String politicaId;

    @Field("nombre")
    private String nombre;

    @Field("descripcion")
    private String descripcion;

    @Field("tipo")
    private TipoActividad tipo;

    @Field("responsable_rol_id")
    @Indexed
    private String responsableRolId;

    @Field("formulario_id")
    @Indexed
    private String formularioId;

    @Field("cargo_requerido")
    private String cargoRequerido;

    @Field("department_id")
    private String departmentId;

    @Field("posicion")
    @Builder.Default
    private Posicion posicion = new Posicion(0.0, 0.0);

    @Field("transiciones")
    @Builder.Default
    private List<Transicion> transiciones = new ArrayList<>();

    @Field("tiempo_limite_horas")
    private Integer tiempoLimiteHoras;

    @Field("acciones_permitidas")
    @Builder.Default
    private List<String> accionesPermitidas = new ArrayList<>();

    @Field("campos")
    @Builder.Default
    private List<CampoActividad> campos = new ArrayList<>();

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;
}
