package com.workflow.decisions;

import java.time.LocalDateTime;

/**
 * DTO de respuesta para Decision.
 * El campo dmnXml se incluye solo en endpoints de detalle y XML dedicado,
 * no en listados. Los listados usan instancias creadas sin dmnXml (null).
 */
public record DecisionResponse(
        String id,
        String nombre,
        String dmnXml,
        String politicaId,
        String gatewayBpmnId,
        String creadoPorId,
        LocalDateTime creadoEn,
        LocalDateTime actualizadoEn
) {

    /**
     * Incluye dmnXml — usar en detalle y endpoints /dmn.
     */
    public static DecisionResponse fromDecision(Decision d) {
        return new DecisionResponse(
                d.getId(),
                d.getNombre(),
                d.getDmnXml(),
                d.getPoliticaId(),
                d.getGatewayBpmnId(),
                d.getCreadoPorId(),
                d.getCreadoEn(),
                d.getActualizadoEn()
        );
    }

    /**
     * Excluye dmnXml — usar en listados para reducir payload.
     */
    public static DecisionResponse fromDecisionSinXml(Decision d) {
        return new DecisionResponse(
                d.getId(),
                d.getNombre(),
                null,
                d.getPoliticaId(),
                d.getGatewayBpmnId(),
                d.getCreadoPorId(),
                d.getCreadoEn(),
                d.getActualizadoEn()
        );
    }
}
