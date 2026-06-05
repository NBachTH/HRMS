package org.dummy.facez.domain.payroll.service;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for batch payroll job records.
 *
 * Lives in the Spring singleton scope — the same store is shared across
 * all HTTP threads and the async batch thread, so job state is always
 * visible to polling requests.
 *
 * Note: records are never evicted in this implementation. For production,
 * add a scheduled cleanup that removes records older than N hours/days.
 */
@Component
public class PayrollJobStore {

    private final ConcurrentHashMap<String, PayrollJobRecord> store = new ConcurrentHashMap<>();

    /**
     * Creates a new {@link PayrollJobRecord} in PENDING state and returns its ID.
     * The caller should immediately submit the async job after calling this.
     */
    public String createJob(int year, int month, int standardWorkingDays) {
        String jobId = UUID.randomUUID().toString();
        store.put(jobId, new PayrollJobRecord(jobId, year, month, standardWorkingDays));
        return jobId;
    }

    public Optional<PayrollJobRecord> get(String jobId) {
        return Optional.ofNullable(store.get(jobId));
    }
}
