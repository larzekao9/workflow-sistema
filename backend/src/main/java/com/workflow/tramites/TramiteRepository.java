package com.workflow.tramites;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

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

    /**
     * Bandeja del funcionario filtrada por área:
     * ROL == rolNombre AND (area == userArea OR area == null) AND (asignadoA == userId OR asignadoA == null)
     */
    @Query("{ 'etapa_actual.responsable_rol_nombre': ?0, '$and': [{ '$or': [{ 'etapa_actual.area': null }, { 'etapa_actual.area': ?1 }] }, { '$or': [{ 'asignado_a_id': ?2 }, { 'asignado_a_id': null }] }] }")
    Page<Tramite> findBandejaFuncionarioPorArea(String rolNombre, String area, String userId, Pageable pageable);

    @Query(value = "{ 'etapa_actual.responsable_rol_nombre': ?0, '$and': [{ '$or': [{ 'etapa_actual.area': null }, { 'etapa_actual.area': ?1 }] }, { '$or': [{ 'asignado_a_id': ?2 }, { 'asignado_a_id': null }] }] }", count = true)
    long countBandejaFuncionarioPorArea(String rolNombre, String area, String userId);

    Page<Tramite> findByEstado(Tramite.EstadoTramite estado, Pageable pageable);

    // --- Conteos para stats ---

    long countByClienteId(String clienteId);

    long countByClienteIdAndEstado(String clienteId, Tramite.EstadoTramite estado);

    long countByEtapaActual_ResponsableRolNombre(String rolNombre);

    long countByEtapaActual_ResponsableRolNombreAndEstado(String rolNombre, Tramite.EstadoTramite estado);

    long countByEstado(Tramite.EstadoTramite estado);

    // --- Motor de asignación automática ---

    /**
     * Cuenta trámites activos (INICIADO, EN_PROCESO, SIN_ASIGNAR) asignados a un funcionario.
     * Usado para determinar la carga de trabajo y elegir al funcionario con menor carga.
     */
    @Query(value = "{ 'asignado_a_id': ?0, 'estado': { '$in': ['INICIADO','EN_PROCESO','SIN_ASIGNAR'] } }", count = true)
    long countActivosByAsignadoId(String userId);

    /**
     * Trámites sin asignar filtrados por rol (para bandeja de administrador).
     */
    Page<Tramite> findByEstadoAndEtapaActual_ResponsableRolNombre(
            Tramite.EstadoTramite estado, String rolNombre, Pageable pageable);

    /**
     * Apelaciones vencidas: estado EN_APELACION, apelación PENDIENTE y fecha límite superada.
     */
    @Query("{ 'estado': 'EN_APELACION', 'apelacion.estado': 'PENDIENTE', 'apelacion.fecha_limite': { '$lt': ?0 } }")
    List<Tramite> findApelacionesVencidas(java.time.LocalDateTime ahora);
}
