package com.workflow.departments;

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
@Document(collection = "departamentos")
public class Department {

    @Id
    private String id;

    @Field("nombre")
    @Indexed(unique = true)
    private String nombre;

    @Field("descripcion")
    private String descripcion;

    @Field("responsable")
    private String responsable;

    @Builder.Default
    @Field("activa")
    private boolean activa = true;

    @Field("empresa_id")
    private String empresaId;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;
}
