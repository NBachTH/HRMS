# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FaceZ HRMS** is a comprehensive Human Resource Management System for technology companies operating under Vietnamese labour law. The system combines face-recognition attendance tracking with multi-level approval workflows for leave, overtime, payroll processing, and contract lifecycle management.

The project is a **monorepo** with two main subsystems:
- **Backend (facez/):** Spring Boot 4.0.0-M3 (Java 21) REST API
- **Frontend (facez-front/):** Next.js 15 (TypeScript, React 19) with Tailwind CSS

---

## Development Setup & Commands

### Prerequisites
- **Java 21+** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL 15** (via Docker Compose or local)
- **Redis 7** (via Docker Compose or local)

### Quick Start

**Option 1: Docker (Recommended)**
```bash
cd facez
docker compose -f compose.yaml up -d
# Bring up PostgreSQL (port 5432), pgAdmin (port 5050), Redis (port 6379)
```

**Option 2: Local Services**
Ensure PostgreSQL is running on `localhost:5432` (default user: postgres/postgres) and Redis on `localhost:6379`.

### Backend Commands

```bash
cd facez

# Build and compile
./mvnw clean install

# Run application (port 8084, context-path: /face-z)
./mvnw spring-boot:run

# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=FaceZApplicationTests

# Access points after startup
# - API base: http://localhost:8084/face-z
# - Swagger UI: http://localhost:8084/face-z/swagger-ui.html
# - Health: http://localhost:8084/face-z/actuator/health
```

**Default admin account** (auto-seeded): `admin` / `admin123`

### Frontend Commands

```bash
cd facez-front

# Install dependencies
npm install

# Dev server with Turbopack (port 3000)
npm run dev

# Production build
npm run build

# Serve production build
npm start

# ESLint
npm run lint
```

The frontend reads `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:8084/face-z` in `.env.local`). Override if your backend port differs.

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         FaceZ HRMS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (Next.js 15)          Backend (Spring Boot 4.0.0-M3) │
│  - React 19 (App Router)        - Java 21                      │
│  - Tailwind CSS                 - PostgreSQL 15 (Flyway)       │
│  - Port 3000                    - Redis 7 (tokens, cache)      │
│                                 - Port 8084                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Package Structure

```
org.dummy.facez/
├── configs/           — SecurityConfig, RedisConfig, DataInitializerConfig, JpaAuditingConfig
├── auth/              — Authentication flow, JWT, login rate limiting
├── domain/
│   ├── attendance/    — Attendance records, check-in devices, period close, API key management
│   ├── employee/      — Employee info, user accounts, benefits, tax dependents, profile pictures
│   ├── department/    — Department management
│   ├── contract/      — Contract lifecycle (history pattern: one-to-many with effectiveFrom/To)
│   ├── leave/         — Leave requests, leave balance, multi-level approvals
│   ├── otrequest/     — Overtime requests (same approval flow as leave)
│   ├── notification/  — Event-driven notifications (Spring Application Events)
│   └── payroll/       — Payroll calculation, batch processing, system configuration, financial reports
└── common/
    ├── enums/         — Role, RequestStatus, PayrollStatus, EmployeeStatus, LeaveType, Gender, etc.
    ├── filters/       — JwtAuthFilter, DeviceApiKeyFilter
    ├── services/      — JwtService (Redis-backed), AuditorAwareImpl
    └── utils/         — JWT utilities, exception handlers
```

### Frontend Route Architecture

All pages are protected via `ProtectedRoute` component and organized by role:

```
app/
├── employees/        — Any authenticated user (Personal dashboards, attendance, leave, OT, payroll, self-service)
│   ├── dashboard/
│   ├── attendance/
│   ├── leave/
│   ├── ot/
│   ├── payroll/
│   └── me/          — User profile
├── managers/        — MANAGER, LEADER, HR_ADMIN (Team-level views and approval workflows)
│   ├── request/     — Approve/reject leave/OT
│   └── department/  — View department details
├── hr/              — HR_ADMIN, SYSTEM_ADMIN (Employee lifecycle, system operations)
│   ├── employee/
│   ├── contract/
│   ├── attendance/
│   ├── attendance/close-period/
│   ├── checkin-log/
│   ├── devices/     — API key management
│   ├── holidays/    — Public holiday configuration
│   └── department/
├── finance/         — FINANCE_ADMIN, DIRECTOR (Payroll and financial reporting)
│   ├── payroll/
│   ├── payroll/[id]/
│   └── reports/     — Labour cost, insurance remittance, PIT summary
├── director/        — DIRECTOR only (Payroll approval)
│   └── approvals/
├── system/          — SYSTEM_ADMIN only (System configuration)
│   └── config/
└── notifications/   — Any authenticated user (Notification inbox)
```

---

## Key Architecture Patterns

### 1. Authentication & Authorization

**JWT Flow:**
- Access token (5 min) + HTTP-only refresh cookie (14 days, Redis-backed)
- Refresh endpoint: `POST /api/auth/refresh` (no auth required, uses cookie)
- 401/403 triggers automatic silent refresh via `apiClient()` in frontend
- All endpoints return `ApiResponse<T>` with `{ success, message, data }`

**Roles (7 levels):**
- `EMPLOYEE`, `LEADER`, `MANAGER`, `HR_ADMIN`, `FINANCE_ADMIN`, `DIRECTOR`, `SYSTEM_ADMIN`
- Enforced per-endpoint via `@PreAuthorize` annotations (NOT a strict hierarchy)

**Device Authentication:**
- Check-in terminals authenticate via `X-Device-API-Key` header (SHA-256 hashed, never stored raw)
- `DeviceApiKeyFilter` runs before `JwtAuthFilter`

### 2. Request Flow (Frontend → Backend)

**All API calls must go through `apiClient()` in `src/app/commons/utils/ApiCallUtil.tsx`:**
- Attaches in-memory access token as `Authorization: Bearer <token>`
- On 401/403: silently calls `/api/auth/refresh` (HttpOnly cookie), retries once, notifies `AuthContext`
- Throws `{ status, body }` on non-2xx; `body.message` is the backend's error string
- **Never** call `fetch()` directly

**Standard error-handling pattern:**
```typescript
try {
    await someService.doSomething();
    showToast('Success message');
    onSuccess();
} catch (err: any) {
    showToast(err?.body?.message || 'Fallback error text', 'error');
}
```

### 3. Global Contexts (Frontend)

Both provided at root `layout.tsx`:

| Context | Hook | Provides |
|---------|------|----------|
| `AuthContext` | `useAuth()` | `user`, `role`, `accessToken`, `isLoading`, `logout()` |
| `ToastContext` | `useToast()` | `showToast(message, type)` — type defaults to `'success'` |

`AuthContext` restores the session on mount via the refresh endpoint; `isLoading` is `true` until resolved.

### 4. Backend API Response Shape

All endpoints return:
```typescript
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
}
```

**Backend response inconsistency:** Some endpoints return either plain `T[]` or `PageResponse<T>` depending on query params. Always extract defensively:
```typescript
const items = Array.isArray(res.data) ? res.data : ((res.data as any)?.content ?? []);
```

**Delete responses** return `ApiResponse<null>` — only `success` and `message` matter.

### 5. Data Layer Patterns

**Service layer:**
- Each file in `src/app/services/` wraps one backend module and calls `apiClient`
- Return types: `ApiResponse<T>` or `ApiResponse<PageResponse<T>>`
- All DTOs live in `src/app/commons/types/index.ts`

**Endpoint scoping:**
- Functions ending in `/my` (e.g. `getLeaves` → `/api/leaves/my`) are employee self-service (current user only)
- Manager/HR views use unscoped endpoints (`/api/leaves`, `/api/attendances`)
- If a service only exposes `/my`, add a separate exported function for the manager-scoped variant

### 6. Frontend Component Structure

**Feature components use a three-file split:**
- `*Content.tsx` — owns local state (`refreshKey`, modal open/close, search term), renders layout
- `*Table.tsx` — fetches and renders paginated data; re-fetches when `refreshKey` prop changes
- `*FormModal.tsx` — create/edit form using `Modal` from `src/app/components/common/Modal.tsx`

**Refresh key pattern:** Increment an integer after any mutation to trigger table re-fetch (replaces imperative refetch calls).

**Page layout pattern:** Every page follows this structure:
```tsx
<ProtectedRoute allowedRoles={[...]}>
  <div className="flex h-screen w-full bg-gray-50">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <*Content />
      </main>
    </div>
  </div>
</ProtectedRoute>
```

### 7. Multi-Level Approval Workflows

**Leave & OT Requests:**
```
DRAFT → TO_APPROVE → LEADER_APPROVED → MANAGER_APPROVED → APPROVED
                                                        ↘ REJECTED (any level)
```
- `LEADER` approves from `TO_APPROVE`
- `MANAGER` approves from `LEADER_APPROVED`
- `HR_ADMIN` gives final approval from `MANAGER_APPROVED`
- Delete allowed only on `DRAFT` or `TO_APPROVE`

**Payroll:**
```
DRAFT → PENDING_APPROVAL → APPROVED → PAID
                        ↘ REJECTED
```
- `FINANCE_ADMIN` calculates, submits, marks paid
- `DIRECTOR` approves or rejects from `PENDING_APPROVAL`

### 8. Attendance & Check-in Flow

1. Raw events arrive via `POST /api/checkin-logs` (real-time) or `/batch` (offline device upload)
2. `CheckinLogService` saves each raw event, delegates to `AttendanceService.processCheckinForAttendance()`
3. `LogTypes.IN` → creates new `Attendance` for the day (idempotent)
4. `LogTypes.OUT` → closes open `Attendance`, fills `checkOut`, computes hours
5. `AttendanceSchedule` cron (midnight) backfills from previous day's raw `CheckinLog` entries
6. Auto-computed fields: `lateHour`, `workingHour`, `paidHour`, `workingDay`, `paidDay`, `violate` (8:00 AM start, 8 hours = 1 paid day)

**Period Close:**
- HR admins lock a month via `POST /api/attendance/period-close`
- Dry run (`forceClose: false`) returns unexplained absences list
- Set `forceClose: true` to override and close permanently
- Once closed, period is immutable for payroll purposes

### 9. Payroll Calculation Engine

`PayrollCalculationEngine` is a pure-computation `@Component` — no DB access, no transactions:
- `PayrollService` (single employee) and `PayrollBatchService` (bulk) share identical logic
- Salary formula: `baseGross = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt)`
  - `Lhq` = contract base salary, `Li` = position coefficient, `HTi` = allowances
  - `KPItb` = average of KPI1 (A/B/C → 1.04/1.00/0.98) and KPI2 (auto-derived from attendance)
  - OT rates: weekday ×1.5, weekend ×2.0, night (22:00–06:00) adds ×1.3
- `PayrollBatchService` uses `@Async` with two-method design (avoid Spring proxy self-call issues): `triggerBatch()` creates job record and returns `jobId`; `runBatch()` is `@Async` worker
- Job status tracked in-memory via `PayrollJobStore`
- `PayrollScheduler` auto-triggers on the 1st of each month

**Batch Job Polling (Frontend):**
```typescript
batchCalculatePayroll()  // Returns PayrollJobResponse with jobId
// Then poll:
setInterval(() => pollPayrollJob(jobId), 1500)  // Check every 1.5s
// Until state is COMPLETED or FAILED
```
See `BatchCalcModal` in `src/app/components/payroll/PayrollContent.tsx` for reference.

### 10. System Configuration

`SystemConfig` entity (PostgreSQL `jsonb`) manages versioned payroll rules:
- Types: `SALARY_GRADE`, `ALLOWANCE`, `PIT`, `INSURANCE`
- Only one record per type should have `active = true` (enforced at service layer)
- Only `SYSTEM_ADMIN` can call these endpoints
- Activating a new version reloads the payroll engine cache immediately
- Managed via `SystemConfigService` / `SystemConfigController` at `app/system/config/`

### 11. Database Migrations

**Flyway strategy:**
- `ddl-auto: none` — no auto-schema generation
- 19 versioned migration files (V1–V19) in `src/main/resources/db/migration/`
- Config: `baseline-on-migrate: false`, `out-of-order: false`, `validate-on-migrate: true`
- All schema changes delivered as new numbered migration files

**Soft delete:** `deleteFlag` and `deletedAt` fields on all entities (not enforced universally at query level — check per-repository).

### 12. Scheduled Tasks

| Scheduler | Cron | Purpose |
|-----------|------|---------|
| `AttendanceSchedule` | `0 0 0 * * *` (midnight) | Backfill attendance from yesterday's checkin logs |
| `PayrollScheduler` | 1st of each month | Auto-trigger batch payroll calculation |
| `ContractExpiryScheduler` | Monthly | Fire `ContractExpiringEvent` for expiring contracts |

### 13. Notification System

Event-driven (Spring Application Events) — no direct service-to-service coupling:
- Event types: `LeaveRequestSubmittedEvent`, `PayrollApprovedEvent`, `ContractExpiringEvent`, `CheckinProcessedEvent`
- All handled by `NotificationEventListener` → `NotificationService.send()`
- Employees read via `GET /api/notifications` (paginated)
- Mark read via `PATCH /api/notifications/{id}/read` or `/read-all`

### 14. Common UI Components (Frontend)

Reuse from `src/app/components/common/` instead of building ad-hoc:

| Component | Key Props | Use Case |
|-----------|-----------|----------|
| `Modal` | `isOpen`, `onClose`, `title`, `width` | Form/detail overlays |
| `ConfirmDialog` | `open`, `title`, `message`, `onConfirm`, `onCancel`, `danger?`, `loading?` | Destructive actions |
| `Pagination` | `page`, `totalPages`, `onPageChange` | Paginated tables |
| `EmptyState` | `message` | Empty list placeholder |
| `Spinner` | — | Loading states |
| `RejectReasonModal` | `isOpen`, `onClose`, `onConfirm` | Leave/OT rejection reason capture |

### 15. Utility Functions (Frontend)

`src/app/commons/utils/formatters.ts`:
- `formatVnd(n)` — Vietnamese Dong currency (vi-VN locale)
- `formatDate(iso)` / `formatDateTime(iso)` — locale date/datetime strings, returns '—' for null
- `relativeTime(iso)` — relative time string (e.g. "5m ago")
- `formatMonth(year, month)` — "MM/YYYY" string
- `exportToCsv(filename, rows)` — triggers browser CSV download with UTF-8 BOM

### 16. Financial Reports (Frontend)

Three tabbed report types at `app/finance/reports/` (all support CSV export):
- **Labour Cost** — gross/net/insurance/PIT/OT per employee; filterable by department
- **Insurance Remittance** — BHXH/BHYT/BHTN employee+employer per employee
- **PIT Summary** — taxable income and PIT per employee

All use `PayrollService` DTOs: `LabourCostResponse`, `InsuranceRemittanceResponse`, `PitSummaryResponse`.

### 17. Dashboard Role Dispatch

`app/employees/dashboard/` is a single route for all roles. `DashboardContent` dispatches to role-specific sub-component:

| Role | Component |
|------|-----------|
| `SYSTEM_ADMIN` | `SystemAdminDashboard` (renders `HrDashboard` + active config cards) |
| `HR_ADMIN` | `HrDashboard` (payroll trend, cost breakdown, contract types, leave rate, approvals) |
| `MANAGER` / `LEADER` | `ManagerDashboard` (renders `EmployeeDashboard` + team approvals + dept overview) |
| `FINANCE_ADMIN` / `DIRECTOR` / `EMPLOYEE` | `EmployeeDashboard` (attendance, personal requests, salary trend) |

Charts use **Recharts** (`BarChart`, `AreaChart`, `LineChart`, `PieChart` via `ResponsiveContainer`).

---

## Important Enums & Types

**Role:** `'EMPLOYEE' | 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'LEADER' | 'MANAGER' | 'FINANCE_ADMIN' | 'DIRECTOR'`

**RequestStatus:** `'DRAFT' | 'TO_APPROVE' | 'LEADER_APPROVED' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED'`

**PayrollStatus:** `'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID'`

**EmployeeStatus:** `'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'`

**LeaveType:** `'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'MARRIAGE' | 'UNPAID' | 'PUBLIC_HOLIDAY' | 'COMPENSATORY'`

**ConfigType:** `'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE'`

---

## Configuration & Environment

**Application Properties** (`facez/src/main/resources/application.yml`):
- Port: 8084, context-path: `/face-z`
- Database: PostgreSQL (env: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`)
- Redis: (env: `REDIS_HOST`, `REDIS_PORT`)
- JWT: Access exp 5 min, refresh exp 14 days (env: `JWT_SECRET`, `JWT_ACCESS_EXP_MS`, `JWT_REFRESH_EXP_MS`)
- CORS: Allowed origins (env: `CORS_ALLOWED_ORIGINS`)

**Profile-based configs:**
- `application-dev.yml`, `application-staging.yml`, `application-prod.yml` available

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_BASE=http://localhost:8084/face-z`

---

## Subdirectory CLAUDE.md Files

For more detailed guidance specific to each subsystem:
- **Backend details:** See `facez/CLAUDE.md`
- **Frontend details:** See `facez-front/CLAUDE.md`

---

## Security Notes

- **CORS:** Configured for `http://localhost:3000` only
- **Public endpoints:** `/api/auth/**`, `/actuator/**`, `/v3/api-docs/**`, `/swagger-ui/**`
- **Device check-in:** `/api/checkin-logs/**` accepts both JWT and `X-Device-API-Key` header
- **Login rate limiting:** 10 attempts per 15-minute window (Redis-backed, IP-aware)
- **JWT Secret:** Environment variable (no hardcoded fallback in production)

---

## Development Notes

- **IDs:** All primary keys are String UUIDs (generated at service layer)
- **Auditing:** All auditable entities extend `AuditableEntity` with `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- **Contract history:** Uses history pattern (one-to-many with `effectiveFrom`, `effectiveTo`, `current` flag)
- **Profile pictures:** Uploaded to `uploads/profile-pictures/` (5 MB max) on backend
- **Timezone considerations:** System uses local time for payroll calculations; adjust formatters if timezone support is needed