package com.workflow.notifications;

import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionRepository notificacionRepository;
    private final UserRepository userRepository;

    /**
     * GET /notificaciones — Historial de notificaciones del usuario autenticado,
     * ordenadas por fecha descendente.
     */
    @GetMapping
    public ResponseEntity<List<NotificacionResponse>> getMisNotificaciones() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .map(user -> {
                    List<NotificacionResponse> lista = notificacionRepository
                            .findByUserIdOrderByCreadoEnDesc(user.getId())
                            .stream()
                            .map(NotificacionResponse::from)
                            .toList();
                    return ResponseEntity.ok(lista);
                })
                .orElse(ResponseEntity.ok(List.of()));
    }

    /**
     * PATCH /notificaciones/{id}/leer — Marca una notificación como leída.
     * Solo el propietario puede marcarla. Si el ID no existe o no pertenece
     * al usuario autenticado, retorna 200 sin efecto (idempotente).
     */
    @PatchMapping("/{id}/leer")
    public ResponseEntity<Void> marcarLeida(@PathVariable String id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByEmail(email).ifPresent(user ->
                notificacionRepository.findById(id).ifPresent(n -> {
                    if (user.getId().equals(n.getUserId()) && !n.isLeida()) {
                        n.setLeida(true);
                        notificacionRepository.save(n);
                    }
                })
        );
        return ResponseEntity.ok().build();
    }
}
