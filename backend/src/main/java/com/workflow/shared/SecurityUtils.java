package com.workflow.shared;

import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UserRepository userRepository;

    /**
     * Retorna empresaId del usuario logueado.
     * Null si es SUPERADMIN o el usuario no tiene empresa asignada.
     */
    public String getCurrentUserEmpresaId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .map(user -> user.getEmpresaId())
                .orElse(null);
    }

    /**
     * True si el usuario logueado tiene la autoridad SUPERADMIN.
     */
    public boolean isSuperAdmin() {
        return SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("SUPERADMIN"));
    }
}
