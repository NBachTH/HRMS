package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ApiKeyRepository extends JpaRepository<ApiKey, String> {

    Optional<ApiKey> findByKeyHashAndActiveTrue(String keyHash);
}
