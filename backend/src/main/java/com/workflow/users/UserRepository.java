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
}
