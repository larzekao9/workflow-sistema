package com.workflow.roles;

import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.BusinessRuleException;
import com.workflow.shared.exception.ResourceNotFoundException;
import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public RoleResponse createRole(CreateRoleRequest request) {
        // Validar nombre único
        roleRepository.findByNombre(request.getNombre()).ifPresent(existing -> {
            throw new BadRequestException("Ya existe un rol con el nombre: " + request.getNombre());
        });

        Role role = Role.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .permisos(request.getPermisos() != null ? request.getPermisos() : new java.util.ArrayList<>())
                .activo(true)
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        Role saved = roleRepository.save(role);
        return toResponse(saved);
    }

    public List<RoleResponse> getAllRoles() {
        return roleRepository.findByActivoTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public RoleResponse getRoleById(String id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));
        return toResponse(role);
    }

    public RoleResponse updateRole(String id, UpdateRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));

        // Solo actualizar campos que vienen con valor
        if (request.getDescripcion() != null) {
            role.setDescripcion(request.getDescripcion());
        }
        if (request.getPermisos() != null) {
            role.setPermisos(request.getPermisos());
        }
        if (request.getActivo() != null) {
            role.setActivo(request.getActivo());
        }
        role.setActualizadoEn(LocalDateTime.now());

        Role updated = roleRepository.save(role);
        return toResponse(updated);
    }

    public void deleteRole(String id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));

        // Verificar que no existan usuarios asignados a este rol
        List<?> usersWithRole = userRepository.findByRolId(id);
        if (!usersWithRole.isEmpty()) {
            throw new BusinessRuleException("No se puede eliminar un rol con usuarios asignados");
        }

        roleRepository.delete(role);
    }

    private RoleResponse toResponse(Role role) {
        return RoleResponse.builder()
                .id(role.getId())
                .nombre(role.getNombre())
                .descripcion(role.getDescripcion())
                .permisos(role.getPermisos())
                .activo(role.isActivo())
                .creadoEn(role.getCreadoEn())
                .actualizadoEn(role.getActualizadoEn())
                .build();
    }
}
