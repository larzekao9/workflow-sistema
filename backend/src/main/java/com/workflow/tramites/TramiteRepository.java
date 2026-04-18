package com.workflow.tramites;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TramiteRepository extends MongoRepository<Tramite, String> {

    Page<Tramite> findByClienteId(String clienteId, Pageable pageable);

    Page<Tramite> findByEtapaActual_ResponsableRolNombre(String rolNombre, Pageable pageable);

    Page<Tramite> findByEstado(Tramite.EstadoTramite estado, Pageable pageable);

    Page<Tramite> findByClienteIdAndEstado(String clienteId, Tramite.EstadoTramite estado, Pageable pageable);
}
