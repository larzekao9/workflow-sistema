package com.workflow.policyrelations;

/**
 * Tipos de relación estructural que puede existir entre dos políticas de negocio.
 * El motor de workflow evalúa estas relaciones antes de instanciar o avanzar un trámite.
 */
public enum TipoRelacion {

    /** La política destino no puede iniciarse hasta que la origen haya concluido. */
    DEPENDENCIA,

    /** La política origen debe ejecutarse antes que la destino (orden temporal, no bloqueo fuerte). */
    PRECEDENCIA,

    /** Ambas políticas se complementan y deben aplicarse juntas en el mismo contexto. */
    COMPLEMENTO,

    /** Las políticas son mutuamente excluyentes; no pueden estar activas simultáneamente en el mismo trámite. */
    EXCLUSION,

    /** La política origen anula o reemplaza a la destino cuando ambas aplican. Requiere trazabilidad en historial. */
    OVERRIDE,

    /**
     * La política origen escala automáticamente a la destino si se supera el SLA.
     * Requiere que la política origen tenga tiempoLimiteDias definido.
     */
    ESCALAMIENTO
}
