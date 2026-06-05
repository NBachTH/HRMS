# Backend Implementation Audit
## FaceZ HRMS — Full Roadmap Implementation Review (Phases 0–8)
**Version:** 2.0 | **Date:** 2026-05-21
**Supersedes:** v1.0 (2026-04-23)

> **v2.0 scope:** The v1.0 audit document recorded the implementation intent. This v2.0 audit verifies actual implementation against that intent, notes deviations, and documents the remaining gaps (Phase 9) identified during the v2.0 document review.

---

## Phase 0 — Infrastructure & Foundation ✅ Complete

### 0.1 Spring Boot Setup ✅
- Spring Boot 4.0.0-M3, Java 21, Maven wrapper.
- Module structure: `domain/`, `auth/`, `common/`, `configs/`.
- `AuditableEntity` base class with full JPA auditing (`@CreatedBy`, `@LastModifiedBy`, `@CreatedDate`, `@LastModifiedDate`).
- `AuditorAwareImpl` reads username from `SecurityContextHolder`.
- `@EnableJpaAuditing` in `JpaAuditingConfig`.

### 0.2 Database Migrations (Flyway) ✅

All 19 migration files present and verified in `src/main/resources/db/migration/`:

| File | Purpose |
|------|---------|
| `V1__baseline_schema.sql` | Complete baseline schema (all core tables) |
| `V2__add_audit_columns.sql` | `created_by`, `updated_by` on auditable tables |
| `V3__add_roles.sql` | Role documentation migration |
| `V4__payroll_status_update.sql` | `PENDING_APPROVAL`, `REJECTED`, `rejection_reason` |
| `V5__attendance_period_close.sql` | `attendance_period_close` table |
| `V6__employee_statutory_fields.sql` | Statutory employee fields |
| `V7__tax_dependent.sql` | `tax_dependent` table |
| `V8__work_schedule_config.sql` | WORK_SCHEDULE seed |
| `V9__public_holiday.sql` | `public_holiday` table + 2026 holidays |
| `V10__leave_type.sql` | `leave_type`, `duration_hours`, `balance_deducted` |
| `V11__leave_balance.sql` | `leave_balance` table with `pending_days` |
| `V12__contract_date_types.sql` | Safe parallel-column VARCHAR→DATE migration |
| `V13__contract_history.sql` | Contract history (drop unique FK, add effective_from/to, current) |
| `V14a__ot_monthly_summary_view.sql` | OT monthly summary view |
| `V14b__employer_contributions.sql` | Employer insurance columns on payroll |
| `V15__pit_brackets_config.sql` | PIT 7-bracket seed in system_config |
| `V16a__profile_picture_url.sql` | `profile_picture_url` on employee_info |
| `V17__api_key.sql` | `api_key` table with device FK |
| `V18__notification.sql` | `notification` table |
| `V19_final.sql` | Final schema corrections (notification column names) |

`application.yml` settings verified: `flyway.enabled: true`, `ddl-auto: none`, `baseline-on-migrate: false`, `out-of-order: false`, `validate-on-migrate: true`.

### 0.3 Environment Configuration ✅ (with one deviation)

`application.yml` verified:
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` — env vars with `localhost` defaults.
- `REDIS_HOST`, `REDIS_PORT` — env vars with `localhost` defaults.
- `CORS_ALLOWED_ORIGINS` — env var with `http://localhost:3000` default.
- `show-sql: false` — correct.
- `JWT_ACCESS_EXP_MS`, `JWT_REFRESH_EXP_MS` — env vars with sensible defaults.

**⚠️ Deviation:** `JWT_SECRET` has a hardcoded default: `${JWT_SECRET:12345678abcdefgh12345678abcdefgh}`. The specification required no default. This is a production security risk — any deployment that does not explicitly set `JWT_SECRET` will accept tokens signed with the known default key.

**Corrective action required (Phase 9.1):** Remove the default value.

### 0.4 Login Rate Limiting ✅ (implementation differs from spec)

`LoginRateLimiter` (in `common/services/`) — Redis-backed IP counter.
- 10 attempts per 15-minute sliding window.
- HTTP 429 with `Retry-After` header on breach.
- `X-Forwarded-For` header used for IP extraction (proxy-aware).
- Successful login resets the counter.

**Deviation from spec:** Spec called for Bucket4j with Redis `ProxyManager`. Actual implementation uses a direct Redis counter. Functionally equivalent for single-instance deployment; Bucket4j would provide stronger guarantees under race conditions at high request rates. Not a production blocker at current scale.

### 0.5 Environment Profiles ✅

`application-dev.yml`, `application-staging.yml`, `application-prod.yml` all present.

**⚠️ Remaining gap:** `application.yml` still contains `org.springframework.security: DEBUG` and `org.flywaydb: DEBUG` in the base logging config. These should be in `application-dev.yml` only. Corrective action in Phase 9.1.

---

## Phase 1 — Roles & Security Architecture ✅ Complete

### 1.1 New Roles ✅

`FINANCE_ADMIN` and `DIRECTOR` added to `Role` enum. All `@PreAuthorize` annotations updated across all controllers.

### 1.2 RBAC Hierarchy ✅

`SecurityConfig.filterChain()` verified with URL-level `requestMatchers`:
- `FINANCE_ADMIN`: `/api/payrolls/calculate`, `/api/payrolls/batch-calculate`, reports, mark-paid, system-configs.
- `DIRECTOR`: `/api/payrolls/*/approve`, `/api/payrolls/*/reject`.
- `HR_ADMIN`: employee CRUD, period close, leave/OT final approval.
- `SYSTEM_ADMIN`: actuator endpoints (`/actuator/env`, `/actuator/loggers`, `/actuator/flyway`, `/actuator/metrics/**`).
- `/actuator/health` — public.
- `/api/departments/**` GET — authenticated (not public). *(Fixed from v1.0 public access.)*
- `/api/checkin-logs/**` — `DEVICE_CHECKIN` authority (via DeviceApiKeyFilter) or JWT.

Filter chain order: `DeviceApiKeyFilter` → `JwtAuthFilter` (both before `UsernamePasswordAuthenticationFilter`).

### 1.3 Payroll Status Workflow ✅

`PayrollStatus` enum: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`, `REJECTED`.

`PayrollService` methods and corresponding endpoints:

| Method | Endpoint | Source State | Target State | Required Role |
|--------|----------|:------------:|:------------:|:-------------:|
| `submitForApproval()` | `PATCH /submit` | DRAFT | PENDING_APPROVAL | FINANCE_ADMIN |
| `approve()` | `PATCH /approve` | PENDING_APPROVAL | APPROVED | DIRECTOR |
| `reject()` | `PATCH /reject` | PENDING_APPROVAL | REJECTED | DIRECTOR |
| `markPaid()` | `PATCH /mark-paid` | APPROVED | PAID | FINANCE_ADMIN |

`rejection_reason` (VARCHAR 500) stored on `Payroll` entity.

**Bug fixed in Phase 7:** `approve()` was checking `status != DRAFT` (wrong) — corrected to `status != PENDING_APPROVAL`.

### 1.4 Attendance Period Close Guard ✅

`PayrollService.calculate()` calls `periodCloseRepository.existsByCloseYearAndCloseMonth()`. If no record exists, throws `BadRequestException("Attendance for {month}/{year} has not been closed by HR...")`.

---

## Phase 2 — Employee Data ✅ Complete

### 2.1 Statutory Fields on EmployeeInfo ✅

Added fields: `nationalId` (unique), `nationalIdIssueDate`, `nationalIdIssuePlace`, `taxCode` (unique), `socialInsuranceCode` (unique), `bankAccountNumber`, `bankName`, `bankBranch`, `dateOfBirth`, `gender` (Gender enum: MALE/FEMALE/OTHER), `hometown`, `profilePictureUrl`.

`EmployeeCreateRequest`, `EmployeeUpdateRequest`, `EmployeeResponse` all updated.
`EmployeeService` updated to handle all fields.

### 2.2 Tax Dependent Management ✅

- `TaxDependent.java` — entity: `employeeInfo` (ManyToOne), `fullName`, `nationalId`, `dateOfBirth`, `relationship`, `registrationDate`, `active`.
- `TaxDependentRepository.java` — `findByEmployeeInfo_EmployeeId`, `countByEmployeeInfo_EmployeeIdAndActiveTrue`.
- `TaxDependentService.java` / `TaxDependentController.java` — full CRUD, HR_ADMIN + FINANCE_ADMIN access.

---

## Phase 3 — Attendance Pipeline ✅ Complete

### 3.1 Spring Events Decoupling ✅

- `CheckinProcessedEvent.java` — carries `EmployeeInfo`, `LocalDateTime logTime`, `LogTypes logType`.
- `CheckinLogService` publishes event via `ApplicationEventPublisher` after each `CheckinLog` save.
- `AttendanceService.onCheckinProcessed()`:
  - `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` — fires after checkin transaction commits.
  - `@Transactional(propagation = Propagation.REQUIRES_NEW)` — runs in a separate transaction.
  - `LogTypes.IN` → idempotent Attendance record creation (skips if one exists for that employee/day).
  - `LogTypes.OUT` → closes open Attendance; computes `lateHour`, `workingHour`, `paidHour`, `workingDay`, `paidDay`, `violate`.

### 3.2 Work Schedule Config ✅

`AttendanceService` reads `WORK_SCHEDULE` SystemConfig JSON (`workStartTime`, `workHoursPerDay`). Falls back to constants (`08:30`, `8`) if config absent or malformed. V8 migration seeds default config.

### 3.3 Public Holiday Management ✅

- `PublicHoliday.java` entity + `PublicHolidayRepository.existsByHolidayDate(date)`.
- `PublicHolidayService.java` / `PublicHolidayController.java` — GET/POST/DELETE.
- Used by `AttendanceService` (exclude from working day counts) and `PayrollCalculationEngine` (OT ×3.0 on public holidays).

### 3.4 Attendance Period Close ✅

- `AttendancePeriodClose.java` entity.
- `PeriodCloseService.closePeriod(year, month, forceClose)`:
  - Scans for days where no `Attendance` exists AND no approved `LeaveRequest` exists for each active employee.
  - Returns `PeriodCloseResponse{closed, unexplainedAbsences}`.
  - `forceClose=true` proceeds despite absences (marks them as unpaid).
- `POST /api/attendances/close-period` (HR_ADMIN).

---

## Phase 4 — Leave Management ✅ Complete

### 4.1 LeaveType Enum ✅

`ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `BEREAVEMENT`, `MARRIAGE`, `UNPAID`, `PUBLIC_HOLIDAY`, `COMPENSATORY`.

V10 migration: `leave_type` NOT NULL (default ANNUAL for existing rows), `duration_hours`, `balance_deducted`.

### 4.2 Two-Stage Balance Deduction ✅

- **Submit:** `balance.remainingDays >= requested` check; reserve into `pendingDays`; reduce `remainingDays`.
- **HR approval:** `pendingDays → usedDays` (remainingDays already reduced at submission).
- **Rejection/deletion:** `pendingDays → remainingDays` (release reservation).

`LeaveBalance.java` — unique constraint on `(employee_id, leave_year, leave_type)`. Fields: `entitlementDays`, `carriedOverDays`, `pendingDays`, `usedDays`, `remainingDays`, `carryOverCap`.

### 4.3 Leave Balance API ✅

- `GET /api/leaves/balances/my` — employee self-service.
- `GET /api/leaves/balances/{employeeId}` — HR_ADMIN access.

### 4.4 Guards ✅

`PUBLIC_HOLIDAY` and `COMPENSATORY` blocked in `LeaveService.create()`. Insufficient balance throws `BadRequestException` with remaining balance in message.

---

## Phase 5 — Contract Lifecycle ✅ Complete

### 5.1 Date Type Migration ✅

V12 migration: parallel-column safe approach — adds `start_date_new DATE`, populates via regex-guarded CAST from VARCHAR, drops old columns, renames new columns. `Contract.startDate`, `endDate` are `LocalDate`.

### 5.2 Contract History Pattern ✅

V13 migration: drops unique `employee_id` FK constraint; adds `effective_from DATE`, `effective_to DATE`, `current BOOLEAN DEFAULT true`.

`ContractService.update()`: sets `effectiveTo = today`, `current = false` on existing record; inserts new with `effectiveFrom = today`, `current = true`.

`ContractRepository`: `findByEmployeeInfo_EmployeeIdAndCurrentTrue()`.

`GET /api/contracts/employee/{id}/history` — full history ordered by `effectiveFrom DESC`.

### 5.3 Expiry Management ✅

`ContractExpiryScheduler` — runs at `0 0 8 * * *` (08:00 daily).
- Queries contracts where `current = true` AND `endDate BETWEEN today AND today+30`.
- Logs warnings per expiring contract.
- Publishes `ContractExpiringEvent` (consumed by `NotificationEventListener` → HR_ADMIN notification).

`GET /api/contracts/expiring-soon?withinDays=30` (HR_ADMIN).

---

## Phase 6 — OT Compliance ✅ Complete

### 6.1 Minute-Based OT Limits ✅

`OTRequestService` — on submission:
1. Computes `requestedMinutes = Duration.between(req.startTime, req.endTime).toMinutes()`.
2. Queries `sumApprovedMinutesForMonth(employeeId, year, month)` via native SQL with `EXTRACT(EPOCH)`.
3. Monthly limit check: `monthlyMinutes + requestedMinutes > 2400` → HTTP 400.
4. Annual limit check: `annualMinutes + requestedMinutes > 12000` → HTTP 400.

V14a migration: `ot_monthly_summary` view for performance (avoids full table scan).

Error messages state current approved total and limit in fractional hours (e.g., `"Approved this month: 38.5h. Requested: 2.0h. Limit: 40.0h."`).

### 6.2 Night Supplement Calculation ✅

`PayrollCalculationEngine.calculateNightOverlapMinutes(start, end)`:
- Minute-by-minute scan of the OT window.
- Counts minutes where `hour >= 22 || hour < 6`.
- Returns overlap in minutes (decimal).

`computeOtPayForRequest(ot, hourlyRate)`:
- Base rate: `isPublicHoliday → 3.0`, `isWeekend → 2.0`, else `1.5`.
- `pay = (hourlyRate / 60.0) × (dayMinutes × baseRate + nightMinutes × (baseRate + 0.3))`.

---

## Phase 7 — Accounting Function ✅ Complete

### 7.1 Employer Contributions ✅

`Payroll` entity fields added (verified against `Payroll.java`):
- `bhxhEmployer`, `bhytEmployer`, `bhtnEmployer`, `workplaceAccidentInsurance`, `totalEmployerContributions`, `totalEmploymentCost`.
- Column name overrides: `@Column(name = "kpi1score")`, `@Column(name = "kpi2score")` to bypass Hibernate naming strategy conflict.

V14b migration adds the columns.

`PayrollCalculationEngine` — BHXH cap: `min(insuranceBase, 20 × statutoryMinWage)` read from SALARY_GRADE config.

### 7.2–7.4 Report Endpoints ✅

`PayrollReportService`:
- `getLabourCostReport(year, month, deptId)` — aggregates per-employee and per-department.
- `getInsuranceRemittanceReport(year, month)` — social insurance code + contribution amounts.
- `getPitSummaryReport(year, month)` — tax code + taxable income + PIT.

All endpoints accessible to `FINANCE_ADMIN` and `DIRECTOR`. `SYSTEM_ADMIN` also allowed.

### 7.5 PIT 7-Bracket Calculation ✅

V15 seeds PIT config:
- 7 brackets: 5% (0–5M), 10% (5–10M), 15% (10–18M), 20% (18–32M), 25% (32–52M), 30% (52–80M), 35% (80M+).
- `personalDeduction`: 11,000,000 VND/month.
- `dependentDeduction`: 4,400,000 VND/month.

`PayrollCalculationEngine.calculatePit()` reads brackets from `SystemConfig` at runtime. No hardcoded rates.

### 7.6 Employee Payslip ✅

`PayrollService.getMyPayslip(year, month, authenticatedUsername)`:
- Resolves `EmployeeInfo` from `UserAccount.username` (JWT principal).
- Finds `Payroll` with `status IN (APPROVED, PAID)` for the period.
- Returns `PayslipResponse` with all deduction line items.

`GET /api/payrolls/my/{year}/{month}/slip` — authenticated (any role for own payslip).

---

## Phase 8 — Notifications, Security, Operations ⚠️ Mostly Complete

### 8.1 Notification System ✅

- `Notification.java` entity: `id`, `employeeInfo` (ManyToOne), `title`, `message`, `type`, `readFlag`, `createdAt`.
- `NotificationRepository`: `findByEmployeeInfo_EmployeeIdAndDeleteFlagFalseOrderByCreatedAtDesc`, `countByEmployeeInfo_EmployeeIdAndReadFlagFalse`, `markAllRead`.
- `NotificationService`: `send()`, `getMyNotifications()`, `countUnread()`, `markRead()`, `markAllRead()`.
- `NotificationController`: `GET /api/notifications` (paginated), `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`.

**Events wired:**
- `LeaveRequestSubmittedEvent` — `LeaveService.createLeaveRequest()` after save → notification to employee's LEADER.
- `PayrollApprovedEvent` — `PayrollService.approve()` and `reject()` → notification to FINANCE_ADMIN.
- `ContractExpiringEvent` — `ContractExpiryScheduler` daily → notification to HR_ADMIN users.

`NotificationEventListener`: `@Async` + `@TransactionalEventListener(AFTER_COMMIT)` for transactional events; plain `@EventListener` for contract expiry (scheduler context is non-transactional).

### 8.2 Actuator Hardening ✅

`application.yml` management section verified:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,loggers,flyway,env
  endpoint:
    health:
      show-details: when-authorized
    env:
      show-values: never
```

`SecurityConfig`: `/actuator/health` — public; `/actuator/env`, `/actuator/loggers`, `/actuator/flyway`, `/actuator/metrics/**` — `SYSTEM_ADMIN` only.

### 8.3 Profile Picture Storage ⚠️ Partial

- ✅ V16a migration: `profile_picture_url VARCHAR(500)` on `employee_info`.
- ✅ `ProfilePictureService.java`: validates content type (JPEG/PNG/WebP), max 5 MB; stores to configurable local directory; updates `employeeInfo.profilePictureUrl`.
- ✅ `POST /api/employees/{id}/profile-picture` (multipart/form-data, HR_ADMIN).
- ⚠️ **NOT implemented:** Cloud/MinIO storage backend. Files are stored on local disk only.
- ⚠️ **NOT implemented:** Background migration job (Phase 8.3-B).
- ⚠️ **NOT implemented:** Drop of old BLOB column (Phase 8.3-C) — `profile_picture` BLOB column is not present in V1 baseline (was not added, so nothing to drop; `profile_picture_url` is the only picture field).

**Production concern:** Local-disk storage is incompatible with horizontal scaling and container-without-persistent-volume deployments. Addressed in Phase 9.4.

### 8.4 Device API Key Authentication ✅

- `ApiKey.java` entity: `keyHash` (SHA-256 hex), `device` (FK), `active`, `lastUsedAt`.
- `ApiKeyRepository`: `findByKeyHashAndActiveTrue`.
- `ApiKeyService`: generates 32-byte `SecureRandom` key; computes SHA-256 hex; deactivates existing keys for device; stores only hash.
- `ApiKeyResponse` returns raw key once (never stored, not retrievable again).
- `DeviceApiKeyFilter`: `OncePerRequestFilter` on `/api/checkin-logs/**`; validates `X-Device-API-Key` header; sets `DEVICE_CHECKIN` authority in `SecurityContext`; updates `lastUsedAt`.
- `DeviceController`: `POST /api/devices/{deviceId}/api-key` (SYSTEM_ADMIN, HR_ADMIN).
- `SecurityConfig`: `DeviceApiKeyFilter` added before `JwtAuthFilter` using `UsernamePasswordAuthenticationFilter.class` as anchor (required by Spring Security 7.x — custom filter classes have no registered order).

### 8.5 Structured Logging ✅ (with base config deviation)

- `logback-spring.xml`: `default` spring profile → coloured pattern; `prod` profile → JSON (LogstashEncoder).
- `RequestLoggingFilter`: adds `requestId` (UUID) to MDC; logs `METHOD URI STATUS DURATIONms` after response; clears MDC on completion.
- `logstash-logback-encoder:8.0` in `pom.xml`.

**⚠️ Deviation:** `application.yml` base config has `org.springframework.security: DEBUG` and `org.flywaydb: DEBUG`. Per Phase 9.1 corrective action, these must be moved to `application-dev.yml`.

---

## Phase 9 — Remaining Work (Not Yet Implemented)

| Item | Priority | Document Reference |
|------|:--------:|-------------------|
| Remove JWT_SECRET default | HIGH | Doc 05 Phase 9.1 |
| Move DEBUG logging to dev profile | MEDIUM | Doc 05 Phase 9.1 |
| Persist batch payroll job state (V20) | MEDIUM | Doc 05 Phase 9.2 |
| SystemConfig JSON schema validation | MEDIUM | Doc 05 Phase 9.3 |
| Cloud storage for profile pictures | MEDIUM | Doc 05 Phase 9.4 |
| Annual leave rollover scheduled job | LOW | Doc 05 Phase 9.5 |
| API version prefix (/api/v1/) | LOW | Doc 05 Phase 9.6 |
| Overlapping leave request check | LOW | Doc 05 Phase 9.7 |
| Payslip PDF generation | LOW | Doc 05 Phase 9.8 |

---

## Summary: New Files Created in Phases 0–8

| Path | Description |
|------|-------------|
| `domain/notification/model/Notification.java` | Notification entity |
| `domain/notification/repository/NotificationRepository.java` | |
| `domain/notification/dto/NotificationResponse.java` | |
| `domain/notification/service/NotificationService.java` | |
| `domain/notification/controller/NotificationController.java` | |
| `domain/notification/event/LeaveRequestSubmittedEvent.java` | |
| `domain/notification/event/PayrollApprovedEvent.java` | |
| `domain/notification/event/ContractExpiringEvent.java` | |
| `domain/notification/event/NotificationEventListener.java` | |
| `domain/attendance/model/ApiKey.java` | Device API key entity |
| `domain/attendance/model/PublicHoliday.java` | Public holiday entity |
| `domain/attendance/model/AttendancePeriodClose.java` | Period close entity |
| `domain/attendance/repository/ApiKeyRepository.java` | |
| `domain/attendance/repository/PublicHolidayRepository.java` | |
| `domain/attendance/service/ApiKeyService.java` | Key generation (SHA-256) |
| `domain/attendance/service/PeriodCloseService.java` | Period close logic |
| `domain/attendance/service/PublicHolidayService.java` | |
| `domain/attendance/event/CheckinProcessedEvent.java` | Spring event carrier |
| `domain/attendance/controller/DeviceController.java` | API key generation endpoint |
| `domain/attendance/controller/PublicHolidayController.java` | |
| `domain/employee/model/TaxDependent.java` | Tax dependent entity |
| `domain/employee/service/TaxDependentService.java` | |
| `domain/employee/service/ProfilePictureService.java` | File upload for profile pictures |
| `domain/employee/controller/TaxDependentController.java` | |
| `domain/payroll/service/PayrollReportService.java` | Labour cost, insurance, PIT reports |
| `domain/payroll/dto/PayrollRejectRequest.java` | |
| `domain/contract/scheduler/ContractExpiryScheduler.java` | Expiry cron |
| `common/filters/DeviceApiKeyFilter.java` | X-Device-API-Key filter |
| `common/filters/RequestLoggingFilter.java` | Request MDC + duration logging |
| `common/services/LoginRateLimiter.java` | Redis-backed login rate limiter |
| `resources/logback-spring.xml` | Profile-aware logging config |

## Summary: Key Files Modified in Phases 0–8

| Path | Change |
|------|--------|
| `domain/payroll/model/Payroll.java` | Added employer fields; `@Column(name="kpi1score/kpi2score")` overrides |
| `domain/payroll/service/PayrollService.java` | Fixed approve() bug; period-close guard; employer fields; payslip; events |
| `domain/payroll/service/PayrollBatchService.java` | Requires FINANCE_ADMIN; period-close guard |
| `domain/payroll/service/PayrollCalculationEngine.java` | Night supplement; public holiday rate; employer contributions; PIT from config |
| `domain/payroll/controller/PayrollController.java` | Report + payslip endpoints; FINANCE_ADMIN/DIRECTOR RBAC |
| `domain/payroll/dto/PayrollResponse.java` | Employer contribution fields |
| `domain/attendance/service/AttendanceService.java` | Event listener; WORK_SCHEDULE config; REQUIRES_NEW propagation |
| `domain/attendance/service/CheckinLogService.java` | Publishes CheckinProcessedEvent |
| `domain/leave/service/LeaveService.java` | LeaveType guard; balance check; event publishing |
| `domain/contract/model/Contract.java` | LocalDate dates; effectiveFrom/To/current fields |
| `domain/employee/model/EmployeeInfo.java` | Statutory fields; profilePictureUrl |
| `domain/employee/controller/EmployeeController.java` | Profile picture upload endpoint |
| `configs/SecurityConfig.java` | DeviceApiKeyFilter; FINANCE_ADMIN/DIRECTOR RBAC; actuator RBAC; dept auth |
| `auth/controller/AuthController.java` | Login rate limiter integration |
| `common/enums/Role.java` | FINANCE_ADMIN, DIRECTOR added |
| `common/enums/PayrollStatus.java` | PENDING_APPROVAL, REJECTED added |
| `common/enums/LeaveType.java` | New enum |
| `resources/application.yml` | Flyway; ddl-auto:none; show-sql:false; actuator; env vars |
| `resources/db/migration/` | V1–V19 migration files |
| `pom.xml` | logstash-logback-encoder dependency |

---

*End of Document 6 — Version 2.0*
