package com.workflow.empresas;

import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmpresaService {

    private final EmpresaRepository empresaRepository;

    public List<EmpresaResponse> getAll() {
        return empresaRepository.findByActivaTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EmpresaResponse getById(String id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa no encontrada: " + id));
        return toResponse(empresa);
    }

    public EmpresaResponse create(EmpresaRequest request) {
        empresaRepository.findByNombre(request.getNombre()).ifPresent(existing -> {
            throw new BadRequestException("Ya existe una empresa con el nombre: " + request.getNombre());
        });

        LocalDateTime ahora = LocalDateTime.now();
        Empresa empresa = Empresa.builder()
                .nombre(request.getNombre())
                .razonSocial(request.getRazonSocial())
                .nit(request.getNit())
                .emailContacto(request.getEmailContacto())
                .telefono(request.getTelefono())
                .direccion(request.getDireccion())
                .ciudad(request.getCiudad())
                .pais(request.getPais())
                .activa(request.getActiva() != null ? request.getActiva() : true)
                .creadoEn(ahora)
                .actualizadoEn(ahora)
                .build();

        return toResponse(empresaRepository.save(empresa));
    }

    public EmpresaResponse update(String id, EmpresaRequest request) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa no encontrada: " + id));

        if (request.getNombre() != null && !request.getNombre().equals(empresa.getNombre())) {
            empresaRepository.findByNombre(request.getNombre()).ifPresent(existing -> {
                throw new BadRequestException("Ya existe una empresa con el nombre: " + request.getNombre());
            });
            empresa.setNombre(request.getNombre());
        }

        if (request.getRazonSocial() != null) empresa.setRazonSocial(request.getRazonSocial());
        if (request.getNit() != null) empresa.setNit(request.getNit());
        if (request.getEmailContacto() != null) empresa.setEmailContacto(request.getEmailContacto());
        if (request.getTelefono() != null) empresa.setTelefono(request.getTelefono());
        if (request.getDireccion() != null) empresa.setDireccion(request.getDireccion());
        if (request.getCiudad() != null) empresa.setCiudad(request.getCiudad());
        if (request.getPais() != null) empresa.setPais(request.getPais());
        if (request.getActiva() != null) empresa.setActiva(request.getActiva());

        empresa.setActualizadoEn(LocalDateTime.now());

        return toResponse(empresaRepository.save(empresa));
    }

    public void delete(String id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa no encontrada: " + id));
        // Soft delete
        empresa.setActiva(false);
        empresa.setActualizadoEn(LocalDateTime.now());
        empresaRepository.save(empresa);
    }

    private EmpresaResponse toResponse(Empresa empresa) {
        return EmpresaResponse.builder()
                .id(empresa.getId())
                .nombre(empresa.getNombre())
                .razonSocial(empresa.getRazonSocial())
                .nit(empresa.getNit())
                .emailContacto(empresa.getEmailContacto())
                .telefono(empresa.getTelefono())
                .direccion(empresa.getDireccion())
                .ciudad(empresa.getCiudad())
                .pais(empresa.getPais())
                .activa(empresa.isActiva())
                .adminPrincipalId(empresa.getAdminPrincipalId())
                .creadoEn(empresa.getCreadoEn())
                .actualizadoEn(empresa.getActualizadoEn())
                .build();
    }
}
