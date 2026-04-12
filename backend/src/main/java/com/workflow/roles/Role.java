package com.workflow.roles;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "roles")
@CompoundIndex(def = "{'activo': 1}")
public class Role {

    @Id
    private String id;

    @Field("nombre")
    @Indexed(unique = true)
    private String nombre;

    @Field("descripcion")
    private String descripcion;

    @Builder.Default
    @Field("permisos")
    private List<String> permisos = new ArrayList<>();

    @Builder.Default
    @Field("activo")
    private boolean activo = true;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;
}
