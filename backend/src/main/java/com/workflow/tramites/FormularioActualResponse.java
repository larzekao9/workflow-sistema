package com.workflow.tramites;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormularioActualResponse {

    private String formularioId;
    // formJsSchema se almacena como Object/BSON en Formulario — puede ser null si no se definió con form-js
    private Object formJsSchema;
}
