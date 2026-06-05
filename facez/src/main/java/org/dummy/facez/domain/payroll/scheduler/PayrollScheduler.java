package org.dummy.facez.domain.payroll.scheduler;

import org.dummy.facez.domain.payroll.service.PayrollBatchService;
import org.dummy.facez.domain.payroll.service.PayrollConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Scheduled trigger for monthly payroll batch calculation.
 *
 * The scheduler calls triggerBatch() + runBatch() on the injected
 * {@link PayrollBatchService} proxy — this is the correct pattern to
 * ensure @Async is applied (scheduler thread → proxy → thread pool).
 *
 * The batch produces DRAFT records. HR then reviews and approves via
 * PATCH /api/payrolls/{id}/approve before marking as paid.
 */
@Component
public class PayrollScheduler {

    private static final Logger log = LoggerFactory.getLogger(PayrollScheduler.class);

    private final PayrollBatchService batchService;

    public PayrollScheduler(PayrollBatchService batchService) {
        this.batchService = batchService;
    }

    /**
     * Triggers batch payroll calculation at 06:00 on the 26th of every month.
     *
     * The 26th is the standard payroll cutoff in Vietnamese IT companies —
     * attendance for the month is considered closed. Adjust the cron
     * expression to match your company's actual cutoff date.
     *
     * Cron format: second  minute  hour  day-of-month  month  day-of-week
     */
    @Scheduled(cron = "0 0 6 26 * *")
    public void scheduleMonthlyPayroll() {
        LocalDate today = LocalDate.now();
        int year  = today.getYear();
        int month = today.getMonthValue();
        int nt    = PayrollConfigService.DEFAULT_STANDARD_DAYS;

        log.info("PayrollScheduler: triggering batch payroll DRAFT generation for {}/{}", year, month);

        // triggerBatch creates the job record and returns the ID.
        // runBatch is then called on the SAME injected proxy (batchService),
        // so Spring's @Async proxy intercepts it and submits to the thread pool.
        String jobId = batchService.triggerBatch(year, month, nt);
        batchService.runBatch(jobId, year, month, nt);

        log.info("PayrollScheduler: batch job {} submitted for {}/{}", jobId, year, month);
    }
}
