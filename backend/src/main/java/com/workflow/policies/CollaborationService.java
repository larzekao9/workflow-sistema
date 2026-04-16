package com.workflow.policies;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final SimpMessagingTemplate messagingTemplate;

    // policyId → { userId → CollaboratorInfo }
    private final Map<String, Map<String, CollaboratorInfo>> presence = new ConcurrentHashMap<>();

    private static final List<String> COLORS = List.of(
            "#F44336", "#E91E63", "#9C27B0", "#3F51B5",
            "#2196F3", "#009688", "#FF9800", "#795548"
    );

    public List<CollaboratorInfo> join(String policyId, String userId, String nombreCompleto, String email) {
        String color = COLORS.get(Math.abs(userId.hashCode()) % COLORS.size());
        presence.computeIfAbsent(policyId, k -> new ConcurrentHashMap<>())
                .put(userId, new CollaboratorInfo(userId, nombreCompleto, email, color));
        List<CollaboratorInfo> collaborators = getCollaborators(policyId);
        broadcast(policyId, collaborators);
        log.info("Colaborador unido: policyId={}, userId={}", policyId, userId);
        return collaborators;
    }

    public void leave(String policyId, String userId) {
        Map<String, CollaboratorInfo> policy = presence.get(policyId);
        if (policy != null) {
            policy.remove(userId);
            if (policy.isEmpty()) presence.remove(policyId);
        }
        broadcast(policyId, getCollaborators(policyId));
        log.info("Colaborador salió: policyId={}, userId={}", policyId, userId);
    }

    public List<CollaboratorInfo> getCollaborators(String policyId) {
        Map<String, CollaboratorInfo> policy = presence.get(policyId);
        return policy == null ? List.of() : List.copyOf(policy.values());
    }

    private void broadcast(String policyId, List<CollaboratorInfo> collaborators) {
        messagingTemplate.convertAndSend("/topic/policy/" + policyId + "/collaborators", collaborators);
    }
}
