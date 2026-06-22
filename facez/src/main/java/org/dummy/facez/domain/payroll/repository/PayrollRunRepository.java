package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.domain.payroll.model.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, String> {

    Optional<PayrollRun> findByYearAndMonth(int year, int month);

    List<PayrollRun> findAllByOrderByYearDescMonthDesc();
}
