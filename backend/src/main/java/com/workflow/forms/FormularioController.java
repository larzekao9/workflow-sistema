package com.workflow.forms;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/forms")
@RequiredArgsConstructor
public class FormularioController {

    private final FormularioService formularioService;

    // GET /forms?nombre=&estado=&page=0&size=20
    @GetMapping
    public ResponseEntity<Page<FormularioResponse>> findAll(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "actualizadoEn"));
        return ResponseEntity.ok(formularioService.findAll(nombre, estado, pageable));
    }

    // GET /forms/{id}
    @GetMapping("/{id}")
    public ResponseEntity<FormularioResponse> findById(@PathVariable String id) {
        return ResponseEntity.ok(formularioService.findById(id));
    }

    // POST /forms
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FormularioResponse> create(
            @Valid @RequestBody CreateFormularioRequest request,
            Authentication authentication) {

        String userId = authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(formularioService.create(request, userId));
    }

    // PUT /forms/{id}
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FormularioResponse> update(
            @PathVariable String id,
            @Valid @RequestBody UpdateFormularioRequest request) {

        return ResponseEntity.ok(formularioService.update(id, request));
    }

    // DELETE /forms/{id}  — soft delete: cambia estado a INACTIVO
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        formularioService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
