package org.dummy.facez.domain.employee.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.common.model.AuditableEntity;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "user_account",
        uniqueConstraints = {@UniqueConstraint(columnNames = "username")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount extends AuditableEntity implements UserDetails {

    @Id
    @Column(name = "employee_id", length = 64)
    private String employeeId;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String username;

    @NotBlank
    @Column(name = "password_hash", nullable = false, length = 100)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String passwordHash;

    private String lastPasswordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @MapsId
    @JoinColumn(name = "employee_id")
    private EmployeeInfo employeeInfo;

    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public @Nullable String getPassword() {
        return passwordHash;
    }

    @Override
    public @NotBlank String getUsername() {
        return username;
    }

    public void setUsername(@NotBlank String username) {
        this.username = username;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
