package com.workflow.departments;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends MongoRepository<Department, String> {

    Optional<Department> findByNombre(String nombre);

    List<Department> findByActivaTrue();

    List<Department> findByEmpresaIdAndActivaTrue(String empresaId);
}
