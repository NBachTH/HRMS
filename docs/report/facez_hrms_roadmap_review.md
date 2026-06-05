# FaceZ HRMS — Roadmap Review Report

**Document reviewed:** `05_development_roadmap_and_guidelines.md`
**Version:** 1.0 | **Review date:** 2026-04-12
**Scope:** Phases 0–8 (Foundation → Operations & Hardening)

---

## Executive Summary

The roadmap is professionally written — dependencies between phases are clearly stated, each phase has specific acceptance criteria, illustrative code snippets, and a migration sequence table. The overall quality is above average for real-world project documentation.

However, **6 critical defects** must be resolved before implementation begins to avoid production data loss or system failure. An additional **9 improvement areas** and **7 missing items** are identified below.

| Category | Count |
|---|---|
| Critical defects | 6 |
| Needs improvement | 9 |
| Missing / to be added | 7 |
| Total phases reviewed | 8 (Phase 0–8) |

---

## 1. Critical Defects

> These issues can cause data loss, migration failure, or incorrect business logic in production. They must be fixed before implementation begins.

---

### 1.1 Migration V13 may cause data loss

**Affected:** Phase 5.2 — `V13__contract_date_types.sql`

The migration uses `USING start_date::date` to cast VARCHAR columns to DATE. If any existing rows contain non-standard date strings (e.g. `"2025/01/15"`, `"15-01-2025"`, empty strings, or null-equivalent text), PostgreSQL will throw a cast error and roll back the entire migration — taking down the system mid-deployment.

**Recommended fix:**
Run a data-cleansing script before V13 to validate and normalise all date values. Use a parallel-column approach: add a new `DATE` column, migrate row by row with error handling, then drop the old column after full verification. Do not attempt a single-shot `ALTER COLUMN ... TYPE` cast.

---

### 1.2 Migration V12 uses an unresolvable placeholder

**Affected:** Phase 5.1 — `V12__contract_history.sql`

The script contains:
```sql
DROP CONSTRAINT IF EXISTS <existing_unique_constraint_on_employee_id>
```
This is a literal placeholder, not a valid SQL identifier. Flyway will execute this verbatim and fail immediately. The constraint name must be discovered from the actual database schema before the migration is written.

**Recommended fix:**
Query the real constraint name first:
```sql
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'contract' AND constraint_type = 'UNIQUE';
```
Then hardcode the actual name (e.g. `contract_employee_id_key`) into the migration file.

---

### 1.3 Potential circular dependency in Phase 3.1

**Affected:** Phase 3.1 — `CheckinLogService` → `AttendanceService`

The roadmap instructs injecting `AttendanceService` directly into `CheckinLogService`. If any bean in the `AttendanceService` dependency chain references `CheckinLogService` (directly or transitively), Spring will throw a `BeanCurrentlyInCreationException` at startup.

**Recommended fix:**
Decouple using Spring Application Events:
- `CheckinLogService` publishes a `CheckinProcessedEvent` after saving the log.
- `AttendanceService` listens with `@EventListener` (or `@TransactionalEventListener`).

This eliminates the direct dependency entirely.

---

### 1.4 OT hour calculation truncates fractional hours

**Affected:** Phase 6.1 — `OTRequestService`

```java
long requestedHours = Duration.between(req.getStartTime(), req.getEndTime()).toHours();
```
`Duration.toHours()` returns a `long` and silently truncates fractions. A 1h 45min OT request is counted as 1 hour. Accumulated over a month, an employee can exceed the 40-hour legal limit without the system detecting it.

Note: Phase 6.2 correctly uses `toMinutes() / 60.0` — Phase 6.1 must be brought into alignment.

**Recommended fix:**
Replace with minute-based comparison throughout:
```java
long requestedMinutes = Duration.between(req.getStartTime(), req.getEndTime()).toMinutes();
long monthlyOtMinutes = calculateApprovedOtMinutesForMonth(...);
if (monthlyOtMinutes + requestedMinutes > 2400) { // 40h × 60
    throw new BadRequestException(...);
}
```

---

### 1.5 Leave balance deduction logic allows double-booking

**Affected:** Phase 4.2 — `LeaveService` / `LeaveBalance`

The document states: *"On leave approval: decrement `usedDays`."* This is incorrect. If the balance is only decremented at approval time, an employee can submit multiple overlapping leave requests simultaneously — each passing the balance check — and have all of them approved, consuming more days than their entitlement.

**Recommended fix:**
Implement a two-stage deduction:
1. **On submission:** Reserve (tentatively deduct) the requested days into a `pendingDays` field. Reject if `remainingDays - pendingDays < requested`.
2. **On approval:** Convert pending to confirmed (`usedDays += approved; pendingDays -= approved`).
3. **On rejection/cancellation:** Release the pending reservation.

Add a `pendingDays` column to the `leave_balance` table.

---

### 1.6 Profile picture migration (V15) has no rollback path

**Affected:** Phase 8.3 — `V15__profile_picture_url.sql`

The migration immediately drops the `profile_picture` BLOB column after adding `profile_picture_url`. If the MinIO/S3 upload job fails partway through, or the storage service is unavailable, all employee profile pictures are permanently deleted with no recovery path.

**Recommended fix:**
Execute as three separate steps across multiple releases:
1. **Migration A:** Add `profile_picture_url VARCHAR(500)` (do not drop BLOB yet).
2. **Background job:** Iterate all employees, upload each BLOB to object storage, save the returned URL.
3. **Migration B (after 100% verification):** Drop the `profile_picture` BLOB column.

---

## 2. Areas Needing Improvement

---

### 2.1 Phase 5.2 and 5.1 should be executed in reverse order

Phase 5.1 (Contract History) adds `effectiveFrom / effectiveTo` fields of type `LocalDate`, but Phase 5.2 is what converts `startDate / endDate` from `String` to `LocalDate`. The entity will be inconsistent between the two migrations if applied in the documented order.

**Fix:** Swap the order — fix date types first (V12), then add contract history (V13). Update the migration sequence table accordingly.

---

### 2.2 No migration file for OT limit enforcement

Phase 6.1 adds monthly/annual OT limit logic but there is no corresponding migration in the sequence table. Running `calculateApprovedOtHoursForMonth()` as a full table scan on every OT submission will degrade as data grows.

**Fix:** Add a database view or summary index for monthly OT totals, with a corresponding migration file included in the sequence.

---

### 2.3 `ContractExpiryScheduler` has dead functionality for 3 phases

Phase 5.3 creates the scheduler but notes: *"send an alert to HR_ADMIN (when notifications are implemented in Phase 8)."* The scheduler runs from Phase 5 but its primary function only works from Phase 8 — three phases of dead code.

**Fix:** Split into two deliverables. Phase 5 exposes expiring contracts via `GET /api/contracts/expiring-soon` and logs a warning. Phase 8 adds the event publication to trigger the notification.

---

### 2.4 Night OT classification is inaccurate

**Affected:** Phase 6.2 — `computeOtPayForRequest`

```java
boolean isNight = ot.getStartTime().getHour() >= 22 || ot.getEndTime().getHour() < 6;
```
This boolean check has two problems: OT from 21:00–23:00 has `startHour = 21 < 22` and is not flagged as night shift despite overlapping the night window. OT spanning midnight (e.g. 23:00–03:00) relies solely on the end-time condition.

**Fix:** Calculate the actual overlap in minutes between the OT window and the statutory night period (22:00–06:00), then apply a proportional supplement rather than a binary flag.

---

### 2.5 No guard preventing employees from submitting system-only leave types

`PUBLIC_HOLIDAY` and `COMPENSATORY` are defined in `LeaveType` as "auto-generated, not employee-submitted," but there is no documented validation in `LeaveService` to enforce this restriction.

**Fix:** Add an explicit allowlist in `LeaveService.create()`. Employees may only submit: `ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `BEREAVEMENT`, `MARRIAGE`, `UNPAID`. Attempts to submit `PUBLIC_HOLIDAY` or `COMPENSATORY` must return HTTP 400.

---

### 2.6 Timeline is overly optimistic

Phase 0 (Flyway baseline from all existing entities) and Phase 1 (complete security redesign, payroll workflow restructure, and frontend role routing) are scheduled for 4 weeks combined. Writing a correct Flyway baseline from an existing production schema alone can take 2–3 weeks when accounting for data validation, testing, and zero-downtime deployment planning.

**Recommended revision:**

| Phase | Current estimate | Recommended |
|---|---|---|
| Phase 0 | Week 1–2 | Week 1–3 |
| Phase 1 | Week 3–4 | Week 4–7 |
| Phases 2–8 | Week 5–14 | Week 8–20 |
| **Total** | **14 weeks** | **20 weeks** |

---

### 2.7 Bucket4j rate limiting will not work in multi-instance deployments

Phase 0.4 specifies Bucket4j but does not define the storage backend. The default in-memory bucket is per-JVM instance. With a load balancer in front of two application instances, an attacker can send 10 requests to each instance — 20 total — without triggering the rate limit.

**Fix:** Explicitly configure the `bucket4j-redis` extension using the Redis instance already present in the architecture so that rate limit state is shared across all instances.

---

### 2.8 No API versioning strategy

Multiple phases modify response DTOs (`EmployeeResponse`, `ContractResponse`, `PayrollResponse`). There is no plan for backward compatibility. Mobile or web clients built against an earlier phase will break silently when a new phase is deployed.

**Fix:** Adopt a versioning convention before Phase 1 deployment — either URL prefix (`/api/v1/`) or Accept-header versioning — and document the breaking-change policy between phases.

---

### 2.9 No test strategy defined

Each phase has acceptance criteria but no guidance on automated tests. `PayrollCalculationEngine` contains complex multi-variable logic (PIT progressive brackets, BHXH rates, OT multipliers, dependent deductions) with no test requirements specified.

**Fix:** Add a minimum test coverage requirement per phase, especially for Phases 6 and 7. Example: *"PayrollCalculationEngine must have ≥ 90% branch coverage. Each OT rate combination (weekday / weekend / public holiday / night supplement) must have a dedicated unit test."*

---

## 3. Missing Items — Must Be Added

---

### 3.1 Audit log with old/new value history

`AuditableEntity` records `createdBy` / `updatedBy` but does not capture what changed or what the previous values were. For an HRMS handling salary, national ID, bank account numbers, and tax codes, a full change history is both an internal control requirement and a legal compliance expectation.

**Recommended addition:** Implement Hibernate Envers, or a custom `audit_log` table recording `entity_type`, `entity_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `changed_at` for all sensitive entities (`Payroll`, `Contract`, `EmployeeInfo`, `TaxDependent`).

---

### 3.2 Data backup and disaster recovery plan

The roadmap provides no guidance on PostgreSQL backup schedules, MinIO replication policy, or a pre-migration checklist. A failed migration without a prior backup is unrecoverable.

**Recommended addition:** Add to Phase 0 or Phase 8: automated `pg_dump` schedule, MinIO bucket versioning or replication policy, and a required pre-deployment checklist: *"Take full database backup. Verify backup restores successfully. Then run the migration."*

---

### 3.3 Employee payslip export

Phase 7 provides reporting endpoints for Finance and Director only. Employees have no way to view or download their own monthly payslip — one of the most fundamental features of any HRMS.

**Recommended addition:** `GET /api/payrolls/my/{year}/{month}/slip` — returns the authenticated employee's own payslip as JSON (renderable as PDF on the frontend). Accessible to the `EMPLOYEE` role for their own records only.

---

### 3.4 Social insurance contribution cap

Vietnamese Social Insurance Law specifies that the monthly contribution base is capped at 20× the statutory minimum wage (2026: 20 × VND 2,340,000 = VND 46,800,000). The roadmap does not mention this cap. For high-salary employees, the current implementation will calculate incorrect (overstated) employer and employee insurance contributions.

**Recommended addition:** In `PayrollCalculationEngine`:
```java
long cappedInsuranceBase = Math.min(grossSalary, 20 * statutoryMinWage);
```
Read `statutoryMinWage` from `SystemConfig` so it can be updated when the government revises the figure without a code deployment.

---

### 3.5 PIT progressive tax bracket implementation

Phase 7.4 describes a PIT summary endpoint but provides no implementation guide for the 7-bracket progressive tax schedule under Vietnamese Personal Income Tax Law. It is unclear how `PayrollCalculationEngine` currently calculates PIT, if at all.

**Recommended addition:** Document the PIT calculation algorithm using the 7 statutory brackets (5%, 10%, 15%, 20%, 25%, 30%, 35%) and store bracket thresholds and rates in `SystemConfig` so they can be updated without code changes when the law is amended.

---

### 3.6 Environment separation (dev / staging / prod)

Phase 0.2 externalises secrets but does not define how different environments are managed. Running Flyway migrations against a production database requires a different process than running them in development.

**Recommended addition:** Define `application-dev.yml`, `application-staging.yml`, and `application-prod.yml` profiles. Document the CI/CD pipeline step: *"Run migration against staging. Verify. Then deploy to production."* Include guidance on `flyway repair` for failed mid-run migrations.

---

### 3.7 Frontend error handling and loading states

The roadmap covers frontend role routing (Phase 1.5) but provides no guidance on UX for error conditions: 403 Forbidden when a role changes mid-session, 429 Too Many Requests from the rate limiter, network timeouts, or server-side validation errors.

**Recommended addition:** Add a frontend hardening section — in Phase 8 or as Phase 1.6 — covering: global error boundary component, toast notification system for API errors, loading skeletons for async data, and form validation feedback patterns aligned with backend error response shapes.

---

## 4. Migration Sequence — Corrections

| Migration | Current state | Recommended change |
|---|---|---|
| V12 | Contract history (drop constraint) | Resolve placeholder constraint name before committing |
| V13 | Contract date types (VARCHAR → DATE) | Swap order with V12; add pre-migration data-cleanse script |
| V14 | Employer contributions | Add BHXH cap logic to corresponding service code |
| V15 | Profile picture URL (drop BLOB) | Split into V15a (add URL) + background job + V15b (drop BLOB) |
| *(new)* | OT monthly summary view | Add after Phase 6.1 for query performance |
| *(new)* | Audit log table | Add in Phase 0 alongside V2 (audit columns) |
| *(new)* | PIT tax brackets in SystemConfig | Add as Phase 7 data migration |

---

## 5. Overall Assessment

| Dimension | Rating | Notes |
|---|---|---|
| Structure and clarity | ✅ Strong | Phase dependencies, acceptance criteria, and code examples are well done |
| Technical correctness | ⚠️ Partial | 6 defects that will cause failures if unaddressed |
| Vietnamese labour law compliance | ⚠️ Incomplete | Missing BHXH cap, PIT brackets; night OT supplement logic is inaccurate |
| Security | ✅ Good | Rate limiting, device API keys, and CORS externalisation are sound in concept |
| Operational readiness | ❌ Weak | No backup plan, no test strategy, no environment separation defined |
| Timeline realism | ⚠️ Optimistic | 14 weeks documented; 20 weeks recommended |

**Recommendation:** Resolve the 6 critical defects and add the 3 highest-priority missing items (BHXH contribution cap, PIT progressive brackets, employee payslip endpoint) before Phase 0 implementation begins. The remaining improvements can be addressed incrementally within their respective phases.

---

*End of review — FaceZ HRMS Roadmap v1.0*
