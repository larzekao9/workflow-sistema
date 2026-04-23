package com.workflow.tramites;

import com.workflow.forms.FormularioRepository;
import com.workflow.policies.Politica;
import com.workflow.policies.PoliticaRepository;
import com.workflow.roles.Role;
import com.workflow.roles.RoleRepository;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import com.workflow.users.User;
import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class TramiteService {

    private final TramiteRepository tramiteRepository;
    private final PoliticaRepository politicaRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FormularioRepository formularioRepository;
    private final BpmnMotorService bpmnMotorService;

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
                    .completados(tramiteRepository.countByEstado(Tramite.EstadoTramite.COMPLETADO))
                    .rechazados(tramiteRepository.countByEstado(Tramite.EstadoTramite.RECHAZADO))
                    .devueltos(tramiteRepository.countByEstado(Tramite.EstadoTramite.DEVUELTO))
                    .escalados(tramiteRepository.countByEstado(Tramite.EstadoTramite.ESCALADO))
                    .cancelados(tramiteRepository.countByEstado(Tramite.EstadoTramite.CANCELADO))
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

        LocalDateTime ahora = LocalDateTime.now();

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

        tramite.setActualizadoEn(ahora);
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

    public TramiteResponse responderTramite(String tramiteId, String clienteId, String observaciones) {
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

        tramite.setEstado(Tramite.EstadoTramite.EN_PROCESO);
        agregarHistorial(tramite,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getActividadBpmnId() : null,
                tramite.getEtapaActual() != null ? tramite.getEtapaActual().getNombre() : null,
                clienteId, clienteNombre, "RESPONDIDO_POR_CLIENTE", observaciones, ahora);
        tramite.setActualizadoEn(ahora);

        log.info("[TramiteService] Trámite {} respondido por cliente {}", tramiteId, clienteId);
        return TramiteResponse.fromDocument(tramiteRepository.save(tramite));
    }

    // -----------------------------------------------------------------------
    // Obtener formulario de la etapa actual
    // -----------------------------------------------------------------------

    public FormularioActualResponse getFormularioActual(String tramiteId) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Trámite no encontrado: " + tramiteId));

        if (tramite.getEtapaActual() == null || tramite.getEtapaActual().getFormularioId() == null) {
            return FormularioActualResponse.builder()
                    .formularioId(null)
                    .formJsSchema(null)
                    .build();
        }

        String formularioId = tramite.getEtapaActual().getFormularioId();
        return formularioRepository.findById(formularioId)
                .map(f -> FormularioActualResponse.builder()
                        .formularioId(formularioId)
                        .formJsSchema(f.getFormJsSchema()) // Object BSON; null si aún usa secciones custom
                        .build())
                .orElseGet(() -> {
                    log.warn("[TramiteService] Formulario {} no encontrado para trámite {}", formularioId, tramiteId);
                    return FormularioActualResponse.builder()
                            .formularioId(formularioId)
                            .formJsSchema(null)
                            .build();
                });
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
        }
    }

    private void agregarHistorial(Tramite tramite, String actividadBpmnId, String actividadNombre,
                                   String responsableId, String responsableNombre,
                                   String accion, String observaciones, LocalDateTime timestamp) {
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
}
