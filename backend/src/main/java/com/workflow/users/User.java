package com.workflow.users;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "usuarios")
public class User implements UserDetails {

    @Id
    private String id;

    @Field("username")
    @Indexed(unique = true)
    private String username;

    @Field("email")
    @Indexed(unique = true)
    private String email;

    @Field("password_hash")
    @JsonIgnore
    private String passwordHash;

    @Field("nombre_completo")
    private String nombreCompleto;

    @Field("rol_id")
    @Indexed
    private String rolId;

    @Field("departamento")
    private String departamento;

    @Field("department_id")
    private String departmentId;

    @Field("cargo")
    private String cargo;

    @Field("empresa_id")
    private String empresaId;

    @Builder.Default
    @Field("activo")
    private boolean activo = true;

    @Field("fcm_token")
    private String fcmToken;

    @Field("ultimo_acceso")
    private LocalDateTime ultimoAcceso;

    @Field("creado_en")
    private LocalDateTime creadoEn;

    @Field("actualizado_en")
    private LocalDateTime actualizadoEn;

    @org.springframework.data.annotation.Transient
    private Collection<? extends GrantedAuthority> authorities = Collections.emptyList();

    // --- UserDetails ---

    @Override
    @JsonIgnore
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        // Spring Security usa email como identificador principal
        return email;
    }

    @Override
    @JsonIgnore
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public void setAuthorities(Collection<? extends GrantedAuthority> authorities) {
        this.authorities = authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return activo;
    }

    @Override
    public boolean isAccountNonLocked() {
        return activo;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return activo;
    }

    @Override
    public boolean isEnabled() {
        return activo;
    }
}
