package com.workflow.activities;

import com.workflow.policies.Politica;
import com.workflow.policies.PoliticaRepository;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActividadService {

    private final ActividadRepository actividadRepository;
    private final PoliticaRepository politicaRepository;

    public List<ActividadResponse> getByPoliticaId(String politicaId) {
        // Verificar que la política exista
        politicaRepository.findById(politicaId)
                .orElseThrow(() -> new ResourceNotFoundException("Política", politicaId));

        return actividadRepository.findByPoliticaId(politicaId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ActividadResponse getById(String id) {
        Actividad actividad = actividadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad", id));
        return toResponse(actividad);
    }

    public ActividadResponse create(CreateActividadRequest request) {
        // Verificar que la política exista y esté en BORRADOR
        Politica politica = politicaRepository.findById(request.getPoliticaId())
                .orElseThrow(() -> new ResourceNotFoundException("Política", request.getPoliticaId()));

        verificarPoliticaBorrador(politica);

        // Nodos TAREA requieren responsableRolId
        if (request.getTipo() == Actividad.TipoActividad.TAREA && request.getResponsableRolId() == null) {
            throw new BadRequestException("Las actividades de tipo TAREA requieren un responsableRolId");
        }

        List<Actividad.Transicion> transiciones = mapTransiciones(request.getTransiciones());

        Actividad.Posicion posicion = null;
        if (request.getPosicion() != null) {
            posicion = Actividad.Posicion.builder()
                    .x(request.getPosicion().getX())
                    .y(request.getPosicion().getY())
                    .build();
        }

        Actividad actividad = Actividad.builder()
                .politicaId(request.getPoliticaId())
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .tipo(request.getTipo())
                .responsableRolId(request.getResponsableRolId())
                .formularioId(request.getFormularioId())
                .posicion(posicion != null ? posicion : Actividad.Posicion.builder().x(0.0).y(0.0).build())
                .transiciones(transiciones)
                .tiempoLimiteHoras(request.getTiempoLimiteHoras())
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        Actividad saved = actividadRepository.save(actividad);

        // Registrar actividad en la lista de la política
        List<String> actividadIds = politica.getActividadIds();
        actividadIds.add(saved.getId());
        politica.setActividadIds(actividadIds);
        politica.setActualizadoEn(LocalDateTime.now());
        politicaRepository.save(politica);

        String currentUser = getCurrentUserId();
        log.info("Actividad creada: id={}, tipo={}, politicaId={}, por usuario={}",
                saved.getId(), saved.getTipo(), saved.getPoliticaId(), currentUser);

        return toResponse(saved);
    }

    public ActividadResponse update(String id, UpdateActividadRequest request) {
        Actividad actividad = actividadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad", id));

        Politica politica = politicaRepository.findById(actividad.getPoliticaId())
                .orElseThrow(() -> new ResourceNotFoundException("Política", actividad.getPoliticaId()));

        verificarPoliticaBorrador(politica);

        if (request.getNombre() != null) {
            actividad.setNombre(request.getNombre());
        }
        if (request.getDescripcion() != null) {
            actividad.setDescripcion(request.getDescripcion());
        }
        if (request.getResponsableRolId() != null) {
            actividad.setResponsableRolId(request.getResponsableRolId());
        }
        if (request.getFormularioId() != null) {
            actividad.setFormularioId(request.getFormularioId());
        }
        if (request.getPosicion() != null) {
            actividad.setPosicion(Actividad.Posicion.builder()
                    .x(request.getPosicion().getX())
                    .y(request.getPosicion().getY())
                    .build());
        }
        if (request.getTransiciones() != null) {
            actividad.setTransiciones(mapUpdateTransiciones(request.getTransiciones()));
        }
        if (request.getTiempoLimiteHoras() != null) {
            actividad.setTiempoLimiteHoras(request.getTiempoLimiteHoras());
        }

        actividad.setActualizadoEn(LocalDateTime.now());

        Actividad updated = actividadRepository.save(actividad);

        log.info("Actividad actualizada: id={}, politicaId={}, por usuario={}",
                id, actividad.getPoliticaId(), getCurrentUserId());

        return toResponse(updated);
    }

    public void delete(String id) {
        Actividad actividad = actividadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad", id));

        Politica politica = politicaRepository.findById(actividad.getPoliticaId())
                .orElseThrow(() -> new ResourceNotFoundException("Política", actividad.getPoliticaId()));

        verificarPoliticaBorrador(politica);

        // Verificar que ninguna otra actividad tenga una transición apuntando a esta
        List<Actividad> todas = actividadRepository.findByPoliticaId(actividad.getPoliticaId());
        boolean esReferenciada = todas.stream()
                .filter(a -> !a.getId().equals(id))
                .flatMap(a -> a.getTransiciones().stream())
                .anyMatch(t -> id.equals(t.getActividadDestinoId()));

        if (esReferenciada) {
            throw new BadRequestException(
                    "La actividad no puede eliminarse porque está referenciada por las transiciones de otra actividad");
        }

        // Quitar de la lista de la política
        politica.getActividadIds().remove(id);
        politica.setActualizadoEn(LocalDateTime.now());
        politicaRepository.save(politica);

        actividadRepository.deleteById(id);

        log.info("Actividad eliminada: id={}, politicaId={}, por usuario={}",
                id, actividad.getPoliticaId(), getCurrentUserId());
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    private void verificarPoliticaBorrador(Politica politica) {
        if (politica.getEstado() != Politica.EstadoPolitica.BORRADOR) {
            throw new BadRequestException(
                    "La política está en estado " + politica.getEstado() + " y no puede ser modificada");
        }
    }

    private List<Actividad.Transicion> mapTransiciones(
            List<CreateActividadRequest.TransicionRequest> reqs) {
        if (reqs == null) return List.of();
        return reqs.stream()
                .map(t -> Actividad.Transicion.builder()
                        .actividadDestinoId(t.getActividadDestinoId())
                        .condicion(t.getCondicion())
                        .etiqueta(t.getEtiqueta())
                        .build())
                .collect(Collectors.toList());
    }

    private List<Actividad.Transicion> mapUpdateTransiciones(
            List<UpdateActividadRequest.TransicionRequest> reqs) {
        return reqs.stream()
                .map(t -> Actividad.Transicion.builder()
                        .actividadDestinoId(t.getActividadDestinoId())
                        .condicion(t.getCondicion())
                        .etiqueta(t.getEtiqueta())
                        .build())
                .collect(Collectors.toList());
    }

    private String getCurrentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "system";
        } catch (Exception e) {
            return "system";
        }
    }

    ActividadResponse toResponse(Actividad a) {
        List<ActividadResponse.TransicionResponse> transiciones = a.getTransiciones() == null
                ? List.of()
                : a.getTransiciones().stream()
                        .map(t -> ActividadResponse.TransicionResponse.builder()
                                .actividadDestinoId(t.getActividadDestinoId())
                                .condicion(t.getCondicion())
                                .etiqueta(t.getEtiqueta())
                                .build())
                        .collect(Collectors.toList());

        ActividadResponse.PosicionResponse posicion = null;
        if (a.getPosicion() != null) {
            posicion = ActividadResponse.PosicionResponse.builder()
                    .x(a.getPosicion().getX())
                    .y(a.getPosicion().getY())
                    .build();
        }

        return ActividadResponse.builder()
                .id(a.getId())
                .politicaId(a.getPoliticaId())
                .nombre(a.getNombre())
                .descripcion(a.getDescripcion())
                .tipo(a.getTipo() != null ? a.getTipo().name() : null)
                .responsableRolId(a.getResponsableRolId())
                .formularioId(a.getFormularioId())
                .posicion(posicion)
                .transiciones(transiciones)
                .tiempoLimiteHoras(a.getTiempoLimiteHoras())
                .creadoEn(a.getCreadoEn())
                .actualizadoEn(a.getActualizadoEn())
                .build();
    }
}
