package com.workflow.policies;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePoliticaRequest {

    @Size(min = 3, max = 150, message = "El nombre debe tener entre 3 y 150 caracteres")
    private String nombre;

    private String descripcion;

    private String departamento;

    // Metadatos opcionales — si vienen, se actualizan
    private List<String> tags;

    private String icono;

    private String color;
}
