package com.workflow.activities;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActividadRepository extends MongoRepository<Actividad, String> {

    List<Actividad> findByPoliticaId(String politicaId);

    List<Actividad> findByPoliticaIdAndTipo(String politicaId, Actividad.TipoActividad tipo);

    long countByPoliticaId(String politicaId);

    // Usado por FormularioService para verificar referencias antes de desactivar un formulario
    long countByFormularioId(String formularioId);

    void deleteByPoliticaId(String politicaId);

    /**
     * Busca la actividad de una política cuyo nombre coincide con el de un BPMN task.
     * Usado por el motor de asignación automática para obtener departmentId y cargoRequerido.
     */
    java.util.Optional<Actividad> findByPoliticaIdAndNombre(String politicaId, String nombre);
}
