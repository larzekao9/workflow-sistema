package com.workflow.shared.exception;

/**
 * Se lanza cuando una operación viola una regla de negocio del sistema.
 * Ejemplos: editar una política congelada, avanzar un trámite sin completar campos obligatorios.
 */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
