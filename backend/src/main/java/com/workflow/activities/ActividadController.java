package com.workflow.activities;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ActividadController {

    private final ActividadService actividadService;

    // GET /policies/{policyId}/activities
    @GetMapping("/policies/{policyId}/activities")
    public ResponseEntity<List<ActividadResponse>> getByPolitica(@PathVariable String policyId) {
        return ResponseEntity.ok(actividadService.getByPoliticaId(policyId));
    }

    // GET /activities/by-policy/{policyId}  (alias for the BPMN properties panel)
    @GetMapping("/activities/by-policy/{policyId}")
    public ResponseEntity<List<ActividadResponse>> getByPoliticaAlias(@PathVariable String policyId) {
        return ResponseEntity.ok(actividadService.getByPoliticaId(policyId));
    }

    // GET /activities/{id}
    @GetMapping("/activities/{id}")
    public ResponseEntity<ActividadResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(actividadService.getById(id));
    }

    // POST /activities
    @PostMapping("/activities")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<ActividadResponse> create(@Valid @RequestBody CreateActividadRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(actividadService.create(request));
    }

    // PUT /activities/{id}
    @PutMapping("/activities/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<ActividadResponse> update(
            @PathVariable String id,
            @Valid @RequestBody UpdateActividadRequest request) {
        return ResponseEntity.ok(actividadService.update(id, request));
    }

    // PATCH /activities/{id}/propiedades
    @PatchMapping("/activities/{id}/propiedades")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<ActividadResponse> updatePropiedades(
            @PathVariable String id,
            @RequestBody ActividadPropiedadesRequest request) {
        return ResponseEntity.ok(actividadService.updatePropiedades(id, request));
    }

    // DELETE /activities/{id}
    @DeleteMapping("/activities/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        actividadService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
