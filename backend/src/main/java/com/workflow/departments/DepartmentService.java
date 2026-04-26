package com.workflow.departments;

import com.workflow.shared.SecurityUtils;
import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import com.workflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    public List<DepartmentResponse> getAll() {
        String empresaId = securityUtils.getCurrentUserEmpresaId();
        List<Department> depts = (empresaId != null)
                ? departmentRepository.findByEmpresaIdAndActivaTrue(empresaId)
                : departmentRepository.findByActivaTrue();
        return depts.stream().map(this::toResponse).toList();
    }

    public DepartmentResponse getById(String id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + id));
        return toResponse(dept);
    }

    public DepartmentResponse create(DepartmentRequest request) {
        String empresaId = request.getEmpresaId() != null
                ? request.getEmpresaId()
                : securityUtils.getCurrentUserEmpresaId();

        if (empresaId != null) {
            departmentRepository.findByNombreAndEmpresaId(request.getNombre(), empresaId).ifPresent(existing -> {
                throw new BadRequestException("Ya existe un departamento con el nombre: " + request.getNombre());
            });
        } else {
            departmentRepository.findByNombre(request.getNombre()).ifPresent(existing -> {
                throw new BadRequestException("Ya existe un departamento con el nombre: " + request.getNombre());
            });
        }

        LocalDateTime ahora = LocalDateTime.now();
        Department dept = Department.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .responsable(request.getResponsable())
                .activa(request.getActiva() != null ? request.getActiva() : true)
                .empresaId(empresaId)
                .creadoEn(ahora)
                .actualizadoEn(ahora)
                .build();

        return toResponse(departmentRepository.save(dept));
    }

    public DepartmentResponse update(String id, DepartmentRequest request) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + id));

        if (request.getNombre() != null && !request.getNombre().equals(dept.getNombre())) {
            departmentRepository.findByNombre(request.getNombre()).ifPresent(existing -> {
                throw new BadRequestException("Ya existe un departamento con el nombre: " + request.getNombre());
            });
            dept.setNombre(request.getNombre());
        }
        if (request.getDescripcion() != null) dept.setDescripcion(request.getDescripcion());
        if (request.getResponsable() != null) dept.setResponsable(request.getResponsable());
        if (request.getActiva() != null) dept.setActiva(request.getActiva());
        if (request.getEmpresaId() != null) dept.setEmpresaId(request.getEmpresaId());
        dept.setActualizadoEn(LocalDateTime.now());

        return toResponse(departmentRepository.save(dept));
    }

    public void delete(String id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + id));
        dept.setActiva(false);
        dept.setActualizadoEn(LocalDateTime.now());
        departmentRepository.save(dept);
    }

    public List<String> getCargosByDepartamento(String departmentId) {
        departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento", departmentId));
        return userRepository.findByDepartmentIdAndActivoTrue(departmentId)
                .stream()
                .map(u -> u.getCargo())
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .toList();
    }

    private DepartmentResponse toResponse(Department dept) {
        return DepartmentResponse.builder()
                .id(dept.getId())
                .nombre(dept.getNombre())
                .descripcion(dept.getDescripcion())
                .responsable(dept.getResponsable())
                .activa(dept.isActiva())
                .empresaId(dept.getEmpresaId())
                .creadoEn(dept.getCreadoEn())
                .actualizadoEn(dept.getActualizadoEn())
                .build();
    }
}
