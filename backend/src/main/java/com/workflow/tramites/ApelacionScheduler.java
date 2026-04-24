package com.workflow.tramites;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler que cierra automáticamente las apelaciones PENDIENTE cuyo plazo haya vencido.
 * Se ejecuta cada hora para detectar trámites EN_APELACION sin respuesta del cliente.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApelacionScheduler {

    private final TramiteService tramiteService;

    @Scheduled(fixedRate = 3_600_000) // cada hora (ms)
    public void vencerApelaciones() {
        log.info("[ApelacionScheduler] Verificando apelaciones vencidas...");
        tramiteService.vencerApelacionesSinRespuesta();
    }
}
