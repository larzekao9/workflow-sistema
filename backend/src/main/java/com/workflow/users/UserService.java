package com.workflow.users;

import com.workflow.roles.RoleRepository;
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
    private final PasswordEncoder passwordEncoder;

    // --- UserDetailsService ---

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con email: " + email));

        if (user.getRolId() != null) {
            roleRepository.findById(user.getRolId()).ifPresent(role -> {
                if (role.getPermisos() != null) {
                    List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = role.getPermisos().stream()
                            .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                            .toList();
                    user.setAuthorities(authorities);
                }
            });
        }
        
        return user;
    }

    // --- CRUD ---

    public UserResponse createUser(CreateUserRequest request) {
        // Verificar unicidad de email
        userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            throw new BadRequestException("Ya existe un usuario con el email: " + request.getEmail());
        });

        // Verificar unicidad de username
        userRepository.findByUsername(request.getUsername()).ifPresent(existing -> {
            throw new BadRequestException("Ya existe un usuario con el username: " + request.getUsername());
        });

        // Verificar que el rol exista
        roleRepository.findById(request.getRolId())
                .orElseThrow(() -> new ResourceNotFoundException("Rol", request.getRolId()));

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .nombreCompleto(request.getNombreCompleto())
                .rolId(request.getRolId())
                .departamento(request.getDepartamento())
                .activo(true)
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);
        return toResponse(saved);
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

        // Solo actualizar campos que vienen con valor
        if (request.getNombreCompleto() != null) {
            user.setNombreCompleto(request.getNombreCompleto());
        }
        if (request.getDepartamento() != null) {
            user.setDepartamento(request.getDepartamento());
        }
        if (request.getRolId() != null) {
            // Verificar que el nuevo rol exista
            roleRepository.findById(request.getRolId())
                    .orElseThrow(() -> new ResourceNotFoundException("Rol", request.getRolId()));
            user.setRolId(request.getRolId());
        }
        if (request.getActivo() != null) {
            user.setActivo(request.getActivo());
        }
        user.setActualizadoEn(LocalDateTime.now());

        User updated = userRepository.save(user);
        return toResponse(updated);
    }

    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));

        // Soft delete — no se borra físicamente, solo se desactiva
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

    private UserResponse toResponse(User user) {
        String rolNombre = null;
        if (user.getRolId() != null) {
            rolNombre = roleRepository.findById(user.getRolId())
                    .map(role -> role.getNombre())
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
                .activo(user.isActivo())
                .creadoEn(user.getCreadoEn())
                .build();
    }
}
