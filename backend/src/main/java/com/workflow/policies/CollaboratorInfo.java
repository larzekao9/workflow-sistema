package com.workflow.policies;

public record CollaboratorInfo(
        String userId,
        String nombreCompleto,
        String email,
        String color
) {}
