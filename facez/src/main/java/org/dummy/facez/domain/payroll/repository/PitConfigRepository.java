package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.domain.payroll.model.PitConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PitConfigRepository extends JpaRepository<PitConfig, String> {

    Optional<PitConfig> findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
            ConfigStatus status, LocalDate anchor);

    List<PitConfig> findAllByOrderByEffectiveFromDesc();
}
