package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.domain.payroll.model.SalaryGradeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalaryGradeConfigRepository extends JpaRepository<SalaryGradeConfig, String> {

    /** The version in effect for a payroll period: latest PUBLISHED with effectiveFrom <= anchor. */
    Optional<SalaryGradeConfig> findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
            ConfigStatus status, LocalDate anchor);

    List<SalaryGradeConfig> findAllByOrderByEffectiveFromDesc();
}
