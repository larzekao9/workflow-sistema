package com.workflow.decisions;

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
@Document(collection = "decisiones")
public class Decision {

    @Id
    private String id;

    @Field("nombre")
    private String nombre;

    @Field("dmn_xml")
    private String dmnXml;

    @Field("politica_id")
    @Indexed
    private String politicaId;

    @Field("gateway_bpmn_id")
    private String gatewayBpmnId;

    @Field("creado_por_id")
    @Indexed
    private String creadoPorId;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;
}
