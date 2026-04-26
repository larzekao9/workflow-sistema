package com.workflow.users;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FcmTokenRequest {

    @NotBlank(message = "El fcmToken no puede estar vacío")
    private String fcmToken;
}
