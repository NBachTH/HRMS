package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.domain.payroll.model.AllowanceConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AllowanceConfigRepository extends JpaRepository<AllowanceConfig, String> {

    Optional<AllowanceConfig> findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
            ConfigStatus status, LocalDate anchor);

    List<AllowanceConfig> findAllByOrderByEffectiveFromDesc();
}
