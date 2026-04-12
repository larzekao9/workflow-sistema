package com.workflow.activities;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActividadRepository extends MongoRepository<Actividad, String> {

    List<Actividad> findByPoliticaId(String politicaId);

    List<Actividad> findByPoliticaIdAndTipo(String politicaId, Actividad.TipoActividad tipo);

    long countByPoliticaId(String politicaId);

    void deleteByPoliticaId(String politicaId);
}
