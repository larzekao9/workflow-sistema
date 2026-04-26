package com.workflow.notifications;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificacionRepository extends MongoRepository<Notificacion, String> {

    List<Notificacion> findByUserIdOrderByCreadoEnDesc(String userId);
}
