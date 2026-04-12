package com.workflow.forms;

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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "formularios")
@CompoundIndexes({
    @CompoundIndex(name = "idx_nombre_estado", def = "{'nombre': 1, 'estado': 1}"),
    @CompoundIndex(name = "idx_estado_actualizado", def = "{'estado': 1, 'actualizado_en': -1}")
})
public class Formulario {

    public enum EstadoFormulario {
        ACTIVO, INACTIVO
    }

    public enum TipoCampo {
        TEXT, NUMBER, DATE, BOOLEAN, SELECT, MULTISELECT, TEXTAREA, FILE, EMAIL
    }

    // -----------------------------------------------------------------------
    // Clases embebidas
    // -----------------------------------------------------------------------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidacionCampo {
        // Para TEXT/TEXTAREA: longitud mín/máx; NUMBER: valor mín/máx;
        // MULTISELECT: cantidad mín/máx; FILE: tamaño en bytes
        @Field("min")
        private Double min;

        @Field("max")
        private Double max;

        // Para TEXT/EMAIL: regex; para FILE: lista de MIME types separados por coma
        @Field("pattern")
        private String pattern;

        @Field("mensaje")
        private String mensajeError;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpcionCampo {
        @Field("valor")
        private String valor;

        @Field("etiqueta")
        private String etiqueta;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampoFormulario {
        // ID único dentro del documento; generado por el backend (UUID)
        @Field("id")
        private String id;

        // Nombre técnico en snake_case; clave usada por el motor de trámites al almacenar respuestas
        @Field("nombre")
        private String nombre;

        @Field("etiqueta")
        private String etiqueta;

        @Field("tipo")
        private TipoCampo tipo;

        @Field("obligatorio")
        private Boolean obligatorio;

        @Field("orden")
        private Integer orden;

        @Field("placeholder")
        private String placeholder;

        @Field("valor_defecto")
        private Object valorDefecto;

        @Field("validaciones")
        private ValidacionCampo validaciones;

        // Solo poblado para SELECT y MULTISELECT; vacío para el resto
        @Field("opciones")
        @Builder.Default
        private List<OpcionCampo> opciones = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeccionFormulario {
        // ID único dentro del documento; generado por el backend (UUID)
        @Field("id")
        private String id;

        @Field("titulo")
        private String titulo;

        @Field("orden")
        private Integer orden;

        @Field("campos")
        @Builder.Default
        private List<CampoFormulario> campos = new ArrayList<>();
    }

    // -----------------------------------------------------------------------
    // Campos del documento principal
    // -----------------------------------------------------------------------

    @Id
    private String id;

    @Field("nombre")
    private String nombre;

    @Field("descripcion")
    private String descripcion;

    @Field("estado")
    private EstadoFormulario estado;

    @Field("secciones")
    @Builder.Default
    private List<SeccionFormulario> secciones = new ArrayList<>();

    @Field("creado_por_id")
    @Indexed
    private String creadoPorId;

    @Field("creado_en")
    private Instant creadoEn;

    @Field("actualizado_en")
    private Instant actualizadoEn;
}
