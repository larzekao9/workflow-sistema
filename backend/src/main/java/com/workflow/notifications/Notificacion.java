package com.workflow.notifications;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notificaciones")
public class Notificacion {

    @Id
    private String id;

    @Field("user_id")
    @Indexed
    private String userId;

    private String titulo;
    private String cuerpo;

    @Field("tramite_id")
    private String tramiteId;

    private TipoNotificacion tipo;

    @Builder.Default
    private boolean leida = false;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    public enum TipoNotificacion {
        TRAMITE_AVANZADO,
        TRAMITE_OBSERVADO,
        TRAMITE_RECHAZADO,
        TAREA_ASIGNADA,
        CLIENTE_RESPONDIO,
        APELACION_RESUELTA
    }
}
