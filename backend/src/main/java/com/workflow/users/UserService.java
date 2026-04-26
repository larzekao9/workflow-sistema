package com.workflow.users;

import com.workflow.departments.DepartmentRepository;
import com.workflow.roles.RoleRepository;
import com.workflow.shared.SecurityUtils;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;

    // --- UserDetailsService ---

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con email: " + email));

        if (user.getRolId() != null) {
            roleRepository.findById(user.getRolId()).ifPresent(role -> {
                List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities =
                        new java.util.ArrayList<>();
                // Nombre del rol como authority (para @PreAuthorize hasAnyAuthority)
                if (role.getNombre() != null) {
                    authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(role.getNombre()));
                }
                // Permisos granulares
                if (role.getPermisos() != null) {
                    role.getPermisos().stream()
                            .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                            .forEach(authorities::add);
                }
                user.setAuthorities(authorities);
            });
        }

        return user;
    }

    // --- CRUD ---

    public UserResponse createUser(CreateUserRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            throw new BadRequestException("Ya existe un usuario con el email: " + request.getEmail());
        });

        userRepository.findByUsername(request.getUsername()).ifPresent(existing -> {
            throw new BadRequestException("Ya existe un usuario con el username: " + request.getUsername());
        });

        roleRepository.findById(request.getRolId())
                .orElseThrow(() -> new ResourceNotFoundException("Rol", request.getRolId()));

        // Resolver nombre del departamento y guardarlo denormalizado para el motor BPMN
        String departamentoNombre = null;
        if (request.getDepartmentId() != null && !request.getDepartmentId().isBlank()) {
            departamentoNombre = departmentRepository.findById(request.getDepartmentId())
                    .map(dept -> dept.getNombre())
                    .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + request.getDepartmentId()));
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .nombreCompleto(request.getNombreCompleto())
                .rolId(request.getRolId())
                .departamento(departamentoNombre)
                .departmentId(request.getDepartmentId())
                .cargo(request.getCargo())
                .activo(true)
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        return toResponse(userRepository.save(user));
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findByActivoTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        return toResponse(user);
    }

    public UserResponse updateUser(String id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));

        if (request.getNombreCompleto() != null) {
            user.setNombreCompleto(request.getNombreCompleto());
        }
        if (request.getRolId() != null) {
            roleRepository.findById(request.getRolId())
                    .orElseThrow(() -> new ResourceNotFoundException("Rol", request.getRolId()));
            user.setRolId(request.getRolId());
        }
        if (request.getDepartmentId() != null) {
            if (request.getDepartmentId().isBlank()) {
                user.setDepartmentId(null);
                user.setDepartamento(null);
            } else {
                String deptNombre = departmentRepository.findById(request.getDepartmentId())
                        .map(dept -> dept.getNombre())
                        .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + request.getDepartmentId()));
                user.setDepartmentId(request.getDepartmentId());
                user.setDepartamento(deptNombre);
            }
        }
        if (request.getCargo() != null) {
            user.setCargo(request.getCargo().isBlank() ? null : request.getCargo());
        }
        if (request.getActivo() != null) {
            user.setActivo(request.getActivo());
        }
        user.setActualizadoEn(LocalDateTime.now());

        return toResponse(userRepository.save(user));
    }

    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        user.setActivo(false);
        user.setActualizadoEn(LocalDateTime.now());
        userRepository.save(user);
    }

    public void updateUltimoAcceso(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setUltimoAcceso(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    public void updateFcmToken(String email, String fcmToken) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setFcmToken(fcmToken);
            userRepository.save(user);
        });
    }

    private UserResponse toResponse(User user) {
        String rolNombre = null;
        if (user.getRolId() != null) {
            rolNombre = roleRepository.findById(user.getRolId())
                    .map(role -> role.getNombre())
                    .orElse(null);
        }

        String departmentNombre = null;
        if (user.getDepartmentId() != null && !user.getDepartmentId().isBlank()) {
            departmentNombre = departmentRepository.findById(user.getDepartmentId())
                    .map(dept -> dept.getNombre())
                    .orElse(null);
        }

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nombreCompleto(user.getNombreCompleto())
                .rolId(user.getRolId())
                .rolNombre(rolNombre)
                .departamento(user.getDepartamento())
                .departmentId(user.getDepartmentId())
                .departmentNombre(departmentNombre)
                .cargo(user.getCargo())
                .activo(user.isActivo())
                .creadoEn(user.getCreadoEn())
                .build();
    }
}
