package com.workflow.decisions;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DecisionRepository extends MongoRepository<Decision, String> {

    List<Decision> findByPoliticaId(String politicaId);

    Optional<Decision> findByPoliticaIdAndGatewayBpmnId(String politicaId, String gatewayBpmnId);
}
