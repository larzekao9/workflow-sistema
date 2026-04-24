package com.workflow.empresas;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/empresas")
@RequiredArgsConstructor
public class EmpresaController {

    private final EmpresaService empresaService;

    @GetMapping
    public ResponseEntity<List<EmpresaResponse>> getAll() {
        return ResponseEntity.ok(empresaService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmpresaResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(empresaService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GESTIONAR_EMPRESAS')")
    public ResponseEntity<EmpresaResponse> create(@Valid @RequestBody EmpresaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(empresaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_EMPRESAS')")
    public ResponseEntity<EmpresaResponse> update(
            @PathVariable String id,
            @Valid @RequestBody EmpresaRequest request) {
        return ResponseEntity.ok(empresaService.update(id, request));
    }

    @PostMapping("/{id}/asignar-admin")
    @PreAuthorize("hasAuthority('GESTIONAR_EMPRESAS')")
    public ResponseEntity<EmpresaResponse> asignarAdmin(
            @PathVariable String id,
            @Valid @RequestBody AsignarAdminRequest request) {
        return ResponseEntity.ok(empresaService.asignarAdmin(id, request.getAdminId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_EMPRESAS')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        empresaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
