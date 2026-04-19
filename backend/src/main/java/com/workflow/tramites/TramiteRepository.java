package com.workflow.tramites;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TramiteRepository extends MongoRepository<Tramite, String> {

    // --- Consultas paginadas (listado) ---

    Page<Tramite> findByClienteId(String clienteId, Pageable pageable);

    Page<Tramite> findByClienteIdAndEstado(String clienteId, Tramite.EstadoTramite estado, Pageable pageable);

    Page<Tramite> findByEtapaActual_ResponsableRolNombre(String rolNombre, Pageable pageable);

    Page<Tramite> findByEtapaActual_ResponsableRolNombreAndEstado(String rolNombre, Tramite.EstadoTramite estado, Pageable pageable);

    Page<Tramite> findByEtapaActual_ResponsableRolNombreAndAsignadoAId(
            String rolNombre, String asignadoAId, Pageable pageable);

    Page<Tramite> findByEtapaActual_ResponsableRolNombreAndAsignadoAIdIsNull(
            String rolNombre, Pageable pageable);

    Page<Tramite> findByEstado(Tramite.EstadoTramite estado, Pageable pageable);

    // --- Conteos para stats ---

    long countByClienteId(String clienteId);

    long countByClienteIdAndEstado(String clienteId, Tramite.EstadoTramite estado);

    long countByEtapaActual_ResponsableRolNombre(String rolNombre);

    long countByEtapaActual_ResponsableRolNombreAndEstado(String rolNombre, Tramite.EstadoTramite estado);

    long countByEstado(Tramite.EstadoTramite estado);
}
