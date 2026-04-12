package com.workflow.forms;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormularioRepository extends MongoRepository<Formulario, String> {

    Page<Formulario> findByEstado(Formulario.EstadoFormulario estado, Pageable pageable);

    Page<Formulario> findByNombreContainingIgnoreCaseAndEstado(
            String nombre,
            Formulario.EstadoFormulario estado,
            Pageable pageable);

    Page<Formulario> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);

    // Usado para validar unicidad de nombre al crear o actualizar
    boolean existsByNombreAndIdNot(String nombre, String id);

    boolean existsByNombre(String nombre);
}
