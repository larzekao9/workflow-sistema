package com.workflow.decisions;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/decisions")
@RequiredArgsConstructor
public class DecisionController {

    private final DecisionService decisionService;

    @PostMapping
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<DecisionResponse> create(
            @Valid @RequestBody CreateDecisionRequest request,
            Authentication authentication) {
        DecisionResponse response = decisionService.create(
                request.politicaId(),
                request.gatewayBpmnId(),
                request.nombre(),
                authentication.getName()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DecisionResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(decisionService.getById(id));
    }

    @GetMapping("/by-politica/{politicaId}")
    public ResponseEntity<List<DecisionResponse>> listByPolitica(@PathVariable String politicaId) {
        return ResponseEntity.ok(decisionService.listByPolitica(politicaId));
    }

    @GetMapping("/by-gateway")
    public ResponseEntity<DecisionResponse> getByGateway(
            @RequestParam String politicaId,
            @RequestParam String gatewayBpmnId) {
        return decisionService.findByGateway(politicaId, gatewayBpmnId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/dmn")
    public ResponseEntity<Map<String, String>> getDmn(@PathVariable String id) {
        return ResponseEntity.ok(decisionService.getDmn(id));
    }

    @PutMapping("/{id}/dmn")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Void> saveDmn(
            @PathVariable String id,
            @Valid @RequestBody SaveDmnRequest request) {
        decisionService.saveDmn(id, request.dmnXml());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        decisionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
