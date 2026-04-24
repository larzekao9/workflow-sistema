package com.workflow.tramites;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RespuestaFormularioRepository extends MongoRepository<RespuestaFormulario, String> {

    List<RespuestaFormulario> findByTramiteIdOrderByTimestampAsc(String tramiteId);
}
