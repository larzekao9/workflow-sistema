package com.workflow.policyrelations;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoliticaRelacionRepository extends MongoRepository<PoliticaRelacion, String> {

    List<PoliticaRelacion> findByPoliticaOrigenIdAndActivo(String origenId, boolean activo);

    List<PoliticaRelacion> findByPoliticaDestinoIdAndActivo(String destinoId, boolean activo);

    List<PoliticaRelacion> findByPoliticaOrigenIdOrPoliticaDestinoId(String origenId, String destinoId);

    boolean existsByPoliticaOrigenIdAndPoliticaDestinoIdAndTipoRelacion(
            String origenId, String destinoId, TipoRelacion tipoRelacion);
}
