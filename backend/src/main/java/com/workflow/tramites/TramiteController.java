package com.workflow.tramites;

import com.workflow.shared.exception.ResourceNotFoundException;
import com.workflow.users.User;
import com.workflow.users.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/tramites")
@RequiredArgsConstructor
public class TramiteController {

    private final TramiteService tramiteService;
    private final UserRepository userRepository;

    // -----------------------------------------------------------------------
    // POST /tramites — Iniciar un nuevo trámite (cualquier usuario autenticado)
    // -----------------------------------------------------------------------

    @PostMapping
    public ResponseEntity<TramiteResponse> crearTramite(@Valid @RequestBody CreateTramiteRequest request) {
        String clienteId = resolverUsuarioActualId();
        TramiteResponse response = tramiteService.crearTramite(request.getPoliticaId(), clienteId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // -----------------------------------------------------------------------
    // GET /tramites — Listar trámites (filtrado automáticamente por rol)
    // -----------------------------------------------------------------------

    @GetMapping
    public ResponseEntity<Page<TramiteResponse>> getTramites(
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = resolverUsuarioActualId();
        Page<TramiteResponse> tramites = tramiteService.getTramites(userId, estado, page, size);
        return ResponseEntity.ok(tramites);
    }

    // -----------------------------------------------------------------------
    // GET /tramites/stats — Conteos por estado según scope del usuario
    // IMPORTANTE: debe ir ANTES de /{id} para evitar colisión de rutas
    // -----------------------------------------------------------------------

    @GetMapping("/stats")
    public ResponseEntity<TramiteStatsResponse> getStats() {
        String userId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.getTramiteStats(userId));
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/tomar — Funcionario toma el trámite (asignación individual)
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/tomar")
    public ResponseEntity<TramiteResponse> tomarTramite(@PathVariable String id) {
        String funcionarioId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.tomarTramite(id, funcionarioId));
    }

    // -----------------------------------------------------------------------
    // GET /tramites/{id} — Detalle del trámite con historial
    // -----------------------------------------------------------------------

    @GetMapping("/{id}")
    public ResponseEntity<TramiteResponse> getTramiteById(@PathVariable String id) {
        TramiteResponse tramite = tramiteService.getTramiteById(id);
        return ResponseEntity.ok(tramite);
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/avanzar — Avanzar el trámite (funcionario o admin)
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/avanzar")
    public ResponseEntity<TramiteResponse> avanzarTramite(
            @PathVariable String id,
            @Valid @RequestBody AvanzarTramiteRequest request) {
        String responsableId = resolverUsuarioActualId();
        TramiteResponse response = tramiteService.avanzarTramite(id, request, responsableId);
        return ResponseEntity.ok(response);
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/responder — Cliente responde tras estado DEVUELTO
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/responder")
    public ResponseEntity<TramiteResponse> responderTramite(
            @PathVariable String id,
            @RequestBody(required = false) ResponderTramiteRequest request) {
        String clienteId = resolverUsuarioActualId();
        TramiteResponse response = tramiteService.responderTramite(id, clienteId, request);
        return ResponseEntity.ok(response);
    }

    // -----------------------------------------------------------------------
    // GET /tramites/mis-tramites — Trámites del cliente autenticado (portal cliente)
    // IMPORTANTE: debe ir ANTES de /{id} para evitar colisión de rutas
    // -----------------------------------------------------------------------

    @GetMapping("/mis-tramites")
    public ResponseEntity<Page<TramiteResponse>> getMisTramites(
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String clienteId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.getMisTramites(clienteId, estado, page, size));
    }

    // -----------------------------------------------------------------------
    // GET /tramites/sin-asignar — Bandeja de trámites sin asignar (solo ADMIN)
    // IMPORTANTE: debe ir ANTES de /{id} para evitar colisión de rutas
    // -----------------------------------------------------------------------

    @GetMapping("/sin-asignar")
    @PreAuthorize("hasAnyAuthority('ADMINISTRADOR','SUPERADMIN')")
    public ResponseEntity<Page<TramiteResponse>> getTramitesSinAsignar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(tramiteService.getTramitesSinAsignar(page, size));
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/asignar-manual — Asignación manual por administrador
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/asignar-manual")
    @PreAuthorize("hasAnyAuthority('ADMINISTRADOR','SUPERADMIN')")
    public ResponseEntity<TramiteResponse> asignarManual(
            @PathVariable String id,
            @Valid @RequestBody AsignarManualRequest request) {
        return ResponseEntity.ok(tramiteService.asignarManual(id, request.getFuncionarioId()));
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/observar — Funcionario/admin observa formalmente
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/observar")
    @PreAuthorize("hasAnyAuthority('FUNCIONARIO','ADMINISTRADOR','SUPERADMIN')")
    public ResponseEntity<TramiteResponse> observar(
            @PathVariable String id,
            @Valid @RequestBody ObservarDenegarRequest request) {
        String funcionarioId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.observar(id, funcionarioId, request));
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/denegar — Funcionario/admin deniega con opción de apelar
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/denegar")
    @PreAuthorize("hasAnyAuthority('FUNCIONARIO','ADMINISTRADOR','SUPERADMIN')")
    public ResponseEntity<TramiteResponse> denegar(
            @PathVariable String id,
            @Valid @RequestBody ObservarDenegarRequest request) {
        String funcionarioId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.denegar(id, funcionarioId, request));
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/apelar — Cliente presenta apelación
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/apelar")
    public ResponseEntity<TramiteResponse> apelar(
            @PathVariable String id,
            @Valid @RequestBody ApelarRequest request) {
        String clienteId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.apelar(id, clienteId, request));
    }

    // -----------------------------------------------------------------------
    // POST /tramites/{id}/resolver-apelacion — Funcionario/admin resuelve
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/resolver-apelacion")
    @PreAuthorize("hasAnyAuthority('FUNCIONARIO','ADMINISTRADOR','SUPERADMIN')")
    public ResponseEntity<TramiteResponse> resolverApelacion(
            @PathVariable String id,
            @RequestBody ResolverApelacionRequest request) {
        String funcionarioId = resolverUsuarioActualId();
        return ResponseEntity.ok(tramiteService.resolverApelacion(id, funcionarioId, request));
    }

    // -----------------------------------------------------------------------
    // GET /tramites/{id}/apelacion — Detalle de la apelación
    // -----------------------------------------------------------------------

    @GetMapping("/{id}/apelacion")
    public ResponseEntity<Tramite.Apelacion> getApelacion(@PathVariable String id) {
        return ResponseEntity.ok(tramiteService.getApelacion(id));
    }

    // -----------------------------------------------------------------------
    // GET /tramites/{id}/respuestas — Historial de datos de formulario por etapa
    // -----------------------------------------------------------------------

    @GetMapping("/{id}/respuestas")
    public ResponseEntity<List<RespuestaResponse>> getRespuestas(@PathVariable String id) {
        return ResponseEntity.ok(tramiteService.getRespuestas(id));
    }

    // -----------------------------------------------------------------------
    // GET /tramites/{id}/formulario-actual — Campos del formulario de la etapa actual
    // -----------------------------------------------------------------------

    @GetMapping("/{id}/formulario-actual")
    public ResponseEntity<FormularioActualResponse> getFormularioActual(@PathVariable String id) {
        return ResponseEntity.ok(tramiteService.getFormularioActual(id));
    }

    // -----------------------------------------------------------------------
    // Helper: resuelve el ID del usuario autenticado desde el contexto JWT
    // -----------------------------------------------------------------------

    private String resolverUsuarioActualId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User usuario = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario autenticado no encontrado: " + email));
        return usuario.getId();
    }
}
