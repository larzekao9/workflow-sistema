package com.workflow.auth;

import com.workflow.shared.config.JwtUtil;
import com.workflow.users.CreateUserRequest;
import com.workflow.users.UserRepository;
import com.workflow.users.UserResponse;
import com.workflow.users.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    public AuthResponse register(RegisterRequest request) {
        // Delegar la creación al UserService (reutilizamos su lógica de validación y hashing)
        CreateUserRequest createRequest = CreateUserRequest.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(request.getPassword())
                .nombreCompleto(request.getNombreCompleto())
                .rolId(request.getRolId())
                .build();

        UserResponse userResponse = userService.createUser(createRequest);

        // Cargar UserDetails para generar el token
        UserDetails userDetails = userService.loadUserByUsername(request.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .expiresIn(expirationMs)
                .user(userResponse)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        // Autenticar con email y password — Spring Security valida las credenciales
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Si llegamos aquí, la autenticación fue exitosa — actualizar ultimoAcceso
        userService.updateUltimoAcceso(request.getEmail());

        // Cargar UserDetails actualizado y generar token
        UserDetails userDetails = userService.loadUserByUsername(request.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        // Obtener UserResponse enriquecido
        UserResponse userResponse = userRepository.findByEmail(request.getEmail())
                .map(user -> userService.getUserById(user.getId()))
                .orElseThrow();

        return AuthResponse.builder()
                .token(token)
                .expiresIn(expirationMs)
                .user(userResponse)
                .build();
    }
}
