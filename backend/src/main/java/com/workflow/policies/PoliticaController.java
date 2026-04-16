package com.workflow.policies;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    // GET /policies/{id}/bpmn
    @GetMapping("/{id}/bpmn")
    public ResponseEntity<Map<String, Object>> getBpmn(@PathVariable String id) {
        return ResponseEntity.ok(politicaService.getBpmn(id));
    }

    // PUT /policies/{id}/bpmn
    @PutMapping("/{id}/bpmn")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Map<String, Object>> saveBpmn(
            @PathVariable String id,
            @Valid @RequestBody SaveBpmnRequest body) {
        Map<String, Object> result = politicaService.saveBpmn(id, body.bpmnXml(), body.bpmnVersion());
        return ResponseEntity.ok(result);
    }

    // POST /policies/{id}/join — registrar colaborador activo
    @PostMapping("/{id}/join")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<List<CollaboratorInfo>> join(@PathVariable String id) {
        List<CollaboratorInfo> collaborators = politicaService.joinCollaboration(id);
        return ResponseEntity.ok(collaborators);
    }

    // POST /policies/{id}/leave — salir de la sesión colaborativa
    @PostMapping("/{id}/leave")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<Void> leave(
            @PathVariable String id,
            @RequestParam String userId) {
        politicaService.leaveCollaboration(id, userId);
        return ResponseEntity.noContent().build();
    }

    // GET /policies/{id}/collaborators — lista de colaboradores activos
    @GetMapping("/{id}/collaborators")
    @PreAuthorize("hasAuthority('GESTIONAR_POLITICAS')")
    public ResponseEntity<List<CollaboratorInfo>> getCollaborators(@PathVariable String id) {
        return ResponseEntity.ok(politicaService.getCollaboratorsForPolicy(id));
    }
}
