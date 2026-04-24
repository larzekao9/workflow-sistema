package com.workflow.tramites;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolverApelacionRequest {

    private boolean aprobada;
    private String observaciones;
}
