package com.workflow.forms;

import com.workflow.activities.ActividadRepository;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormularioService {

    private final FormularioRepository formularioRepository;
    private final ActividadRepository actividadRepository;

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    public Page<FormularioResponse> findAll(String nombre, String estado, Pageable pageable) {
        Formulario.EstadoFormulario estadoEnum = parseEstado(estado);

        Page<Formulario> page;

        if (nombre != null && !nombre.isBlank() && estadoEnum != null) {
            page = formularioRepository.findByNombreContainingIgnoreCaseAndEstado(nombre, estadoEnum, pageable);
        } else if (nombre != null && !nombre.isBlank()) {
            page = formularioRepository.findByNombreContainingIgnoreCase(nombre, pageable);
        } else if (estadoEnum != null) {
            page = formularioRepository.findByEstado(estadoEnum, pageable);
        } else {
            page = formularioRepository.findAll(pageable);
        }

        return page.map(this::toResponse);
    }

    public FormularioResponse findById(String id) {
        Formulario formulario = formularioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formulario", id));
        return toResponse(formulario);
    }

    // -----------------------------------------------------------------------
    // Comandos
    // -----------------------------------------------------------------------

    public FormularioResponse create(CreateFormularioRequest request, String creadoPorId) {
        // Validar unicidad de nombre
        if (formularioRepository.existsByNombre(request.getNombre())) {
            throw new BadRequestException(
                    "Ya existe un formulario con el nombre '" + request.getNombre() + "'");
        }

        List<Formulario.SeccionFormulario> secciones = mapSecciones(request.getSecciones());

        // Validar que los nombres de campo sean únicos dentro del formulario completo
        validarNombresCampoUnicos(secciones);

        // Validar reglas de negocio sobre opciones por tipo de campo
        validarOpcionesPorTipo(secciones);

        Formulario formulario = Formulario.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .estado(Formulario.EstadoFormulario.ACTIVO)
                .secciones(secciones)
                .creadoPorId(creadoPorId)
                .creadoEn(Instant.now())
                .actualizadoEn(Instant.now())
                .build();

        Formulario saved = formularioRepository.save(formulario);
        log.info("Formulario creado: id={}, nombre='{}', por usuario={}", saved.getId(), saved.getNombre(), creadoPorId);
        return toResponse(saved);
    }

    public FormularioResponse update(String id, UpdateFormularioRequest request) {
        Formulario formulario = formularioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formulario", id));

        // Solo se puede editar un formulario ACTIVO
        if (formulario.getEstado() == Formulario.EstadoFormulario.INACTIVO) {
            throw new BadRequestException("El formulario está INACTIVO y no puede ser modificado");
        }

        if (request.getNombre() != null) {
            // Validar unicidad excluyendo el propio documento
            if (formularioRepository.existsByNombreAndIdNot(request.getNombre(), id)) {
                throw new BadRequestException(
                        "Ya existe otro formulario con el nombre '" + request.getNombre() + "'");
            }
            formulario.setNombre(request.getNombre());
        }

        if (request.getDescripcion() != null) {
            formulario.setDescripcion(request.getDescripcion());
        }

        if (request.getSecciones() != null) {
            if (request.getSecciones().isEmpty()) {
                throw new BadRequestException("El formulario debe tener al menos una sección");
            }
            List<Formulario.SeccionFormulario> secciones = mapUpdateSecciones(request.getSecciones());
            validarNombresCampoUnicos(secciones);
            validarOpcionesPorTipo(secciones);
            formulario.setSecciones(secciones);
        }

        formulario.setActualizadoEn(Instant.now());

        Formulario updated = formularioRepository.save(formulario);
        log.info("Formulario actualizado: id={}, por usuario={}", id, getCurrentUserId());
        return toResponse(updated);
    }

    public void delete(String id) {
        Formulario formulario = formularioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formulario", id));

        // Verificar que ninguna actividad referencie este formulario antes de desactivarlo
        long referenciaCount = actividadRepository.countByFormularioId(id);
        if (referenciaCount > 0) {
            throw new BadRequestException(
                    "El formulario no puede eliminarse porque está referenciado por "
                    + referenciaCount + " actividad(es). Desasocie el formulario primero.");
        }

        // Soft delete: cambia estado a INACTIVO (el formulario no desaparece del histórico)
        formulario.setEstado(Formulario.EstadoFormulario.INACTIVO);
        formulario.setActualizadoEn(Instant.now());
        formularioRepository.save(formulario);

        log.info("Formulario desactivado (soft delete): id={}, por usuario={}", id, getCurrentUserId());
    }

    // -----------------------------------------------------------------------
    // Helpers de mapeo — Request → Document
    // -----------------------------------------------------------------------

    private List<Formulario.SeccionFormulario> mapSecciones(
            List<CreateFormularioRequest.SeccionRequest> reqs) {
        return reqs.stream()
                .map(s -> Formulario.SeccionFormulario.builder()
                        .id(UUID.randomUUID().toString())
                        .titulo(s.getTitulo())
                        .orden(s.getOrden())
                        .campos(mapCampos(s.getCampos()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<Formulario.CampoFormulario> mapCampos(
            List<CreateFormularioRequest.CampoRequest> reqs) {
        return reqs.stream()
                .map(c -> Formulario.CampoFormulario.builder()
                        .id(UUID.randomUUID().toString())
                        .nombre(c.getNombre())
                        .etiqueta(c.getEtiqueta())
                        .tipo(c.getTipo())
                        .obligatorio(c.getObligatorio())
                        .orden(c.getOrden())
                        .placeholder(c.getPlaceholder())
                        .valorDefecto(c.getValorDefecto())
                        .validaciones(mapValidacion(c.getValidaciones()))
                        .opciones(mapOpciones(c.getOpciones()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<Formulario.SeccionFormulario> mapUpdateSecciones(
            List<UpdateFormularioRequest.SeccionRequest> reqs) {
        return reqs.stream()
                .map(s -> Formulario.SeccionFormulario.builder()
                        .id(UUID.randomUUID().toString())
                        .titulo(s.getTitulo())
                        .orden(s.getOrden())
                        .campos(mapUpdateCampos(s.getCampos()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<Formulario.CampoFormulario> mapUpdateCampos(
            List<UpdateFormularioRequest.CampoRequest> reqs) {
        if (reqs == null) return new ArrayList<>();
        return reqs.stream()
                .map(c -> Formulario.CampoFormulario.builder()
                        .id(UUID.randomUUID().toString())
                        .nombre(c.getNombre())
                        .etiqueta(c.getEtiqueta())
                        .tipo(c.getTipo())
                        .obligatorio(c.getObligatorio())
                        .orden(c.getOrden())
                        .placeholder(c.getPlaceholder())
                        .valorDefecto(c.getValorDefecto())
                        .validaciones(mapUpdateValidacion(c.getValidaciones()))
                        .opciones(mapUpdateOpciones(c.getOpciones()))
                        .build())
                .collect(Collectors.toList());
    }

    private Formulario.ValidacionCampo mapValidacion(
            CreateFormularioRequest.ValidacionRequest req) {
        if (req == null) return null;
        return Formulario.ValidacionCampo.builder()
                .min(req.getMin())
                .max(req.getMax())
                .pattern(req.getPattern())
                .mensajeError(req.getMensajeError())
                .build();
    }

    private Formulario.ValidacionCampo mapUpdateValidacion(
            UpdateFormularioRequest.ValidacionRequest req) {
        if (req == null) return null;
        return Formulario.ValidacionCampo.builder()
                .min(req.getMin())
                .max(req.getMax())
                .pattern(req.getPattern())
                .mensajeError(req.getMensajeError())
                .build();
    }

    private List<Formulario.OpcionCampo> mapOpciones(
            List<CreateFormularioRequest.OpcionRequest> reqs) {
        if (reqs == null) return new ArrayList<>();
        return reqs.stream()
                .map(o -> Formulario.OpcionCampo.builder()
                        .valor(o.getValor())
                        .etiqueta(o.getEtiqueta())
                        .build())
                .collect(Collectors.toList());
    }

    private List<Formulario.OpcionCampo> mapUpdateOpciones(
            List<UpdateFormularioRequest.OpcionRequest> reqs) {
        if (reqs == null) return new ArrayList<>();
        return reqs.stream()
                .map(o -> Formulario.OpcionCampo.builder()
                        .valor(o.getValor())
                        .etiqueta(o.getEtiqueta())
                        .build())
                .collect(Collectors.toList());
    }

    // -----------------------------------------------------------------------
    // Helpers de mapeo — Document → Response
    // -----------------------------------------------------------------------

    FormularioResponse toResponse(Formulario f) {
        List<FormularioResponse.SeccionResponse> secciones = f.getSecciones() == null
                ? List.of()
                : f.getSecciones().stream()
                        .map(this::toSeccionResponse)
                        .collect(Collectors.toList());

        return FormularioResponse.builder()
                .id(f.getId())
                .nombre(f.getNombre())
                .descripcion(f.getDescripcion())
                .estado(f.getEstado() != null ? f.getEstado().name() : null)
                .secciones(secciones)
                .creadoPorId(f.getCreadoPorId())
                .creadoEn(f.getCreadoEn())
                .actualizadoEn(f.getActualizadoEn())
                .build();
    }

    private FormularioResponse.SeccionResponse toSeccionResponse(Formulario.SeccionFormulario s) {
        List<FormularioResponse.CampoResponse> campos = s.getCampos() == null
                ? List.of()
                : s.getCampos().stream()
                        .map(this::toCampoResponse)
                        .collect(Collectors.toList());

        return FormularioResponse.SeccionResponse.builder()
                .id(s.getId())
                .titulo(s.getTitulo())
                .orden(s.getOrden())
                .campos(campos)
                .build();
    }

    private FormularioResponse.CampoResponse toCampoResponse(Formulario.CampoFormulario c) {
        FormularioResponse.ValidacionResponse validacion = null;
        if (c.getValidaciones() != null) {
            validacion = FormularioResponse.ValidacionResponse.builder()
                    .min(c.getValidaciones().getMin())
                    .max(c.getValidaciones().getMax())
                    .pattern(c.getValidaciones().getPattern())
                    .mensajeError(c.getValidaciones().getMensajeError())
                    .build();
        }

        List<FormularioResponse.OpcionResponse> opciones = c.getOpciones() == null
                ? List.of()
                : c.getOpciones().stream()
                        .map(o -> FormularioResponse.OpcionResponse.builder()
                                .valor(o.getValor())
                                .etiqueta(o.getEtiqueta())
                                .build())
                        .collect(Collectors.toList());

        return FormularioResponse.CampoResponse.builder()
                .id(c.getId())
                .nombre(c.getNombre())
                .etiqueta(c.getEtiqueta())
                .tipo(c.getTipo() != null ? c.getTipo().name() : null)
                .obligatorio(c.getObligatorio())
                .orden(c.getOrden())
                .placeholder(c.getPlaceholder())
                .valorDefecto(c.getValorDefecto())
                .validaciones(validacion)
                .opciones(opciones)
                .build();
    }

    // -----------------------------------------------------------------------
    // Validaciones de negocio
    // -----------------------------------------------------------------------

    /**
     * Los nombres de campo (snake_case) deben ser únicos dentro del formulario completo,
     * no solo dentro de su sección, porque el motor de trámites los usa como claves al
     * almacenar las respuestas del funcionario.
     */
    private void validarNombresCampoUnicos(List<Formulario.SeccionFormulario> secciones) {
        Set<String> nombres = new HashSet<>();
        for (Formulario.SeccionFormulario seccion : secciones) {
            for (Formulario.CampoFormulario campo : seccion.getCampos()) {
                if (campo.getNombre() != null && !nombres.add(campo.getNombre())) {
                    throw new BadRequestException(
                            "El nombre de campo '" + campo.getNombre()
                            + "' está duplicado dentro del formulario. Los nombres deben ser únicos.");
                }
            }
        }
    }

    /**
     * SELECT y MULTISELECT deben tener al menos una opción.
     * Los demás tipos no deben tener opciones.
     */
    private void validarOpcionesPorTipo(List<Formulario.SeccionFormulario> secciones) {
        Set<Formulario.TipoCampo> tiposConOpciones = Set.of(
                Formulario.TipoCampo.SELECT,
                Formulario.TipoCampo.MULTISELECT);

        for (Formulario.SeccionFormulario seccion : secciones) {
            for (Formulario.CampoFormulario campo : seccion.getCampos()) {
                boolean tieneOpciones = campo.getOpciones() != null && !campo.getOpciones().isEmpty();
                boolean requiereOpciones = tiposConOpciones.contains(campo.getTipo());

                if (requiereOpciones && !tieneOpciones) {
                    throw new BadRequestException(
                            "El campo '" + campo.getNombre() + "' es de tipo " + campo.getTipo()
                            + " y debe tener al menos una opción definida.");
                }
                if (!requiereOpciones && tieneOpciones) {
                    throw new BadRequestException(
                            "El campo '" + campo.getNombre() + "' es de tipo " + campo.getTipo()
                            + " y no debe tener opciones. Las opciones solo aplican para SELECT y MULTISELECT.");
                }
            }
        }
    }

    private Formulario.EstadoFormulario parseEstado(String estado) {
        if (estado == null || estado.isBlank()) return null;
        try {
            return Formulario.EstadoFormulario.valueOf(estado.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Estado inválido: '" + estado + "'. Valores permitidos: ACTIVO, INACTIVO");
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
}
