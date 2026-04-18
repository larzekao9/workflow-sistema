package com.workflow.tramites;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Motor de parsing BPMN 2.0.
 * Soporta namespaces: bpmn2:, bpmn:, y sin namespace.
 * No requiere dependencias externas — solo javax.xml y org.w3c.dom.
 */
@Slf4j
@Service
public class BpmnMotorService {

    // -----------------------------------------------------------------------
    // Clase de resultado
    // -----------------------------------------------------------------------

    public record BpmnTask(String id, String name) {}

    // Tags BPMN con los distintos namespaces que puede traer bpmn-js
    private static final String[] USER_TASK_TAGS   = {"bpmn2:userTask", "bpmn:userTask", "userTask"};
    private static final String[] START_EVENT_TAGS = {"bpmn2:startEvent", "bpmn:startEvent", "startEvent"};
    private static final String[] END_EVENT_TAGS   = {"bpmn2:endEvent", "bpmn:endEvent", "endEvent"};
    private static final String[] SEQ_FLOW_TAGS    = {"bpmn2:sequenceFlow", "bpmn:sequenceFlow", "sequenceFlow"};
    private static final String[] GATEWAY_TAGS     = {
        "bpmn2:exclusiveGateway", "bpmn:exclusiveGateway", "exclusiveGateway",
        "bpmn2:inclusiveGateway", "bpmn:inclusiveGateway", "inclusiveGateway",
        "bpmn2:parallelGateway", "bpmn:parallelGateway", "parallelGateway"
    };

    // Fallback cuando el BPMN no tiene UserTasks
    private static final BpmnTask FALLBACK_TASK = new BpmnTask("manual", "Revisión Manual");

    // -----------------------------------------------------------------------
    // API pública
    // -----------------------------------------------------------------------

    /**
     * Encuentra la primera UserTask del proceso siguiendo el SequenceFlow desde el StartEvent.
     */
    public BpmnTask getFirstUserTask(String bpmnXml) {
        if (bpmnXml == null || bpmnXml.isBlank()) {
            log.warn("[BpmnMotor] bpmnXml vacío — usando tarea fallback");
            return FALLBACK_TASK;
        }

        try {
            Document doc = parseXml(bpmnXml);

            // 1. Localiza el StartEvent
            String startEventId = findFirstElementId(doc, START_EVENT_TAGS);
            if (startEventId == null) {
                log.warn("[BpmnMotor] No se encontró StartEvent en el BPMN — fallback");
                return FALLBACK_TASK;
            }

            // 2. Sigue el SequenceFlow hasta encontrar una UserTask
            return followFlowToUserTask(doc, startEventId)
                    .orElseGet(() -> {
                        log.warn("[BpmnMotor] No se encontró UserTask después del StartEvent — fallback");
                        return FALLBACK_TASK;
                    });

        } catch (Exception ex) {
            log.error("[BpmnMotor] Error parseando BPMN para getFirstUserTask: {}", ex.getMessage());
            return FALLBACK_TASK;
        }
    }

    /**
     * Dado el ID de la tarea actual y la acción del funcionario, navega al siguiente nodo.
     *
     * @return BpmnTask siguiente, o null si se llegó a un EndEvent (proceso terminado).
     */
    public BpmnTask getNextTask(String bpmnXml, String currentTaskId, String accion) {
        if (bpmnXml == null || bpmnXml.isBlank() || currentTaskId == null) {
            return null;
        }

        // Si la acción no es APROBAR, no avanzamos el flujo — el servicio maneja el estado
        if (!"APROBAR".equalsIgnoreCase(accion)) {
            return null;
        }

        try {
            Document doc = parseXml(bpmnXml);

            // Busca SequenceFlows donde sourceRef == currentTaskId
            List<String> targetIds = findOutgoingTargets(doc, currentTaskId);
            if (targetIds.isEmpty()) {
                log.info("[BpmnMotor] Sin salidas desde '{}' — fin de proceso", currentTaskId);
                return null;
            }

            // Toma el primer target (para gateways exclusivos evalúa el primero disponible)
            for (String targetId : targetIds) {
                Optional<BpmnTask> result = resolveNode(doc, targetId);
                if (result != null) {
                    // result vacío = EndEvent
                    return result.orElse(null);
                }
            }

            return null;

        } catch (Exception ex) {
            log.error("[BpmnMotor] Error en getNextTask desde '{}': {}", currentTaskId, ex.getMessage());
            return null;
        }
    }

    /**
     * Extrae el nombre del rol responsable de la UserTask desde el atributo
     * camunda:candidateGroups, camunda:assignee, o el campo documentation.
     * Devuelve "FUNCIONARIO" si no se encuentra nada.
     */
    public String extractRolFromTask(String bpmnXml, String taskId) {
        if (bpmnXml == null || bpmnXml.isBlank() || taskId == null) {
            return "FUNCIONARIO";
        }

        try {
            Document doc = parseXml(bpmnXml);
            Element taskEl = findElementById(doc, taskId, USER_TASK_TAGS);
            if (taskEl == null) {
                return "FUNCIONARIO";
            }

            // Intenta camunda:candidateGroups
            String candidateGroups = getAttributeIgnoreNs(taskEl, "candidateGroups");
            if (candidateGroups != null && !candidateGroups.isBlank()) {
                // Toma el primer grupo si hay varios separados por coma
                return candidateGroups.split(",")[0].trim().toUpperCase();
            }

            // Intenta camunda:assignee
            String assignee = getAttributeIgnoreNs(taskEl, "assignee");
            if (assignee != null && !assignee.isBlank()) {
                return assignee.trim().toUpperCase();
            }

            // Intenta el texto del elemento documentation
            NodeList docNodes = taskEl.getElementsByTagNameNS("*", "documentation");
            if (docNodes.getLength() == 0) {
                docNodes = taskEl.getElementsByTagName("documentation");
            }
            if (docNodes.getLength() == 0) {
                docNodes = taskEl.getElementsByTagName("bpmn2:documentation");
            }
            if (docNodes.getLength() == 0) {
                docNodes = taskEl.getElementsByTagName("bpmn:documentation");
            }
            if (docNodes.getLength() > 0) {
                String text = docNodes.item(0).getTextContent();
                if (text != null && !text.isBlank()) {
                    return text.trim().toUpperCase();
                }
            }

            return "FUNCIONARIO";

        } catch (Exception ex) {
            log.error("[BpmnMotor] Error extrayendo rol de tarea '{}': {}", taskId, ex.getMessage());
            return "FUNCIONARIO";
        }
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    private Document parseXml(String bpmnXml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        // Bloquea entidades externas (XXE prevention)
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setExpandEntityReferences(false);

        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new ByteArrayInputStream(bpmnXml.getBytes(StandardCharsets.UTF_8)));
    }

    /** Devuelve el id del primer elemento encontrado buscando en los tags dados. */
    private String findFirstElementId(Document doc, String[] tags) {
        for (String tag : tags) {
            NodeList nodes = getElementsByTag(doc, tag);
            if (nodes.getLength() > 0) {
                return ((Element) nodes.item(0)).getAttribute("id");
            }
        }
        return null;
    }

    /** Busca un element por id y tagName (con múltiples variantes de namespace). */
    private Element findElementById(Document doc, String id, String[] tags) {
        for (String tag : tags) {
            NodeList nodes = getElementsByTag(doc, tag);
            for (int i = 0; i < nodes.getLength(); i++) {
                Element el = (Element) nodes.item(i);
                if (id.equals(el.getAttribute("id"))) {
                    return el;
                }
            }
        }
        return null;
    }

    /** Busca todos los SequenceFlows y devuelve los targetRef donde sourceRef == sourceId. */
    private List<String> findOutgoingTargets(Document doc, String sourceId) {
        List<String> targets = new ArrayList<>();
        for (String tag : SEQ_FLOW_TAGS) {
            NodeList nodes = getElementsByTag(doc, tag);
            for (int i = 0; i < nodes.getLength(); i++) {
                Element el = (Element) nodes.item(i);
                if (sourceId.equals(el.getAttribute("sourceRef"))) {
                    String target = el.getAttribute("targetRef");
                    if (!target.isBlank()) {
                        targets.add(target);
                    }
                }
            }
            if (!targets.isEmpty()) break;
        }
        return targets;
    }

    /**
     * Resuelve un nodo por ID:
     * - Si es UserTask → Optional.of(BpmnTask)
     * - Si es EndEvent → Optional.empty() (fin)
     * - Si es Gateway → sigue los outgoing del gateway recursivamente
     * - null = nodo desconocido, trata como fin
     */
    private Optional<BpmnTask> resolveNode(Document doc, String nodeId) {
        // ¿Es UserTask?
        Element taskEl = findElementById(doc, nodeId, USER_TASK_TAGS);
        if (taskEl != null) {
            String name = taskEl.getAttribute("name");
            return Optional.of(new BpmnTask(nodeId, name.isBlank() ? "Tarea " + nodeId : name));
        }

        // ¿Es EndEvent?
        Element endEl = findElementById(doc, nodeId, END_EVENT_TAGS);
        if (endEl != null) {
            return Optional.empty(); // fin de proceso
        }

        // ¿Es Gateway? → atraviesa hacia el primer outgoing
        Element gwEl = findElementById(doc, nodeId, GATEWAY_TAGS);
        if (gwEl != null) {
            List<String> gwTargets = findOutgoingTargets(doc, nodeId);
            for (String target : gwTargets) {
                Optional<BpmnTask> resolved = resolveNode(doc, target);
                if (resolved != null) {
                    return resolved;
                }
            }
            return Optional.empty();
        }

        // Nodo no reconocido → trata como fin seguro
        log.warn("[BpmnMotor] Nodo '{}' no reconocido, tratando como EndEvent", nodeId);
        return Optional.empty();
    }

    /**
     * Sigue el flujo desde un sourceId hasta encontrar la primera UserTask.
     */
    private Optional<BpmnTask> followFlowToUserTask(Document doc, String sourceId) {
        List<String> targets = findOutgoingTargets(doc, sourceId);
        for (String targetId : targets) {
            Optional<BpmnTask> result = resolveNode(doc, targetId);
            if (result != null && result.isPresent()) {
                return result;
            }
            // Si es vacío (EndEvent) o null, sigue buscando en el siguiente target
        }
        return Optional.empty();
    }

    /** Obtiene un atributo ignorando el prefijo de namespace (busca "name" y "camunda:name"). */
    private String getAttributeIgnoreNs(Element el, String localName) {
        // Intenta directamente
        String val = el.getAttribute(localName);
        if (!val.isBlank()) return val;

        // Intenta con prefijos comunes de camunda
        for (String prefix : new String[]{"camunda", "flowable", "activiti"}) {
            val = el.getAttribute(prefix + ":" + localName);
            if (!val.isBlank()) return val;
        }

        // Intenta getAttributeNS con URI de camunda
        val = el.getAttributeNS("http://camunda.org/schema/1.0/bpmn", localName);
        if (val != null && !val.isBlank()) return val;

        return null;
    }

    /** Wrapper que intenta getElementsByTagNameNS("*", localPart) y también por tagName completo. */
    private NodeList getElementsByTag(Document doc, String tagName) {
        // Si tiene prefijo, intentamos por tagName exacto primero
        NodeList nl = doc.getElementsByTagName(tagName);
        if (nl.getLength() > 0) return nl;

        // Intenta por localName usando wildcard namespace
        String localName = tagName.contains(":") ? tagName.split(":")[1] : tagName;
        return doc.getElementsByTagNameNS("*", localName);
    }
}
