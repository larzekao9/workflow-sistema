package com.workflow.policies;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoliticaRepository extends MongoRepository<Politica, String> {

    Page<Politica> findByEstado(Politica.EstadoPolitica estado, Pageable pageable);

    Page<Politica> findByNombreContainingIgnoreCaseAndEstado(
            String nombre, Politica.EstadoPolitica estado, Pageable pageable);

    Page<Politica> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);

    List<Politica> findByVersionPadreId(String versionPadreId);

    long countByEstadoAndNombre(Politica.EstadoPolitica estado, String nombre);
}
