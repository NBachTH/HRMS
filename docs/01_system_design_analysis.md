# FaceZ HRMS — System Design Analysis
### Architecture, Component Map, and Remaining Production Gaps
**Version:** 2.0 | **Date:** 2026-05-21 | **Analyst:** Claude Code
**Supersedes:** v1.0 (2026-04-10)

> **v2.0 scope:** Full re-survey of the live codebase after Phases 0–8 implementation. Every gap identified in v1.0 was assessed against the current source. This document reflects the system as it stands today, with corrections throughout and remaining gaps clearly marked.

---

## 1. System Overview

FaceZ HRMS is a Human Resource Management System for technology companies operating under Vietnamese labour law. Two sub-systems:

- **Backend:** Spring Boot 4.0.0-M3 (Java 21), PostgreSQL 15, Redis 7. Package root: `org.dummy.facez`. Base URL: `http://localhost:8084/face-z`.
- **Frontend:** Next.js 15 (TypeScript, React 19), Tailwind CSS. Port 3000.

The system covers: employee management, department structure, face-recognition attendance tracking with period close, multi-level leave and OT approval workflows, contract lifecycle management, role-segregated payroll calculation and authorisation, financial reporting, and in-app notifications.

---

## 2. Domain Model Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FaceZ HRMS Domains                       │
│                                                                 │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────────┐   │
│   │  Auth &  │────▶│   Employee   │────▶│   Department     │   │
│   │  User    │     │   Profile    │     │   Management     │   │
│   └──────────┘     └──────┬───────┘     └──────────────────┘   │
│                           │                                     │
│          ┌────────────────┼───────────────────┐                │
│          ▼                ▼                   ▼                │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐      │
│   │  Attendance  │ │  Leave / OT  │ │    Contract &    │      │
│   │  & Check-in  │ │  Workflows   │ │   Salary Config  │      │
│   └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘      │
│    PeriodClose    LeaveBalance                │                 │
│    PublicHoliday  LeaveType                  Contract          │
│          │                │                  History           │
│          └────────────────▼──────────────────┘                 │
│                    ┌──────────────┐                             │
│                    │   Payroll    │──── Notification            │
│                    │  Calculation │──── Reports                 │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Entities and Relationships

```
UserAccount (1) ──── (1) EmployeeInfo (N) ──── (1) Department
                          │
              ┌───────────┼────────────────────────────┐
              │           │                            │
         Contract(N)   Attendance               LeaveRequest
         (history)     CheckinLog               OTRequest
         TaxDependent  PublicHoliday            LeaveBalance
         Benefit       AttendancePeriodClose     Notification
              │           │                            │
              └───────────▼────────────────────────────┘
                         (N)
                       Payroll
                          │
                     SystemConfig (versioned rules)
```

**Key design decisions (updated from v1.0):**
- `UserAccount` ↔ `EmployeeInfo`: mandatory 1:1, created atomically.
- Soft delete (`deleteFlag`, `deletedAt`) on all entities — data is never physically removed.
- **`Contract` now uses a history pattern** (one-to-many): each record has `effectiveFrom`, `effectiveTo`, `current` flag. The active contract has `current = true`. Payroll reads the contract effective for the calculation period. *(Corrected from v1.0, which documented a 1:1 relationship.)*
- All auditable entities extend `AuditableEntity` which auto-populates `createdBy`, `updatedBy`, `createdAt`, `updatedAt` via Spring Data JPA auditing.

---

## 3. Role-Based Access Control (RBAC)

The system implements a **seven-level role hierarchy** since v2.0. Two roles were added (FINANCE_ADMIN, DIRECTOR) to correctly separate payroll calculation authority from HR authority. *(v1.0 had five roles.)*

```
SYSTEM_ADMIN
    │  Infrastructure config, user management, device API key management,
    │  actuator access; can also perform HR_ADMIN and FINANCE_ADMIN actions.
    │
DIRECTOR
    │  Final payroll authorisation (approve/reject PENDING_APPROVAL payrolls);
    │  labour cost reporting.
    │
FINANCE_ADMIN
    │  Payroll calculation, batch processing, financial reports, mark-paid;
    │  system configuration management (tax brackets, salary grades).
    │
HR_ADMIN
    │  Employee lifecycle (CRUD), contracts, period close;
    │  final leave and OT approval; leave balance oversight.
    │
MANAGER
    │  Second-level leave/OT approval; view team details.
    │
LEADER
    │  First-level leave/OT approval.
    │
EMPLOYEE
       View own profile, attendance, leave/OT requests, notifications, payslip.
```

**Payroll workflow — role boundaries:**

| Step | Role |
|------|------|
| Close attendance period | HR_ADMIN |
| Calculate / batch-calculate payroll | FINANCE_ADMIN |
| Submit payroll for director review | FINANCE_ADMIN |
| Approve / reject payroll | DIRECTOR |
| Mark payroll as paid | FINANCE_ADMIN |

**Updated access matrix:**

| Feature | EMP | LEADER | MGR | HR | FINANCE | DIRECTOR | SYS |
|---------|:---:|:------:|:---:|:--:|:-------:|:--------:|:---:|
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit leave/OT | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| First-level approval | | ✓ | ✓ | ✓ | | | ✓ |
| Manager approval | | | ✓ | ✓ | | | ✓ |
| Final HR approval | | | | ✓ | | | ✓ |
| Employee CRUD | | | | ✓ | | | ✓ |
| Period close | | | | ✓ | | | ✓ |
| Payroll calculation | | | | | ✓ | | ✓ |
| Payroll authorisation | | | | | | ✓ | ✓ |
| Financial reports | | | | | ✓ | ✓ | ✓ |
| System configuration | | | | | ✓ | | ✓ |
| Device API keys | | | | ✓ | | | ✓ |
| Actuator (env/logs) | | | | | | | ✓ |

---

## 4. Business Flow: Authentication & Session Management

```
Client                    Backend (LoginRateLimiter)         Redis
  │                               │                            │
  │── POST /api/auth/login ──────▶│ Check IP rate limit (10/15min)
  │   {username, password}        │ Validate credentials       │
  │                               │ Generate accessToken (5min)│
  │                               │ Generate refreshToken (14d)│
  │                               │── Store JTI ──────────────▶│
  │◀─ {accessToken} + cookie ─────│ (for revocation tracking)  │
  │   Set-Cookie: refreshToken    │                            │
  │   (HttpOnly, Secure, Lax)     │                            │
  │                               │                            │
  │── API Request ───────────────▶│                            │
  │   Authorization: Bearer <AT>  │ JwtAuthFilter validates    │
  │◀─ Response ───────────────────│                            │
  │                               │                            │
  │   [Token expires or 401]      │                            │
  │── POST /api/auth/refresh ────▶│ Validate refresh token     │
  │   (cookie sent automatically) │── Check JTI not revoked ──▶│
  │                               │◀─ JTI valid ───────────────│
  │                               │ Rotate: revoke old JTI     │
  │                               │── Store new JTI ───────────▶│
  │◀─ {new accessToken} ──────────│                            │
```

**Login brute-force protection (added in Phase 0):** `LoginRateLimiter` uses a Redis counter keyed by client IP. After 10 failed attempts in 15 minutes, the endpoint returns HTTP 429 with a `Retry-After` header. Successful login resets the counter.

---

## 5. Business Flow: Attendance Tracking

The v1.0 document flagged that the CheckinLog → Attendance pipeline was **not automated**. This is now resolved.

```
Device (X-Device-API-Key)   CheckinLogService       AttendanceService
         │                         │                       │
         │── POST /api/checkin-logs▶│                       │
         │   {employeeId, logType}  │ DeviceApiKeyFilter     │
         │                         │  validates SHA-256 hash│
         │                         │ Save CheckinLog        │
         │                         │ Publish                │
         │                         │  CheckinProcessedEvent  │
         │                         │                       │ [AFTER_COMMIT]
         │                         │                       │ onCheckinProcessed()
         │                         │                       │  IN  → create Attendance
         │                         │                       │        (idempotent)
         │                         │                       │  OUT → close Attendance,
         │                         │                       │        compute hours
         │                         │                       │
         Midnight cron (AttendanceSchedule):
         │                         │ backfills any missed   │
         │                         │ Attendance records     │
         │                         │ from previous day logs │
```

**Attendance computation rules:**
- Work start time: read from `WORK_SCHEDULE` SystemConfig (`workStartTime`); default 08:30 if config absent.
- Standard hours per day: read from `WORK_SCHEDULE` (`workHoursPerDay`); default 8.
- `lateHour` = minutes after work start ÷ 60 (minimum 0)
- `paidHour` = `workingHour − lateHour` (minimum 0)
- `paidDay` = `paidHour ÷ workHoursPerDay`
- `violate` = true if late or no checkout
- Public holidays excluded from working day count

**Period close:** Before payroll can be calculated, HR must close the attendance period via `POST /api/attendances/close-period`. The system checks for unexplained absences (working days with no attendance AND no approved leave). `forceClose=true` overrides and marks unexplained absences as unpaid leave.

---

## 6. Business Flow: Leave Management

Leave requests now carry a `leaveType` (required), and a two-stage balance deduction prevents overdraft.

```
EMPLOYEE               LeaveService              LeaveBalance
    │                       │                         │
    │── POST /api/leaves ──▶│                         │
    │  {leaveType: ANNUAL,  │ Guard: PUBLIC_HOLIDAY   │
    │   startDate, endDate} │  and COMPENSATORY        │
    │                       │  cannot be submitted     │
    │                       │ Check balance ──────────▶│
    │                       │◀─ remainingDays ─────────│
    │                       │ if insufficient → 400    │
    │                       │ Reserve pendingDays ─────▶│
    │                       │ Save request (TO_APPROVE)│
    │◀─ LeaveResponse ──────│                         │
    │                       │                         │
    [Approval flow: LEADER → MANAGER → HR_ADMIN]
    │                       │                         │
    HR approves:            │ Move pendingDays        │
                            │  → usedDays ────────────▶│
    HR rejects:             │ Release pendingDays     │
                            │  → remainingDays ────────▶│
```

**Leave types (`LeaveType` enum):**
`ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `BEREAVEMENT`, `MARRIAGE`, `UNPAID`, `PUBLIC_HOLIDAY` (system only), `COMPENSATORY` (system only)

---

## 7. Business Flow: Payroll Calculation

**Corrected from v1.0:** Payroll is now calculated by FINANCE_ADMIN (not HR_ADMIN), authorised by DIRECTOR, and requires a closed attendance period.

```
HR_ADMIN closes period → AttendancePeriodClose record exists
         │
FINANCE_ADMIN              PayrollCalculationEngine
    │                              │
    │── POST /api/payrolls ────────▶│
    │   /calculate                  │ Load: active SystemConfig
    │   {employeeId, year, month,   │        Contract (effective for period)
    │    kpi1Rating, kpi2Rating,    │        Attendance records
    │    japaneseLevel, odcAllowance│        Approved OT requests
    │    bonus}                     │
    │                              │ Guard: period must be closed
    │                              │
    │                              │ Compute:
    │                              │  NCtt = days where paidDay > 0
    │                              │  Li = positionCoefficient from SALARY_GRADE
    │                              │  KPItb = avg(KPI1, KPI2)
    │                              │  baseGross = [(Lhq×KPItb)+Li+HTi]×(NCtt/Nt)
    │                              │  otPay: weekday×1.5, weekend×2.0,
    │                              │         public holiday×3.0, night+0.3
    │                              │  insuranceBase = min(gross, 46,800,000)
    │                              │  BHXH 8%, BHYT 1.5%, BHTN 1% (employee)
    │                              │  BHXH 17%, BHYT 3%, BHTN 1%,
    │                              │   accident 0.5% (employer)
    │                              │  PIT: 7-bracket progressive
    │                              │  netSalary = totalGross − deductions − PIT
    │◀─ PayrollResponse (DRAFT) ───│
    │                              │
    │── PATCH /{id}/submit ────────▶│ DRAFT → PENDING_APPROVAL
    │                              │ fires PayrollApprovedEvent (notification)
    │
DIRECTOR
    │── PATCH /{id}/approve ───────▶ PENDING_APPROVAL → APPROVED
    │── PATCH /{id}/reject ────────▶ PENDING_APPROVAL → REJECTED (with reason)
    │
FINANCE_ADMIN
    │── PATCH /{id}/mark-paid ─────▶ APPROVED → PAID
```

### 7.1 Employer-Side Cost (added in Phase 7)

The payroll entity now stores full employment cost:

```
totalEmploymentCost = totalGross
                    + bhxhEmployer (17% of capped base)
                    + bhytEmployer (3% of capped base)
                    + bhtnEmployer (1% of capped base)
                    + workplaceAccidentInsurance (0.5% of capped base)
```

This enables Finance to see the true per-employee cost to the company.

---

## 8. Business Flow: System Configuration Management

System configuration is now managed by FINANCE_ADMIN (not SYSTEM_ADMIN as documented in v1.0).

```
FINANCE_ADMIN           SystemConfigService
    │                        │
    │── POST /api/system-configs
    │   {configType, version,│ Deactivate existing active
    │    effectiveDate,       │ config of same type
    │    legalBasis,          │ Insert new active record
    │    configData: {...}}   │
    │◀─ SystemConfigResponse ─│
    │                        │
    │── PATCH /{id}/activate─▶│ Swap active flag;
    │                        │ reload PayrollConfigService cache
```

**Config types and payroll engine dependencies:**

| Config type | Used for |
|-------------|----------|
| `SALARY_GRADE` | Position coefficient (Li) lookup; statutory minimum wage |
| `ALLOWANCE` | Living allowance (HT2) and language allowance (HT1) amounts |
| `PIT` | 7-bracket progressive tax schedule; personal relief (11M VND/month); dependent relief (4.4M VND/month) |
| `INSURANCE` | BHXH/BHYT/BHTN rates and the 46.8M VND ceiling |
| `WORK_SCHEDULE` | Work start time, hours per day (read by AttendanceService) |

---

## 9. Database Schema Management

Schema is managed by Flyway (`spring.jpa.hibernate.ddl-auto: none`). 19 versioned migrations cover the full schema lifecycle from the v1.0 baseline through all eight implementation phases.

**v1.0 documented `ddl-auto: update` as the schema management approach. This has been corrected — Flyway is the sole schema manager and `ddl-auto: none` is enforced.**

All database credentials, CORS origins, and JWT expiry are externalised to environment variables (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `CORS_ALLOWED_ORIGINS`, `JWT_SECRET`). Defaults are provided for local development.

---

## 10. Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Interfaces                          │
│                                                                 │
│  Biometric / Badge Devices                                      │
│  ─────────────────────────                                      │
│  POST /api/checkin-logs        (authenticated: X-Device-API-Key)│
│  POST /api/checkin-logs/batch  (authenticated: X-Device-API-Key)│
│                                                                 │
│  Next.js Frontend (port 3000)                                   │
│  ──────────────────────────────                                 │
│  All requests via apiClient() → Authorization: Bearer           │
│  Silent token refresh via HttpOnly refreshToken cookie          │
│                                                                 │
│  Infrastructure                                                 │
│  ─────────────                                                  │
│  PostgreSQL 15 (localhost:5432) — primary data store, Flyway    │
│  Redis 7 (localhost:6379)      — JWT revocation + login limiter │
└─────────────────────────────────────────────────────────────────┘
```

**v1.0 documented the check-in endpoint as unauthenticated. This has been corrected — the endpoint now requires a valid `X-Device-API-Key` header validated against SHA-256 hashes in the `api_key` table.**

---

## 11. Operational Features

### 11.1 Spring Boot Actuator
Enabled at `/actuator/`. Exposed endpoints: `health`, `info`, `metrics`, `loggers`, `flyway`, `env`.
- `/actuator/health` — public (no auth)
- All others — `SYSTEM_ADMIN` only

### 11.2 Structured Logging
`logback-spring.xml` provides profile-aware logging:
- Non-prod: human-readable coloured pattern
- `prod` profile: JSON format (LogstashEncoder) — one JSON object per log line

`RequestLoggingFilter` adds `requestId` to MDC and logs `METHOD URI STATUS DURATIONms` after each response.

### 11.3 Notification System
Spring Application Events drive in-app notifications:

| Event | Trigger | Recipient |
|-------|---------|-----------|
| `LeaveRequestSubmittedEvent` | Leave submitted | Employee's LEADER |
| `PayrollApprovedEvent` | Payroll status change | Finance/HR users |
| `ContractExpiringEvent` | Daily cron (30-day look-ahead) | HR_ADMIN users |

Employees read notifications via `GET /api/notifications` and mark them read via `PATCH /api/notifications/{id}/read`.

---

## 12. Remaining Production Gaps

These gaps remain after Phase 0–8 implementation. They do not block a careful pilot deployment but must be resolved for full production rollout.

### GAP-A: JWT_SECRET Has Weak Default ⚠️ HIGH
`JWT_SECRET` in `application.yml` defaults to `12345678abcdefgh12345678abcdefgh`. A deployment that does not explicitly set this environment variable will accept tokens signed with the publicly known default key. **The default must be removed** so the application refuses to start without an explicit secret.

### GAP-B: Security DEBUG Logging in Prod Config ⚠️ MEDIUM
`application.yml` sets `org.springframework.security: DEBUG` and `org.flywaydb: DEBUG` globally. These leak JWT processing internals in production logs. They must be moved to `application-dev.yml` only.

### GAP-C: In-Memory Batch Job Store ⚠️ MEDIUM
`PayrollJobStore` tracks batch payroll progress in a `ConcurrentHashMap`. If the application restarts during a batch run, job state is lost. Partially committed payroll records remain in the database with no status report for Finance.

### GAP-D: Profile Pictures in Local File Storage ⚠️ MEDIUM
`ProfilePictureService` stores files in a local directory. This is incompatible with horizontal scaling and does not survive container restarts without a persistent volume mount.

### GAP-E: No SystemConfig JSON Schema Validation ⚠️ MEDIUM
`configData` is free-form JSONB. A malformed PIT config will only fail at payroll calculation time, not at config-save time, potentially invalidating an entire batch run.

### GAP-F: No API Versioning ⚠️ LOW
All routes use `/api/...` with no version prefix. Breaking DTO changes will silently break clients.

### GAP-G: No Payslip PDF ⚠️ LOW
The payslip endpoint (`GET /api/payrolls/my/{year}/{month}/slip`) returns JSON only. There is no printable or downloadable payslip document.

### GAP-H: No Annual Leave Rollover Job ⚠️ LOW
`LeaveBalance` has a `carryOverCap` field but no scheduled job to carry unused days into the following year.

### GAP-I: No Overlapping Leave Check ⚠️ LOW
`LeaveService` checks balance but does not detect whether another approved leave request already covers the same date range for the same employee.

---

## 13. Technical Debt Summary

| Item | Location | Risk | v1.0 status | v2.0 status |
|------|----------|:----:|-------------|-------------|
| `ddl-auto: update` | application.yml | HIGH | Open | **Fixed (Flyway)** |
| DB credentials in plaintext | application.yml | HIGH | Open | **Fixed (env vars)** |
| JWT_SECRET weak default | application.yml | HIGH | N/A | **Open** |
| Unauthenticated check-in endpoint | SecurityConfig | MEDIUM | Open | **Fixed (DeviceApiKeyFilter)** |
| Missing attendance automation | CheckinLogService | HIGH | Open | **Fixed (events)** |
| No audit trail (createdBy/updatedBy) | All entities | HIGH | Open | **Fixed (AuditableEntity)** |
| No leave balance | LeaveService | MEDIUM | Open | **Fixed (LeaveBalance)** |
| No leave types | LeaveRequest | MEDIUM | Open | **Fixed (LeaveType enum)** |
| No employer-side costs | Payroll entity | MEDIUM | Open | **Fixed** |
| No notifications | — | MEDIUM | Open | **Fixed (Spring Events)** |
| No Actuator | application.yml | MEDIUM | Open | **Fixed** |
| No rate limiting | AuthController | MEDIUM | Open | **Fixed (Redis)** |
| CORS hardcoded | SecurityConfig | LOW | Open | **Fixed (env var)** |
| show-sql: true | application.yml | LOW | Open | **Fixed (false)** |
| In-memory PayrollJobStore | PayrollBatchService | MEDIUM | Open | Open |
| Security DEBUG logging | application.yml | MEDIUM | N/A | Open |
| Profile pictures in local storage | ProfilePictureService | MEDIUM | Open (DB BLOB) | Partial |
| No SystemConfig JSON validation | SystemConfigService | MEDIUM | Open | Open |
| No API versioning | All controllers | LOW | N/A | Open |
| No payslip PDF | PayrollController | LOW | Open | Open |
| No annual leave rollover | LeaveService | LOW | N/A | Open |
| No overlapping leave check | LeaveService | LOW | Open | Open |

---

*End of Document 1 — Version 2.0*
