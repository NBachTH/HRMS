# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Build
./mvnw clean install

# Run application (port 8084)
./mvnw spring-boot:run

# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=FaceZApplicationTests
```

**Prerequisites:** Java 21+, PostgreSQL on `localhost:5432` (postgres/postgres), Redis on `localhost:6379`

**Access points after startup:**
- API base: `http://localhost:8084/face-z`
- Swagger UI: `http://localhost:8084/face-z/swagger-ui.html`
- Health: `http://localhost:8084/face-z/actuator/health`

**Default admin account** (seeded by `DataInitializerConfig` on first run): `admin` / `admin123`

## Architecture Overview

Spring Boot 4.0.0-M3 HRMS with face-recognition attendance tracking. Uses PostgreSQL with **Flyway migrations** (`ddl-auto: none`; migrations in `src/main/resources/db/migration/`, currently V1–V19), Redis (refresh token blacklist/rotation), Spring Security + JWT, and SpringDoc OpenAPI.

### Package Layout

Each feature module under `domain/` uses the same sub-package split: `controller/`, `dto/`, `model/`, `repository/`, `service/` (plus `event/` for attendance and notification; `scheduler/` for contract and payroll).

```
org.dummy.facez/
├── configs/           — SecurityConfig, RedisConfig, DataInitializerConfig, JpaAuditingConfig
├── auth/              — controller/, service/, dtos/
├── domain/
│   ├── attendance/    — Attendance, CheckinLog, Device, PublicHoliday, AttendancePeriodClose,
│   │                    ApiKey + AttendanceSchedule (daily cron), PeriodCloseService, ApiKeyService
│   ├── employee/      — EmployeeInfo, UserAccount, Benefit, TaxDependent
│   │                    + ProfilePictureService (upload to uploads/profile-pictures/, 5 MB max)
│   ├── department/    — Department
│   ├── contract/      — Contract + ContractExpiryScheduler (monthly cron)
│   ├── leave/         — LeaveRequest, LeaveBalance
│   ├── otrequest/     — OTRequest
│   ├── notification/  — Notification + event listeners (Spring Events)
│   └── payroll/       — Payroll, SystemConfig, PayrollBatchService, PayrollScheduler,
│                        PayrollReportService, PayrollConfigService
└── common/
    ├── configs/       — AsyncConfig
    ├── enums/         — Role, EmployeeStatus, EmployeeLevels, LogTypes, RequestStatus, PayrollStatus, Gender, LeaveType
    ├── exception/     — GlobalExceptionHandler, ResourceNotFoundException, BadRequestException
    ├── filters/       — JwtAuthFilter, DeviceApiKeyFilter
    ├── model/         — AuditableEntity (base class with @CreatedBy/@LastModifiedBy JPA auditing)
    ├── response/      — ApiResponse<T>, PageResponse<T>
    ├── services/      — JwtService (Redis-backed), AuditorAwareImpl
    └── utils/         — JwtUtils
```

### Key Design Patterns

- **All endpoints return** `ApiResponse<T>` (or `PageResponse<T>` for paginated results)
- **Auth flow:** Stateless JWT (5 min access token) + HTTP-only cookie refresh token (14 days, Redis-backed with rotation/revocation)
- **Roles** (all 7): `EMPLOYEE`, `LEADER`, `MANAGER`, `HR_ADMIN`, `FINANCE_ADMIN`, `DIRECTOR`, `SYSTEM_ADMIN`. Not a strict linear hierarchy — enforced per-endpoint via `@PreAuthorize`. Domain ownership: LEADER/MANAGER/HR_ADMIN own leave & OT approvals; FINANCE_ADMIN owns payroll calculation; DIRECTOR approves payroll; SYSTEM_ADMIN manages system config and can override most operations.
- **Soft delete:** `deleteFlag` field on entities (not enforced at query level universally — check per-repo)
- **IDs:** All primary keys are `String` UUIDs generated at the service layer (`UUID.randomUUID().toString()`)
- **CORS:** Configured for `http://localhost:3000` only

### Entity Relationships

`UserAccount` (implements `UserDetails`) ←1:1→ `EmployeeInfo` ←N:1→ `Department`

Standalone entities linked to `EmployeeInfo`: `Contract`, `Attendance`, `LeaveRequest`, `LeaveBalance`, `OTRequest`, `CheckinLog`, `Benefit`, `Payroll`, `TaxDependent`, `Notification`

`CheckinLog` links to `Device` (the physical check-in terminal) and back to `Attendance`.

`ApiKey` links to `Device` — stores a SHA-256 hash of the secret key, not the raw value. Activated/deactivated by HR admins via `DeviceController`.

All entities that need audit trails extend `AuditableEntity` (adds `createdBy`, `updatedBy`, `createdAt`, `updatedAt` via Spring Data JPA auditing).

### Device Authentication

Check-in terminals authenticate via `X-Device-API-Key` header instead of JWT. `DeviceApiKeyFilter` (runs before `JwtAuthFilter` on `/api/checkin-logs/**`) validates the header against SHA-256 hashes in the `ApiKey` table. A valid key grants `DEVICE_CHECKIN` authority and sets the security principal to `"device:<deviceId>"`. Raw keys are never stored — only their SHA-256 hex hash.

### Attendance / Check-in Flow

Raw events come in via `POST /api/checkin-logs` (real-time, single) or `POST /api/checkin-logs/batch` (offline device upload). `CheckinLogService` saves each raw `CheckinLog`, then delegates to `AttendanceService.processCheckinForAttendance()`:

- `LogTypes.IN` → creates a new `Attendance` for the day (idempotent; skips if one already exists)
- `LogTypes.OUT` → closes the open `Attendance` (fills `checkOut`, computes hours)

`AttendanceService` auto-computes `lateHour`, `workingHour`, `paidHour`, `workingDay`, `paidDay`, and `violate` (late or missing checkout). Work day starts at 08:00, 8 hours = 1 paid day.

`AttendanceSchedule` runs a daily cron at midnight to backfill attendance records for the previous day from raw `CheckinLog` entries.

**Period Close** (`PeriodCloseService`): HR admins lock a month via `POST /api/attendance/period-close`. Before closing, the service checks for unexplained absences (days without attendance or approved leave). If found, it returns a 200 with `closed=false` and the list; set `forceClose=true` to override and treat absences as unpaid leave. Once closed, the period is immutable for payroll purposes.

**Public Holidays** (`PublicHolidayService`): Managed via `POST/GET /api/public-holidays`. Holidays are excluded from working-day calculations and do not count as absences.

### Leave / OT Approval Workflow

Both `LeaveRequest` and `OTRequest` share a multi-level approval via `RequestStatus`:

```
DRAFT → TO_APPROVE → LEADER_APPROVED → MANAGER_APPROVED → APPROVED
                                                         ↘ REJECTED (any level)
```

- `LEADER` approves/rejects from `TO_APPROVE`
- `MANAGER` approves/rejects from `LEADER_APPROVED`
- `HR_ADMIN` gives final approval/rejection from `MANAGER_APPROVED`

Delete is only allowed on `DRAFT` or `TO_APPROVE` status.

### Notification System

Notifications are created via Spring Application Events — no direct service-to-service coupling. Event types: `LeaveRequestSubmittedEvent`, `PayrollApprovedEvent`, `ContractExpiringEvent`, `CheckinProcessedEvent`. All are handled by `NotificationEventListener`, which calls `NotificationService.send()`. Employees read their own notifications via `GET /api/notifications` (paginated); mark read via `PATCH /api/notifications/{id}/read` or `PATCH /api/notifications/read-all`.

### Payroll Module

`PayrollCalculationEngine` is a pure-computation `@Component` — no DB access, no transactions. It accepts pre-loaded domain objects and returns an unsaved `DRAFT` `Payroll`. This lets `PayrollService` (single employee) and `PayrollBatchService` (bulk) share identical logic without redundant queries.

Salary formula (simplified): `baseGross = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt)`
- `Lhq` = contract base salary, `Li` = position coefficient, `HTi` = allowances sum
- `KPItb` = average of KPI1 (A/B/C → 1.04/1.00/0.98) and KPI2 (auto-derived from attendance if not provided)
- OT pay rates: weekday ×1.5, weekend ×2.0, night (+22:00–06:00) adds ×1.3

`PayrollBatchService` uses `@Async` (via `AsyncConfig`) with a two-method design to avoid Spring proxy self-call issues: `triggerBatch()` creates a job record and returns a `jobId`; `runBatch()` is the `@Async` method that does the actual work. Job status is tracked in-memory via `PayrollJobStore`.

`PayrollScheduler` auto-triggers batch payroll on the 1st of each month.

**Payroll approval workflow:**
```
DRAFT → PENDING_APPROVAL → APPROVED → PAID
                         ↘ REJECTED (DIRECTOR or SYSTEM_ADMIN)
```
- `FINANCE_ADMIN` calculates (`POST /api/payrolls/calculate`), submits (`PATCH /{id}/submit`), and marks paid (`PATCH /{id}/mark-paid`)
- `DIRECTOR` approves (`PATCH /{id}/approve`) or rejects from `PENDING_APPROVAL`

**Payroll reports** (`PayrollReportService`, all under `GET /api/payrolls/reports/`, require `FINANCE_ADMIN` or `DIRECTOR`):
- `/labour-cost?year=&month=&deptId=` — gross, net, insurance, PIT, OT per employee
- `/insurance-remittance?year=&month=` — BHXH/BHYT/BHTN employee + employer contributions
- `/pit-summary?year=&month=` — taxable income and PIT per employee

**System configuration** (`SystemConfig` entity, stored as PostgreSQL `jsonb`): versioned config records for payroll rule tables. Config types: `SALARY_GRADE`, `ALLOWANCE`, `PIT`, `INSURANCE`. Only one record per type should have `active = true` — enforced at service layer. Managed via `SystemConfigService` / `SystemConfigController`.

### Scheduled Tasks

| Scheduler | Cron | Purpose |
|---|---|---|
| `AttendanceSchedule` | `0 0 0 * * *` (midnight) | Backfill attendance from yesterday's checkin logs |
| `PayrollScheduler` | 1st of each month | Auto-trigger batch payroll calculation |
| `ContractExpiryScheduler` | Monthly | Fire `ContractExpiringEvent` for contracts expiring soon |

### Security Config

Public endpoints: `/api/auth/**`, `/actuator/**`, `/v3/api-docs/**`, `/swagger-ui/**`

`/api/checkin-logs/**` accepts both JWT auth and `X-Device-API-Key` header (DEVICE_CHECKIN authority). All other endpoints require JWT authentication. Role checks are method-level with `@PreAuthorize`.

Filter chain order: `DeviceApiKeyFilter` → `JwtAuthFilter`.

## Docker Compose

`compose.yaml.txt` (rename to `compose.yaml`) brings up PostgreSQL 15, pgAdmin (port 5050), and Redis 7 (port 6379).
