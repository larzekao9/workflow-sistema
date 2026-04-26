package com.workflow.tramites;

import com.workflow.activities.Actividad;
import com.workflow.activities.ActividadRepository;
import com.workflow.files.FileReference;
import com.workflow.files.FileStorageService;
import com.workflow.notifications.FcmService;
import com.workflow.notifications.Notificacion;
import com.workflow.policies.Politica;
import com.workflow.policies.PoliticaRepository;
import com.workflow.roles.Role;
import com.workflow.roles.RoleRepository;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import com.workflow.users.User;
import com.workflow.users.UserRepository;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TramiteService {

    private final TramiteRepository tramiteRepository;
    private final PoliticaRepository politicaRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BpmnMotorService bpmnMotorService;
    private final ActividadRepository actividadRepository;
    private final FileStorageService fileStorageService;
    private final FcmService fcmService;

    // -----------------------------------------------------------------------
    // Crear trámite
    // -----------------------------------------------------------------------

    public TramiteResponse crearTramite(String politicaId, String clienteId) {
        // 1. Busca la política y verifica que esté activa
        Politica politica = politicaRepository.findById(politicaId)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + politicaId));

        if (politica.getEstado() != Politica.EstadoPolitica.ACTIVA) {
            throw new BadRequestException("Solo se pueden iniciar trámites sobre políticas ACTIVAS. Estado actual: " + politica.getEstado());
        }

        if (politica.getBpmnXml() == null || politica.getBpmnXml().isBlank()) {
            throw new BadRequestException("La política no tiene un diagrama BPMN definido. No se puede instanciar el trámite.");
        }

        // 2. Obtiene la primera UserTask del proceso
        BpmnMotorService.BpmnTask primeraTask = bpmnMotorService.getFirstUserTask(politica.getBpmnXml());

        // 3. Extrae el rol, área y formulario de esa tarea
        String rolNombre = bpmnMotorService.extractRolFromTask(politica.getBpmnXml(), primeraTask.id());
        String areaTask = bpmnMotorService.extractAreaFromTask(politica.getBpmnXml(), primeraTask.id());
        String formularioId = bpmnMotorService.extractFormIdFromTask(politica.getBpmnXml(), primeraTask.id());

        // 4. Obtiene el nombre del cliente
        String clienteNombre = resolverNombreUsuario(clienteId);

        // 5. Construye el trámite
        LocalDateTime ahora = LocalDateTime.now();

        Tramite.HistorialEntry entradaCreacion = Tramite.HistorialEntry.builder()
                .actividadBpmnId(primeraTask.id())
                .actividadNombre(primeraTask.name())
                .responsableId(clienteId)
                .responsableNombre(clienteNombre)
                .accion("INICIADO")
                .timestamp(ahora)
                .observaciones("Trámite iniciado")
                .build();

        Tramite.EtapaActual etapa = Tramite.EtapaActual.builder()
                .actividadBpmnId(primeraTask.id())
                .nombre(primeraTask.name())
                .responsableRolNombre(rolNombre)
                .formularioId(formularioId)
                .area(areaTask)
                .build();

        Tramite tramite = Tramite.builder()
                .politicaId(politicaId)
                .politicaNombre(politica.getNombre())
                .politicaVersion(politica.getVersion())
                .clienteId(clienteId)
                .clienteNombre(clienteNombre)
                .estado(Tramite.EstadoTramite.INICIADO)
                .etapaActual(etapa)
                .historial(new ArrayList<>())
                .creadoEn(ahora)
                .actualizadoEn(ahora)
                .build();

        tramite.getHistorial().add(entradaCreacion);

        Tramite guardado = tramiteRepository.save(tramite);
        log.info("[TramiteService] Trámite creado: {} para política: {}", guardado.getId(), politicaId);

        // Intenta asignar funcionario automáticamente si la primera tarea es de FUNCIONARIO.
        // Solo persiste de nuevo si la asignación automática modificó el documento.
        String asignadoAntes = guardado.getAsignadoAId();
        Tramite.EstadoTramite estadoAntes = guardado.getEstado();
        asignarFuncionarioAutomatico(guardado, primeraTask.id(), primeraTask.name());
        boolean cambio = !java.util.Objects.equals(asignadoAntes, guardado.getAsignadoAId())
                || estadoAntes != guardado.getEstado();
        if (cambio) {
            guardado = tramiteRepository.save(guardado);
        }

        return TramiteResponse.fromDocument(guardado);
    }

    // -----------------------------------------------------------------------
    // Listar trámites (filtrado por rol del usuario, con filtro opcional por estado)
    // -----------------------------------------------------------------------

    public Page<TramiteResponse> getTramites(String userId, String estado, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("creado_en").descending());

        User usuario = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userId));

        String rolNombre = resolverRolNombre(usuario);

        log.debug("[TramiteService] getTramites userId={} rolNombre={} estado={}", userId, rolNombre, estado);

        Tramite.EstadoTramite estadoEnum = parsearEstado(estado);

        if (rolNombre.contains("ADMINISTRADOR")) {
            if (estadoEnum != null) {
                return tramiteRepository.findByEstado(estadoEnum, pageable)
                        .map(TramiteResponse::fromDocument);
            }
            return tramiteRepository.findAll(pageable)
                    .map(TramiteResponse::fromDocument);
        }

        if (rolNombre.contains("FUNCIONARIO")) {
            // Si el funcionario tiene área asignada, filtrar solo tareas de su área (o sin área)
            String areaFuncionario = usuario.getDepartamento();
            if (areaFuncionario != null && !areaFuncionario.isBlank()) {
                return tramiteRepository
                        .findBandejaFuncionarioPorArea(rolNombre, areaFuncionario, userId, pageable)
                        .map(TramiteResponse::fromDocument);
            }
            // Sin área asignada: ve todas las tareas de su rol (comportamiento anterior)
            Page<Tramite> asignados = tramiteRepository
                    .findByEtapaActual_ResponsableRolNombreAndAsignadoAId(rolNombre, userId, pageable);
            Page<Tramite> sinAsignar = tramiteRepository
                    .findByEtapaActual_ResponsableRolNombreAndAsignadoAIdIsNull(rolNombre, pageable);

            java.util.List<TramiteResponse> combined = new java.util.ArrayList<>();
            asignados.getContent().forEach(t -> combined.add(TramiteResponse.fromDocument(t)));
            sinAsignar.getContent().forEach(t -> {
                if (combined.stream().noneMatch(r -> r.getId().equals(t.getId()))) {
                    combined.add(TramiteResponse.fromDocument(t));
                }
            });
            long total = asignados.getTotalElements() + sinAsignar.getTotalElements();
            return new org.springframework.data.domain.PageImpl<>(combined, pageable, total);
        }

        // Cliente (y cualquier otro rol) ve solo sus trámites propios
        if (estadoEnum != null) {
            return tramiteRepository.findByClienteIdAndEstado(userId, estadoEnum, pageable)
                    .map(TramiteResponse::fromDocument);
        }
        return tramiteRepository.findByClienteId(userId, pageable)
                .map(TramiteResponse::fromDocument);
    }

    // -----------------------------------------------------------------------
    // Mis trámites (portal cliente — filtrado estricto por clienteId del JWT)
    // -----------------------------------------------------------------------

    /**
     * Retorna los trámites donde clienteId coincide exactamente con el userId autenticado.
     * No depende del rol: el scope se impone por la clave de filtro, no por permisos.
     * Soporta filtrado opcional por estado y paginación.
     */
    public Page<TramiteResponse> getMisTramites(String clienteId, String estado, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("creado_en").descending());
        Tramite.EstadoTramite estadoEnum = parsearEstado(estado);

        if (estadoEnum != null) {
            return tramiteRepository.findByClienteIdAndEstado(clienteId, estadoEnum, pageable)
                    .map(TramiteResponse::fromDocument);
        }
        return tramiteRepository.findByClienteId(clienteId, pageable)
                .map(TramiteResponse::fromDocument);
    }

    // -----------------------------------------------------------------------
    // Stats de trámites (conteos por estado según scope del usuario)
    // -----------------------------------------------------------------------

    public TramiteStatsResponse getTramiteStats(String userId) {
        User usuario = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userId));

        String rolNombre = resolverRolNombre(usuario);

        log.debug("[TramiteService] getTramiteStats userId={} rolNombre={}", userId, rolNombre);

        if (rolNombre.contains("ADMINISTRADOR")) {
            return TramiteStatsResponse.builder()
                    .total(tramiteRepository.count())
                    .iniciados(tramiteRepository.countByEstado(Tramite.EstadoTramite.INICIADO))
                    .enProceso(tramiteRepository.countByEstado(Tramite.EstadoTramite.EN_PROCESO))
                    .sinAsignar(tramiteRepository.countByEstado(Tramite.EstadoTramite.SIN_ASIGNAR))
                    .completados(tramiteRepository.countByEstado(Tramite.EstadoTramite.COMPLETADO))
                    .rechazados(tramiteRepository.countByEstado(Tramite.EstadoTramite.RECHAZADO))
                    .devueltos(tramiteRepository.countByEstado(Tramite.EstadoTramite.DEVUELTO))
                    .escalados(tramiteRepository.countByEstado(Tramite.EstadoTramite.ESCALADO))
                    .cancelados(tramiteRepository.countByEstado(Tramite.EstadoTramite.CANCELADO))
                    .enApelacion(tramiteRepository.countByEstado(Tramite.EstadoTramite.EN_APELACION))
                    .build();
        }

        if (rolNombre.contains("FUNCIONARIO")) {
            String areaFuncionario = usuario.getDepartamento();
            long total;
            if (areaFuncionario != null && !areaFuncionario.isBlank()) {
                total = tramiteRepository.countBandejaFuncionarioPorArea(rolNombre, areaFuncionario, userId);
            } else {
                total = tramiteRepository.countByEtapaActual_ResponsableRolNombre(rolNombre);
            }
            return TramiteStatsResponse.builder()
                    .total(total)
                    .iniciados(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.INICIADO))
                    .enProceso(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.EN_PROCESO))
                    .sinAsignar(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.SIN_ASIGNAR))
                    .completados(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.COMPLETADO))
                    .rechazados(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.RECHAZADO))
                    .devueltos(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.DEVUELTO))
                    .escalados(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.ESCALADO))
                    .cancelados(tramiteRepository.countByEtapaActual_ResponsableRolNombreAndEstado(rolNombre, Tramite.EstadoTramite.CANCELADO))
                    .build();
        }

        // Cliente: solo sus propios trámites
        long total = tramiteRepository.countByClienteId(userId);
        return TramiteStatsResponse.builder()
                .total(total)
                .iniciados(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.INICIADO))
                .enProceso(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.EN_PROCESO))
                .sinAsignar(0L)
                .completados(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.COMPLETADO))
                .rechazados(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.RECHAZADO))
                .devueltos(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.DEVUELTO))
                .escalados(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.ESCALADO))
                .cancelados(tramiteRepository.countByClienteIdAndEstado(userId, Tramite.EstadoTramite.CANCELADO))
                .build();
    }

    // -----------------------------------------------------------------------
    // Obtener trámite por ID
    // -----------------------------------------------------------------------

    public TramiteResponse getTramiteById(String id) {
        Tramite tramite = tramiteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + id));
        return TramiteResponse.fromDocument(tramite);
    }

    // -----------------------------------------------------------------------
    // Avanzar trámite (funcionario o admin)
    // -----------------------------------------------------------------------

    public TramiteResponse avanzarTramite(String tramiteId, AvanzarTramiteRequest req, String responsableId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        // Solo se puede avanzar si está en estado activo
        if (tramite.getEstado() == Tramite.EstadoTramite.COMPLETADO
                || tramite.getEstado() == Tramite.EstadoTramite.RECHAZADO
                || tramite.getEstado() == Tramite.EstadoTramite.CANCELADO) {
            throw new BadRequestException("El trámite ya está en estado final: " + tramite.getEstado());
        }

        String responsableNombre = resolverNombreUsuario(responsableId);
        String actividadActualId = tramite.getEtapaActual() != null
                ? tramite.getEtapaActual().getActividadBpmnId()
                : "desconocido";
        String actividadActualNombre = tramite.getEtapaActual() != null
                ? tramite.getEtapaActual().getNombre()
                : "desconocido";
        // Captura el actividadId del documento Actividad ANTES del switch, porque procesarAprobacion
        // puede mutar etapaActual apuntando ya a la siguiente etapa.
        String actividadDocId = tramite.getEtapaActual() != null
                ? tramite.getEtapaActual().getActividadId()
                : null;

        LocalDateTime ahora = LocalDateTime.now();
        // Captura el índice donde se insertará el entry de acción (APROBADO/RECHAZADO/etc.)
        // ANTES del switch, para que datos no queden en el entry ASIGNADO_AUTO posterior
        int idxAccion = tramite.getHistorial() != null ? tramite.getHistorial().size() : 0;

        switch (req.getAccion()) {
            case APROBAR -> procesarAprobacion(tramite, req, responsableId, responsableNombre,
                    actividadActualId, actividadActualNombre, ahora);

            case RECHAZAR -> {
                tramite.setEstado(Tramite.EstadoTramite.RECHAZADO);
                agregarHistorial(tramite, actividadActualId, actividadActualNombre,
                        responsableId, responsableNombre, "RECHAZADO", req.getObservaciones(), ahora);
                log.info("[TramiteService] Trámite {} RECHAZADO por {}", tramiteId, responsableId);
            }

            case DEVOLVER -> {
                tramite.setEstado(Tramite.EstadoTramite.DEVUELTO);
                agregarHistorial(tramite, actividadActualId, actividadActualNombre,
                        responsableId, responsableNombre, "DEVUELTO", req.getObservaciones(), ahora);
                log.info("[TramiteService] Trámite {} DEVUELTO al cliente por {}", tramiteId, responsableId);
            }

            case ESCALAR -> {
                tramite.setEstado(Tramite.EstadoTramite.ESCALADO);
                agregarHistorial(tramite, actividadActualId, actividadActualNombre,
                        responsableId, responsableNombre, "ESCALADO", req.getObservaciones(), ahora);
                log.info("[TramiteService] Trámite {} ESCALADO por {}", tramiteId, responsableId);
            }
        }

        // Guardar datos del formulario en el entry de la acción (no en ASIGNADO_AUTO posterior)
        if (req.getDatos() != null && !req.getDatos().isEmpty()
                && tramite.getHistorial() != null && tramite.getHistorial().size() > idxAccion) {
            tramite.getHistorial().get(idxAccion).setDatos(req.getDatos());
        }

        tramite.setActualizadoEn(ahora);

        // FCM hooks — fire-and-forget, no bloquea el flujo de negocio
        String clienteId = tramite.getClienteId();
        String politicaNombre = tramite.getPoliticaNombre() != null
                ? tramite.getPoliticaNombre() : tramite.getPoliticaId();
        switch (req.getAccion()) {
            case RECHAZAR -> fcmService.enviarPush(clienteId,
                    "Trámite rechazado",
                    "Tu trámite de " + politicaNombre + " ha sido rechazado.",
                    tramiteId, Notificacion.TipoNotificacion.TRAMITE_RECHAZADO);
            case DEVOLVER -> fcmService.enviarPush(clienteId,
                    "Trámite devuelto",
                    "Tu trámite de " + politicaNombre + " fue devuelto para correcciones.",
                    tramiteId, Notificacion.TipoNotificacion.TRAMITE_AVANZADO);
            case APROBAR -> {
                fcmService.enviarPush(clienteId,
                        "Trámite avanzado",
                        "Tu trámite de " + politicaNombre + " ha avanzado a la siguiente etapa.",
                        tramiteId, Notificacion.TipoNotificacion.TRAMITE_AVANZADO);
                // Notificar al nuevo funcionario asignado si la asignación automática seleccionó uno
                String nuevoAsignado = tramite.getAsignadoAId();
                if (nuevoAsignado != null && !nuevoAsignado.equals(responsableId)) {
                    fcmService.enviarPush(nuevoAsignado,
                            "Nueva tarea asignada",
                            "Se te asignó el trámite de " + politicaNombre + ".",
                            tramiteId, Notificacion.TipoNotificacion.TAREA_ASIGNADA);
                }
            }
            default -> { /* ESCALAR — sin notificación FCM definida */ }
        }

        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    // -----------------------------------------------------------------------
    // Tomar trámite (asignación individual a un funcionario)
    // -----------------------------------------------------------------------

    public TramiteResponse tomarTramite(String tramiteId, String funcionarioId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEstado() == Tramite.EstadoTramite.COMPLETADO
                || tramite.getEstado() == Tramite.EstadoTramite.RECHAZADO
                || tramite.getEstado() == Tramite.EstadoTramite.CANCELADO) {
            throw new BadRequestException("No se puede tomar un trámite en estado final: " + tramite.getEstado());
        }

        String nombre = resolverNombreUsuario(funcionarioId);
        tramite.setAsignadoAId(funcionarioId);
        tramite.setAsignadoANombre(nombre);
        LocalDateTime ahora = LocalDateTime.now();
        tramite.setActualizadoEn(ahora);

        agregarHistorial(tramite,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null,
                funcionarioId, nombre, "TOMADO", "Trámite tomado por el funcionario", ahora);

        log.info("[TramiteService] Trámite {} tomado por {}", tramiteId, funcionarioId);
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    // -----------------------------------------------------------------------
    // Responder trámite (cliente corrige tras DEVUELTO)
    // -----------------------------------------------------------------------

    public TramiteResponse responderTramite(String tramiteId, String clienteId, ResponderTramiteRequest req) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEstado() != Tramite.EstadoTramite.DEVUELTO) {
            throw new BadRequestException("Solo se puede responder un trámite en estado DEVUELTO. Estado actual: " + tramite.getEstado());
        }

        if (!clienteId.equals(tramite.getClienteId())) {
            throw new BadRequestException("Solo el cliente que inició el trámite puede responderlo");
        }

        String clienteNombre = resolverNombreUsuario(clienteId);
        LocalDateTime ahora = LocalDateTime.now();
        String observaciones = req != null ? req.getObservaciones() : null;

        tramite.setEstado(Tramite.EstadoTramite.EN_PROCESO);
        agregarHistorial(tramite,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null,
                clienteId, clienteNombre, "RESPONDIDO_POR_CLIENTE", observaciones, ahora);

        // Guardar datos del formulario en el último historial entry
        if (req != null && req.getDatos() != null && !req.getDatos().isEmpty()
                && tramite.getHistorial() != null && !tramite.getHistorial().isEmpty()) {
            tramite.getHistorial().get(tramite.getHistorial().size() - 1).setDatos(req.getDatos());
        }

        tramite.setActualizadoEn(ahora);

        // FCM: notificar al funcionario asignado que el cliente respondió
        String asignadoId = tramite.getAsignadoAId();
        if (asignadoId != null) {
            fcmService.enviarPush(asignadoId,
                    "Cliente respondió",
                    "El cliente respondió el trámite de " + tramite.getPoliticaNombre() + ".",
                    tramiteId, Notificacion.TipoNotificacion.CLIENTE_RESPONDIO);
        }

        log.info("[TramiteService] Trámite {} respondido por cliente {}", tramiteId, clienteId);
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    private void procesarAprobacion(Tramite tramite, AvanzarTramiteRequest req,
                                    String responsableId, String responsableNombre,
                                    String actividadActualId, String actividadActualNombre,
                                    LocalDateTime ahora) {
        // Registra la aprobación de la etapa actual antes de avanzar
        agregarHistorial(tramite, actividadActualId, actividadActualNombre,
                responsableId, responsableNombre, "APROBADO", req.getObservaciones(), ahora);

        // Busca la política para obtener el BPMN
        Politica politica = politicaRepository.findById(tramite.getPoliticaId())
                .orElseThrow(() -> new ResourceNotFoundException("Política del trámite no encontrada: " + tramite.getPoliticaId()));

        String bpmnXml = politica.getBpmnXml();
        if (bpmnXml == null || bpmnXml.isBlank()) {
            // Sin BPMN, completamos el trámite directamente
            tramite.setEstado(Tramite.EstadoTramite.COMPLETADO);
            tramite.setEtapaActual(null);
            log.warn("[TramiteService] Trámite {} completado sin BPMN (política sin XML)", tramite.getId());
            return;
        }

        // Navega al siguiente nodo en el BPMN
        BpmnMotorService.BpmnTask siguienteTask = bpmnMotorService.getNextTask(bpmnXml, actividadActualId, "APROBAR");

        if (siguienteTask == null) {
            // Llegamos a un EndEvent: proceso completado
            tramite.setEstado(Tramite.EstadoTramite.COMPLETADO);
            tramite.setEtapaActual(null);
            log.info("[TramiteService] Trámite {} COMPLETADO — alcanzó el EndEvent", tramite.getId());
        } else {
            // Avanza a la siguiente etapa — el área ya fue extraída al parsear el nodo
            String nuevoRol = bpmnMotorService.extractRolFromTask(bpmnXml, siguienteTask.id());
            String nuevoFormularioId = bpmnMotorService.extractFormIdFromTask(bpmnXml, siguienteTask.id());
            Tramite.EtapaActual nuevaEtapa = Tramite.EtapaActual.builder()
                    .actividadBpmnId(siguienteTask.id())
                    .nombre(siguienteTask.name())
                    .responsableRolNombre(nuevoRol)
                    .formularioId(nuevoFormularioId)
                    .area(siguienteTask.area())
                    .build();
            tramite.setEtapaActual(nuevaEtapa);
            tramite.setEstado(Tramite.EstadoTramite.EN_PROCESO);
            log.info("[TramiteService] Trámite {} avanzó a etapa '{}' (rol: {})",
                    tramite.getId(), siguienteTask.name(), nuevoRol);

            // Limpia la asignación anterior e intenta reasignar automáticamente para la nueva etapa
            tramite.setAsignadoAId(null);
            tramite.setAsignadoANombre(null);
            asignarFuncionarioAutomatico(tramite, siguienteTask.id(), siguienteTask.name());
        }
    }

    private void agregarHistorial(Tramite tramite, String actividadBpmnId, String actividadNombre,
                                   String responsableId, String responsableNombre,
                                   String accion, String observaciones, LocalDateTime timestamp) {
        agregarHistorial(tramite, actividadBpmnId, actividadNombre, responsableId, responsableNombre,
                accion, observaciones, timestamp, null, null);
    }

    private void agregarHistorial(Tramite tramite, String actividadBpmnId, String actividadNombre,
                                   String responsableId, String responsableNombre,
                                   String accion, String observaciones, LocalDateTime timestamp,
                                   String responsableCargo, List<FileReference> documentosAdjuntos) {
        if (tramite.getHistorial() == null) {
            tramite.setHistorial(new ArrayList<>());
        }
        tramite.getHistorial().add(Tramite.HistorialEntry.builder()
                .actividadBpmnId(actividadBpmnId)
                .actividadNombre(actividadNombre)
                .responsableId(responsableId)
                .responsableNombre(responsableNombre)
                .accion(accion)
                .timestamp(timestamp)
                .observaciones(observaciones)
                .responsableCargo(responsableCargo)
                .documentosAdjuntos(documentosAdjuntos)
                .build());
    }

    /**
     * Parsea el estado desde String ignorando mayúsculas/minúsculas.
     * Retorna null si el valor es nulo, vacío o no corresponde a un valor del enum.
     */
    private Tramite.EstadoTramite parsearEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return null;
        }
        try {
            return Tramite.EstadoTramite.valueOf(estado.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("[TramiteService] Estado inválido ignorado: '{}'", estado);
            return null;
        }
    }

    private String resolverNombreUsuario(String userId) {
        return userRepository.findById(userId)
                .map(u -> u.getNombreCompleto() != null ? u.getNombreCompleto() : u.getEmail())
                .orElse("Usuario " + userId);
    }

    /**
     * Resuelve el nombre del rol principal del usuario cargando el Role desde RoleRepository.
     * El campo rolId en User apunta a la colección roles.
     */
    private String resolverRolNombre(User usuario) {
        if (usuario.getRolId() == null || usuario.getRolId().isBlank()) {
            return "CLIENTE";
        }
        return roleRepository.findById(usuario.getRolId())
                .map(Role::getNombre)
                .orElse("CLIENTE");
    }

    // -----------------------------------------------------------------------
    // Motor de asignación automática
    // -----------------------------------------------------------------------

    /**
     * Intenta asignar el funcionario de menor carga al trámite dado.
     *
     * Lógica:
     * 1. Busca la Actividad por politicaId + nombre del task BPMN para obtener departmentId.
     * 2. Si no hay departmentId configurado en la actividad, no asigna (falla silenciosa).
     * 3. Busca funcionarios activos con empresa + departamento coincidentes.
     * 4. Filtra solo los que tengan rol FUNCIONARIO.
     * 5. Si ninguno → estado SIN_ASIGNAR.
     * 6. Si uno → asigna directo.
     * 7. Si varios → asigna el de menor carga (countActivosByAsignadoId).
     * 8. Registra historial con acción ASIGNADO_AUTO.
     *
     * El trámite se muta en memoria; el caller es responsable de persistir.
     */
    private void asignarFuncionarioAutomatico(Tramite tramite, String bpmnTaskId, String bpmnTaskNombre) {
        // 1. Busca la Actividad para obtener los criterios de asignación
        Actividad actividad = actividadRepository
                .findByPoliticaIdAndNombre(tramite.getPoliticaId(), bpmnTaskNombre)
                .orElse(null);

        if (actividad == null) {
            log.debug("[AsignacionAuto] No se encontró Actividad para politica={} nombre='{}'",
                    tramite.getPoliticaId(), bpmnTaskNombre);
            return;
        }

        String departmentId = actividad.getDepartmentId();

        // 2. Sin departmentId → asignar al cliente que inició el trámite (tarea de recolección de datos)
        if (departmentId == null || departmentId.isBlank()) {
            tramite.setAsignadoAId(tramite.getClienteId());
            tramite.setEstado(Tramite.EstadoTramite.EN_PROCESO);
            log.debug("[AsignacionAuto] Actividad '{}' sin dept → asignada al cliente {}",
                    bpmnTaskNombre, tramite.getClienteId());
            return;
        }

        // Obtiene empresaId del cliente que inició el trámite para filtrar dentro de la misma empresa
        String empresaId = userRepository.findById(tramite.getClienteId())
                .map(User::getEmpresaId)
                .orElse(null);

        // 3. Busca candidatos: empresa + departamento + activo
        List<User> candidatos;
        if (empresaId != null && !empresaId.isBlank()) {
            candidatos = userRepository.findByEmpresaIdAndDepartmentIdAndActivoTrue(
                    Objects.requireNonNull(empresaId), departmentId);
        } else {
            // Sin empresa definida: filtra solo por departamento (sin multi-tenant)
            candidatos = userRepository.findByDepartmentIdAndActivoTrue(departmentId);
        }

        // 4. Filtra solo los que tengan rol FUNCIONARIO
        String rolFuncionarioId = roleRepository.findByNombre("FUNCIONARIO")
                .map(Role::getId)
                .orElse(null);

        if (rolFuncionarioId != null) {
            final String rolId = rolFuncionarioId;
            candidatos = candidatos.stream()
                    .filter(u -> rolId.equals(u.getRolId()))
                    .toList();
        }

        if (candidatos.isEmpty()) {
            // 5. Sin candidatos → marcar como SIN_ASIGNAR
            tramite.setEstado(Tramite.EstadoTramite.SIN_ASIGNAR);
            log.warn("[AsignacionAuto] Trámite {} marcado SIN_ASIGNAR — ningún funcionario con dept={}",
                    tramite.getId(), departmentId);
            return;
        }

        // 6 & 7. Elige el candidato de menor carga activa
        User elegido;
        if (candidatos.size() == 1) {
            elegido = candidatos.get(0);
        } else {
            elegido = candidatos.stream()
                    .min(Comparator.comparingLong(u ->
                            tramiteRepository.countActivosByAsignadoId(u.getId())))
                    .orElse(candidatos.get(0));
        }

        // 8. Asigna y registra historial
        LocalDateTime ahora = LocalDateTime.now();
        tramite.setAsignadoAId(elegido.getId());
        tramite.setAsignadoANombre(
                elegido.getNombreCompleto() != null ? elegido.getNombreCompleto() : elegido.getEmail());
        agregarHistorial(tramite, bpmnTaskId, bpmnTaskNombre,
                elegido.getId(), tramite.getAsignadoANombre(),
                "ASIGNADO_AUTO",
                "Asignación automática por menor carga (dept=" + departmentId + ")",
                ahora);

        log.info("[AsignacionAuto] Trámite {} asignado automáticamente a {} ({})",
                tramite.getId(), elegido.getId(), tramite.getAsignadoANombre());
    }

    // -----------------------------------------------------------------------
    // Listar trámites SIN_ASIGNAR (bandeja de administrador)
    // -----------------------------------------------------------------------

    /**
     * Retorna los trámites en estado SIN_ASIGNAR paginados.
     * Solo accesible por ADMINISTRADOR/SUPERADMIN (el control de acceso se aplica en el Controller).
     */
    public Page<TramiteResponse> getTramitesSinAsignar(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("creado_en").descending());
        return tramiteRepository
                .findByEstado(Tramite.EstadoTramite.SIN_ASIGNAR, pageable)
                .map(TramiteResponse::fromDocument);
    }

    // -----------------------------------------------------------------------
    // Asignación manual por administrador
    // -----------------------------------------------------------------------

    /**
     * Asigna manualmente un funcionario a un trámite específico.
     * Válido para cualquier estado activo (no final).
     * Genera entrada en historial con acción ASIGNADO_MANUAL.
     */
    public TramiteResponse asignarManual(String tramiteId, String funcionarioId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEstado() == Tramite.EstadoTramite.COMPLETADO
                || tramite.getEstado() == Tramite.EstadoTramite.RECHAZADO
                || tramite.getEstado() == Tramite.EstadoTramite.CANCELADO) {
            throw new BadRequestException("No se puede asignar un trámite en estado final: " + tramite.getEstado());
        }

        User funcionario = userRepository.findById(funcionarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Funcionario no encontrado: " + funcionarioId));

        String nombreFuncionario = funcionario.getNombreCompleto() != null
                ? funcionario.getNombreCompleto()
                : funcionario.getEmail();

        LocalDateTime ahora = LocalDateTime.now();
        tramite.setAsignadoAId(funcionarioId);
        tramite.setAsignadoANombre(nombreFuncionario);

        // Si estaba SIN_ASIGNAR, pasa a EN_PROCESO al ser asignado manualmente
        if (tramite.getEstado() == Tramite.EstadoTramite.SIN_ASIGNAR) {
            tramite.setEstado(Tramite.EstadoTramite.EN_PROCESO);
        }

        tramite.setActualizadoEn(ahora);
        agregarHistorial(tramite,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null,
                funcionarioId, nombreFuncionario,
                "ASIGNADO_MANUAL",
                "Asignación manual por administrador",
                ahora);

        log.info("[TramiteService] Trámite {} asignado manualmente a {} por administrador", tramiteId, funcionarioId);
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    // -----------------------------------------------------------------------
    // Sprint 3.4 — Módulo de apelaciones
    // -----------------------------------------------------------------------

    /**
     * Dado una lista de IDs de archivos, retorna los FileReference correspondientes.
     * Los IDs que no existan en disco son silenciosamente ignorados (log de advertencia en FileStorageService).
     */
    private List<FileReference> resolveFileReferences(List<String> ids) {
        if (ids == null || ids.isEmpty()) return new ArrayList<>();
        return ids.stream()
                .map(fileStorageService::getFileReference)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .toList();
    }

    /**
     * Observar un trámite: el funcionario registra una observación formal y coloca el trámite en estado EN_APELACION,
     * dando al cliente un plazo de 2 días para apelar.
     */
    public TramiteResponse observar(String tramiteId, String funcionarioId, ObservarDenegarRequest req) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        validarNoEstadoFinal(tramite);

        User funcionario = userRepository.findById(funcionarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Funcionario no encontrado: " + funcionarioId));
        String nombreFuncionario = funcionario.getNombreCompleto() != null
                ? funcionario.getNombreCompleto() : funcionario.getEmail();
        String cargoFuncionario = funcionario.getCargo();

        LocalDateTime ahora = LocalDateTime.now();
        List<FileReference> docsOriginales = resolveFileReferences(req.getDocumentosIds());

        Tramite.Apelacion apelacion = Tramite.Apelacion.builder()
                .activa(true)
                .fechaInicio(ahora)
                .fechaLimite(ahora.plusDays(2))
                .motivoOriginal(req.getMotivo())
                .documentosOriginales(docsOriginales)
                .documentosApelatoria(new ArrayList<>())
                .estado(Tramite.EstadoApelacion.PENDIENTE)
                .build();

        tramite.setEstado(Tramite.EstadoTramite.EN_APELACION);
        tramite.setApelacion(apelacion);
        tramite.setActualizadoEn(ahora);

        String actividadBpmnId = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null;
        String actividadNombre = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null;
        agregarHistorial(tramite, actividadBpmnId, actividadNombre,
                funcionarioId, nombreFuncionario, "OBSERVADO", req.getMotivo(), ahora,
                cargoFuncionario, docsOriginales.isEmpty() ? null : docsOriginales);

        // FCM: notificar al cliente que su trámite fue observado y puede apelar
        fcmService.enviarPush(tramite.getClienteId(),
                "Trámite observado",
                "Tu trámite de " + tramite.getPoliticaNombre() + " tiene una observación. Podés apelar.",
                tramiteId, Notificacion.TipoNotificacion.TRAMITE_OBSERVADO);

        log.info("[TramiteService] Trámite {} OBSERVADO por funcionario {} — plazo apelación: {}",
                tramiteId, funcionarioId, apelacion.getFechaLimite());
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    /**
     * Denegar con posibilidad de apelación: igual que observar pero con acción DENEGADO_APELAR.
     */
    public TramiteResponse denegar(String tramiteId, String funcionarioId, ObservarDenegarRequest req) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        validarNoEstadoFinal(tramite);

        User funcionario = userRepository.findById(funcionarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Funcionario no encontrado: " + funcionarioId));
        String nombreFuncionario = funcionario.getNombreCompleto() != null
                ? funcionario.getNombreCompleto() : funcionario.getEmail();
        String cargoFuncionario = funcionario.getCargo();

        LocalDateTime ahora = LocalDateTime.now();
        List<FileReference> docsOriginales = resolveFileReferences(req.getDocumentosIds());

        Tramite.Apelacion apelacion = Tramite.Apelacion.builder()
                .activa(true)
                .fechaInicio(ahora)
                .fechaLimite(ahora.plusDays(2))
                .motivoOriginal(req.getMotivo())
                .documentosOriginales(docsOriginales)
                .documentosApelatoria(new ArrayList<>())
                .estado(Tramite.EstadoApelacion.PENDIENTE)
                .build();

        tramite.setEstado(Tramite.EstadoTramite.EN_APELACION);
        tramite.setApelacion(apelacion);
        tramite.setActualizadoEn(ahora);

        String actividadBpmnId = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null;
        String actividadNombre = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null;
        agregarHistorial(tramite, actividadBpmnId, actividadNombre,
                funcionarioId, nombreFuncionario, "DENEGADO_APELAR", req.getMotivo(), ahora,
                cargoFuncionario, docsOriginales.isEmpty() ? null : docsOriginales);

        // FCM: notificar al cliente que su trámite fue denegado y puede apelar
        fcmService.enviarPush(tramite.getClienteId(),
                "Trámite denegado",
                "Tu trámite de " + tramite.getPoliticaNombre() + " fue denegado. Podés apelar.",
                tramiteId, Notificacion.TipoNotificacion.TRAMITE_OBSERVADO);

        log.info("[TramiteService] Trámite {} DENEGADO_APELAR por funcionario {} — plazo: {}",
                tramiteId, funcionarioId, apelacion.getFechaLimite());
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    /**
     * El cliente presenta su apelación con justificación y documentos de respaldo.
     * Solo válido dentro del plazo establecido.
     */
    public TramiteResponse apelar(String tramiteId, String clienteId, ApelarRequest req) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEstado() != Tramite.EstadoTramite.EN_APELACION) {
            throw new BadRequestException("El trámite no está en estado EN_APELACION: " + tramite.getEstado());
        }

        Tramite.Apelacion apelacion = tramite.getApelacion();
        if (apelacion == null) {
            throw new BadRequestException("El trámite no tiene apelación activa");
        }

        if (!apelacion.getFechaLimite().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Plazo de apelación vencido. Fecha límite: " + apelacion.getFechaLimite());
        }

        if (!clienteId.equals(tramite.getClienteId())) {
            throw new BadRequestException("Solo el cliente titular puede apelar este trámite");
        }

        LocalDateTime ahora = LocalDateTime.now();
        List<FileReference> docsApelatoria = resolveFileReferences(req.getDocumentosIds());

        apelacion.setDocumentosApelatoria(docsApelatoria);
        apelacion.setJustificacionCliente(req.getJustificacion());
        apelacion.setEstado(Tramite.EstadoApelacion.EN_REVISION);
        tramite.setActualizadoEn(ahora);

        String actividadBpmnId = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null;
        String actividadNombre = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null;

        String nombreCliente = resolverNombreUsuario(clienteId);
        agregarHistorial(tramite, actividadBpmnId, actividadNombre,
                clienteId, nombreCliente, "APELADO", req.getJustificacion(), ahora,
                null, docsApelatoria.isEmpty() ? null : docsApelatoria);

        // Reasigna revisor automáticamente para que un funcionario atienda la apelación
        if (actividadBpmnId != null) {
            tramite.setAsignadoAId(null);
            tramite.setAsignadoANombre(null);
            asignarFuncionarioAutomatico(tramite, actividadBpmnId, actividadNombre != null ? actividadNombre : "");
        }

        log.info("[TramiteService] Trámite {} apelado por cliente {} — en revisión", tramiteId, clienteId);
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    /**
     * El funcionario/admin resuelve la apelación: la aprueba (avanza al siguiente nodo BPMN)
     * o la deniega (cierra el trámite como RECHAZADO).
     */
    public TramiteResponse resolverApelacion(String tramiteId, String funcionarioId, ResolverApelacionRequest req) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEstado() != Tramite.EstadoTramite.EN_APELACION) {
            throw new BadRequestException("El trámite no está en estado EN_APELACION: " + tramite.getEstado());
        }

        Tramite.Apelacion apelacion = tramite.getApelacion();
        if (apelacion == null || apelacion.getEstado() != Tramite.EstadoApelacion.EN_REVISION) {
            throw new BadRequestException("La apelación no está en estado EN_REVISION");
        }

        User funcionario = userRepository.findById(funcionarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Funcionario no encontrado: " + funcionarioId));
        String nombreFuncionario = funcionario.getNombreCompleto() != null
                ? funcionario.getNombreCompleto() : funcionario.getEmail();
        String cargoFuncionario = funcionario.getCargo();

        LocalDateTime ahora = LocalDateTime.now();
        String actividadBpmnId = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null;
        String actividadNombre = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null;

        if (req.isAprobada()) {
            apelacion.setEstado(Tramite.EstadoApelacion.APROBADO);
            apelacion.setActiva(false);
            tramite.setActualizadoEn(ahora);
            agregarHistorial(tramite, actividadBpmnId, actividadNombre,
                    funcionarioId, nombreFuncionario, "APELACION_APROBADA", req.getObservaciones(), ahora,
                    cargoFuncionario, null);

            // Avanza al siguiente nodo BPMN como si fuera una aprobación normal
            AvanzarTramiteRequest avanzarReq = new AvanzarTramiteRequest();
            avanzarReq.setAccion(AccionTramite.APROBAR);
            avanzarReq.setObservaciones(req.getObservaciones());
            procesarAprobacion(tramite, avanzarReq, funcionarioId, nombreFuncionario,
                    actividadBpmnId, actividadNombre, ahora);
        } else {
            apelacion.setEstado(Tramite.EstadoApelacion.DENEGADO);
            apelacion.setActiva(false);
            tramite.setEstado(Tramite.EstadoTramite.RECHAZADO);
            tramite.setActualizadoEn(ahora);
            agregarHistorial(tramite, actividadBpmnId, actividadNombre,
                    funcionarioId, nombreFuncionario, "APELACION_DENEGADA", req.getObservaciones(), ahora,
                    cargoFuncionario, null);
        }

        // FCM: notificar al cliente el resultado de su apelación
        fcmService.enviarPush(tramite.getClienteId(),
                req.isAprobada() ? "Apelación aprobada" : "Apelación denegada",
                req.isAprobada()
                        ? "Tu apelación del trámite de " + tramite.getPoliticaNombre() + " fue aprobada."
                        : "Tu apelación del trámite de " + tramite.getPoliticaNombre() + " fue denegada.",
                tramiteId, Notificacion.TipoNotificacion.APELACION_RESUELTA);

        log.info("[TramiteService] Apelación del trámite {} resuelta por {} — aprobada={}",
                tramiteId, funcionarioId, req.isAprobada());
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    /**
     * Retorna los datos de apelación de un trámite.
     */
    public Tramite.Apelacion getApelacion(String tramiteId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));
        if (tramite.getApelacion() == null) {
            throw new ResourceNotFoundException("El trámite " + tramiteId + " no tiene apelación registrada");
        }
        return tramite.getApelacion();
    }

    /**
     * Cierra automáticamente las apelaciones PENDIENTE cuyo plazo haya vencido.
     * Llamado por ApelacionScheduler cada hora.
     */
    public void vencerApelacionesSinRespuesta() {
        List<Tramite> vencidos = tramiteRepository.findApelacionesVencidas(LocalDateTime.now());
        if (vencidos.isEmpty()) {
            log.debug("[ApelacionScheduler] Sin apelaciones vencidas en este ciclo");
            return;
        }
        log.info("[ApelacionScheduler] Procesando {} apelación(es) vencida(s)", vencidos.size());
        LocalDateTime ahora = LocalDateTime.now();
        for (Tramite tramite : vencidos) {
            tramite.getApelacion().setEstado(Tramite.EstadoApelacion.DENEGADO);
            tramite.getApelacion().setActiva(false);
            tramite.setEstado(Tramite.EstadoTramite.RECHAZADO);
            tramite.setActualizadoEn(ahora);
            String actividadBpmnId = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null;
            String actividadNombre = tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null;
            agregarHistorial(tramite, actividadBpmnId, actividadNombre,
                    "SISTEMA", "Sistema", "APELACION_VENCIDA",
                    "Apelación cerrada automáticamente por vencimiento de plazo", ahora);
        }
        tramiteRepository.saveAll(vencidos);
        log.info("[ApelacionScheduler] {} apelación(es) cerrada(s) por vencimiento", vencidos.size());
    }

    // -----------------------------------------------------------------------
    // Sprint 4.1 — Formulario actual de la etapa del trámite
    // -----------------------------------------------------------------------

    /**
     * Retorna los campos del formulario embebido en la actividad correspondiente
     * a la etapa actual del trámite. Si la actividad no tiene campos o no se encuentra,
     * retorna una lista vacía (nunca null).
     */
    public FormularioActualResponse getFormularioActual(String tramiteId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEtapaActual() == null) {
            return FormularioActualResponse.builder()
                    .campos(java.util.Collections.emptyList())
                    .build();
        }

        String nombre = tramite.getEtapaActual().getNombre();
        return actividadRepository.findByPoliticaIdAndNombre(tramite.getPoliticaId(), nombre)
                .map(act -> FormularioActualResponse.builder()
                        .actividadId(act.getId())
                        .actividadNombre(act.getNombre())
                        .campos(act.getCampos() != null ? act.getCampos() : java.util.Collections.emptyList())
                        .build())
                .orElseGet(() -> FormularioActualResponse.builder()
                        .actividadNombre(nombre)
                        .campos(java.util.Collections.emptyList())
                        .build());
    }

    // -----------------------------------------------------------------------
    // Helper: validación estado no final
    // -----------------------------------------------------------------------

    private void validarNoEstadoFinal(Tramite tramite) {
        Tramite.EstadoTramite estado = tramite.getEstado();
        if (estado == Tramite.EstadoTramite.COMPLETADO
                || estado == Tramite.EstadoTramite.RECHAZADO
                || estado == Tramite.EstadoTramite.CANCELADO) {
            throw new BadRequestException("No se puede operar sobre un trámite en estado final: " + estado);
        }
    }

    // -----------------------------------------------------------------------
    // GET /tramites/{id}/respuestas — historial de datos de formulario por etapa
    // -----------------------------------------------------------------------

    public List<RespuestaResponse> getRespuestas(String tramiteId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));
        if (tramite.getHistorial() == null) return List.of();
        return tramite.getHistorial().stream()
                .filter(h -> h.getDatos() != null && !h.getDatos().isEmpty())
                .map(h -> RespuestaResponse.builder()
                        .actividadBpmnId(h.getActividadBpmnId())
                        .actividadNombre(h.getActividadNombre())
                        .responsableId(h.getResponsableId())
                        .responsableNombre(h.getResponsableNombre())
                        .accion(h.getAccion())
                        .datos(h.getDatos())
                        .documentosAdjuntos(h.getDocumentosAdjuntos())
                        .timestamp(h.getTimestamp())
                        .build())
                .toList();
    }
}
