package com.workflow.shared.config;

import com.workflow.roles.Role;
import com.workflow.roles.RoleRepository;
import com.workflow.users.User;
import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        Role adminRole;
        if (roleRepository.count() == 0) {
            adminRole = Role.builder()
                    .nombre("Administrador")
                    .descripcion("Rol con acceso total al sistema")
                    .permisos(List.of("ADMIN", "USER", "POLICIES_READ", "POLICIES_WRITE", "TRAMITES_ALL"))
                    .activo(true)
                    .build();
            adminRole = roleRepository.save(adminRole);
        } else {
            adminRole = roleRepository.findAll().get(0);
        }

        if (userRepository.findByEmail("admin@workflow.com").isEmpty()) {
            User adminUser = User.builder()
                    .nombreCompleto("Administrador del Sistema")
                    .username("admin")
                    .email("admin@workflow.com")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .rolId(adminRole.getId())
                    .activo(true)
                    .build();
            userRepository.save(adminUser);
        }
    }
}
