package com.workflow.users;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    List<User> findByRolId(String rolId);

    List<User> findByActivoTrue();

    List<User> findByEmpresaIdAndActivoTrue(String empresaId);

    List<User> findByDepartmentIdAndActivoTrue(String departmentId);

    /**
     * Funcionarios candidatos para asignación automática: empresa + departamento + cargo + activo.
     */
    List<User> findByEmpresaIdAndDepartmentIdAndCargoAndActivoTrue(
            String empresaId, String departmentId, String cargo);

    /**
     * Funcionarios candidatos para asignación automática: empresa + departamento + activo (sin cargo).
     */
    List<User> findByEmpresaIdAndDepartmentIdAndActivoTrue(String empresaId, String departmentId);
}
