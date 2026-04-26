package com.workflow.tramites;

import lombok.Data;

import java.util.Map;

@Data
public class ResponderTramiteRequest {

    private String observaciones;

    private Map<String, Object> datos;
}
