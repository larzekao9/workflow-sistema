package com.workflow.tramites;

import com.workflow.files.FileReference;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "respuestas_formulario")
public class RespuestaFormulario {

    @Id
    private String id;

    @Field("tramite_id")
    @Indexed
    private String tramiteId;

    @Field("actividad_id")
    private String actividadId;

    @Field("actividad_nombre")
    private String actividadNombre;

    @Field("usuario_id")
    private String usuarioId;

    @Field("usuario_nombre")
    private String usuarioNombre;

    @Field("rol_usuario")
    private String rolUsuario;

    @Field("campos")
    private Map<String, Object> campos;

    @Field("archivos")
    private List<FileReference> archivos;

    @Field("accion")
    private String accion;

    @Field("timestamp")
    private LocalDateTime timestamp;
}
