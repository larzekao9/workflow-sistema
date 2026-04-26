package com.workflow.tramites;

import com.workflow.activities.Actividad;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FormularioActualResponse {
    private String actividadId;
    private String actividadNombre;
    private List<Actividad.CampoActividad> campos;
}
