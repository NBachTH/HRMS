package org.dummy.facez.domain.payroll.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory state object for a running or completed batch payroll job.
 *
 * Thread-safety design:
 *  - {@code state}, {@code startedAt}, {@code completedAt}, {@code failureReason}
 *    are {@code volatile} — writes from the async thread are immediately visible
 *    to the HTTP polling thread.
 *  - {@code total}, {@code succeeded}, {@code skipped}, {@code failedCount}
 *    are {@link AtomicInteger} — lock-free increments from the async thread,
 *    safe reads from any thread.
 *  - {@code errors} is {@link CopyOnWriteArrayList} — concurrent writes (async thread)
 *    and reads (HTTP thread) without explicit synchronization.
 */
public class PayrollJobRecord {

    public enum JobState { PENDING, RUNNING, COMPLETED, FAILED }

    private final String jobId;
    private final int year;
    private final int month;
    private final int standardWorkingDays;

    private volatile JobState     state         = JobState.PENDING;
    private volatile LocalDateTime startedAt;
    private volatile LocalDateTime completedAt;
    private volatile String        failureReason;

    private final AtomicInteger total      = new AtomicInteger(0);
    private final AtomicInteger succeeded  = new AtomicInteger(0);
    private final AtomicInteger skipped    = new AtomicInteger(0);
    private final AtomicInteger failedCount = new AtomicInteger(0);
    private final List<String>  errors     = new CopyOnWriteArrayList<>();

    public PayrollJobRecord(String jobId, int year, int month, int standardWorkingDays) {
        this.jobId = jobId;
        this.year  = year;
        this.month = month;
        this.standardWorkingDays = standardWorkingDays;
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public String getJobId()               { return jobId; }
    public int getYear()                   { return year; }
    public int getMonth()                  { return month; }
    public int getStandardWorkingDays()    { return standardWorkingDays; }

    public JobState getState()             { return state; }
    public LocalDateTime getStartedAt()    { return startedAt; }
    public LocalDateTime getCompletedAt()  { return completedAt; }
    public String getFailureReason()       { return failureReason; }

    public AtomicInteger getTotal()        { return total; }
    public AtomicInteger getSucceeded()    { return succeeded; }
    public AtomicInteger getSkipped()      { return skipped; }
    public AtomicInteger getFailedCount()  { return failedCount; }
    public List<String>  getErrors()       { return errors; }

    // ── Setters (volatile fields only) ────────────────────────────────────────

    public void setState(JobState state)               { this.state = state; }
    public void setStartedAt(LocalDateTime startedAt)  { this.startedAt = startedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
}
