package com.workflow.empresas;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AsignarAdminRequest {
    @NotBlank
    private String adminId;
}
