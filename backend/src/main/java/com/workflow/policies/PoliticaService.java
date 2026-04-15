package com.workflow.policies;

import com.workflow.activities.Actividad;
import com.workflow.activities.ActividadRepository;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PoliticaService {

    private final PoliticaRepository politicaRepository;
    private final ActividadRepository actividadRepository;

    // -----------------------------------------------------------------------
    // Consultas
    // -----------------------------------------------------------------------

    public Page<PoliticaResponse> getAll(String estado, String nombre, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "creadoEn"));

        Politica.EstadoPolitica estadoEnum = parseEstado(estado);

        Page<Politica> resultPage;
        if (estadoEnum != null && nombre != null && !nombre.isBlank()) {
            resultPage = politicaRepository.findByNombreContainingIgnoreCaseAndEstado(nombre, estadoEnum, pageable);
        } else if (estadoEnum != null) {
            resultPage = politicaRepository.findByEstado(estadoEnum, pageable);
        } else if (nombre != null && !nombre.isBlank()) {
            resultPage = politicaRepository.findByNombreContainingIgnoreCase(nombre, pageable);
        } else {
            resultPage = politicaRepository.findAll(pageable);
        }

        return resultPage.map(this::toResponse);
    }

    public PoliticaResponse getById(String id) {
        Politica politica = findOrThrow(id);
        return toResponse(politica);
    }

    // -----------------------------------------------------------------------
    // Creación
    // -----------------------------------------------------------------------

    public PoliticaResponse create(CreatePoliticaRequest request) {
        String userId = getCurrentUserId();

        Politica.Metadatos metadatos = Politica.Metadatos.builder()
                .tags(request.getTags() != null ? request.getTags() : new ArrayList<>())
                .icono(request.getIcono())
                .color(request.getColor())
                .build();

        Politica politica = Politica.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .version(1)
                .versionPadreId(null)
                .estado(Politica.EstadoPolitica.BORRADOR)
                .actividadIds(new ArrayList<>())
                .metadatos(metadatos)
                .creadoPorId(userId)
                .departamento(request.getDepartamento())
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        Politica saved = politicaRepository.save(politica);

        log.info("Política creada: id={}, nombre='{}', por usuario={}", saved.getId(), saved.getNombre(), userId);

        return toResponse(saved);
    }

    // -----------------------------------------------------------------------
    // Actualización (solo BORRADOR)
    // -----------------------------------------------------------------------

    public PoliticaResponse update(String id, UpdatePoliticaRequest request) {
        Politica politica = findOrThrow(id);
        verificarBorrador(politica);

        if (request.getNombre() != null) {
            politica.setNombre(request.getNombre());
        }
        if (request.getDescripcion() != null) {
            politica.setDescripcion(request.getDescripcion());
        }
        if (request.getDepartamento() != null) {
            politica.setDepartamento(request.getDepartamento());
        }
        // Actualizar metadatos si se envían campos
        Politica.Metadatos meta = politica.getMetadatos();
        if (meta == null) {
            meta = new Politica.Metadatos();
        }
        if (request.getTags() != null) {
            meta.setTags(request.getTags());
        }
        if (request.getIcono() != null) {
            meta.setIcono(request.getIcono());
        }
        if (request.getColor() != null) {
            meta.setColor(request.getColor());
        }
        politica.setMetadatos(meta);
        politica.setActualizadoEn(LocalDateTime.now());

        Politica updated = politicaRepository.save(politica);

        log.info("Política actualizada: id={}, por usuario={}", id, getCurrentUserId());

        return toResponse(updated);
    }

    // -----------------------------------------------------------------------
    // Hard delete → elimina la política y sus actividades de la base de datos
    // -----------------------------------------------------------------------

    public void delete(String id) {
        Politica politica = findOrThrow(id);

        // Eliminar todas las actividades asociadas
        List<Actividad> actividades = actividadRepository.findByPoliticaId(id);
        if (!actividades.isEmpty()) {
            actividadRepository.deleteAll(actividades);
            log.info("Actividades eliminadas para política id={}: {} actividad(es)", id, actividades.size());
        }

        politicaRepository.deleteById(id);
        log.info("Política eliminada permanentemente: id='{}', nombre='{}', por usuario={}",
                id, politica.getNombre(), getCurrentUserId());
    }

    // -----------------------------------------------------------------------
    // Eliminar TODAS las políticas (uso administrativo / desarrollo)
    // -----------------------------------------------------------------------

    public int deleteAll() {
        String userId = getCurrentUserId();
        long totalActividades = actividadRepository.count();
        long totalPoliticas = politicaRepository.count();

        actividadRepository.deleteAll();
        politicaRepository.deleteAll();

        log.warn("ELIMINACIÓN MASIVA: {} política(s) y {} actividad(es) eliminadas por usuario={}",
                totalPoliticas, totalActividades, userId);

        return (int) totalPoliticas;
    }

    // -----------------------------------------------------------------------
    // Publicar → ACTIVA (con validaciones de grafo)
    // -----------------------------------------------------------------------

    public PoliticaResponse publicar(String id) {
        Politica politica = findOrThrow(id);
        verificarBorrador(politica);

        List<Actividad> actividades = actividadRepository.findByPoliticaId(id);

        // 1. Exactamente 1 nodo INICIO
        List<Actividad> inicios = actividades.stream()
                .filter(a -> a.getTipo() == Actividad.TipoActividad.INICIO)
                .collect(Collectors.toList());
        if (inicios.size() != 1) {
            throw new BadRequestException(
                    "La política debe tener exactamente 1 actividad de tipo INICIO (encontradas: " + inicios.size() + ")");
        }

        // 2. Exactamente 1 nodo FIN
        long countFin = actividades.stream()
                .filter(a -> a.getTipo() == Actividad.TipoActividad.FIN)
                .count();
        if (countFin < 1) {
            throw new BadRequestException("La política debe tener al menos 1 actividad de tipo FIN");
        }

        // 3. Todos los nodos TAREA tienen responsableRolId
        List<String> tareasHuerfanas = actividades.stream()
                .filter(a -> a.getTipo() == Actividad.TipoActividad.TAREA)
                .filter(a -> a.getResponsableRolId() == null || a.getResponsableRolId().isBlank())
                .map(Actividad::getNombre)
                .collect(Collectors.toList());
        if (!tareasHuerfanas.isEmpty()) {
            throw new BadRequestException(
                    "Las siguientes actividades TAREA no tienen responsableRolId: " + tareasHuerfanas);
        }

        // 4. Nodos DECISION tienen >= 2 transiciones con condiciones distintas
        actividades.stream()
                .filter(a -> a.getTipo() == Actividad.TipoActividad.DECISION)
                .forEach(decision -> {
                    List<Actividad.Transicion> trans = decision.getTransiciones();
                    if (trans == null || trans.size() < 2) {
                        throw new BadRequestException(
                                "La actividad DECISION '" + decision.getNombre() + "' debe tener al menos 2 transiciones");
                    }
                    Set<String> condiciones = trans.stream()
                            .map(Actividad.Transicion::getCondicion)
                            .collect(Collectors.toSet());
                    if (condiciones.size() < trans.size()) {
                        throw new BadRequestException(
                                "La actividad DECISION '" + decision.getNombre() + "' tiene condiciones duplicadas en sus transiciones");
                    }
                });

        // 5. Grafo conexo: todos los nodos son alcanzables desde INICIO
        Actividad inicio = inicios.get(0);
        Set<String> alcanzables = new HashSet<>();
        Set<String> todasIds = actividades.stream()
                .map(Actividad::getId)
                .collect(Collectors.toSet());

        dfsAlcanzable(inicio.getId(), actividades, alcanzables);

        Set<String> noAlcanzables = new HashSet<>(todasIds);
        noAlcanzables.removeAll(alcanzables);
        if (!noAlcanzables.isEmpty()) {
            List<String> nombres = actividades.stream()
                    .filter(a -> noAlcanzables.contains(a.getId()))
                    .map(Actividad::getNombre)
                    .collect(Collectors.toList());
            throw new BadRequestException(
                    "Las siguientes actividades no son alcanzables desde el nodo INICIO: " + nombres);
        }

        // Todas las validaciones pasaron → publicar
        politica.setEstado(Politica.EstadoPolitica.ACTIVA);
        politica.setActividadInicioId(inicio.getId());
        politica.setActualizadoEn(LocalDateTime.now());

        Politica saved = politicaRepository.save(politica);

        log.info("Política publicada (ACTIVA): id={}, actividadInicioId={}, por usuario={}",
                id, inicio.getId(), getCurrentUserId());

        return toResponse(saved);
    }

    // -----------------------------------------------------------------------
    // Crear nueva versión desde una política ACTIVA o ARCHIVADA
    // -----------------------------------------------------------------------

    public PoliticaResponse crearVersion(String id) {
        Politica original = findOrThrow(id);

        if (original.getEstado() != Politica.EstadoPolitica.ACTIVA
                && original.getEstado() != Politica.EstadoPolitica.ARCHIVADA) {
            throw new BadRequestException(
                    "Solo se puede crear una nueva versión desde una política ACTIVA o ARCHIVADA");
        }

        String userId = getCurrentUserId();

        // Crear copia de la política en BORRADOR
        Politica.Metadatos metaCopia = Politica.Metadatos.builder()
                .tags(original.getMetadatos() != null && original.getMetadatos().getTags() != null
                        ? new ArrayList<>(original.getMetadatos().getTags()) : new ArrayList<>())
                .icono(original.getMetadatos() != null ? original.getMetadatos().getIcono() : null)
                .color(original.getMetadatos() != null ? original.getMetadatos().getColor() : null)
                .build();

        Politica nuevaVersion = Politica.builder()
                .nombre(original.getNombre())
                .descripcion(original.getDescripcion())
                .version(original.getVersion() + 1)
                .versionPadreId(original.getId())
                .estado(Politica.EstadoPolitica.BORRADOR)
                .actividadIds(new ArrayList<>())
                .metadatos(metaCopia)
                .creadoPorId(userId)
                .departamento(original.getDepartamento())
                .creadoEn(LocalDateTime.now())
                .actualizadoEn(LocalDateTime.now())
                .build();

        Politica savedVersion = politicaRepository.save(nuevaVersion);

        // Copiar todas las actividades apuntando a la nueva política
        List<Actividad> actividadesOriginales = actividadRepository.findByPoliticaId(id);

        // Mapa: id original → id nueva copia (para reasignar transiciones)
        Map<String, String> idMap = new HashMap<>();

        List<Actividad> copias = actividadesOriginales.stream()
                .map(original2 -> Actividad.builder()
                        .politicaId(savedVersion.getId())
                        .nombre(original2.getNombre())
                        .descripcion(original2.getDescripcion())
                        .tipo(original2.getTipo())
                        .responsableRolId(original2.getResponsableRolId())
                        .formularioId(original2.getFormularioId())
                        .posicion(original2.getPosicion() != null
                                ? Actividad.Posicion.builder()
                                        .x(original2.getPosicion().getX())
                                        .y(original2.getPosicion().getY())
                                        .build()
                                : new Actividad.Posicion())
                        .transiciones(new ArrayList<>()) // se reasignan después
                        .tiempoLimiteHoras(original2.getTiempoLimiteHoras())
                        .creadoEn(LocalDateTime.now())
                        .actualizadoEn(LocalDateTime.now())
                        .build())
                .collect(Collectors.toList());

        List<Actividad> savedCopias = actividadRepository.saveAll(copias);

        // Construir mapa de ids
        for (int i = 0; i < actividadesOriginales.size(); i++) {
            idMap.put(actividadesOriginales.get(i).getId(), savedCopias.get(i).getId());
        }

        // Reasignar transiciones con los nuevos ids
        for (int i = 0; i < actividadesOriginales.size(); i++) {
            Actividad originalAct = actividadesOriginales.get(i);
            Actividad copia = savedCopias.get(i);

            if (originalAct.getTransiciones() != null && !originalAct.getTransiciones().isEmpty()) {
                List<Actividad.Transicion> nuevasTransiciones = originalAct.getTransiciones().stream()
                        .map(t -> Actividad.Transicion.builder()
                                .actividadDestinoId(idMap.getOrDefault(t.getActividadDestinoId(), t.getActividadDestinoId()))
                                .condicion(t.getCondicion())
                                .etiqueta(t.getEtiqueta())
                                .build())
                        .collect(Collectors.toList());
                copia.setTransiciones(nuevasTransiciones);
            }
        }

        actividadRepository.saveAll(savedCopias);

        // Actualizar lista de actividades en la nueva política
        List<String> nuevosIds = savedCopias.stream().map(Actividad::getId).collect(Collectors.toList());
        savedVersion.setActividadIds(nuevosIds);
        savedVersion.setActualizadoEn(LocalDateTime.now());
        politicaRepository.save(savedVersion);

        log.info("Nueva versión de política creada: originalId={}, nuevaId={}, version={}, por usuario={}",
                id, savedVersion.getId(), savedVersion.getVersion(), userId);

        return toResponse(savedVersion);
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    private Politica findOrThrow(String id) {
        return politicaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Política", id));
    }

    private void verificarBorrador(Politica politica) {
        if (politica.getEstado() != Politica.EstadoPolitica.BORRADOR) {
            throw new BadRequestException(
                    "La política está en estado " + politica.getEstado() + " y no puede ser modificada");
        }
    }

    /**
     * DFS para determinar todos los nodos alcanzables desde el nodo de inicio.
     */
    private void dfsAlcanzable(String actividadId, List<Actividad> todas, Set<String> visitados) {
        if (visitados.contains(actividadId)) return;
        visitados.add(actividadId);

        Map<String, Actividad> porId = todas.stream()
                .collect(Collectors.toMap(Actividad::getId, a -> a));

        Actividad actual = porId.get(actividadId);
        if (actual == null || actual.getTransiciones() == null) return;

        for (Actividad.Transicion t : actual.getTransiciones()) {
            dfsAlcanzable(t.getActividadDestinoId(), todas, visitados);
        }
    }

    private Politica.EstadoPolitica parseEstado(String estado) {
        if (estado == null || estado.isBlank()) return null;
        try {
            return Politica.EstadoPolitica.valueOf(estado.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Estado inválido: " + estado + ". Valores permitidos: BORRADOR, ACTIVA, INACTIVA, ARCHIVADA");
        }
    }

    private String getCurrentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "system";
        } catch (Exception e) {
            return "system";
        }
    }

    private PoliticaResponse toResponse(Politica p) {
        PoliticaResponse.MetadatosResponse metaResp = null;
        if (p.getMetadatos() != null) {
            metaResp = PoliticaResponse.MetadatosResponse.builder()
                    .tags(p.getMetadatos().getTags())
                    .icono(p.getMetadatos().getIcono())
                    .color(p.getMetadatos().getColor())
                    .build();
        }

        return PoliticaResponse.builder()
                .id(p.getId())
                .nombre(p.getNombre())
                .descripcion(p.getDescripcion())
                .version(p.getVersion())
                .versionPadreId(p.getVersionPadreId())
                .estado(p.getEstado() != null ? p.getEstado().name() : null)
                .actividadInicioId(p.getActividadInicioId())
                .actividadIds(p.getActividadIds())
                .metadatos(metaResp)
                .creadoPorId(p.getCreadoPorId())
                .departamento(p.getDepartamento())
                .creadoEn(p.getCreadoEn())
                .actualizadoEn(p.getActualizadoEn())
                .build();
    }
}
