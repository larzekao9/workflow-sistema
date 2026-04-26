package com.workflow.notifications;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacionResponse {

    private String id;
    private String titulo;
    private String cuerpo;
    private String tramiteId;
    private String tipo;
    private boolean leida;
    private LocalDateTime creadoEn;

    public static NotificacionResponse from(Notificacion n) {
        return NotificacionResponse.builder()
                .id(n.getId())
                .titulo(n.getTitulo())
                .cuerpo(n.getCuerpo())
                .tramiteId(n.getTramiteId())
                .tipo(n.getTipo() != null ? n.getTipo().name() : null)
                .leida(n.isLeida())
                .creadoEn(n.getCreadoEn())
                .build();
    }
}
