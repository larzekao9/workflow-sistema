package com.workflow.roles;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoleRequest {

    @NotBlank(message = "El nombre del rol es obligatorio")
    private String nombre;

    private String descripcion;

    @Builder.Default
    private List<String> permisos = new ArrayList<>();
}
