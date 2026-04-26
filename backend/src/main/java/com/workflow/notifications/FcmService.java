package com.workflow.notifications;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.workflow.users.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

    private final UserRepository userRepository;
    private final NotificacionRepository notificacionRepository;

    private boolean firebaseEnabled = false;

    @PostConstruct
    public void initFirebase() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                ClassPathResource resource = new ClassPathResource("firebase-service-account.json");
                if (!resource.exists()) {
                    log.warn("[FCM] firebase-service-account.json no encontrado en classpath. Push deshabilitado, solo se guardan notificaciones en BD.");
                    return;
                }
                try (InputStream is = resource.getInputStream()) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(is))
                            .build();
                    FirebaseApp.initializeApp(options);
                }
            }
            firebaseEnabled = true;
            log.info("[FCM] Firebase Admin SDK inicializado correctamente.");
        } catch (IOException e) {
            log.warn("[FCM] Error inicializando Firebase Admin SDK: {}. Push deshabilitado.", e.getMessage());
        }
    }

    /**
     * Persiste la notificacion en MongoDB y, si Firebase está habilitado,
     * envía el push al dispositivo registrado del usuario.
     * Fire-and-forget: no bloquea el flujo de negocio.
     */
    @Async
    public void enviarPush(String userId, String titulo, String cuerpo,
                           String tramiteId, Notificacion.TipoNotificacion tipo) {
        if (userId == null || userId.isBlank()) {
            log.debug("[FCM] enviarPush ignorado — userId nulo o vacío");
            return;
        }

        // Siempre persistir en MongoDB, independientemente del estado de Firebase
        Notificacion notificacion = Notificacion.builder()
                .userId(userId)
                .titulo(titulo)
                .cuerpo(cuerpo)
                .tramiteId(tramiteId)
                .tipo(tipo)
                .leida(false)
                .creadoEn(LocalDateTime.now())
                .build();
        notificacionRepository.save(notificacion);

        if (!firebaseEnabled) {
            log.debug("[FCM] Push omitido (Firebase deshabilitado) — userId={} titulo={}", userId, titulo);
            return;
        }

        userRepository.findById(userId).ifPresent(user -> {
            String token = user.getFcmToken();
            if (token == null || token.isBlank()) {
                log.debug("[FCM] Usuario {} sin fcmToken registrado — push omitido", userId);
                return;
            }
            try {
                Message message = Message.builder()
                        .setToken(token)
                        .setNotification(Notification.builder()
                                .setTitle(titulo)
                                .setBody(cuerpo)
                                .build())
                        .putData("tramiteId", tramiteId != null ? tramiteId : "")
                        .putData("tipo", tipo.name())
                        .build();
                String messageId = FirebaseMessaging.getInstance().send(message);
                log.info("[FCM] Push enviado — userId={} tipo={} messageId={}", userId, tipo, messageId);
            } catch (Exception e) {
                log.warn("[FCM] Error enviando push a userId={}: {}", userId, e.getMessage());
            }
        });
    }
}
