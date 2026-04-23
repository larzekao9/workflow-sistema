package com.workflow.empresas;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmpresaRequest {

    @NotBlank(message = "El nombre de la empresa es obligatorio")
    @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
    private String nombre;

    @Size(max = 250, message = "La razón social no puede superar los 250 caracteres")
    private String razonSocial;

    @Size(max = 50, message = "El NIT no puede superar los 50 caracteres")
    private String nit;

    @Email(message = "El email de contacto debe ser válido")
    @Size(max = 150, message = "El email no puede superar los 150 caracteres")
    private String emailContacto;

    @Size(max = 30, message = "El teléfono no puede superar los 30 caracteres")
    private String telefono;

    @Size(max = 300, message = "La dirección no puede superar los 300 caracteres")
    private String direccion;

    @Size(max = 100, message = "La ciudad no puede superar los 100 caracteres")
    private String ciudad;

    @Size(max = 100, message = "El país no puede superar los 100 caracteres")
    private String pais;

    private Boolean activa;
}
