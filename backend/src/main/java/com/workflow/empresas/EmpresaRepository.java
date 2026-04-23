package com.workflow.empresas;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmpresaRepository extends MongoRepository<Empresa, String> {

    List<Empresa> findByActivaTrue();

    Optional<Empresa> findByNombre(String nombre);
}
