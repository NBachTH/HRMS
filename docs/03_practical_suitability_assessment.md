# FaceZ HRMS — Practical Suitability Assessment
### Assessment of System Readiness for Production Use
**Version:** 2.0 | **Date:** 2026-05-21 | **Analyst:** Claude Code
**Supersedes:** v1.0 (2026-04-10)

> **v2.0 scope:** All nine critical gaps (GAP-001 through GAP-009) and all functional/operational gaps from v1.0 have been re-assessed against the current codebase (Phases 0–8 complete). Scores have been updated. Resolved items are noted inline. Remaining gaps are consolidated at the end.

---

## 1. Assessment Summary

Since v1.0, the system has undergone substantial improvement. All three critical production blockers from v1.0 (attendance pipeline, audit trail, schema migration) have been resolved. The two new roles (FINANCE_ADMIN, DIRECTOR) correctly distribute payroll authority. The check-in endpoint is now authenticated. Notifications, leave balance management, contract history, employer-side costs, and OT limit enforcement are all implemented.

**Overall verdict: Suitable for a controlled pilot deployment.** The most severe blockers from v1.0 are resolved. Remaining gaps are medium-to-low severity — they represent incomplete features rather than data integrity or security failures.

An estimated **80–85% of production requirements** are now met. The remaining 15–20% consists of: in-memory job state, missing payslip PDF, absence of annual leave rollover, no JSON schema validation for system config, and a weak JWT secret default.

---

## 2. Scoring by Domain

| Domain | v1.0 Score | v2.0 Score | Change | Commentary |
|--------|:----------:|:----------:|:------:|------------|
| Authentication & Security | 7/10 | **9/10** | +2 | Rate limiting, device auth, audit trail added |
| Employee Management | 6/10 | **8/10** | +2 | Statutory fields, tax dependents, profile pictures |
| Attendance Tracking | 4/10 | **8/10** | +4 | Auto-pipeline, period close, public holidays |
| Leave & OT Workflows | 6/10 | **8/10** | +2 | Leave types, balance, OT limits, notifications |
| Payroll Calculation | 8/10 | **9/10** | +1 | Employer costs, OT night supplement corrected |
| Contract Management | 4/10 | **8/10** | +4 | History model, LocalDate dates, expiry alerts |
| System Configuration | 7/10 | **8/10** | +1 | Finance-owned config; schema validation still absent |
| Frontend UX | 7/10 | **8/10** | +1 | All role dashboards implemented |
| Data Integrity | 5/10 | **8/10** | +3 | Flyway, AuditableEntity, period close gate |
| Operational Readiness | 3/10 | **7/10** | +4 | Actuator, rate limiting, structured logging |

---

## 3. Strengths

### 3.1 Payroll Calculation Engine
The `PayrollCalculationEngine` correctly implements the Vietnamese salary formula including:
- Lhq × KPItb + Li + HTi components with day-proration.
- KPI auto-scoring from attendance data.
- OT pay with three base rate multipliers (weekday ×1.5, weekend ×2.0, public holiday ×3.0) plus a proportional night supplement (+0.3 for the fraction of time falling within 22:00–06:00).
- Employer-side contributions (BHXH 17%, BHYT 3%, BHTN 1%, accident 0.5%).
- Progressive PIT with 7 brackets read from `SystemConfig`.
- Insurance base ceiling (46.8M VND) applied consistently to both employee and employer calculations.
- Pure computation class (no database access) enables unit testing without infrastructure.

### 3.2 Role Architecture
The introduction of `FINANCE_ADMIN` and `DIRECTOR` roles correctly models the separation of duties that paper-based payroll enforced through physical signatures. HR inputs, Finance calculates and submits, Director authorises. This was the most significant structural gap in v1.0.

### 3.3 Attendance Pipeline Automation
The Spring Events architecture (`CheckinProcessedEvent`) decouples `CheckinLogService` from `AttendanceService`, avoiding circular dependencies while ensuring attendance records are created and updated automatically after each check-in/check-out event. The midnight cron backfills any records missed by real-time processing.

### 3.4 Database Schema Management
Flyway manages 19 versioned migrations from the baseline schema through all implementation phases. `ddl-auto: none` is enforced. Schema changes are reviewable, versioned, and reversible (via point-in-time backup). This was a critical gap in v1.0.

### 3.5 Leave Management
The two-stage balance deduction (reserve on submission, confirm on approval, release on rejection) correctly prevents double-booking and balance overdraft. `LeaveType` enum covers all Vietnamese Labour Code categories.

### 3.6 Authentication Architecture
JWT + HttpOnly cookie design remains sound. The addition of Redis-backed login rate limiting (10 attempts / 15 min per IP) closes the brute-force exposure. Device API key authentication (SHA-256 hash, single-use display, rotation on new key generation) closes the unauthenticated check-in endpoint.

---

## 4. Gap Status from v1.0

### GAP-001: Attendance Auto-Processing — ✅ RESOLVED

**v1.0 finding:** `CheckinLog` to `Attendance` pipeline was not automated; payroll would receive zero attendance data.

**v2.0 status:** Resolved. `CheckinLogService` publishes `CheckinProcessedEvent` after each save. `AttendanceService.onCheckinProcessed()` consumes the event after transaction commit (`@TransactionalEventListener(AFTER_COMMIT)`) and creates/updates the `Attendance` record. The midnight `AttendanceSchedule` cron provides a safety net.

---

### GAP-002: No Audit Trail — ✅ RESOLVED

**v1.0 finding:** No `createdBy` / `updatedBy` fields. Payroll disputes could not be investigated.

**v2.0 status:** Resolved. `AuditableEntity` (mapped superclass) provides `@CreatedBy`, `@LastModifiedBy`, `@CreatedDate`, `@LastModifiedDate` via Spring Data JPA auditing. `AuditorAwareImpl` reads the authenticated username from `SecurityContextHolder`. All auditable entities extend this class. Migration V2 added the columns.

**Remaining nuance:** The audit trail captures who last changed a record but not the previous values. For high-stakes fields (salary, national ID, bank account), a field-level audit log (Hibernate Envers or custom `audit_log` table) would provide full change history. This remains an enhancement, not a blocker.

---

### GAP-003: No Database Migration Management — ✅ RESOLVED

**v1.0 finding:** `ddl-auto: update` was in use.

**v2.0 status:** Resolved. Flyway is active (`spring.flyway.enabled: true`, `ddl-auto: none`). 19 versioned migrations (V1–V19) cover the complete schema.

---

### GAP-004: In-Memory Job Store for Batch Payroll — ⚠️ STILL OPEN (MEDIUM)

**v1.0 finding:** `PayrollJobStore` holds batch job status in a `ConcurrentHashMap`.

**v2.0 status:** Not resolved. The same in-memory store is in use. An application restart during batch processing loses job state — Finance has no status summary for partial runs. Multi-instance deployments would be incompatible with this approach.

**Impact in current deployment:** Single-instance deployment only (no horizontal scaling). Batch runs complete in seconds for hundreds of employees. Risk is low in practice but would become blocking at scale or under deployment automation.

---

### GAP-005: No Leave Balance Management — ✅ RESOLVED

**v1.0 finding:** Leave requests approved with no quota check.

**v2.0 status:** Resolved. `LeaveBalance` entity with `entitlementDays`, `carriedOverDays`, `pendingDays`, `usedDays`, `remainingDays`, `carryOverCap` (unique per employee × year × type). Two-stage deduction prevents balance overdraft and double-booking.

---

### GAP-006: Contract History Not Preserved — ✅ RESOLVED

**v1.0 finding:** `@OneToOne` contract; updates overwrote previous terms.

**v2.0 status:** Resolved. Contract is now a history model: `effectiveFrom`, `effectiveTo`, `current` flag. Updates supersede the existing record rather than overwriting. Full history queryable. Payroll reads the contract effective for the calculation period.

---

### GAP-007: SystemConfig JSON Schema Validation — ⚠️ STILL OPEN (MEDIUM)

**v1.0 finding:** `configData` is free-form JSONB; invalid config only fails at payroll time.

**v2.0 status:** Not resolved. `SystemConfigService` still performs no structural validation before saving. A FINANCE_ADMIN entering a malformed PIT config will not discover the error until a batch payroll run fails.

---

### GAP-008: Check-in Endpoints Unauthenticated — ✅ RESOLVED

**v1.0 finding:** `POST /api/checkin-logs` accessible without authentication.

**v2.0 status:** Resolved. `DeviceApiKeyFilter` validates `X-Device-API-Key` on `/api/checkin-logs/**`. `SecurityConfig` allows `DEVICE_CHECKIN` authority on this path. `GET /api/checkin-logs` now also requires JWT authentication.

---

### GAP-009: Department List Publicly Accessible — ✅ RESOLVED

**v1.0 finding:** `GET /api/departments` required no authentication.

**v2.0 status:** Resolved. Department read endpoints now require at minimum `isAuthenticated()`. The `SecurityConfig` update in Phase 1 moved department GET requests to the authenticated group.

---

## 5. Functional Gap Status from v1.0

| v1.0 Item | Description | v2.0 Status |
|-----------|-------------|-------------|
| FUNC-001 | No notification system | ✅ Resolved — Spring Events + Notification entity |
| FUNC-002 | Leave type classification missing | ✅ Resolved — LeaveType enum, required on all requests |
| FUNC-003 | Work start time hardcoded | ✅ Resolved — WORK_SCHEDULE SystemConfig |
| FUNC-004 | No OT auto-creation from attendance | ⚠️ Still open |
| FUNC-005 | Contract dates as String | ✅ Resolved — LocalDate (V12 migration) |
| FUNC-006 | No employer-side insurance | ✅ Resolved — employer fields on Payroll entity |
| FUNC-007 | Profile pictures as DB BLOB | ✅ Partial — local file storage (not cloud) |
| FUNC-008 | No payslip PDF | ⚠️ Partial — JSON payslip endpoint exists; no PDF |
| FUNC-009 | No annual leave rollover | ⚠️ Still open |

---

## 6. Operational Readiness Gap Status from v1.0

| v1.0 Item | Description | v2.0 Status |
|-----------|-------------|-------------|
| OPS-001 | No Spring Boot Actuator | ✅ Resolved — enabled; /health public, others SYSTEM_ADMIN |
| OPS-002 | No structured logging | ✅ Resolved — logback-spring.xml JSON profile + RequestLoggingFilter |
| OPS-003 | No login rate limiting | ✅ Resolved — Redis-backed 10 attempts / 15 min |
| OPS-004 | CORS hardcoded to localhost:3000 | ✅ Resolved — CORS_ALLOWED_ORIGINS env var |
| OPS-005 | DB credentials in plaintext | ✅ Resolved — env vars with defaults |
| OPS-006 | show-sql: true | ✅ Resolved — show-sql: false |

---

## 7. New Gaps Identified in v2.0

### GAP-A: JWT_SECRET Has Weak Hardcoded Default ⚠️ HIGH

`application.yml` sets:
```yaml
app:
  jwt:
    secret: ${JWT_SECRET:12345678abcdefgh12345678abcdefgh}
```

If deployed without setting `JWT_SECRET`, the application accepts tokens signed with a publicly known key. The default must be **removed** (not just documented) so the application fails to start without an explicit secret.

**Fix:** Change to `secret: ${JWT_SECRET}` (no default). Fail-fast on startup if unset.

---

### GAP-B: Security DEBUG Logging in Base Config ⚠️ MEDIUM

`application.yml` contains:
```yaml
logging:
  level:
    org:
      springframework:
        security: DEBUG
      flywaydb: DEBUG
```

This is in the base configuration file, so it applies to all profiles including production. Spring Security DEBUG logs include JWT token parsing details. These must be moved to `application-dev.yml` only.

---

### GAP-C: Profile Pictures in Local File Storage ⚠️ MEDIUM

`ProfilePictureService` stores images in a local directory. This is incompatible with:
- Horizontal scaling (two instances see different files).
- Container deployments without a persistent volume.
- Disaster recovery (files lost if the host disk fails).

The roadmap Phase 8.3 specified cloud storage (MinIO/S3) as the target. The local-file implementation covers Phase 8.3-A (add URL column) but not 8.3-B and 8.3-C (migrate and replace with cloud storage).

---

### GAP-D: In-Memory PayrollJobStore ⚠️ MEDIUM *(Carried from GAP-004)*

See Section 4, GAP-004 above.

---

### GAP-E: No SystemConfig JSON Schema Validation ⚠️ MEDIUM *(Carried from GAP-007)*

See Section 4, GAP-007 above.

---

### GAP-F: No API Versioning ⚠️ LOW

All routes use `/api/...` with no version prefix. The roadmap recommended `/api/v1/`. Without this, any breaking change to a response DTO silently breaks existing clients.

---

### GAP-G: No Payslip PDF ⚠️ LOW

`GET /api/payrolls/my/{year}/{month}/slip` returns JSON. Employees cannot download or print a payslip document. This was a Phase 7.6 deliverable but PDF generation was not implemented.

---

### GAP-H: No Annual Leave Rollover ⚠️ LOW

`LeaveBalance.carryOverCap` exists but no scheduled job computes and carries over unused days at year end. HR must initialise new balances manually; carryover from the prior year is not applied automatically.

---

### GAP-I: No Overlapping Leave Check ⚠️ LOW

Two leave requests can be submitted for overlapping date ranges for the same employee. Balance check prevents quantity overdraft but not date overlap. This can lead to inconsistencies in attendance reconciliation during period close.

---

## 8. Risk Summary (Updated)

| Risk | Likelihood | Impact | Status |
|------|:----------:|:------:|--------|
| Payroll calculated with zero attendance | — | — | **Eliminated (GAP-001 resolved)** |
| Fraudulent check-in logs affect payroll | — | — | **Eliminated (GAP-008 resolved)** |
| Schema corruption from ddl-auto:update | — | — | **Eliminated (GAP-003 resolved)** |
| Payroll disputes unresolvable (no audit trail) | — | — | **Eliminated (GAP-002 resolved)** |
| HR unilaterally calculates and approves payroll | — | — | **Eliminated (role redesign)** |
| JWT tokens forged with known default secret (GAP-A) | MEDIUM | HIGH | Open |
| Security internals leaked in prod logs (GAP-B) | HIGH | LOW | Open |
| Batch state lost on restart (GAP-C/GAP-004) | LOW | MEDIUM | Open |
| Malformed SystemConfig crashes batch run (GAP-E) | LOW | MEDIUM | Open |
| Profile pictures unavailable after restart (GAP-C) | LOW | LOW | Open |

---

## 9. Recommended Actions (Ordered by Priority)

1. **[CRITICAL] Remove JWT_SECRET default.** Change `application.yml` to `secret: ${JWT_SECRET}` with no fallback. Document that this environment variable must be set in all non-development deployments.

2. **[HIGH] Move DEBUG logging to dev profile.** Move `logging.level.org.springframework.security: DEBUG` and `logging.level.org.flywaydb: DEBUG` to `application-dev.yml`. Set both to `WARN` in `application.yml`.

3. **[MEDIUM] Persist batch payroll job state.** Replace `PayrollJobStore` with a `payroll_job` database entity. Use Flyway to add the table. This eliminates data loss on restart and enables multi-instance deployment.

4. **[MEDIUM] Add SystemConfig JSON schema validation.** Define expected JSON structure per `configType` and validate at save time. A simple `JsonSchema`-based validator or per-type POJO deserialization check is sufficient.

5. **[MEDIUM] Migrate profile pictures to cloud storage.** Replace `ProfilePictureService` local disk storage with MinIO or S3-compatible storage. Configure via `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` env vars.

6. **[LOW] Add annual leave rollover scheduled job.** Run on 1 January each year: for each active employee, compute unused annual leave, apply `carryOverCap`, add to new year's `carriedOverDays`.

7. **[LOW] Add overlapping leave check.** In `LeaveService.create()`, query for approved or pending leave requests for the same employee that overlap the requested date range. Return HTTP 400 if an overlap exists.

---

## 10. Conclusion

FaceZ HRMS has made substantial progress since v1.0. The three critical production blockers (attendance automation, audit trail, Flyway migrations) are resolved. The role architecture now correctly separates HR, Finance, and Director responsibilities — the most significant structural improvement. Authentication is meaningfully hardened with device API keys, login rate limiting, and per-request audit logging.

The system is suitable for a pilot deployment to a small group of employees under careful monitoring. The remaining gaps are well-scoped and implementable without architectural changes. The most urgent action before any production deployment is removing the weak `JWT_SECRET` default.

---

*End of Document 3 — Version 2.0*
