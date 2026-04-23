package com.workflow.empresas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmpresaResponse {

    private String id;
    private String nombre;
    private String razonSocial;
    private String nit;
    private String emailContacto;
    private String telefono;
    private String direccion;
    private String ciudad;
    private String pais;
    private boolean activa;
    private String adminPrincipalId;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}
