package com.workflow.policyrelations;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/policies/{policyId}/relations")
@RequiredArgsConstructor
public class PoliticaRelacionController {

    private final PoliticaRelacionService relacionService;

    // GET /policies/{policyId}/relations
    @GetMapping
    public ResponseEntity<List<PoliticaRelacionResponse>> getByPolitica(
            @PathVariable String policyId) {
        return ResponseEntity.ok(relacionService.findByPolitica(policyId));
    }

    // POST /policies/{policyId}/relations
    @PostMapping
    public ResponseEntity<PoliticaRelacionResponse> create(
            @PathVariable String policyId,
            @Valid @RequestBody CreatePoliticaRelacionRequest request) {
        String userId = getCurrentUserId();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(relacionService.create(policyId, request, userId));
    }

    // DELETE /policies/{policyId}/relations/{relacionId}
    @DeleteMapping("/{relacionId}")
    public ResponseEntity<Void> delete(
            @PathVariable String policyId,
            @PathVariable String relacionId) {
        relacionService.delete(relacionId);
        return ResponseEntity.noContent().build();
    }

    // -----------------------------------------------------------------------
    // Helper privado — extrae userId del SecurityContext igual que el resto del proyecto
    // -----------------------------------------------------------------------

    private String getCurrentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "system";
        } catch (Exception e) {
            return "system";
        }
    }
}
