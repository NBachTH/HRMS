# FaceZ HRMS — Development Roadmap & Implementation Guidelines
### Completed Phases Review and Remaining Work
**Version:** 2.0 | **Date:** 2026-05-21 | **Based on:** Documents 01–04 v2.0
**Supersedes:** v1.1 (2026-04-23)

> **v2.0 scope:** Phases 0–8 from v1.1 have been implemented. This document records their completion status, notes any deviations from the original specification, and defines the remaining work as a new Phase 9.

---

## 1. How to Read This Document

Each phase from v1.1 is assessed as **Complete**, **Partial**, or **Deferred**, with notes on what was implemented vs. what was specified. Remaining work is collected in Phase 9 with the same `[BE]`/`[FE]`/`[DB]`/`[CFG]` tags from v1.1.

---

## 2. Phase Completion Summary

| Phase | Name | Status |
|-------|------|--------|
| 0 | Foundation | ✅ Complete |
| 1 | Role Architecture | ✅ Complete |
| 2 | Employee Data Completeness | ✅ Complete |
| 3 | Attendance Pipeline | ✅ Complete |
| 4 | Leave Management | ✅ Complete |
| 5 | Contract Lifecycle | ✅ Complete |
| 6 | OT Compliance | ✅ Complete |
| 7 | Accounting Function | ✅ Complete |
| 8 | Operations & Hardening | ⚠️ Mostly complete — 3 items partial/deferred |
| 9 | Remaining Work | 🔲 Not started |

---

## Phase 0 — Foundation ✅ Complete

### 0.1 Replace `ddl-auto: update` with Flyway ✅
- Flyway enabled in `application.yml` with `ddl-auto: none`.
- 19 versioned migration files (V1–V19) in `src/main/resources/db/migration/`.
- `baseline-on-migrate: false`, `out-of-order: false`, `validate-on-migrate: true`.
- All subsequent schema changes delivered as new numbered migration files.

### 0.2 Externalise All Secrets ✅ (with one deviation)
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `CORS_ALLOWED_ORIGINS` all use env-var substitution with safe local defaults.
- `JWT_ACCESS_EXP_MS`, `JWT_REFRESH_EXP_MS` externalised.
- ⚠️ **Deviation:** `JWT_SECRET` has a hardcoded fallback (`12345678abcdefgh12345678abcdefgh`). The v1.1 spec said `# No default — must be set explicitly`. This deviation creates a production security risk. **Corrective action required** (see Phase 9.1).

### 0.3 Shared Audit Base Class ✅
- `AuditableEntity` with `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, `@LastModifiedBy`.
- `AuditorAwareImpl` reads username from `SecurityContextHolder`.
- `@EnableJpaAuditing` in `JpaAuditingConfig`.
- V2 migration adds `created_by`, `updated_by` columns to all auditable tables.

### 0.4 Login Rate Limiting ✅
- `LoginRateLimiter` — Redis-backed counter keyed by client IP.
- 10 attempts per 15-minute window.
- HTTP 429 with `Retry-After` header on breach.
- `X-Forwarded-For` aware.
- ⚠️ **Deviation from spec:** Implemented as a Redis counter rather than Bucket4j. Functionally equivalent. Bucket4j Redis dependency was not added.

### 0.5 Environment Profiles ✅
- `application-dev.yml`, `application-staging.yml`, `application-prod.yml` created.
- Pre-deployment checklist documented in `application-prod.yml` comments.

---

## Phase 1 — Role Architecture ✅ Complete

### 1.1 New Roles ✅
- `FINANCE_ADMIN` and `DIRECTOR` added to `Role` enum.
- All `@PreAuthorize` annotations updated.
- V3 migration documents the change.

### 1.2 Security Configuration ✅
- `SecurityConfig` updated with explicit URL-level rules:
  - FINANCE_ADMIN: payroll calculate, batch, reports, mark-paid.
  - DIRECTOR: payroll approve/reject.
  - HR_ADMIN: employee CRUD, leave approvals, period close.
  - Department GET endpoints: authenticated (not public).
- `DeviceApiKeyFilter` added before `JwtAuthFilter`.
- Checkin-logs accept `DEVICE_CHECKIN` authority.

### 1.3 Payroll Status Workflow ✅
- `PayrollStatus` enum: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`, `REJECTED`.
- V4 migration adds `rejection_reason` column.
- `PayrollService.submitForApproval()`, `approve()`, `reject()`, `markPaid()` methods.
- Endpoints: `PATCH /submit`, `PATCH /approve`, `PATCH /reject`, `PATCH /mark-paid`.

### 1.4 Attendance Period Close Guard ✅
- `PayrollService.calculate()` checks `AttendancePeriodClose` exists; throws `BadRequestException` if absent.
- V5 migration: `attendance_period_close` table.

### 1.5 Frontend Role Routing ✅
- `finance/` and `director/` route namespaces added.
- Sidebar sections for Finance and Director.
- Payroll section removed from HR sidebar.
- Toast notifications and error boundaries implemented.

### 1.6 API Versioning Strategy ⚠️ Deferred
- The v1.1 spec recommended `/api/v1/` prefix before Phase 1 went to any shared environment.
- **Not implemented.** All routes remain `/api/...`. This is carried to Phase 9.6.

---

## Phase 2 — Employee Data Completeness ✅ Complete

### 2.1 Statutory Fields on EmployeeInfo ✅
- Added: `nationalId` (unique), `nationalIdIssueDate`, `nationalIdIssuePlace`, `taxCode` (unique), `socialInsuranceCode` (unique), `bankAccountNumber`, `bankName`, `bankBranch`, `dateOfBirth`, `gender` (enum), `hometown`, `profilePictureUrl`.
- V6 migration.
- `EmployeeCreateRequest`, `EmployeeUpdateRequest`, `EmployeeResponse` updated.

### 2.2 Tax Dependent Management ✅
- `TaxDependent` entity: `fullName`, `nationalId`, `dateOfBirth`, `relationship`, `registrationDate`, `active`.
- `TaxDependentRepository`, `TaxDependentService`, `TaxDependentController`.
- HR_ADMIN + FINANCE_ADMIN access.
- V7 migration.

---

## Phase 3 — Attendance Pipeline ✅ Complete

### 3.1 Spring Events Decoupling ✅
- `CheckinProcessedEvent` carries `employeeInfo`, `logTime`, `logType`.
- `CheckinLogService` publishes event after save.
- `AttendanceService.onCheckinProcessed()` listens with `@TransactionalEventListener(AFTER_COMMIT)` + `@Transactional(propagation = REQUIRES_NEW)`.
- No circular dependency issues.

### 3.2 Work Schedule Config ✅
- `AttendanceService` reads `WORK_SCHEDULE` from `SystemConfig`.
- V8 migration seeds default `{"workStartTime": "08:30", "workHoursPerDay": 8}`.
- Fallback constants used if config absent.

### 3.3 Public Holiday Calendar ✅
- `PublicHoliday` entity: `year`, `holidayDate`, `name`.
- `PublicHolidayService`, `PublicHolidayController` — GET/POST/DELETE.
- HR_ADMIN + FINANCE_ADMIN access.
- V9 migration seeds 2026 Vietnamese public holidays.

### 3.4 Period Close with Absence Reconciliation ✅
- `PeriodCloseService.closePeriod()` scans for unexplained absences.
- Returns `PeriodCloseResponse` with `closed`, `unexplainedAbsences` list.
- `forceClose=true` overrides.
- `POST /api/attendances/close-period` (HR_ADMIN).

---

## Phase 4 — Leave Management ✅ Complete

### 4.1 Leave Type Enum ✅
- `LeaveType`: ANNUAL, SICK, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE, UNPAID, PUBLIC_HOLIDAY, COMPENSATORY.
- V10 migration: `leave_type` (NOT NULL), `duration_hours`, `balance_deducted` columns.

### 4.2 Two-Stage Balance Deduction ✅
- Submit: reserve `pendingDays`, reduce `remainingDays`.
- Final HR approval: move `pendingDays → usedDays`.
- Rejection / deletion: release `pendingDays → remainingDays`.
- `LeaveBalance` entity with unique constraint on `(employee_id, leave_year, leave_type)`.
- V11 migration (includes `pending_days` column per v1.1 correction).

### 4.3 Period Close Absence Reconciliation ✅ (in Phase 3.4)

### 4.4 System-Only Leave Type Guard ✅
- `PUBLIC_HOLIDAY` and `COMPENSATORY` blocked at `LeaveService.create()`.
- Returns HTTP 400 with message.

---

## Phase 5 — Contract Lifecycle ✅ Complete

### 5.1 Contract Date Types ✅
- V12 migration: safe parallel-column approach — added `start_date_new DATE`, `end_date_new DATE`, migrated via regex-guarded `CAST`, dropped old columns, renamed.
- `Contract.startDate` and `endDate` are now `LocalDate`.

### 5.2 Contract History ✅
- V13 migration: dropped unique `employee_id` constraint; added `effective_from DATE`, `effective_to DATE`, `current BOOLEAN`.
- `ContractService.update()` supersedes the old record, inserts a new one.
- `ContractRepository.findByEmployeeInfo_EmployeeIdAndCurrentTrue()`.
- `GET /api/contracts/employee/{id}/history`.

### 5.3 Contract Expiry ✅
- `ContractExpiryScheduler` runs at 08:00 daily.
- Logs warnings and publishes `ContractExpiringEvent` for contracts expiring within 30 days.
- `GET /api/contracts/expiring-soon?withinDays=30` (HR_ADMIN).

---

## Phase 6 — OT Compliance ✅ Complete

### 6.1 Minute-Based OT Limits ✅
- Monthly limit: 2,400 minutes (40h) per Labour Code Art. 107.
- Annual limit: 12,000 minutes (200h).
- `OTRequestService` queries `sumApprovedMinutesForMonth()` and `sumApprovedMinutesForYear()`.
- V14a migration: `ot_monthly_summary` view.
- HTTP 400 on breach with remaining capacity stated in fractional hours.

### 6.2 Night Supplement Calculation ✅
- `PayrollCalculationEngine.calculateNightOverlapMinutes()` computes minute-level overlap with 22:00–06:00 window.
- Public holiday rate: ×3.0; weekend: ×2.0; weekday: ×1.5; night window adds ×0.3 proportionally.

---

## Phase 7 — Accounting Function ✅ Complete

### 7.1 Employer Contributions ✅
- `Payroll` entity fields: `bhxhEmployer`, `bhytEmployer`, `bhtnEmployer`, `workplaceAccidentInsurance`, `totalEmployerContributions`, `totalEmploymentCost`.
- Insurance base capped at `min(insuranceBase, 20 × statutory_min_wage)`.
- V14b migration.

### 7.2 Labour Cost Report ✅
- `PayrollReportService.getLabourCostReport(year, month, deptId)`.
- `GET /api/payrolls/reports/labour-cost` (FINANCE_ADMIN, DIRECTOR).

### 7.3 Insurance Remittance Report ✅
- `PayrollReportService.getInsuranceRemittanceReport(year, month)`.
- `GET /api/payrolls/reports/insurance-remittance` (FINANCE_ADMIN, DIRECTOR).

### 7.4 PIT Summary Report ✅
- `PayrollReportService.getPitSummaryReport(year, month)`.
- `GET /api/payrolls/reports/pit-summary` (FINANCE_ADMIN, DIRECTOR).

### 7.5 PIT Progressive Tax Calculation ✅
- 7-bracket schedule seeded in `system_config` via V15 migration.
- `PayrollCalculationEngine.calculatePit()` reads brackets from SystemConfig.
- Personal deduction 11,000,000 VND/month; dependent deduction 4,400,000 VND/month.

### 7.6 Employee Payslip ✅
- `PayrollService.getMyPayslip(year, month, username)`.
- `GET /api/payrolls/my/{year}/{month}/slip` (authenticated).
- Employee can only retrieve own payslip (resolved from JWT username).
- Returns HTTP 404 for no APPROVED/PAID payroll in the period.

---

## Phase 8 — Operations & Hardening ⚠️ Mostly Complete

### 8.1 Notification System ✅
- `Notification` entity — V18 migration.
- Events: `LeaveRequestSubmittedEvent`, `PayrollApprovedEvent`, `ContractExpiringEvent`.
- `NotificationEventListener` — `@Async` + `@TransactionalEventListener(AFTER_COMMIT)`.
- `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`.

### 8.2 Spring Boot Actuator ✅
- Endpoints exposed: `health`, `info`, `metrics`, `loggers`, `flyway`, `env`.
- `/actuator/health` — public.
- All other actuator endpoints — `SYSTEM_ADMIN` only.
- `show-values: never` on env endpoint.

### 8.3 Profile Picture Storage ⚠️ Partial (local files only)
- ✅ V16a migration: `profile_picture_url` column added.
- ✅ `ProfilePictureService` stores files in local directory; validates content type and size (≤5 MB).
- ✅ `POST /api/employees/{id}/profile-picture` endpoint.
- ⚠️ **Phase 8.3-B and 8.3-C not implemented:** Background migration job and cloud storage (MinIO/S3) were not implemented. Files are stored on the local filesystem. This is incompatible with horizontal scaling. Carried to Phase 9.4.

### 8.4 Device API Key Authentication ✅
- `ApiKey` entity (SHA-256 hash, device FK, active, lastUsedAt) — V17 migration.
- `ApiKeyService` generates 32-byte secure random key; stores SHA-256 hex; deactivates previous keys.
- `DeviceApiKeyFilter` validates `X-Device-API-Key` on `/api/checkin-logs/**`.
- `DeviceController` — `POST /api/devices/{deviceId}/api-key` (SYSTEM_ADMIN, HR_ADMIN).

### 8.5 Structured Logging ✅
- `logback-spring.xml`: coloured pattern for non-prod; JSON (LogstashEncoder) for `prod` profile.
- `RequestLoggingFilter`: adds `requestId` to MDC; logs method/URI/status/duration per response.
- ⚠️ **Deviation:** `application.yml` base config retains `org.springframework.security: DEBUG` and `org.flywaydb: DEBUG`. These must be moved to dev profile only (see Phase 9.1).

---

## Phase 9 — Remaining Work

**Objective:** Resolve the items deferred from Phases 0–8 and address new gaps identified during v2.0 review.

---

### 9.1 Fix JWT_SECRET Default and Debug Logging `[CFG]`

**File:** `facez/src/main/resources/application.yml`

Remove the JWT secret default entirely:
```yaml
# Change:
secret: ${JWT_SECRET:12345678abcdefgh12345678abcdefgh}

# To (no default — fails to start if unset):
secret: ${JWT_SECRET}
```

Move debug logging to `application-dev.yml`:
```yaml
# In application-dev.yml only:
logging:
  level:
    org:
      springframework:
        security: DEBUG
      flywaydb: DEBUG
```

Set production-appropriate levels in base `application.yml`:
```yaml
logging:
  level:
    org:
      springframework:
        security: WARN
      flywaydb: INFO
```

**Acceptance criteria:** Application refuses to start if `JWT_SECRET` is not set. Production logs contain no JWT parsing internals.

---

### 9.2 Persist Batch Payroll Job State `[BE]` `[DB]`

**Replace** `PayrollJobStore` (`ConcurrentHashMap`) with a database-backed entity.

**New entity:** `PayrollJob`
```java
@Entity
@Table(name = "payroll_job")
public class PayrollJob {
    @Id private String jobId;
    private int payrollYear;
    private int payrollMonth;
    private String status;       // RUNNING, COMPLETED, FAILED
    private int total;
    private int succeeded;
    private int failed;
    private int skipped;
    private String startedBy;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String errorMessage;
}
```

Write migration `V20__payroll_job.sql`.

Update `PayrollBatchService` to persist job status updates to the database instead of the in-memory map. Use `@Transactional(propagation = REQUIRES_NEW)` for each status update so individual failures do not roll back the status record.

**Acceptance criteria:** Restarting the application during a batch run preserves all status data in the database. A second instance can query `GET /api/payrolls/jobs/{jobId}` and receive the correct status.

---

### 9.3 Add SystemConfig JSON Schema Validation `[BE]`

**File:** `facez/src/main/java/org/dummy/facez/domain/payroll/service/SystemConfigService.java`

Define a validation method per `configType` that checks required keys and value types before saving:

```java
private void validateConfigData(String configType, JsonNode data) {
    switch (configType) {
        case "PIT" -> {
            requireArrayField(data, "brackets");
            requireLongField(data, "personalDeduction");
            requireLongField(data, "dependentDeduction");
        }
        case "INSURANCE" -> {
            requireDoubleField(data, "bhxhEmployee");
            requireDoubleField(data, "bhytEmployee");
            requireDoubleField(data, "bhtnEmployee");
            requireLongField(data, "insuranceCeiling");
        }
        // ... SALARY_GRADE, ALLOWANCE, WORK_SCHEDULE
    }
}
```

Throw `BadRequestException` with a descriptive message if validation fails.

**Acceptance criteria:** Saving a PIT config missing the `brackets` array returns HTTP 400. A valid config saves successfully. Existing payroll calculation behaviour is unchanged.

---

### 9.4 Migrate Profile Pictures to Cloud Storage `[BE]` `[CFG]`

This must be done in three releases to avoid data loss.

**Release A — Add configuration (now):**
Add to `application.yml`:
```yaml
app:
  storage:
    type: ${STORAGE_TYPE:local}      # local | s3 | minio
    endpoint: ${STORAGE_ENDPOINT:}   # S3/MinIO URL
    bucket: ${STORAGE_BUCKET:facez-uploads}
    access-key: ${STORAGE_ACCESS_KEY:}
    secret-key: ${STORAGE_SECRET_KEY:}
    local-path: ${STORAGE_LOCAL_PATH:./uploads/profile-pictures}
```

Refactor `ProfilePictureService` behind a `StorageService` interface with `LocalStorageService` and `S3StorageService` implementations, selected by `STORAGE_TYPE`.

**Release B — Background migration (staging first):**
One-time job that uploads existing local files to cloud storage and updates `profilePictureUrl`. Run and verify 100% migration before Release C.

**Release C — Remove local fallback:**
After Release B is verified in production, remove `LocalStorageService` and enforce cloud-only.

**Acceptance criteria after Release A:** `STORAGE_TYPE=s3` environment variable switches to S3-backed storage with no code change. `STORAGE_TYPE=local` (default) retains current behaviour.

---

### 9.5 Add Annual Leave Rollover Job `[BE]`

**New scheduled job:** Runs on 2 January each year (not 1 January to avoid conflict with year-end batch payroll).

```java
@Scheduled(cron = "0 0 6 2 1 *")  // 06:00 on 2 January
public void rolloverLeaveBalances() {
    int previousYear = LocalDate.now().getYear() - 1;
    int newYear = previousYear + 1;
    for (EmployeeInfo employee : employeeRepository.findByStatusAndDeleteFlagFalse(ACTIVE)) {
        LeaveBalance annual = leaveBalanceRepository
            .findByEmployeeIdAndLeaveYearAndLeaveType(employee.getId(), previousYear, ANNUAL)
            .orElse(null);
        if (annual == null) continue;
        BigDecimal carryOver = annual.getRemainingDays().min(annual.getCarryOverCap());
        // Create or update new-year balance with carriedOverDays = carryOver
        leaveBalanceService.initialiseOrAddCarryover(employee, newYear, ANNUAL, carryOver);
    }
}
```

**Acceptance criteria:** On 2 January, each active employee's new-year ANNUAL balance has `carriedOverDays` equal to `min(previousYear.remainingDays, carryOverCap)`.

---

### 9.6 Add API Version Prefix `[BE]` `[FE]`

**Add `/api/v1/` prefix to all routes** to enable future non-breaking API evolution.

In `SecurityConfig`, update all `requestMatchers` from `/api/...` to `/api/v1/...`.

In the frontend, update `ApiCallUtil.tsx` base URL from `/api` to `/api/v1`.

Document the breaking-change policy: *Adding optional response fields is non-breaking. Removing, renaming, or changing the type of a field requires a new `/api/v2/` prefix.*

**Note:** This is a coordinated backend + frontend change. Deploy them together or provide an `/api` → `/api/v1` redirect during the transition period.

**Acceptance criteria:** All documented endpoints respond at `/api/v1/...`. The frontend compiles and all existing features work correctly after the change.

---

### 9.7 Add Overlapping Leave Request Check `[BE]`

**File:** `facez/src/main/java/org/dummy/facez/domain/leave/service/LeaveService.java`

In `create()`, after balance check and before saving, add:
```java
boolean hasOverlap = leaveRepository.existsByEmployeeInfo_EmployeeIdAndStatusNotAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
    employee.getEmployeeId(),
    RequestStatus.REJECTED,
    request.getEndDate(),
    request.getStartDate()
);
if (hasOverlap) {
    throw new BadRequestException(
        "An approved or pending leave request already covers part of the requested date range.");
}
```

**Acceptance criteria:** Submitting a leave request whose date range overlaps an existing non-rejected leave for the same employee returns HTTP 400.

---

### 9.8 Payslip PDF Generation `[BE]` `[FE]`

**Backend:** Add a `GET /api/payrolls/my/{year}/{month}/slip.pdf` endpoint that returns `Content-Type: application/pdf`. Use a lightweight PDF library (OpenPDF or iText) to generate the payslip document.

Payslip must include: company name, employee name/ID, period, gross salary components (baseGross, OT pay, bonus), deductions (BHXH, BHYT, BHTN, PIT), net salary, and bank account.

**Frontend:** Add a "Download PDF" button to the payslip page. The button calls the PDF endpoint and triggers a browser download.

**Acceptance criteria:** Employee can download a PDF payslip for any APPROVED or PAID period. PDF contains all salary components. PDF renders correctly for an employee with dependents and OT pay.

---

## 3. Database Migration Sequence (Updated)

| Migration File | Phase | Description |
|---|---|---|
| `V1__baseline_schema.sql` | 0.1 | Full baseline schema |
| `V2__add_audit_columns.sql` | 0.3 | `created_by`, `updated_by` |
| `V3__add_roles.sql` | 1.1 | Role documentation |
| `V4__payroll_status_update.sql` | 1.3 | `PENDING_APPROVAL`, `REJECTED`, `rejection_reason` |
| `V5__attendance_period_close.sql` | 1.4 | `attendance_period_close` table |
| `V6__employee_statutory_fields.sql` | 2.1 | National ID, bank, tax code, etc. |
| `V7__tax_dependent.sql` | 2.2 | `tax_dependent` table |
| `V8__work_schedule_config.sql` | 3.2 | Seed WORK_SCHEDULE config |
| `V9__public_holiday.sql` | 3.3 | `public_holiday` table + 2026 holidays |
| `V10__leave_type.sql` | 4.1 | `leave_type`, `duration_hours`, `balance_deducted` |
| `V11__leave_balance.sql` | 4.2 | `leave_balance` table with `pending_days` |
| `V12__contract_date_types.sql` | 5.1 | Safe VARCHAR→DATE migration |
| `V13__contract_history.sql` | 5.2 | Drop unique constraint, add effective_from/to, current |
| `V14a__ot_monthly_summary_view.sql` | 6.1 | OT limit view |
| `V14b__employer_contributions.sql` | 7.1 | Employer insurance fields on payroll |
| `V15__pit_brackets_config.sql` | 7.5 | PIT 7-bracket config seed |
| `V16a__profile_picture_url.sql` | 8.3 | `profile_picture_url` column |
| `V17__api_key.sql` | 8.4 | `api_key` table |
| `V18__notification.sql` | 8.1 | `notification` table |
| `V19_final.sql` | 8.1 | Final schema corrections |
| `V20__payroll_job.sql` | 9.2 | `payroll_job` table (pending) |

---

## 4. Phase 9 Acceptance Criteria Summary

- [ ] Application refuses to start if `JWT_SECRET` env var is not set.
- [ ] Production logs contain no Spring Security DEBUG output.
- [ ] Restarting the application during a batch payroll run preserves job status in the database.
- [ ] Saving a malformed PIT SystemConfig returns HTTP 400 with a description of the missing fields.
- [ ] Profile picture storage backend is switchable via `STORAGE_TYPE` environment variable.
- [ ] On 2 January each year, all active employees have their previous year's unused annual leave credited as `carriedOverDays` in the new year's balance.
- [ ] All API endpoints respond at `/api/v1/...`.
- [ ] Submitting a leave request that overlaps an existing non-rejected request returns HTTP 400.
- [ ] Employee can download a PDF payslip for any APPROVED or PAID period.

---

*End of Document 5 — Version 2.0*
