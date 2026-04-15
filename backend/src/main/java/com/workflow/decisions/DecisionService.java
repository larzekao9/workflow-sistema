package com.workflow.decisions;

import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DecisionService {

    private final DecisionRepository decisionRepository;

    /**
     * Crea una nueva Decision con DMN XML inicial mínimo válido para dmn-js.
     */
    public DecisionResponse create(String politicaId, String gatewayBpmnId, String nombre, String creadoPorId) {
        LocalDateTime now = LocalDateTime.now();
        Decision decision = Decision.builder()
                .nombre(nombre)
                .politicaId(politicaId)
                .gatewayBpmnId(gatewayBpmnId)
                .creadoPorId(creadoPorId)
                .creadoEn(now)
                .actualizadoEn(now)
                .build();

        Decision saved = decisionRepository.save(decision);
        // Generar el XML inicial usando el ID real asignado por MongoDB
        saved.setDmnXml(buildInitialDmnXml(saved.getId(), nombre));
        saved.setActualizadoEn(LocalDateTime.now());
        saved = decisionRepository.save(saved);

        return DecisionResponse.fromDecisionSinXml(saved);
    }

    /**
     * Retorna el detalle sin dmnXml. Para obtener el XML usar getDmn().
     */
    public DecisionResponse getById(String id) {
        Decision decision = findOrThrow(id);
        return DecisionResponse.fromDecisionSinXml(decision);
    }

    /**
     * Lista todas las decisiones de una política, sin dmnXml.
     */
    public List<DecisionResponse> listByPolitica(String politicaId) {
        return decisionRepository.findByPoliticaId(politicaId)
                .stream()
                .map(DecisionResponse::fromDecisionSinXml)
                .toList();
    }

    /**
     * Retorna el XML DMN. Si no existe o está vacío, genera uno inicial.
     */
    public Map<String, String> getDmn(String id) {
        Decision decision = findOrThrow(id);

        String xml = decision.getDmnXml();
        if (!StringUtils.hasText(xml)) {
            xml = buildInitialDmnXml(decision.getId(), decision.getNombre());
            decision.setDmnXml(xml);
            decision.setActualizadoEn(LocalDateTime.now());
            decisionRepository.save(decision);
        }

        return Map.of("dmnXml", xml);
    }

    /**
     * Persiste el XML DMN y actualiza la fecha de modificación.
     */
    public void saveDmn(String id, String dmnXml) {
        Decision decision = findOrThrow(id);
        decision.setDmnXml(dmnXml);
        decision.setActualizadoEn(LocalDateTime.now());
        decisionRepository.save(decision);
    }

    /**
     * Busca una Decision por política y gateway BPMN. Retorna Optional vacío si no existe.
     */
    public Optional<DecisionResponse> findByGateway(String politicaId, String gatewayBpmnId) {
        return decisionRepository.findByPoliticaIdAndGatewayBpmnId(politicaId, gatewayBpmnId)
                .map(DecisionResponse::fromDecisionSinXml);
    }

    /**
     * Elimina la Decision. Sin reversión — operación destructiva.
     */
    public void delete(String id) {
        findOrThrow(id);
        decisionRepository.deleteById(id);
    }

    // ----------------------------------------------------------------
    // Helpers privados
    // ----------------------------------------------------------------

    private Decision findOrThrow(String id) {
        return decisionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Decision", id));
    }

    /**
     * Genera un DMN XML inicial mínimo, válido para dmn-js y Camunda Modeler.
     */
    private String buildInitialDmnXml(String id, String nombre) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" \
                xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" \
                xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" \
                id="Definitions_%s" name="%s" namespace="http://camunda.org/schema/1.0/dmn">
                  <decision id="Decision_%s" name="%s">
                    <decisionTable id="decisionTable_%s" hitPolicy="FIRST">
                      <input id="input1" label="Condición">
                        <inputExpression id="inputExpression1" typeRef="string">
                          <text></text>
                        </inputExpression>
                      </input>
                      <output id="output1" label="Resultado" name="resultado" typeRef="string" />
                    </decisionTable>
                  </decision>
                </definitions>
                """.formatted(id, nombre, id, nombre, id);
    }
}
