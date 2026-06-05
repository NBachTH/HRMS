package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {

    Optional<SystemConfig> findByConfigTypeAndActiveTrue(String configType);

    boolean existsByConfigTypeAndActiveTrue(String configType);

    List<SystemConfig> findByConfigTypeOrderByCreatedAtDesc(String configType);

    @Modifying
    @Query("UPDATE SystemConfig s SET s.active = false WHERE s.configType = :configType AND s.active = true")
    void deactivateAllByConfigType(String configType);
}
