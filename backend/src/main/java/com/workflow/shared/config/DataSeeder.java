package com.workflow.shared.config;

import com.workflow.empresas.Empresa;
import com.workflow.empresas.EmpresaRepository;
import com.workflow.roles.Role;
import com.workflow.roles.RoleRepository;
import com.workflow.users.User;
import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Field injection con @Lazy para romper posible dependencia circular
    @Autowired
    @Lazy
    private EmpresaRepository empresaRepository;

    @Override
    public void run(String... args) {
        seedRoles();
        seedEmpresaDemo();
        seedSuperAdmin();
        seedAdminLegacy();
    }

    private void seedRoles() {
        LocalDateTime ahora = LocalDateTime.now();
        seedRoleIfMissing("SUPERADMIN",
            "Super administrador con acceso total al sistema multi-empresa",
            List.of("SUPERADMIN","GESTIONAR_EMPRESAS","GESTIONAR_USUARIOS","GESTIONAR_POLITICAS","GESTIONAR_TRAMITES"), ahora);
        seedRoleIfMissing("ADMINISTRADOR",
            "Administrador de empresa con gestión completa de su organización",
            List.of("GESTIONAR_USUARIOS","GESTIONAR_POLITICAS","GESTIONAR_TRAMITES","GESTIONAR_FORMULARIOS","VER_REPORTES"), ahora);
        seedRoleIfMissing("FUNCIONARIO",
            "Funcionario operativo que ejecuta tareas del workflow",
            List.of("VER_TRAMITES","GESTIONAR_TRAMITES_PROPIOS"), ahora);
        seedRoleIfMissing("CLIENTE",
            "Cliente externo que puede iniciar y consultar sus trámites",
            List.of("INICIAR_TRAMITES","VER_MIS_TRAMITES"), ahora);
    }

    private void seedRoleIfMissing(String nombre, String descripcion, List<String> permisos, LocalDateTime ahora) {
        if (roleRepository.findByNombre(nombre).isEmpty()) {
            roleRepository.save(Role.builder()
                .nombre(nombre).descripcion(descripcion).permisos(permisos)
                .activo(true).creadoEn(ahora).actualizadoEn(ahora).build());
        }
    }

    @SuppressWarnings("unused")
    private void seedRolesLegacy() {
        if (roleRepository.count() == 0) {
            LocalDateTime ahora = LocalDateTime.now();

            roleRepository.saveAll(List.of(
                Role.builder()
                    .nombre("SUPERADMIN")
                    .descripcion("Super administrador con acceso total al sistema multi-empresa")
                    .permisos(List.of(
                        "SUPERADMIN",
                        "GESTIONAR_EMPRESAS",
                        "GESTIONAR_USUARIOS",
                        "GESTIONAR_POLITICAS",
                        "GESTIONAR_TRAMITES"
                    ))
                    .activo(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build(),

                Role.builder()
                    .nombre("ADMINISTRADOR")
                    .descripcion("Administrador de empresa con gestión completa de su organización")
                    .permisos(List.of(
                        "GESTIONAR_USUARIOS",
                        "GESTIONAR_POLITICAS",
                        "GESTIONAR_TRAMITES",
                        "GESTIONAR_FORMULARIOS",
                        "VER_REPORTES"
                    ))
                    .activo(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build(),

                Role.builder()
                    .nombre("FUNCIONARIO")
                    .descripcion("Funcionario operativo que ejecuta tareas del workflow")
                    .permisos(List.of(
                        "VER_TRAMITES",
                        "GESTIONAR_TRAMITES_PROPIOS"
                    ))
                    .activo(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build(),

                Role.builder()
                    .nombre("CLIENTE")
                    .descripcion("Cliente externo que puede iniciar y consultar sus trámites")
                    .permisos(List.of(
                        "INICIAR_TRAMITES",
                        "VER_MIS_TRAMITES"
                    ))
                    .activo(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build()
            ));
        }
    }

    private void seedEmpresaDemo() {
        boolean existeDemo = empresaRepository.findByNombre("TelecomDemo S.A.").isPresent();
        if (!existeDemo) {
            LocalDateTime ahora = LocalDateTime.now();
            empresaRepository.save(
                Empresa.builder()
                    .nombre("TelecomDemo S.A.")
                    .razonSocial("TelecomDemo Sociedad Anónima")
                    .ciudad("La Paz")
                    .pais("Bolivia")
                    .activa(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build()
            );
        }
    }

    private void seedSuperAdmin() {
        if (userRepository.findByEmail("superadmin@workflow.com").isEmpty()) {
            Role superadminRole = roleRepository.findByNombre("SUPERADMIN")
                    .orElseGet(() -> roleRepository.findAll().get(0));

            LocalDateTime ahora = LocalDateTime.now();
            userRepository.save(
                User.builder()
                    .nombreCompleto("Super Administrador")
                    .username("superadmin")
                    .email("superadmin@workflow.com")
                    .passwordHash(passwordEncoder.encode("Super2024!"))
                    .rolId(superadminRole.getId())
                    .activo(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build()
            );
        }
    }

    private void seedAdminLegacy() {
        // Mantiene la compatibilidad con el usuario admin@workflow.com del dataset demo
        if (userRepository.findByEmail("admin@workflow.com").isEmpty()) {
            Role adminRole = roleRepository.findByNombre("ADMINISTRADOR")
                    .orElseGet(() -> roleRepository.findAll().get(0));

            LocalDateTime ahora = LocalDateTime.now();
            userRepository.save(
                User.builder()
                    .nombreCompleto("Administrador del Sistema")
                    .username("admin")
                    .email("admin@workflow.com")
                    .passwordHash(passwordEncoder.encode("Admin2024!"))
                    .rolId(adminRole.getId())
                    .activo(true)
                    .creadoEn(ahora)
                    .actualizadoEn(ahora)
                    .build()
            );
        }
    }
}
