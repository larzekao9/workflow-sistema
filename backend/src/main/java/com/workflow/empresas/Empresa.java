package com.workflow.empresas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "empresas")
public class Empresa {

    @Id
    private String id;

    @Field("nombre")
    @Indexed(unique = true)
    private String nombre;

    @Field("razon_social")
    private String razonSocial;

    @Field("nit")
    private String nit;

    @Field("email_contacto")
    private String emailContacto;

    @Field("telefono")
    private String telefono;

    @Field("direccion")
    private String direccion;

    @Field("ciudad")
    private String ciudad;

    @Field("pais")
    private String pais;

    @Builder.Default
    @Field("activa")
    private boolean activa = true;

    @Field("admin_principal_id")
    private String adminPrincipalId;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;
}
