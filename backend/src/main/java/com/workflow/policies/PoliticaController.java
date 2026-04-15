package com.workflow.policies;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/policies")
@RequiredArgsConstructor
public class PoliticaController {

    private final PoliticaService politicaService;

    // GET /policies?estado=&nombre=&page=0&size=20
    @GetMapping
    public ResponseEntity<Page<PoliticaResponse>> getAll(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String nombre,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(politicaService.getAll(estado, nombre, page, size));
    }

    // GET /policies/{id}
    @GetMapping("/{id}")
    public ResponseEntity<PoliticaResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(politicaService.getById(id));
    }

    // POST /policies
    @PostMapping
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<PoliticaResponse> create(@Valid @RequestBody CreatePoliticaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(politicaService.create(request));
    }

    // PUT /policies/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<PoliticaResponse> update(
            @PathVariable String id,
            @Valid @RequestBody UpdatePoliticaRequest request) {
        return ResponseEntity.ok(politicaService.update(id, request));
    }

    // DELETE /policies/{id} → hard delete (elimina de la base de datos)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        politicaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE /policies → elimina TODAS las políticas y sus actividades
    @DeleteMapping
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Map<String, Object>> deleteAll() {
        int eliminadas = politicaService.deleteAll();
        return ResponseEntity.ok(Map.of(
                "mensaje", "Eliminación masiva completada",
                "politicasEliminadas", eliminadas
        ));
    }

    // POST /policies/{id}/publish
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('PUBLICAR_POLITICA')")
    public ResponseEntity<PoliticaResponse> publish(@PathVariable String id) {
        return ResponseEntity.ok(politicaService.publicar(id));
    }

    // POST /policies/{id}/version
    @PostMapping("/{id}/version")
    @PreAuthorize("hasAuthority('VERSIONAR_POLITICA')")
    public ResponseEntity<PoliticaResponse> crearVersion(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(politicaService.crearVersion(id));
    }
}
