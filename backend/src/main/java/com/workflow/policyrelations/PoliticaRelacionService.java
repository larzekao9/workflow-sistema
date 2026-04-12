package com.workflow.policyrelations;

import com.workflow.policies.Politica;
import com.workflow.policies.PoliticaRepository;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PoliticaRelacionService {

    private final PoliticaRelacionRepository relacionRepository;
    private final PoliticaRepository politicaRepository;

    // -----------------------------------------------------------------------
    // Consultas
    // -----------------------------------------------------------------------

    /**
     * Retorna todas las relaciones (activas e inactivas) donde la política participa como origen O destino.
     * Resuelve los nombres de ambas políticas para evitar round-trips adicionales desde el cliente.
     */
    public List<PoliticaRelacionResponse> findByPolitica(String politicaId) {
        List<PoliticaRelacion> relaciones =
                relacionRepository.findByPoliticaOrigenIdOrPoliticaDestinoId(politicaId, politicaId);

        if (relaciones.isEmpty()) {
            return List.of();
        }

        // Recolectar todos los IDs únicos de políticas referenciadas y resolverlos en batch
        Set<String> politicaIds = relaciones.stream()
                .flatMap(r -> java.util.stream.Stream.of(r.getPoliticaOrigenId(), r.getPoliticaDestinoId()))
                .collect(Collectors.toSet());

        Map<String, String> nombresPorId = politicaRepository.findAllById(politicaIds)
                .stream()
                .collect(Collectors.toMap(Politica::getId, Politica::getNombre));

        return relaciones.stream()
                .map(r -> toResponse(r, nombresPorId))
                .collect(Collectors.toList());
    }

    // -----------------------------------------------------------------------
    // Creación
    // -----------------------------------------------------------------------

    public PoliticaRelacionResponse create(
            String politicaOrigenId,
            CreatePoliticaRelacionRequest request,
            String creadoPorId) {

        String destinoId = request.getPoliticaDestinoId();

        // Regla de negocio: prohibición de auto-relación (no imponible con índice MongoDB)
        if (politicaOrigenId.equals(destinoId)) {
            throw new BadRequestException(
                    "Una política no puede tener una relación consigo misma");
        }

        // Validar que el par (origen, destino, tipo) no exista ya
        if (relacionRepository.existsByPoliticaOrigenIdAndPoliticaDestinoIdAndTipoRelacion(
                politicaOrigenId, destinoId, request.getTipoRelacion())) {
            throw new BadRequestException(
                    "Ya existe una relación de tipo " + request.getTipoRelacion()
                            + " entre las políticas indicadas");
        }

        // Cargar y validar la política origen
        Politica origen = politicaRepository.findById(politicaOrigenId)
                .orElseThrow(() -> new ResourceNotFoundException("Política", politicaOrigenId));
        validarEstadoPermitido(origen);

        // Cargar y validar la política destino
        Politica destino = politicaRepository.findById(destinoId)
                .orElseThrow(() -> new ResourceNotFoundException("Política", destinoId));
        validarEstadoPermitido(destino);

        // Regla de negocio: ESCALAMIENTO requiere que la política origen tenga tiempoLimiteDias definido
        if (request.getTipoRelacion() == TipoRelacion.ESCALAMIENTO
                && origen.getTiempoLimiteDias() == null) {
            throw new BadRequestException(
                    "Para crear una relación de tipo ESCALAMIENTO la política origen debe tener "
                            + "'tiempoLimiteDias' definido (SLA requerido)");
        }

        PoliticaRelacion relacion = PoliticaRelacion.builder()
                .politicaOrigenId(politicaOrigenId)
                .politicaDestinoId(destinoId)
                .tipoRelacion(request.getTipoRelacion())
                .prioridad(request.getPrioridad())
                .descripcion(request.getDescripcion())
                .activo(true)
                .creadoPorId(creadoPorId)
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        PoliticaRelacion saved = relacionRepository.save(relacion);

        log.info("Relación de política creada: id={}, origen={}, destino={}, tipo={}, por usuario={}",
                saved.getId(), politicaOrigenId, destinoId, request.getTipoRelacion(), creadoPorId);

        Map<String, String> nombres = Map.of(
                origen.getId(), origen.getNombre(),
                destino.getId(), destino.getNombre()
        );

        return toResponse(saved, nombres);
    }

    // -----------------------------------------------------------------------
    // Soft delete
    // -----------------------------------------------------------------------

    /**
     * Desactiva la relación (activo = false). Nunca elimina físicamente el documento
     * para preservar la trazabilidad histórica de configuraciones.
     */
    public void delete(String relacionId) {
        PoliticaRelacion relacion = relacionRepository.findById(relacionId)
                .orElseThrow(() -> new ResourceNotFoundException("PoliticaRelacion", relacionId));

        if (!relacion.isActivo()) {
            throw new BadRequestException("La relación ya está inactiva");
        }

        relacion.setActivo(false);
        relacion.setActualizadoEn(LocalDateTime.now());
        relacionRepository.save(relacion);

        log.info("Relación de política desactivada (soft delete): id={}", relacionId);
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    /**
     * Las relaciones solo pueden crearse entre políticas que no estén ARCHIVADAS.
     * Una política ARCHIVADA es inmutable; no tiene sentido vincularla en nuevas relaciones.
     */
    private void validarEstadoPermitido(Politica politica) {
        if (politica.getEstado() == Politica.EstadoPolitica.ARCHIVADA) {
            throw new BadRequestException(
                    "La política '" + politica.getNombre()
                            + "' está ARCHIVADA y no puede participar en nuevas relaciones");
        }
    }

    private PoliticaRelacionResponse toResponse(PoliticaRelacion r, Map<String, String> nombresPorId) {
        return PoliticaRelacionResponse.builder()
                .id(r.getId())
                .politicaOrigenId(r.getPoliticaOrigenId())
                .politicaDestinoId(r.getPoliticaDestinoId())
                .tipoRelacion(r.getTipoRelacion() != null ? r.getTipoRelacion().name() : null)
                .prioridad(r.getPrioridad())
                .descripcion(r.getDescripcion())
                .activo(r.isActivo())
                .creadoPorId(r.getCreadoPorId())
                .creadoEn(r.getCreadoEn())
                .actualizadoEn(r.getActualizadoEn())
                .politicaOrigenNombre(nombresPorId.getOrDefault(r.getPoliticaOrigenId(), null))
                .politicaDestinoNombre(nombresPorId.getOrDefault(r.getPoliticaDestinoId(), null))
                .build();
    }
}
