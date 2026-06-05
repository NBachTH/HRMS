package org.dummy.facez.domain.contract.scheduler;

import lombok.RequiredArgsConstructor;
import org.dummy.facez.domain.contract.model.Contract;
import org.dummy.facez.domain.contract.repository.ContractRepository;
import org.dummy.facez.domain.notification.event.ContractExpiringEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ContractExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ContractExpiryScheduler.class);

    private final ContractRepository contractRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(cron = "0 0 8 * * *")
    public void checkExpiringContracts() {
        LocalDate today       = LocalDate.now();
        LocalDate warningDate = today.plusDays(30);

        List<Contract> expiring = contractRepository.findByCurrentTrueAndEndDateBetween(today, warningDate);
        expiring.forEach(c -> {
            String empId   = c.getEmployeeInfo().getEmployeeId();
            String empName = c.getEmployeeInfo().getName();
            log.warn("Contract expiring: employee={}, endDate={}", empId, c.getEndDate());
            eventPublisher.publishEvent(new ContractExpiringEvent(this, empId, empName, c.getEndDate()));
        });

        if (!expiring.isEmpty()) {
            log.info("Contract expiry check completed: {} contracts expiring within 30 days.", expiring.size());
        }
    }
}
